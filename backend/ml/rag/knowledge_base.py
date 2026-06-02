"""
Knowledge Base — ChromaDB vector store cho RAG

Lưu trữ embeddings của sản phẩm, danh mục, chính sách và hướng dẫn sử dụng web.
Dùng sentence-transformers để tạo embeddings (chạy local, không cần API key).

Note: ChromaDB imports are LAZY (inside __init__) để tránh crash toàn bộ ML service
nếu chromadb chưa được cài đặt.
"""

import os
import logging
from typing import List, Dict, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Default embedding model — nhẹ, chạy tốt trên CPU
EMBEDDING_MODEL = os.getenv("KB_EMBEDDING_MODEL", "all-MiniLM-L6-v2")
# Thư mục persist ChromaDB
KB_PERSIST_DIR = os.getenv("KB_PERSIST_DIR", os.path.join(os.path.dirname(__file__), "data"))


class EmbeddingFunction:
    """Wrapper để ChromaDB dùng sentence-transformers (LAZY import)"""

    def __init__(self, model_name: str = EMBEDDING_MODEL):
        logger.info(f"Loading embedding model: {model_name}")
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(model_name)
            self.dimension = self.model.get_sentence_embedding_dimension()
            logger.info(f"Embedding dimension: {self.dimension}")
        except ImportError as e:
            logger.warning(f"sentence-transformers not available: {e}. Embedding disabled.")
            self.model = None
            self.dimension = 384

    def __call__(self, input):
        """ChromaDB 0.5.x expects parameter name 'input' for EmbeddingFunction"""
        if self.model is None:
            logger.warning("EmbeddingFunction called but no model loaded — returning zeros")
            if isinstance(input, str):
                return [[0.0] * self.dimension]
            return [[0.0] * self.dimension for _ in input]
        if isinstance(input, str):
            input = [input]
        embeddings = self.model.encode(input, show_progress_bar=False)
        return embeddings.tolist()


class KnowledgeBase:
    """
    Vector knowledge base lưu thông tin về:
    - Sản phẩm (tên, giá, mô tả, danh mục)
    - Danh mục
    - Chính sách (vận chuyển, đổi trả, bảo hành)
    - FAQ
    - Hướng dẫn sử dụng web
    """

    # Tên collection trong ChromaDB
    COLLECTION_NAME = "ecommerce_kb"

    # Prefix cho metadata type
    TYPE_PRODUCT = "product"
    TYPE_CATEGORY = "category"
    TYPE_POLICY = "policy"
    TYPE_FAQ = "faq"
    TYPE_GUIDE = "guide"

    def __init__(self, persist_dir: Optional[str] = None):
        self.persist_dir = persist_dir or KB_PERSIST_DIR
        os.makedirs(self.persist_dir, exist_ok=True)

        self.embedding_fn = EmbeddingFunction()
        self.client = None
        self.collection = None

        # Lazy import chromadb — tránh crash nếu chưa cài đặt
        try:
            import chromadb
            from chromadb.config import Settings
            self.client = chromadb.PersistentClient(
                path=self.persist_dir,
                settings=Settings(anonymized_telemetry=False),
            )
            self.collection = self.client.get_or_create_collection(
                name=self.COLLECTION_NAME,
                embedding_function=self.embedding_fn,
                metadata={"hnsw:space": "cosine"},
            )
            logger.info(f"Knowledge base ready at {self.persist_dir} ({self.count()} documents)")
        except ImportError as e:
            logger.warning(f"chromadb not available: {e}. Knowledge base disabled.")
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}. Knowledge base disabled.")

    # ─── CRUD ────────────────────────────────────────────────

    def add_documents(self, documents: List[Dict]) -> int:
        """
        Thêm documents vào knowledge base.

        Args:
            documents: List of {id, content, type, source, metadata}
        """
        if not documents or self.collection is None:
            return 0

        ids = []
        contents = []
        metadatas = []

        for doc in documents:
            ids.append(doc["id"])
            contents.append(doc["content"])
            metadatas.append({
                "type": doc.get("type", "unknown"),
                "source": doc.get("source", ""),
                "title": doc.get("metadata", {}).get("title", ""),
                "updated_at": datetime.now().isoformat(),
            })

        # Upsert — nếu ID đã tồn tại thì ghi đè
        self.collection.upsert(
            ids=ids,
            documents=contents,
            metadatas=metadatas,
        )
        logger.info(f"Added/updated {len(documents)} documents (total: {self.count()})")
        return len(documents)

    def delete_documents(self, ids: List[str]):
        """Xoá documents theo ID"""
        if ids and self.collection is not None:
            self.collection.delete(ids=ids)
            logger.info(f"Deleted {len(ids)} documents")

    def clear(self):
        """Xoá toàn bộ knowledge base"""
        if self.collection is None:
            return
        all_ids = self.collection.get()["ids"]
        if all_ids:
            self.collection.delete(ids=all_ids)
        logger.info("Knowledge base cleared")

    # ─── SEARCH ──────────────────────────────────────────────

    def search(
        self,
        query: str,
        n_results: int = 5,
        type_filter: Optional[str] = None,
    ) -> List[Dict]:
        """
        Tìm kiếm documents liên quan nhất.

        Args:
            query: Câu hỏi hoặc từ khoá
            n_results: Số kết quả trả về
            type_filter: Lọc theo loại (product, policy, faq, ...)

        Returns:
            List of {id, content, metadata, distance}
        """
        if self.collection is None:
            return []

        where = {"type": type_filter} if type_filter else None

        results = self.collection.query(
            query_texts=[query],
            n_results=min(n_results, self.count()),
            where=where,
        )

        output = []
        for i in range(len(results["ids"][0])):
            output.append({
                "id": results["ids"][0][i],
                "content": results["documents"][0][i],
                "metadata": results["metadatas"][0][i],
                "distance": results["distances"][0][i] if results.get("distances") else 0,
            })

        return output

    def search_by_type(self, type_name: str, n_results: int = 20) -> List[Dict]:
        """Lấy documents theo loại (không cần query)"""
        if self.collection is None:
            return []
        results = self.collection.get(
            where={"type": type_name},
            limit=n_results,
        )
        output = []
        for i in range(len(results["ids"])):
            output.append({
                "id": results["ids"][i],
                "content": results["documents"][i],
                "metadata": results["metadatas"][i],
            })
        return output

    # ─── HELPERS ─────────────────────────────────────────────

    def count(self) -> int:
        if self.collection is None:
            return 0
        return self.collection.count()

    def get_stats(self) -> Dict:
        """Thống kê các loại documents trong KB"""
        if self.collection is None:
            return {
                "total": 0,
                "by_type": {},
                "embedding_model": EMBEDDING_MODEL,
                "dimension": self.embedding_fn.dimension,
                "error": "ChromaDB not available",
            }
        all_metas = self.collection.get()["metadatas"]
        type_counts = {}
        for m in all_metas:
            t = m.get("type", "unknown")
            type_counts[t] = type_counts.get(t, 0) + 1
        return {
            "total": len(all_metas),
            "by_type": type_counts,
            "embedding_model": EMBEDDING_MODEL,
            "dimension": self.embedding_fn.dimension,
        }

    # ─── BUILD FROM RAW DATA ─────────────────────────────────

    @staticmethod
    def build_product_documents(products: List[Dict]) -> List[Dict]:
        """
        Tạo documents từ danh sách sản phẩm.

        Args:
            products: List of {id, name, description, price, discount_price,
                              category_name, store_name, rating, sold_count}

        Returns:
            Documents ready for add_documents()
        """
        docs = []
        for p in products:
            price = p.get('price') or 0
            discount_price = p.get('discount_price')
            price_str = f"{price:,.0f}₫"
            if discount_price:
                price_str = f"{discount_price:,.0f}₫ (gốc: {price:,.0f}₫)"

            content = (
                f"Sản phẩm: {p['name']}. "
                f"Giá: {price_str}. "
                f"Danh mục: {p.get('category_name', '')}. "
                f"Cửa hàng: {p.get('store_name', '')}. "
                f"Đánh giá: {p.get('rating', 0)}/5 ({p.get('review_count', 0)} đánh giá). "
                f"Đã bán: {p.get('sold_count', 0)}. "
                f"Mô tả: {p.get('description', '')}"
            )
            docs.append({
                "id": f"product_{p['id']}",
                "content": content,
                "type": KnowledgeBase.TYPE_PRODUCT,
                "source": "database",
                "metadata": {
                    "title": p["name"],
                    "price": p.get("discount_price", p["price"]),
                    "category": p.get("category_name", ""),
                    "rating": p.get("rating", 0),
                },
            })
        return docs

    @staticmethod
    def build_category_documents(categories: List[Dict]) -> List[Dict]:
        """Tạo documents từ danh mục"""
        docs = []
        for c in categories:
            content = f"Danh mục: {c['name']}. Mô tả: {c.get('description', '')}"
            docs.append({
                "id": f"category_{c['id']}",
                "content": content,
                "type": KnowledgeBase.TYPE_CATEGORY,
                "source": "database",
                "metadata": {"title": c["name"]},
            })
        return docs

    @staticmethod
    def build_policy_documents() -> List[Dict]:
        """Tạo documents về chính sách (static)"""
        policies = [
            {
                "id": "policy_shipping",
                "content": (
                    "Chính sách vận chuyển: Giao hàng toàn quốc. "
                    "Miễn phí vận chuyển cho đơn hàng từ 500.000₫. "
                    "Thời gian giao hàng từ 2-5 ngày tùy khu vực. "
                    "Thời gian giao hàng nội thành: 1-2 ngày. "
                    "Thời gian giao hàng liên tỉnh: 3-5 ngày."
                ),
                "type": KnowledgeBase.TYPE_POLICY,
                "source": "static",
                "metadata": {"title": "Chính sách vận chuyển"},
            },
            {
                "id": "policy_return",
                "content": (
                    "Chính sách đổi trả: Hỗ trợ đổi trả trong vòng 7 ngày kể từ khi nhận hàng. "
                    "Sản phẩm phải còn nguyên tem, chưa qua sử dụng. "
                    "Khách hàng chịu phí vận chuyển đổi trả. "
                    "Hoàn tiền trong vòng 3-5 ngày làm việc sau khi shop nhận được hàng trả lại."
                ),
                "type": KnowledgeBase.TYPE_POLICY,
                "source": "static",
                "metadata": {"title": "Chính sách đổi trả"},
            },
            {
                "id": "policy_warranty",
                "content": (
                    "Chính sách bảo hành: Sản phẩm được bảo hành theo chính sách của từng shop. "
                    "Thời gian bảo hành từ 3-12 tháng tùy sản phẩm. "
                    "Liên hệ shop qua chat để biết chi tiết bảo hành."
                ),
                "type": KnowledgeBase.TYPE_POLICY,
                "source": "static",
                "metadata": {"title": "Chính sách bảo hành"},
            },
            {
                "id": "policy_payment",
                "content": (
                    "Phương thức thanh toán: Hỗ trợ thanh toán COD (tiền mặt khi nhận hàng), "
                    "chuyển khoản ngân hàng, ví MoMo, và VNPay. "
                    "Thanh toán online được bảo mật và an toàn."
                ),
                "type": KnowledgeBase.TYPE_POLICY,
                "source": "static",
                "metadata": {"title": "Phương thức thanh toán"},
            },
        ]
        return policies

    @staticmethod
    def build_faq_documents() -> List[Dict]:
        """Tạo documents FAQ"""
        faqs = [
            {
                "id": "faq_order_tracking",
                "content": (
                    "Làm thế nào để theo dõi đơn hàng? "
                    "Bạn có thể theo dõi đơn hàng trong mục 'Đơn hàng của tôi' sau khi đăng nhập. "
                    "Trạng thái đơn hàng được cập nhật theo thời gian thực."
                ),
                "type": KnowledgeBase.TYPE_FAQ,
                "source": "static",
                "metadata": {"title": "Theo dõi đơn hàng"},
            },
            {
                "id": "faq_cancel_order",
                "content": (
                    "Làm thế nào để huỷ đơn hàng? "
                    "Bạn có thể huỷ đơn hàng trong mục 'Đơn hàng của tôi' nếu đơn hàng đang ở trạng thái 'Chờ xử lý'. "
                    "Sau khi shop đã xác nhận, bạn không thể huỷ đơn hàng được nữa."
                ),
                "type": KnowledgeBase.TYPE_FAQ,
                "source": "static",
                "metadata": {"title": "Huỷ đơn hàng"},
            },
            {
                "id": "faq_register",
                "content": (
                    "Làm thế nào để đăng ký tài khoản? "
                    "Bạn chỉ cần nhập email, mật khẩu và tên để tạo tài khoản. "
                    "Sau đó bạn có thể mua sắm, theo dõi đơn hàng và nhận khuyến mãi."
                ),
                "type": KnowledgeBase.TYPE_FAQ,
                "source": "static",
                "metadata": {"title": "Đăng ký tài khoản"},
            },
            {
                "id": "faq_coupon",
                "content": (
                    "Làm thế nào để sử dụng mã giảm giá? "
                    "Bạn có thể nhập mã giảm giá tại trang thanh toán trước khi đặt hàng. "
                    "Xem danh sách mã giảm giá tại mục 'Kho voucher'."
                ),
                "type": KnowledgeBase.TYPE_FAQ,
                "source": "static",
                "metadata": {"title": "Sử dụng mã giảm giá"},
            },
            {
                "id": "faq_shop_follow",
                "content": (
                    "Làm thế nào để theo dõi cửa hàng? "
                    "Bạn có thể nhấn nút 'Theo dõi' trên trang cửa hàng để nhận thông tin khuyến mãi. "
                    "Xem danh sách cửa hàng đã theo dõi tại trang cá nhân."
                ),
                "type": KnowledgeBase.TYPE_FAQ,
                "source": "static",
                "metadata": {"title": "Theo dõi cửa hàng"},
            },
            {
                "id": "faq_search",
                "content": (
                    "Làm thế nào để tìm sản phẩm? "
                    "Bạn có thể sử dụng thanh tìm kiếm ở đầu trang, "
                    "hoặc duyệt theo danh mục sản phẩm. "
                    "Kết quả có thể lọc theo giá, đánh giá, và cửa hàng."
                ),
                "type": KnowledgeBase.TYPE_FAQ,
                "source": "static",
                "metadata": {"title": "Tìm kiếm sản phẩm"},
            },
        ]
        return faqs

    @staticmethod
    def build_guide_documents() -> List[Dict]:
        """Tạo documents hướng dẫn sử dụng web"""
        guides = [
            {
                "id": "guide_profile",
                "content": (
                    "Hướng dẫn quản lý tài khoản: Vào trang 'Tài khoản của tôi' để xem và cập nhật "
                    "thông tin cá nhân, đổi mật khẩu, quản lý địa chỉ giao hàng, "
                    "và xem danh sách cửa hàng đã theo dõi."
                ),
                "type": KnowledgeBase.TYPE_GUIDE,
                "source": "static",
                "metadata": {"title": "Quản lý tài khoản"},
            },
            {
                "id": "guide_order",
                "content": (
                    "Hướng dẫn đặt hàng: Thêm sản phẩm vào giỏ hàng, sau đó vào giỏ hàng để thanh toán. "
                    "Nhập địa chỉ giao hàng, chọn phương thức thanh toán, "
                    "và xác nhận đơn hàng. Bạn có thể theo dõi trạng thái đơn hàng sau khi đặt."
                ),
                "type": KnowledgeBase.TYPE_GUIDE,
                "source": "static",
                "metadata": {"title": "Đặt hàng"},
            },
            {
                "id": "guide_flashsale",
                "content": (
                    "Flash Sale là chương trình khuyến mãi giới hạn thời gian. "
                    "Sản phẩm flash sale có giá đặc biệt trong khung giờ nhất định. "
                    "Số lượng có hạn, hãy nhanh tay đặt mua!"
                ),
                "type": KnowledgeBase.TYPE_GUIDE,
                "source": "static",
                "metadata": {"title": "Flash Sale"},
            },
        ]
        return guides
