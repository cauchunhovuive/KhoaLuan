"""
FastAPI ML Service - AI Recommendation Engine
Clustering + Collaborative Filtering + Session-based + Evaluation
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
import logging
import time
import numpy as np
import sys
import os

from .clustering_service import ClusteringPipeline, ClusterProfile
# Add ml/ directory to path for sibling module access
_ML_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ML_DIR not in sys.path:
    sys.path.insert(0, _ML_DIR)

from collaborative.collaborative_filtering import (
    ItemItemCF, UserUserCF, ALSMatrixFactorization, HybridRecommender,
    CFConfig, build_user_product_matrix,
)
from collaborative.graph_cf import GraphCFRecommender

# LightGCN-CF cần PyTorch — nếu chưa cài torch, ML Service vẫn chạy bình thường
# và endpoint /lightgcncf/* sẽ trả lỗi rõ ràng (không sập toàn bộ service).
try:
    from collaborative.lightgcn_cf import LightGCNCFDataset, LightGCNCFRecommender
    LIGHTGCN_AVAILABLE = True
except ImportError:
    LightGCNCFDataset = None
    LightGCNCFRecommender = None
    LIGHTGCN_AVAILABLE = False
    logging.getLogger(__name__).warning(
        "PyTorch (torch) chưa được cài — LightGCN-CF sẽ không khả dụng. "
        "Cài bằng: pip install torch"
    )

from session.session_recommender import (
    SessionRecommender, CoOccurrenceMatrix, SequenceBasedRecommender,
    SessionConfig, build_sessions_from_views,
)
from session.benchmark_hsp_ric import load_yoochoose, load_diginetica, compute_mrr_recall
import session.benchmark_hsp_ric as _bench_mod
from rag.knowledge_base import KnowledgeBase
from evaluation.metrics import (
    RecommendationMetrics, ABTestFramework, EvaluationResult,
    train_test_split_by_time, build_relevant_set,
)

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

# --- CF Models ---
class CFRequest(BaseModel):
    orders: List[OrderItemData]
    products: List[ProductBrief]
    config: Optional[Dict[str, Any]] = None

class CFRecommendRequest(BaseModel):
    user_id: str
    orders: List[OrderItemData]
    products: List[ProductBrief]
    top_n: Optional[int] = 10
    strategy: Optional[str] = "hybrid"  # hybrid, item_cf, user_cf, als

class SimilarProductsRequest(BaseModel):
    product_id: str
    orders: List[OrderItemData]
    products: List[ProductBrief]
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
    alpha: Optional[float] = None       # forgetting factor cho RIC (0.1–0.9, mặc định 0.5)

class TrainSessionRequest(BaseModel):
    view_logs: List[SessionViewLog]

# --- Evaluation Models ---
class EvaluateRequest(BaseModel):
    orders: List[OrderItemData]
    products: List[ProductBrief]
    train_ratio: Optional[float] = 0.8
    top_n: Optional[int] = 10

class ABClickLog(BaseModel):
    group: str  # control, treatment
    user_id: str
    product_id: str
    action: str  # impression, click, add_to_cart, purchase
    timestamp: Optional[str] = None
    revenue: float = 0.0

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
item_cf = None
user_cf = None
als_model = None
hybrid = None
session_rec = None
graph_cf = None
lightgcn_cf = None
ab_test = None
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


def get_cf_models(
    orders_data: List[Dict],
    products_data: List[Dict],
    config: Optional[Dict] = None,
):
    """Lazy init hoặc huấn luyện lại CF models"""
    global item_cf, user_cf, als_model, hybrid
    
    cf_config = CFConfig()
    if config:
        if 'n_neighbors' in config:
            cf_config.n_neighbors = config['n_neighbors']
        if 'n_factors' in config:
            cf_config.n_factors = config['n_factors']
        if 'n_iterations' in config:
            cf_config.n_iterations = config['n_iterations']
    
    matrix, user_ids, product_ids = build_user_product_matrix(orders_data, products_data)
    
    item_cf = ItemItemCF(cf_config)
    item_cf.fit(matrix, product_ids)
    
    user_cf = UserUserCF(cf_config)
    user_cf.fit(matrix, user_ids, product_ids)
    
    als_model = ALSMatrixFactorization(cf_config)
    als_model.fit(matrix, user_ids, product_ids)
    
    hybrid = HybridRecommender(item_cf, user_cf, als_model, config=cf_config)
    
    logger.info("CF models trained successfully")
    return hybrid


def get_session_recommender(view_logs: List[Dict]):
    """Lazy init hoặc huấn luyện lại Session Recommender"""
    global session_rec
    
    sessions = build_sessions_from_views(view_logs)
    session_rec = SessionRecommender()
    session_rec.fit(sessions)
    
    logger.info(f"Session recommender trained with {len(sessions)} sessions")
    return session_rec


def get_graph_cf_models(
    orders_data: List[Dict],
    products_data: List[Dict],
    config: Optional[Dict] = None,
):
    """Lazy init hoặc huấn luyện lại Graph CF (LightGCN-like, không cần PyTorch)."""
    global graph_cf

    n_layers = (config or {}).get('n_layers', 3)
    latent_dim = (config or {}).get('latent_dim', 64)

    matrix, user_ids, product_ids = build_user_product_matrix(orders_data, products_data)

    graph_cf = GraphCFRecommender(n_layers=n_layers, latent_dim=latent_dim)
    graph_cf.fit(
        user_item_matrix=matrix,
        user_ids=user_ids,
        product_ids=product_ids,
    )

    logger.info(
        f"Graph CF trained: {len(user_ids)} users x {len(product_ids)} products, "
        f"{n_layers} layers"
    )
    return graph_cf


def get_lightgcn_cf_models(
    orders_data: List[Dict],
    products_data: List[Dict],
    config: Optional[Dict] = None,
):
    """Lazy init hoặc huấn luyện lại LightGCN-CF (PyTorch, BPR loss)."""
    global lightgcn_cf

    if not LIGHTGCN_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="LightGCN-CF cần PyTorch. Cài bằng: pip install torch (môi trường ML service)",
        )

    cfg = config or {}
    matrix, user_ids, product_ids = build_user_product_matrix(orders_data, products_data)

    dataset = LightGCNCFDataset.from_matrix(matrix, user_ids, product_ids)

    lightgcn_cf = LightGCNCFRecommender(
        latent_dim=cfg.get('latent_dim', 32),
        n_layers=cfg.get('n_layers', 2),
        epochs=cfg.get('epochs', 10),
        batch_size=cfg.get('batch_size', 2048),
        lr=cfg.get('lr', 0.005),
        reg=cfg.get('reg', 1e-4),
        fusion_init=cfg.get('fusion_init', 0.5),
        sim_k=cfg.get('sim_k', 20),
    )
    lightgcn_cf.fit(dataset)

    logger.info(
        f"LightGCN-CF trained: {len(user_ids)} users x {len(product_ids)} products"
    )
    return lightgcn_cf


def get_ab_test():
    global ab_test
    if ab_test is None:
        ab_test = ABTestFramework()
    return ab_test


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
            "collaborative_filtering": {
                "description": "Item-Item CF, User-User CF, ALS Matrix Factorization",
                "endpoints": [
                    "/cf/train", "/cf/recommend", "/cf/similar",
                    "/cf/recommend/hybrid", "/cf/explain",
                ],
            },
            "graph_cf": {
                "description": "Graph CF nhẹ (LightGCN-like, numpy/scipy, không cần PyTorch) — Li & Zhang 2025",
                "endpoints": [
                    "/graphcf/train", "/graphcf/recommend",
                ],
            },
            "lightgcn_cf": {
                "description": "LightGCN-CF hybrid (PyTorch, GCN + CF + learnable fusion weight, BPR) — Li & Zhang 2025",
                "endpoints": [
                    "/lightgcncf/train", "/lightgcncf/recommend",
                ],
                "available": LIGHTGCN_AVAILABLE,
            },
            "session_based": {
                "description": "Co-occurrence + Sequence + HSP + RIC (Delianidi et al. 2023) session recommendations",
                "endpoints": [
                    "/session/train", "/session/recommend",
                ],
                "strategies": ["cooccurrence", "sequence", "hsp", "ric", "ric_cil", "hybrid", "popularity"],
            },
            "evaluation": {
                "description": "Metrics computation and A/B testing framework",
                "endpoints": [
                    "/evaluate/offline", "/abtest/log", "/abtest/report",
                    "/abtest/compare", "/abtest/reset",
                ],
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
# Collaborative Filtering Endpoints (NEW)
# ============================================================

@app.post("/cf/train")
async def train_collaborative_filtering(request: CFRequest):
    """Huấn luyện các Collaborative Filtering models"""
    try:
        orders_data = [
            {'user_id': o.user_id, 'product_id': o.product_id, 'quantity': o.quantity}
            for o in request.orders
        ]
        products_data = [p.dict() for p in request.products]
        config = request.config or {}
        
        model_count = get_cf_models(orders_data, products_data, config)
        
        return {
            "success": True,
            "data": {
                "message": "CF models trained successfully",
                "models": ["Item-Item CF", "User-User CF", "ALS Matrix Factorization", "Hybrid"],
                "n_orders": len(orders_data),
                "n_products": len(products_data),
            },
        }
    except Exception as e:
        logger.error(f"CF training failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/cf/recommend")
async def recommend_collaborative_filtering(request: CFRecommendRequest):
    """Gợi ý sản phẩm bằng Collaborative Filtering cho một user cụ thể"""
    try:
        orders_data = [
            {'user_id': o.user_id, 'product_id': o.product_id, 'quantity': o.quantity}
            for o in request.orders
        ]
        products_data = [p.dict() for p in request.products]
        
        # Train CF models nếu chưa có
        hybrid = get_cf_models(orders_data, products_data)
        
        # Xác định sản phẩm đã mua để exclude
        user_products = set(
            o['product_id'] for o in orders_data if o['user_id'] == request.user_id
        )
        
        # Xây dựng user vector
        matrix, user_ids, product_ids = build_user_product_matrix(orders_data, products_data)
        if request.user_id in user_ids:
            user_idx = user_ids.index(request.user_id)
            user_vector = matrix[user_idx].toarray().flatten()
        else:
            # Fallback: user không có trong dữ liệu
            user_vector = None
        
        strategy = request.strategy
        if strategy == 'item_cf' and user_vector is not None:
            recs = item_cf.recommend(user_vector, request.top_n, list(user_products))
        elif strategy == 'user_cf':
            recs = user_cf.recommend(request.user_id, request.top_n, list(user_products))
        elif strategy == 'als':
            recs = als_model.recommend(request.user_id, request.top_n, list(user_products))
        else:
            # Hybrid default
            if user_vector is not None:
                recs = hybrid.recommend(request.user_id, user_vector, request.top_n, list(user_products))
            else:
                recs = als_model.recommend(request.user_id, request.top_n, list(user_products))
        
        return {
            "success": True,
            "data": {
                "user_id": request.user_id,
                "strategy": strategy,
                "recommendations": recs,
            },
        }
    except Exception as e:
        logger.error(f"CF recommendation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/cf/similar")
async def get_similar_products_cf(request: SimilarProductsRequest):
    """Lấy sản phẩm tương tự bằng Item-Item CF"""
    try:
        orders_data = [
            {'user_id': o.user_id, 'product_id': o.product_id, 'quantity': o.quantity}
            for o in request.orders
        ]
        products_data = [p.dict() for p in request.products]
        
        get_cf_models(orders_data, products_data)
        
        if item_cf is None or not item_cf.is_fitted:
            raise HTTPException(status_code=400, detail="Item-Item CF not trained")
        
        similar = item_cf.get_similar_products(request.product_id, request.top_n)
        
        return {
            "success": True,
            "data": {
                "product_id": request.product_id,
                "similar_products": similar,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Similar products failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/cf/recommend/hybrid")
async def recommend_hybrid(request: CFRecommendRequest):
    """Gợi ý bằng Hybrid (kết hợp tất cả CF methods)"""
    try:
        orders_data = [
            {'user_id': o.user_id, 'product_id': o.product_id, 'quantity': o.quantity}
            for o in request.orders
        ]
        products_data = [p.dict() for p in request.products]
        
        hybrid = get_cf_models(orders_data, products_data)
        
        matrix, user_ids, product_ids = build_user_product_matrix(orders_data, products_data)
        user_products = set(
            o['product_id'] for o in orders_data if o['user_id'] == request.user_id
        )
        
        if request.user_id in user_ids:
            user_idx = user_ids.index(request.user_id)
            user_vector = matrix[user_idx].toarray().flatten()
        else:
            user_vector = np.zeros(len(product_ids))
        
        recs = hybrid.recommend(request.user_id, user_vector, request.top_n, list(user_products))
        
        return {
            "success": True,
            "data": {
                "user_id": request.user_id,
                "strategy": "hybrid",
                "recommendations": recs,
            },
        }
    except Exception as e:
        logger.error(f"Hybrid recommendation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/cf/explain")
async def explain_recommendations(request: CFRecommendRequest):
    """Giải thích chi tiết tại sao sản phẩm được recommend (cho admin)"""
    try:
        orders_data = [
            {'user_id': o.user_id, 'product_id': o.product_id, 'quantity': o.quantity}
            for o in request.orders
        ]
        products_data = [p.dict() for p in request.products]
        
        hybrid = get_cf_models(orders_data, products_data)
        
        matrix, user_ids, product_ids = build_user_product_matrix(orders_data, products_data)
        user_products = set(
            o['product_id'] for o in orders_data if o['user_id'] == request.user_id
        )
        
        if request.user_id in user_ids:
            user_idx = user_ids.index(request.user_id)
            user_vector = matrix[user_idx].toarray().flatten()
        else:
            user_vector = np.zeros(len(product_ids))
        
        explanation = hybrid.get_recommendation_explanation(
            request.user_id, user_vector, request.top_n, list(user_products)
        )
        
        return {
            "success": True,
            "data": explanation,
        }
    except Exception as e:
        logger.error(f"Explain recommendations failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Graph CF Endpoints (LightGCN-like, no PyTorch) — Li & Zhang 2025
# ============================================================

class GraphCFRequest(BaseModel):
    orders: List[OrderItemData]
    products: List[ProductBrief]
    config: Optional[Dict[str, Any]] = None

class GraphCFRecommendRequest(BaseModel):
    user_id: str
    orders: List[OrderItemData]
    products: List[ProductBrief]
    top_n: Optional[int] = 10
    config: Optional[Dict[str, Any]] = None


@app.post("/graphcf/train")
async def train_graph_cf(request: GraphCFRequest):
    """Huấn luyện Graph CF nhẹ (LightGCN-like propagation, numpy/scipy)"""
    try:
        orders_data = [
            {'user_id': o.user_id, 'product_id': o.product_id, 'quantity': o.quantity}
            for o in request.orders
        ]
        products_data = [p.dict() for p in request.products]

        get_graph_cf_models(orders_data, products_data, request.config)

        return {
            "success": True,
            "data": {
                "message": "Graph CF trained successfully (LightGCN-like, numpy/scipy)",
                "n_orders": len(orders_data),
                "n_products": len(products_data),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Graph CF training failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/graphcf/recommend")
async def recommend_graph_cf(request: GraphCFRecommendRequest):
    """Gợi ý bằng Graph CF nhẹ (lan truyền tín hiệu cộng tác trên đồ thị)"""
    try:
        orders_data = [
            {'user_id': o.user_id, 'product_id': o.product_id, 'quantity': o.quantity}
            for o in request.orders
        ]
        products_data = [p.dict() for p in request.products]

        get_graph_cf_models(orders_data, products_data, request.config)

        # Xác định sản phẩm đã mua để exclude
        user_products = set(
            o['product_id'] for o in orders_data if o['user_id'] == request.user_id
        )

        recs = graph_cf.recommend(
            request.user_id, request.top_n, list(user_products)
        )

        return {
            "success": True,
            "data": {
                "user_id": request.user_id,
                "strategy": "graph_cf",
                "recommendations": recs,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Graph CF recommendation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# LightGCN-CF Endpoints (PyTorch, hybrid GCN + CF) — Li & Zhang 2025
# ============================================================

class LightGCNCFRequest(BaseModel):
    orders: List[OrderItemData]
    products: List[ProductBrief]
    config: Optional[Dict[str, Any]] = None

class LightGCNCFRecommendRequest(BaseModel):
    user_id: str
    orders: List[OrderItemData]
    products: List[ProductBrief]
    top_n: Optional[int] = 10
    config: Optional[Dict[str, Any]] = None


@app.post("/lightgcncf/train")
async def train_lightgcn_cf(request: LightGCNCFRequest):
    """
    Huấn luyện LightGCN-CF hybrid (PyTorch).

    Kết hợp LightGCN backbone + CF module (pseudo-interactions cold-start)
    + learnable fusion weight, tối ưu bằng BPR loss.
    config: {latent_dim, n_layers, epochs, batch_size, lr, reg, fusion_init, sim_k}
    """
    try:
        orders_data = [
            {'user_id': o.user_id, 'product_id': o.product_id, 'quantity': o.quantity}
            for o in request.orders
        ]
        products_data = [p.dict() for p in request.products]

        get_lightgcn_cf_models(orders_data, products_data, request.config)

        return {
            "success": True,
            "data": {
                "message": "LightGCN-CF trained successfully (PyTorch, BPR loss)",
                "n_orders": len(orders_data),
                "n_products": len(products_data),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"LightGCN-CF training failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/lightgcncf/recommend")
async def recommend_lightgcn_cf(request: LightGCNCFRecommendRequest):
    """
    Gợi ý bằng LightGCN-CF hybrid.

    Điểm cuối = w * gcn_score + (1 - w) * cf_score với w là trọng số fusion
    học được trong quá trình huấn luyện BPR.
    """
    try:
        orders_data = [
            {'user_id': o.user_id, 'product_id': o.product_id, 'quantity': o.quantity}
            for o in request.orders
        ]
        products_data = [p.dict() for p in request.products]

        get_lightgcn_cf_models(orders_data, products_data, request.config)

        user_products = set(
            o['product_id'] for o in orders_data if o['user_id'] == request.user_id
        )

        recs = lightgcn_cf.recommend(
            request.user_id, request.top_n, list(user_products)
        )

        return {
            "success": True,
            "data": {
                "user_id": request.user_id,
                "strategy": "lightgcn_cf",
                "recommendations": recs,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"LightGCN-CF recommendation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


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
        
        get_session_recommender(view_logs)
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
        # Train nếu có view_logs và chưa có model
        if request.view_logs and (session_rec is None):
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

# --- Paper benchmark state (giữ model Yoochoose giữa các lần gọi) ---
_paper_model = None        # SessionRecommender đã fit trên Yoochoose
_paper_stats_cache = None  # stats dataset (tính 1 lần)
_paper_names = None        # map item_id -> tên minh họa (data gốc ẩn danh)

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
    """Gán tên minh họa cho top item phổ biến nhất (gọi 1 lần, cache)."""
    global _paper_names
    if _paper_names is not None:
        return _paper_names
    from collections import Counter
    counter = Counter()
    for s in train_sessions:
        counter.update(set(s['items']))
    top = [pid for pid, _ in counter.most_common(len(PAPER_ITEM_NAMES))]
    _paper_names = {pid: PAPER_ITEM_NAMES[i] for i, pid in enumerate(top)}
    return _paper_names


def paper_display_name(pid: str) -> str:
    if _paper_names and pid in _paper_names:
        return _paper_names[pid]
    return f"Sản phẩm #{pid}"


def _ensure_paper_model():
    """Lazy train model Yoochoose (dùng chung cho benchmark + paper-recommend)."""
    global _paper_model
    if _paper_model is None:
        train_sessions, _ = load_yoochoose()
        _build_paper_names(train_sessions)
        t0 = time.perf_counter()
        rec = SessionRecommender(SessionConfig(top_n=30))
        rec.fit(train_sessions)
        _paper_model = rec
        logger.info(f"Paper model trained in {time.perf_counter() - t0:.2f}s (lazy)")
    return _paper_model


def _load_paper_stats():
    """Thống kê dataset Yoochoose (dataset bài báo Delianidi 2023)."""
    global _paper_stats_cache
    if _paper_stats_cache is not None:
        return _paper_stats_cache
    try:
        train_sessions, test_samples = load_yoochoose()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    _build_paper_names(train_sessions)

    n_items = len({it for s in train_sessions for it in s['items']})
    total_clicks = sum(len(s['items']) for s in train_sessions)
    avg_len = total_clicks / max(len(train_sessions), 1)

    _paper_stats_cache = {
        "dataset": "Yoochoose (RecSys Challenge 2015)",
        "paper": "Delianidi et al., Applied Sciences 13(1):394, 2023",
        "n_train_sessions": len(train_sessions),
        "n_test_samples": len(test_samples),
        "n_products": n_items,
        "total_clicks": total_clicks,
        "avg_session_length": round(avg_len, 2),
        "sample_sessions": [
            {"session_id": s['session_id'],
             "items": [{"id": it, "name": _paper_names.get(it, f"Sản phẩm #{it}") if _paper_names else f"#{it}"}
                       for it in s['items'][:6]]}
            for s in train_sessions if len(s['items']) >= 4
        ][:5],
    }
    return _paper_stats_cache


@app.get("/session/paper-data")
async def get_paper_data():
    """Thống kê dataset Yoochoose dùng cho benchmark bài báo (hiển thị trên web admin)."""
    stats = _load_paper_stats()
    return {"success": True, "data": stats}


class PaperBenchmarkRequest(BaseModel):
    max_test: Optional[int] = 500


class PaperRecommendRequest(BaseModel):
    session_items: List[str]
    top_n: Optional[int] = 10
    strategy: Optional[str] = "hybrid"
    alpha: Optional[float] = None


@app.post("/session/paper-recommend")
async def paper_recommend(request: PaperRecommendRequest):
    """
    Gợi ý bằng model train sẵn trên dataset Yoochoose (bài báo Delianidi 2023).
    Model ẩn danh (chỉ có mã số item) — dùng để minh họa chất lượng model
    học từ 375k phiên thật, độc lập với dữ liệu shop.
    """
    global _paper_model
    if _paper_model is None:
        train_sessions, _ = load_yoochoose()
        _build_paper_names(train_sessions)
        t0 = time.perf_counter()
        rec = SessionRecommender(SessionConfig(top_n=30))
        rec.fit(train_sessions)
        _paper_model = rec
        logger.info(f"Paper model trained in {time.perf_counter() - t0:.2f}s (lazy)")

    recs = _paper_model.recommend(
        request.session_items,
        request.top_n,
        strategy=request.strategy,
        alpha=request.alpha,
    )
    # Gắn tên minh họa cho item ẩn danh (data gốc chỉ có mã số)
    for r in recs:
        r['name'] = paper_display_name(r['product_id'])
    return {
        "success": True,
        "data": {
            "source": "yoochoose",
            "strategy": request.strategy,
            "recommendations": recs,
        },
    }


@app.post("/session/benchmark/reset")
async def reset_paper_benchmark():
    """Xóa model + stats Yoochoose đang cache — lần benchmark sau sẽ train lại từ đầu."""
    global _paper_model, _paper_stats_cache, _paper_names
    had_model = _paper_model is not None
    _paper_model = None
    _paper_stats_cache = None
    _paper_names = None
    logger.info(f"Paper benchmark reset (had_cached_model={had_model})")
    return {
        "success": True,
        "data": {
            "message": "Đã reset — lần benchmark sau sẽ train lại từ đầu trên 375k phiên",
            "had_cached_model": had_model,
        },
    }


@app.post("/session/benchmark")
async def run_paper_benchmark(request: PaperBenchmarkRequest):
    """
    Chạy benchmark HSP & RIC trực tiếp trên Yoochoose (dataset bài báo).
    Lần đầu train trên 375k phiên (~11s), các lần sau dùng lại model.
    Trả về bảng MRR@K / Recall@K theo đúng protocol bài báo.
    """
    global _paper_model
    max_test = max(10, min(request.max_test or 500, 5000))

    train_sessions, test_samples = load_yoochoose()

    if _paper_model is None:
        t0 = time.perf_counter()
        rec = SessionRecommender(SessionConfig(top_n=30))
        rec.fit(train_sessions)
        _paper_model = rec
        train_time = time.perf_counter() - t0
    else:
        train_time = 0.0  # đã train từ lần trước

    methods = ['cooccurrence', 'sequence', 'hsp', 'ric', 'ric_cil']
    rows = []
    ks = [10, 20, 30]
    for method in methods:
        t1 = time.perf_counter()
        metrics = _bench_mod.evaluate_model(_paper_model, method, test_samples, max_test, ks)
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
            _paper_model, 'ric_cil', test_samples, min(max_test, 2000), [10, 20], alpha=alpha)
        alpha_rows.append({
            "alpha": alpha,
            "mrr@10": metrics['mrr@10'], "recall@10": metrics['recall@10'],
            "mrr@20": metrics['mrr@20'], "recall@20": metrics['recall@20'],
        })

    return {
        "success": True,
        "data": {
            "dataset": "Yoochoose",
            "n_train_sessions": len(train_sessions),
            "n_test_samples": len(test_samples),
            "max_test": max_test,
            "train_seconds": round(train_time, 2),
            "cached_model": _paper_model is not None and train_time == 0.0,
            "rows": rows,
            "alpha_tuning": alpha_rows,
        },
    }


@app.post("/evaluate/offline")
async def evaluate_offline(request: EvaluateRequest):
    """
    Đánh giá offline recommendation quality.
    
    Chia dữ liệu train/test theo thời gian, tính metrics:
    - Precision@K, Recall@K, F1@K
    - Hit Rate, MAP, NDCG
    - Coverage, Popularity Bias
    """
    try:
        orders_data = [
            {'user_id': o.user_id, 'product_id': o.product_id, 'quantity': o.quantity,
             'created_at': o.created_at or '2024-01-01'}
            for o in request.orders
        ]
        products_data = [p.dict() for p in request.products]
        top_n = request.top_n
        
        # Chia train/test
        train_data, test_data = train_test_split_by_time(orders_data, test_ratio=1 - request.train_ratio)
        
        if not train_data or not test_data:
            raise HTTPException(status_code=400, detail="Không đủ dữ liệu để đánh giá")
        
        # Train CF trên train data
        get_cf_models(train_data, products_data)
        
        # Lấy unique users từ test set
        test_users = list(set(o['user_id'] for o in test_data))
        
        recommendations_list = []
        relevant_list = []
        
        for user_id in test_users:
            # Xây dựng relevant set từ test data
            relevant = build_relevant_set(test_data, user_id)
            if not relevant:
                continue
            
            # Xây dựng user vector từ train data
            matrix, user_ids, product_ids = build_user_product_matrix(train_data, products_data)
            user_products = set(
                o['product_id'] for o in train_data if o['user_id'] == user_id
            )
            
            if user_id in user_ids:
                user_idx = user_ids.index(user_id)
                user_vector = matrix[user_idx].toarray().flatten()
                recs = hybrid.recommend(user_id, user_vector, top_n, list(user_products))
            else:
                # Cold-start user
                recs = []
            
            recommendations_list.append([r['product_id'] for r in recs])
            relevant_list.append(relevant)
        
        if not recommendations_list:
            return {
                "success": True,
                "data": {
                    "message": "Không có đủ dữ liệu để đánh giá",
                    "n_train": len(train_data),
                    "n_test": len(test_data),
                    "n_test_users": len(test_users),
                },
            }
        
        # Tính tất cả metrics
        product_popularity = {}
        if session_rec and session_rec.cooccurrence.is_fitted:
            product_popularity = dict(session_rec.cooccurrence.product_popularity)
        
        result = RecommendationMetrics.evaluate_all(
            recommendations_list, relevant_list,
            product_popularity=product_popularity,
            total_products=len(products_data),
            k=top_n,
        )
        
        return {
            "success": True,
            "data": {
                "metrics": {
                    "precision": result.precision,
                    "recall": result.recall,
                    "f1_score": result.f1_score,
                    "hit_rate": result.hit_rate,
                    "map_score": result.map_score,
                    "ndcg_score": result.ndcg_score,
                    "coverage": result.coverage,
                    "popularity_bias": result.popularity_bias,
                },
                "details": {
                    "n_train_samples": len(train_data),
                    "n_test_samples": len(test_data),
                    "n_test_users": len(test_users),
                    "n_users_evaluated": result.n_samples,
                    "top_k": top_n,
                },
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Evaluation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# A/B Testing Endpoints (NEW)
# ============================================================

@app.post("/abtest/log")
async def log_ab_test_interaction(log: ABClickLog):
    """Ghi nhận tương tác user cho A/B test"""
    try:
        tester = get_ab_test()
        tester.log_interaction(
            group=log.group,
            user_id=log.user_id,
            product_id=log.product_id,
            action=log.action,
            timestamp=log.timestamp,
            revenue=log.revenue,
        )
        return {
            "success": True,
            "data": {
                "message": "Interaction logged",
                "group": log.group,
                "action": log.action,
            },
        }
    except Exception as e:
        logger.error(f"A/B log failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/abtest/log_batch")
async def log_ab_test_batch(logs: List[ABClickLog]):
    """Ghi nhận nhiều tương tác một lúc (batch)"""
    try:
        tester = get_ab_test()
        for log in logs:
            tester.log_interaction(
                group=log.group,
                user_id=log.user_id,
                product_id=log.product_id,
                action=log.action,
                timestamp=log.timestamp,
                revenue=log.revenue,
            )
        return {
            "success": True,
            "data": {
                "message": f"{len(logs)} interactions logged",
            },
        }
    except Exception as e:
        logger.error(f"A/B batch log failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/abtest/report")
async def get_ab_test_report():
    """Lấy báo cáo A/B test tổng hợp"""
    try:
        tester = get_ab_test()
        report = tester.get_summary_report()
        return {"success": True, "data": report}
    except Exception as e:
        logger.error(f"A/B report failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/abtest/compare")
async def compare_ab_test_groups(group_a: str = "control", group_b: str = "treatment"):
    """So sánh hiệu quả giữa 2 nhóm A/B test"""
    try:
        tester = get_ab_test()
        comparison = tester.compare_groups(group_a, group_b)
        return {"success": True, "data": comparison}
    except Exception as e:
        logger.error(f"A/B comparison failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/abtest/reset")
async def reset_ab_test():
    """Reset dữ liệu A/B test"""
    try:
        tester = get_ab_test()
        tester.reset()
        return {"success": True, "data": {"message": "A/B test data reset"}}
    except Exception as e:
        logger.error(f"A/B reset failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


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
