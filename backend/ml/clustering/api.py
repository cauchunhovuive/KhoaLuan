"""
FastAPI ML Service - AI Recommendation Engine
Clustering (KMeans) + Session-based + Evaluation + RAG
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
import logging
import time
from time import monotonic as _time_monotonic
from datetime import datetime, timezone
import sys
import os

from .clustering_service import ClusteringPipeline, ClusterProfile
# Add ml/ directory to path for sibling module access
_ML_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ML_DIR not in sys.path:
    sys.path.insert(0, _ML_DIR)

from session.session_recommender import (
    SessionRecommender, CoOccurrenceMatrix, SequenceBasedRecommender,
    SessionConfig, build_sessions_from_views,
)
from session.benchmark_hsp_ric import load_yoochoose, load_diginetica, compute_mrr_recall
import session.benchmark_hsp_ric as _bench_mod
from rag.knowledge_base import KnowledgeBase

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="KhoaLuan AI Engine",
    description="Customer Clustering & Product Recommendation API",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Pydantic Models
# ============================================================

class OrderData(BaseModel):
    user_id: str
    total_amount: float
    created_at: str

class OrderItemData(BaseModel):
    user_id: str
    product_id: str
    quantity: int = 1
    created_at: Optional[str] = None

class ProductData(BaseModel):
    id: str
    name: str
    category_id: str
    price: float

class ProductBrief(BaseModel):
    id: str
    name: Optional[str] = ""

class UserProductInteraction(BaseModel):
    user_id: str
    product_id: str
    action: str = "purchase"  # purchase, view, add_to_cart
    quantity: int = 1
    created_at: Optional[str] = None

# --- Clustering Models ---
class ClusterRequest(BaseModel):
    orders: List[OrderData]
    n_clusters: Optional[int] = 4

class RecommendRequest(BaseModel):
    cluster_id: int
    products: List[ProductData]
    orders: List[OrderData]
    top_n: Optional[int] = 10

# --- Session Models ---
class SessionViewLog(BaseModel):
    user_id: str
    product_id: str
    timestamp: str

class SessionRecommendRequest(BaseModel):
    session_items: List[str]
    view_logs: Optional[List[SessionViewLog]] = None
    products: List[ProductBrief]
    top_n: Optional[int] = 10
    strategy: Optional[str] = "hybrid"  # hybrid, cooccurrence, sequence, hsp, ric, ric_cil, popularity
    alpha: Optional[float] = None       # forgetting factor cho RIC (0.1–0.9; None = 0.3 theo tuning 2 dataset)
    exclude_session_items: Optional[bool] = False  # UI production: không gợi ý lại item đã xem

class TrainSessionRequest(BaseModel):
    view_logs: List[SessionViewLog]
    force: bool = False  # False = bỏ qua nếu model đã train (auto-train mỗi request của UI)

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


# --- RAG Models ---
class RAGAskRequest(BaseModel):
    question: str
    user_context: Optional[Dict[str, Any]] = None
    n_results: Optional[int] = 5

class RAGChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    user_context: Optional[Dict[str, Any]] = None

class RAGBuildRequest(BaseModel):
    db_url: Optional[str] = None
    force: Optional[bool] = False
    products: Optional[List[Dict[str, Any]]] = None
    categories: Optional[List[Dict[str, Any]]] = None


# ============================================================
# Singleton instances
# ============================================================

pipeline = None
session_rec = None
# Auto-retrain session model: theo dõi lần train gần nhất + khoảng cách tối thiểu
# giữa các lần retrain (giây) để không fit lại dồn dập mỗi request.
_session_last_train_attempt = 0.0
SESSION_RETRAIN_INTERVAL = 300  # 5 phút — data mới sẽ được học trong vòng 5 phút
rag_service_instance = None
kb_instance = None


def get_knowledge_base():
    """Lazy init Knowledge Base"""
    global kb_instance
    if kb_instance is None:
        from rag.knowledge_base import KnowledgeBase
        kb_instance = KnowledgeBase()
    return kb_instance


def get_rag_service():
    """Lazy init RAG Service"""
    global rag_service_instance, kb_instance
    if rag_service_instance is None:
        from rag.rag_service import RAGService
        kb = get_knowledge_base()
        rag_service_instance = RAGService(knowledge_base=kb)
    return rag_service_instance


def get_pipeline(n_clusters: int = 4) -> ClusteringPipeline:
    global pipeline
    if pipeline is None or pipeline.n_clusters != n_clusters:
        pipeline = ClusteringPipeline(n_clusters=n_clusters)
    return pipeline


def get_session_recommender(view_logs: List[Dict], force: bool = False):
    """Lazy init hoặc huấn luyện lại Session Recommender.

    force=False (auto-train mỗi request của UI):
      - Model chưa có -> fit ngay từ view_logs (đảm bảo model tốt ngay request đầu).
      - Model đã có: tối đa mỗi SESSION_RETRAIN_INTERVAL giây mới dựng lại sessions
        để so sánh (build_sessions tốn thời gian — không lặp mỗi request):
          + Model yếu hơn data (vd: model cũ train từ ít phiên hơn) -> fit lại.
          + Data có phiên mới hơn model (khách đang xem tạo data liên tục) -> fit lại.
          + Ngược lại giữ model hiện tại.
    force=True: luôn fit lại từ view_logs mới (admin bấm "Huấn luyện Session").
    """
    global session_rec, _session_last_train_attempt

    # Throttle: model đã có và mới kiểm tra gần đây -> trả ngay, không rebuild
    due = (
        force
        or session_rec is None
        or (_time_monotonic() - _session_last_train_attempt) >= SESSION_RETRAIN_INTERVAL
    )
    if not due:
        return session_rec

    sessions = build_sessions_from_views(view_logs)
    _session_last_train_attempt = _time_monotonic()  # đánh dấu đã kiểm tra/train

    if len(sessions) < 5:
        if force:
            raise ValueError(
                f"Chỉ dựng được {len(sessions)} phiên (cần >= 5) từ {len(view_logs)} lượt xem. "
                "Hãy thu thập thêm dữ liệu xem sản phẩm trước khi train."
            )
        # Không đủ data train: giữ model cũ nếu có, không crash request recommend
        if session_rec is not None:
            return session_rec
        raise ValueError(
            f"Chỉ dựng được {len(sessions)} phiên (cần >= 5) từ {len(view_logs)} lượt xem. "
            "Hãy thu thập thêm dữ liệu xem sản phẩm trước khi train."
        )

    # Auto-retrain khi KHÔNG force: chỉ khi data rõ ràng tốt hơn model hiện tại
    if session_rec is not None and not force:
        model_sessions = getattr(session_rec, 'sessions_used', 0) or 0
        trained_at = getattr(session_rec, 'trained_at', None)
        try:
            newest_view = None
            for v in view_logs:
                ts = v.get('timestamp')
                if not ts:
                    continue
                try:
                    t = datetime.fromisoformat(str(ts).replace('Z', '+00:00'))
                    if t.tzinfo is None:
                        t = t.replace(tzinfo=timezone.utc)  # tránh so sánh naive/aware
                except ValueError:
                    continue
                if newest_view is None or t > newest_view:
                    newest_view = t

            stale = trained_at is not None and newest_view is not None and newest_view > trained_at
        except Exception:
            stale = True  # an toàn: quyết định không chắc chắn thì retrain

        if model_sessions >= len(sessions) and not stale:
            return session_rec  # model vẫn tốt, dùng ngay
        logger.info(
            f"Auto-retrain session model: model có {model_sessions} phiên, "
            f"data hiện tại có {len(sessions)} phiên"
            + (", data mới hơn model" if stale else "")
        )

    session_rec = SessionRecommender()
    session_rec.fit(sessions)

    logger.info(f"Session recommender trained with {len(sessions)} sessions")
    return session_rec


# ============================================================
# Health & Info Endpoints
# ============================================================

@app.get("/", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        service="KhoaLuan AI Engine",
        version="2.0.0",
    )


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/info")
async def service_info():
    """Thông tin chi tiết về service và các models available"""
    return {
        "service": "KhoaLuan AI Engine",
        "version": "2.0.0",
        "models": {
            "clustering": {
                "description": "RFM Analysis + K-Means customer segmentation",
                "endpoints": ["/cluster/run", "/cluster/recommend", "/cluster/profiles", "/cluster/stats"],
            },
            "session_based": {
                "description": "Co-occurrence + Sequence + HSP + RIC (Delianidi et al. 2023) session recommendations",
                "endpoints": [
                    "/session/train", "/session/recommend",
                ],
                "strategies": ["cooccurrence", "sequence", "hsp", "ric", "ric_cil", "hybrid", "popularity"],
            },
            "rag": {
                "description": "RAG Chat AI — Knowledge Base + Ollama",
                "endpoints": ["/rag/ask", "/rag/chat", "/rag/build", "/rag/status"],
            },
        },
    }


# ============================================================
# RAG (Retrieval-Augmented Generation) Endpoints
# ============================================================

@app.post("/rag/ask")
async def rag_ask(request: RAGAskRequest):
    """
    Hỏi AI Chatbot dựa trên knowledge base.
    
    Sử dụng RAG pipeline:
    1. Tìm kiếm documents liên quan trong knowledge base
    2. Xây dựng prompt với context
    3. Gọi Ollama local để sinh câu trả lời
    """
    try:
        rag = get_rag_service()
        result = rag.ask(
            question=request.question,
            user_context=request.user_context,
            n_results=request.n_results or 5,
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"RAG ask failed: {str(e)}")
        return {
            "success": True,
            "data": {
                "answer": rag_service_instance._fallback_response(request.question) if rag_service_instance else "Xin lỗi, tạm thời tôi chưa thể trả lời.",
                "sources": [],
                "kb_docs_used": 0,
            },
        }


@app.post("/rag/chat")
async def rag_chat(request: RAGChatRequest):
    """
    Chat với AI có lịch sử hội thoại.
    """
    try:
        rag = get_rag_service()
        answer = rag.chat(
            messages=request.messages,
            user_context=request.user_context,
        )
        return {"success": True, "data": {"answer": answer}}
    except Exception as e:
        logger.error(f"RAG chat failed: {str(e)}")
        return {
            "success": True,
            "data": {
                "answer": "Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau.",
            },
        }


@app.post("/rag/build")
async def rag_build(request: RAGBuildRequest):
    """
    Xây dựng/đồng bộ knowledge base.
    
    Có thể gửi dữ liệu products + categories trực tiếp,
    hoặc để service tự fetch từ database (cần db_url).
    """
    try:
        kb = get_knowledge_base()

        if request.force:
            kb.clear()

        # Nếu có dữ liệu gửi lên thì dùng
        if request.products or request.categories:
            docs = []
            if request.products:
                docs += KnowledgeBase.build_product_documents(request.products)
            if request.categories:
                docs += KnowledgeBase.build_category_documents(request.categories)
            # Thêm policies + FAQ + guides
            docs += KnowledgeBase.build_policy_documents()
            docs += KnowledgeBase.build_faq_documents()
            docs += KnowledgeBase.build_guide_documents()
            kb.add_documents(docs)
        else:
            # Tự fetch từ database
            db_url = request.db_url or os.getenv(
                "DATABASE_URL",
                "postgresql://khoaluan:khoaluan123@localhost:5432/khoaluan"
            )
            from rag.build_kb import build_kb as run_build
            run_build(force=request.force, db_url=db_url)
            # Reload KB
            global kb_instance
            kb_instance = None
            kb = get_knowledge_base()

        stats = kb.get_stats()
        return {"success": True, "data": stats}
    except Exception as e:
        logger.error(f"RAG build failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/rag/status")
async def rag_status():
    """Trạng thái knowledge base"""
    try:
        kb = get_knowledge_base()
        stats = kb.get_stats()

        # Kiểm tra Ollama
        ollama_ok = False
        try:
            import requests
            resp = requests.get(
                f"{os.getenv('OLLAMA_HOST', 'http://localhost:11434')}/api/tags",
                timeout=3
            )
            ollama_ok = resp.status_code == 200
        except:
            pass

        return {
            "success": True,
            "data": {
                "knowledge_base": stats,
                "ollama_connected": ollama_ok,
                "ollama_host": os.getenv("OLLAMA_HOST", "http://localhost:11434"),
                "ollama_model": os.getenv("OLLAMA_MODEL", "llama3.2:3b"),
            },
        }
    except Exception as e:
        logger.error(f"RAG status failed: {str(e)}")
        return {
            "success": True,
            "data": {
                "knowledge_base": {"total": 0, "by_type": {}},
                "ollama_connected": False,
                "error": str(e),
            },
        }


# ============================================================
# Clustering Endpoints (existing, kept intact)
# ============================================================

@app.post("/cluster/run")
async def run_clustering(request: ClusterRequest):
    """Chạy phân cụm khách hàng dựa trên dữ liệu đơn hàng (RFM + K-Means)"""
    try:
        logger.info(f"Received clustering request: {len(request.orders)} orders, {request.n_clusters} clusters")
        orders_data = [
            {'user_id': o.user_id, 'total_amount': o.total_amount, 'created_at': o.created_at}
            for o in request.orders
        ]
        pipeline = get_pipeline(request.n_clusters)
        result = pipeline.run(orders_data)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Clustering failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/cluster/recommend")
async def get_cluster_recommendations(request: RecommendRequest):
    """Gợi ý sản phẩm cho một cụm khách hàng"""
    try:
        import pandas as pd
        products_df = pd.DataFrame([p.dict() for p in request.products])
        orders_data = [
            {'user_id': o.user_id, 'total_amount': o.total_amount, 'created_at': o.created_at}
            for o in request.orders
        ]
        pipeline = get_pipeline()
        recommendations = pipeline.get_recommendations(
            cluster_id=request.cluster_id,
            products_df=products_df,
            orders_data=orders_data,
            top_n=request.top_n,
        )
        return {"success": True, "data": recommendations}
    except Exception as e:
        logger.error(f"Recommendation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/cluster/profiles")
async def get_cluster_profiles():
    """Lấy thông tin hồ sơ các cụm khách hàng"""
    profiles = []
    for cluster_id in range(4):
        profile = ClusterProfile.get_cluster_profile(cluster_id)
        profiles.append({'id': cluster_id, **profile})
    return {"success": True, "data": profiles}


@app.get("/cluster/stats")
async def get_cluster_stats_direct():
    """Lấy thông tin các cụm khách hàng mặc định"""
    profiles = []
    for cluster_id in range(4):
        profile = ClusterProfile.get_cluster_profile(cluster_id)
        profiles.append({
            'id': cluster_id,
            'name': profile['name'],
            'description': profile['description'],
            'color': profile['color'],
        })
    return {"success": True, "data": profiles}


# ============================================================
# Session-Based Endpoints (NEW)
# ============================================================

@app.post("/session/train")
async def train_session_model(request: TrainSessionRequest):
    """Huấn luyện Session-based recommender từ view logs"""
    try:
        view_logs = [
            {'user_id': v.user_id, 'product_id': v.product_id, 'timestamp': v.timestamp}
            for v in request.view_logs
        ]
        
        get_session_recommender(view_logs, force=request.force)
        n_sessions = len(build_sessions_from_views(view_logs))
        
        return {
            "success": True,
            "data": {
                "message": "Session recommender trained successfully",
                "n_view_logs": len(view_logs),
                "n_sessions": n_sessions,
            },
        }
    except Exception as e:
        logger.error(f"Session training failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/session/recommend")
async def recommend_session(request: SessionRecommendRequest):
    """Gợi ý sản phẩm dựa trên phiên hiện tại"""
    try:
        # Train/retrain nếu có view_logs: model chưa có, model yếu hơn data
        # (vd model 22 phiên sau restart trong khi data có 1500 phiên) hoặc data
        # mới hơn model (khách đang xem) — get_session_recommender tự quyết định.
        if request.view_logs:
            view_logs = [
                {'user_id': v.user_id, 'product_id': v.product_id, 'timestamp': v.timestamp}
                for v in request.view_logs
            ]
            get_session_recommender(view_logs)
        if session_rec is None:
            # Fallback: nếu không có session data, trả về lỗi
            raise HTTPException(
                status_code=400,
                detail="Session recommender chưa được huấn luyện. Gửi view_logs qua /session/train trước."
            )
        
        # KHÔNG truyền exclude_ids — SessionRecommender tự xử lý loại trừ session_items khỏi kết quả
        # Bug cũ: exclude_ids = [p.id for p in request.products] loại trừ TẤT CẢ sản phẩm
        recs = session_rec.recommend(
            request.session_items,
            request.top_n,
            strategy=request.strategy,
            alpha=request.alpha,
            exclude_session_items=bool(request.exclude_session_items),
        )
        
        return {
            "success": True,
            "data": {
                "strategy": request.strategy,
                "session_items_count": len(request.session_items),
                "recommendations": recs,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Session recommendation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Evaluation Endpoints (NEW)
# ============================================================

# --- Paper benchmark state (multi-dataset: cả 2 dataset của bài báo) ---
# _paper_models[ds] = {model, names, stats} — model SessionRecommender đã fit trên dataset ds
_paper_models: dict = {}
# Datasets của bài báo đã tích hợp trong repo (backend/ml/datasets/)
PAPER_DATASETS = {
    "yoochoose": {
        "label": "Yoochoose (RecSys Challenge 2015)",
        "paper": "Delianidi et al., Applied Sciences 13(1):394, 2023",
        "loader": "yoochoose",
    },
    "diginetica": {
        "label": "Diginetica (CIKM Cup 2016)",
        "paper": "Delianidi et al., Applied Sciences 13(1):394, 2023",
        "loader": "diginetica",
    },
}

def _normalize_dataset(ds: Optional[str]) -> str:
    """Chọn dataset hợp lệ (mặc định yoochoose)."""
    ds = (ds or "yoochoose").strip().lower()
    return ds if ds in PAPER_DATASETS else "yoochoose"

def _load_paper_sessions(ds: str):
    """Load (train_sessions, test_samples) theo dataset của bài báo."""
    from session.benchmark_hsp_ric import load_yoochoose, load_diginetica
    if ds == "diginetica":
        return load_diginetica()
    return load_yoochoose()

def _paper_state(ds: str) -> dict:
    """Lấy/initialize state (model + names + stats) cho 1 dataset."""
    state = _paper_models.get(ds)
    if state is None:
        state = {"model": None, "names": None, "stats": None}
        _paper_models[ds] = state
    return state

def _paper_display_name_for(ds: str, pid: str) -> str:
    state = _paper_models.get(ds)
    names = (state or {}).get("names") or {}
    return names.get(pid, f"Sản phẩm #{pid}")

# Tên minh họa cho item ẩn danh của Yoochoose (gán theo thứ tự phổ biến giảm dần)
# — chỉ để demo dễ đọc, không phải tên thật trong data gốc
PAPER_ITEM_NAMES = [
    "iPhone 15 Pro Max", "Ốp lưng iPhone 15", "Củ sạc nhanh 20W", "AirPods Pro 2",
    "Cáp Lightning", "Samsung Galaxy S24 Ultra", "Ốp lưng Galaxy S24", "Galaxy Buds FE",
    "Củ sạc Samsung 25W", "Cáp Type-C", "Xiaomi Redmi Note 13", "Ốp lưng Xiaomi",
    "Tai nghe Bluetooth TWS", "Pin sạc dự phòng 20.000mAh", "Giá đỡ điện thoại", "Kính cường lực",
    "MacBook Air M2", "Chuột Logitech MX Master", "Bàn phím cơ Keychron", "Túi chống sốc laptop",
    "Cáp HDMI", "Hub USB-C 7 in 1", "Dell XPS 15", "Chuột gaming Logitech G",
    "Bàn phím không dây", "Webcam Logitech C920", "Màn hình LG 24 inch", "iPad Air 5",
    "Bút Apple Pencil", "Ốp lưng iPad", "Nike Air Force 1", "Giày chạy bộ Adidas",
    "Vớ thể thao (3 đôi)", "Balo laptop", "Áo thun cotton", "Quần jean nam",
    "Áo sơ mi trắng", "Apple Watch SE", "Dây đeo đồng hồ", "Kem chống nắng SPF50",
    "Sữa rửa mặt dịu nhẹ", "Serum Vitamin C", "Mặt nạ dưỡng da (hộp 10)", "Nồi chiên không dầu",
    "Bộ nồi inox 5 chiếc", "Máy xay sinh tố", "Bình giữ nhiệt Lock&Lock", "Máy pha cà phê",
    "Robot hút bụi", "Đèn bàn LED", "Bút máy Lamy", "Sổ tay planner",
    "Sách Nhà giả kim", "Sách Atomic Habits", "Balo du lịch 30L", "Bình nước thể thao",
    "Thảm tập yoga", "Dây nhảy skipping", "Đồ chơi Lego", "Gối memory foam",
]


def _build_paper_names(train_sessions):
    """Gán tên minh họa cho top item phổ biến nhất (theo dataset, cache vào state)."""
    from collections import Counter
    counter = Counter()
    for s in train_sessions:
        counter.update(set(s['items']))
    top = [pid for pid, _ in counter.most_common(len(PAPER_ITEM_NAMES))]
    return {pid: PAPER_ITEM_NAMES[i] for i, pid in enumerate(top)}


def paper_display_name(ds: str, pid: str) -> str:
    return _paper_display_name_for(ds, pid)


def _ensure_paper_model(ds: str):
    """Lazy train model theo dataset (dùng chung cho benchmark + paper-recommend)."""
    state = _paper_state(ds)
    if state["model"] is None:
        train_sessions, _ = _load_paper_sessions(ds)
        state["names"] = _build_paper_names(train_sessions)
        t0 = time.perf_counter()
        rec = SessionRecommender(SessionConfig(top_n=30))
        rec.fit(train_sessions)
        state["model"] = rec
        logger.info(f"Paper model [{ds}] trained in {time.perf_counter() - t0:.2f}s (lazy)")
    return state["model"]


def _load_paper_stats(ds: str):
    """Thống kê dataset bài báo (theo ds: yoochoose | diginetica), cache 1 lần."""
    state = _paper_state(ds)
    if state["stats"] is not None:
        return state["stats"]
    try:
        train_sessions, test_samples = _load_paper_sessions(ds)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    state["names"] = _build_paper_names(train_sessions)

    n_items = len({it for s in train_sessions for it in s['items']})
    total_clicks = sum(len(s['items']) for s in train_sessions)
    avg_len = total_clicks / max(len(train_sessions), 1)

    state["stats"] = {
        "dataset": PAPER_DATASETS[ds]["label"],
        "dataset_key": ds,
        "paper": PAPER_DATASETS[ds]["paper"],
        "n_train_sessions": len(train_sessions),
        "n_test_samples": len(test_samples),
        "n_products": n_items,
        "total_clicks": total_clicks,
        "avg_session_length": round(avg_len, 2),
        "sample_sessions": [
            {"session_id": s['session_id'],
             "items": [{"id": it, "name": state["names"].get(it, f"Sản phẩm #{it}") if state["names"] else f"#{it}"}
                       for it in s['items'][:6]]}
            for s in train_sessions if len(s['items']) >= 4
        ][:5],
    }
    return state["stats"]


@app.get("/session/paper-data")
async def get_paper_data(dataset: Optional[str] = None):
    """
    Thống kê dataset bài báo (yoochoose | diginetica) dùng cho benchmark,
    kèm danh sách datasets đã tích hợp trong repo.
    """
    ds = _normalize_dataset(dataset)
    stats = _load_paper_stats(ds)
    stats = dict(stats)
    stats["available_datasets"] = [
        {"key": k, "label": v["label"],
         "cached": _paper_models.get(k, {}).get("model") is not None}
        for k, v in PAPER_DATASETS.items()
    ]
    return {"success": True, "data": stats}


class PaperBenchmarkRequest(BaseModel):
    max_test: Optional[int] = 500
    dataset: Optional[str] = "yoochoose"


class PaperRecommendRequest(BaseModel):
    session_items: List[str]
    top_n: Optional[int] = 10
    strategy: Optional[str] = "hybrid"
    alpha: Optional[float] = None
    dataset: Optional[str] = "yoochoose"


@app.post("/session/paper-recommend")
async def paper_recommend(request: PaperRecommendRequest):
    """
    Gợi ý bằng model train sẵn trên dataset bài báo (yoochoose | diginetica).
    Model ẩn danh (chỉ có mã số item) — dùng để minh họa chất lượng model
    học từ hàng trăm nghìn phiên thật, độc lập với dữ liệu shop.
    """
    ds = _normalize_dataset(request.dataset)
    try:
        rec = _ensure_paper_model(ds)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))

    recs = rec.recommend(
        request.session_items,
        request.top_n,
        strategy=request.strategy,
        alpha=request.alpha,
    )
    # Gắn tên minh họa cho item ẩn danh (data gốc chỉ có mã số)
    for r in recs:
        r['name'] = paper_display_name(ds, r['product_id'])
    return {
        "success": True,
        "data": {
            "source": ds,
            "dataset": PAPER_DATASETS[ds]["label"],
            "strategy": request.strategy,
            "recommendations": recs,
        },
    }


class PaperInsightsRequest(BaseModel):
    session_items: Optional[List[str]] = None
    top_k: Optional[int] = 4
    dataset: Optional[str] = "yoochoose"


@app.post("/session/paper-insights")
async def paper_insights(request: PaperInsightsRequest):
    """
    Model bài báo ĐÃ HỌC được gì — nội dung bên trong model theo dataset
    (yoochoose | diginetica), để demo trực tiếp trên web admin
    (panel "Model đã học" của trang Gợi ý trong web admin):

    - Toàn cục: số item, cặp P1, bộ ba P2, cặp co-occurrence đã đếm từ toàn bộ phiên
    - Top P0 (độ phổ biến) kèm phân số đếm thô count/total
    - Tra theo phiên hiện tại: P1 (sau món vừa xem), P2 (sau cặp 2 món cuối),
      γ(o|x) = cooc(x,o)/sessions(x) — đúng công thức bài báo

    Item không có trong model → in_model=false → thấy rõ hành vi cold-start
    (gợi ý rơi về P0, đúng thiết kế của HSP/RIC).
    """
    ds = _normalize_dataset(request.dataset)
    try:
        rec = _ensure_paper_model(ds)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))

    hsp, ric = rec.hsp, rec.ric
    names = (_paper_state(ds)["names"]) or {}
    top_k = max(1, min(request.top_k or 4, 10))

    def nm(pid):
        return names.get(pid, f"Sản phẩm #{pid}")

    def frac_row(counts, row, top):
        out = []
        for pid, prob in sorted(row.items(), key=lambda kv: kv[1], reverse=True)[:top]:
            out.append({
                "id": pid, "name": nm(pid),
                "count": counts.get(pid, 0),
                "prob": round(prob, 6),
            })
        return out

    # --- Tra theo từng item trong phiên hiện tại ---
    items_out = []
    session_items = [str(x) for x in (request.session_items or [])]
    for i, x in enumerate(session_items):
        in_model = x in hsp.p0
        entry = {
            "id": x, "name": nm(x), "in_model": in_model,
            "p0": round(hsp.p0.get(x, 0.0), 6) if in_model else None,
            "appearances": hsp.item_counts.get(x, 0),
            "sessions": ric.item_session_counts.get(x, 0),
        }
        if in_model:
            # P1(B | x) = count(x→B) / count(x)
            entry["p1_denom"] = hsp.item_counts.get(x, 0) or 1
            entry["p1"] = frac_row(hsp.pair_counts.get(x, {}), hsp.p1.get(x, {}), top_k)
            # P2(C | prev, x) = count(prev,x→C) / count(prev,x)
            if i >= 1:
                prev = session_items[i - 1]
                denom_ab = hsp.pair_counts.get(prev, {}).get(x, 0)
                if denom_ab:
                    entry["p2_denom"] = denom_ab
                    entry["p2"] = frac_row(
                        hsp.triplet_counts.get((prev, x), {}),
                        hsp.p2.get((prev, x), {}), top_k,
                    )
            # γ(o | x) = cooc(x, o) / sessions(x)
            sess = ric.item_session_counts.get(x, 0)
            if sess:
                grow = ric.cooc_counts.get(x, {})
                entry["gamma"] = [
                    {"id": o, "name": nm(o), "count": cnt, "sess": sess,
                     "gamma": round(cnt / sess, 6)}
                    for o, cnt in sorted(grow.items(), key=lambda kv: kv[1], reverse=True)[:top_k]
                ]
        items_out.append(entry)

    # --- Thống kê toàn cục của model ---
    ranked_p0 = sorted(hsp.p0.items(), key=lambda kv: kv[1], reverse=True)
    data = {
        "dataset": PAPER_DATASETS[ds]["label"],
        "dataset_key": ds,
        "n_items": len(hsp.p0),
        "n_pairs": sum(len(v) for v in hsp.p1.values()),
        "n_triplets": sum(len(v) for v in hsp.p2.values()),
        "n_cooc_pairs": sum(len(v) for v in ric.cooc_counts.values()) // 2,
        "total_appearances": hsp.total_appearances,
        "n_session_items": sum(ric.item_session_counts.values()),
        "top_p0": [
            {"id": pid, "name": nm(pid),
             "count": hsp.item_counts.get(pid, 0), "prob": round(p, 6)}
            for pid, p in ranked_p0[:top_k]
        ],
        "sample_items": [
            {"id": pid, "name": nm(pid)} for pid, _ in ranked_p0[:12]
        ],
        "items": items_out,
    }
    return {"success": True, "data": data}


@app.post("/session/benchmark/reset")
async def reset_paper_benchmark(dataset: Optional[str] = None):
    """
    Xóa model + stats đang cache (1 dataset hoặc tất cả khi dataset='all') —
    lần benchmark sau sẽ train lại từ đầu.
    """
    ds = (dataset or "all").strip().lower()
    targets = list(_paper_models.keys()) if ds in ("all", "") else [_normalize_dataset(ds)]
    had_model = any(_paper_models.get(t, {}).get("model") is not None for t in targets)
    for t in targets:
        _paper_models.pop(t, None)
    logger.info(f"Paper benchmark reset [{ds}] (had_cached_model={had_model})")
    return {
        "success": True,
        "data": {
            "message": f"Đã reset {'tất cả datasets' if ds in ('all', '') else ds} — lần benchmark sau sẽ train lại từ đầu",
            "had_cached_model": had_model,
            "reset_datasets": targets,
        },
    }


@app.post("/session/benchmark")
async def run_paper_benchmark(request: PaperBenchmarkRequest):
    """
    Chạy benchmark HSP & RIC trực tiếp trên dataset bài báo (yoochoose | diginetica).
    Lần đầu train (~11s Yoochoose / vài giây Diginetica), các lần sau dùng lại model.
    Trả về bảng MRR@K / Recall@K theo đúng protocol bài báo.
    """
    ds = _normalize_dataset(request.dataset)
    max_test = max(10, min(request.max_test or 500, 5000))

    train_sessions, test_samples = _load_paper_sessions(ds)

    state = _paper_state(ds)
    if state["model"] is None:
        t0 = time.perf_counter()
        rec = SessionRecommender(SessionConfig(top_n=30))
        rec.fit(train_sessions)
        state["names"] = _build_paper_names(train_sessions)
        state["model"] = rec
        train_time = time.perf_counter() - t0
    else:
        rec = state["model"]
        train_time = 0.0  # đã train từ lần trước

    methods = ['cooccurrence', 'sequence', 'hsp', 'ric', 'ric_cil']
    rows = []
    ks = [10, 20, 30]
    for method in methods:
        t1 = time.perf_counter()
        metrics = _bench_mod.evaluate_model(rec, method, test_samples, max_test, ks)
        elapsed = time.perf_counter() - t1
        rows.append({
            "method": method,
            "mrr@10": metrics['mrr@10'], "mrr@20": metrics['mrr@20'], "mrr@30": metrics['mrr@30'],
            "recall@10": metrics['recall@10'], "recall@20": metrics['recall@20'], "recall@30": metrics['recall@30'],
            "n_evaluated": metrics['n_evaluated'],
            "eval_seconds": round(elapsed, 1),
        })

    # Tuning alpha cho RIC (như cuối benchmark CLI)
    alpha_rows = []
    for alpha in [0.1, 0.3, 0.5, 0.7, 0.9]:
        metrics = _bench_mod.evaluate_model(
            rec, 'ric_cil', test_samples, min(max_test, 2000), [10, 20], alpha=alpha)
        alpha_rows.append({
            "alpha": alpha,
            "mrr@10": metrics['mrr@10'], "recall@10": metrics['recall@10'],
            "mrr@20": metrics['mrr@20'], "recall@20": metrics['recall@20'],
        })

    return {
        "success": True,
        "data": {
            "dataset": PAPER_DATASETS[ds]["label"],
            "dataset_key": ds,
            "n_train_sessions": len(train_sessions),
            "n_test_samples": len(test_samples),
            "max_test": max_test,
            "train_seconds": round(train_time, 2),
            "cached_model": train_time == 0.0,
            "rows": rows,
            "alpha_tuning": alpha_rows,
        },
    }


# ============================================================
# Main entry point
# ============================================================

if __name__ == "__main__":
    uvicorn.run(
        "clustering.api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
