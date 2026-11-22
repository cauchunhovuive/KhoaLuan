"""
FastAPI ML Service - AI Recommendation Engine
Clustering (KMeans) + Session-based
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


# ============================================================
# Singleton instances
# ============================================================

pipeline = None
session_rec = None
# Auto-retrain session model: theo dõi lần train gần nhất + khoảng cách tối thiểu
# giữa các lần retrain (giây) để không fit lại dồn dập mỗi request.
_session_last_train_attempt = 0.0
SESSION_RETRAIN_INTERVAL = 300  # 5 phút — data mới sẽ được học trong vòng 5 phút



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


if __name__ == "__main__":
    uvicorn.run(
        "clustering.api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
