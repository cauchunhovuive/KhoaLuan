"""
Build Knowledge Base từ database

Chạy script này để đồng bộ dữ liệu từ PostgreSQL vào ChromaDB knowledge base.
Sẽ fetch sản phẩm, danh mục, và các policies/FAQ mặc định.

Cách dùng:
    python -m rag.build_kb          # Dùng DATABASE_URL từ env
    python -m rag.build_kb --force  # Xoá KB cũ và xây lại từ đầu
"""

import os
import sys
import logging
import argparse

# Thêm thư mục ml/ vào path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag.knowledge_base import KnowledgeBase
from sqlalchemy import create_engine, text

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Mặc định dùng DATABASE_URL giống docker-compose
DEFAULT_DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://khoaluan:khoaluan123@localhost:5432/khoaluan",
)


def fetch_products(engine) -> list:
    """Fetch sản phẩm từ database"""
    query = text("""
        SELECT
            p.id, p.name, p.description, p.price, p."discountPrice",
            p.rating, p."soldCount", p."reviewCount",
            c.name AS category_name,
            u."storeName" AS store_name
        FROM "Product" p
        LEFT JOIN "Category" c ON c.id = p."categoryId"
        LEFT JOIN "User" u ON u.id = p."partnerId"
        WHERE p."isActive" = true
        ORDER BY p."soldCount" DESC
        LIMIT 500
    """)
    with engine.connect() as conn:
        rows = conn.execute(query).fetchall()
        products = []
        for row in rows:
            products.append({
                "id": row[0],
                "name": row[1] or "",
                "description": row[2] or "",
                "price": float(row[3] or 0),
                "discount_price": float(row[4]) if row[4] else None,
                "rating": float(row[5] or 0),
                "sold_count": row[6] or 0,
                "review_count": row[7] or 0,
                "category_name": row[8] or "",
                "store_name": row[9] or "",
            })
    logger.info(f"Fetched {len(products)} products")
    return products


def fetch_categories(engine) -> list:
    """Fetch danh mục từ database"""
    query = text(        """
        SELECT id, name, description
        FROM "Category"
        WHERE "isActive" = true
    """)
    with engine.connect() as conn:
        rows = conn.execute(query).fetchall()
        categories = [
            {"id": r[0], "name": r[1], "description": r[2] or ""}
            for r in rows
        ]
    logger.info(f"Fetched {len(categories)} categories")
    return categories


def build_kb(force: bool = False, db_url: str = None):
    """Xây dựng knowledge base"""
    db_url = db_url or DEFAULT_DB_URL
    kb = KnowledgeBase()

    if force:
        logger.info("Force mode: xoá KB cũ...")
        kb.clear()

    # Kết nối database
    logger.info(f"Connecting to database...")
    engine = create_engine(db_url)

    # Fetch dữ liệu
    products = fetch_products(engine)
    categories = fetch_categories(engine)

    # Tạo documents
    product_docs = KnowledgeBase.build_product_documents(products)
    category_docs = KnowledgeBase.build_category_documents(categories)
    policy_docs = KnowledgeBase.build_policy_documents()
    faq_docs = KnowledgeBase.build_faq_documents()
    guide_docs = KnowledgeBase.build_guide_documents()

    # Thêm vào KB
    all_docs = product_docs + category_docs + policy_docs + faq_docs + guide_docs
    kb.add_documents(all_docs)

    # Thống kê
    stats = kb.get_stats()
    logger.info(f"=== Knowledge Base Built ===")
    logger.info(f"Total documents: {stats['total']}")
    for type_name, count in stats.get("by_type", {}).items():
        logger.info(f"  {type_name}: {count}")
    logger.info(f"============================")

    engine.dispose()
    return stats


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build knowledge base from database")
    parser.add_argument("--force", action="store_true", help="Clear and rebuild from scratch")
    parser.add_argument("--db-url", help="Database URL (default: from DATABASE_URL env)")
    args = parser.parse_args()

    build_kb(force=args.force, db_url=args.db_url)
