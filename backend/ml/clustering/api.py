"""
FastAPI ML Service - Clustering & Recommendation API
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import uvicorn
import logging
from .clustering_service import ClusteringPipeline, ClusterProfile

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="KhoaLuan ML Service",
    description="Customer Clustering & Product Recommendation API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class OrderData(BaseModel):
    user_id: str
    total_amount: float
    created_at: str

class ProductData(BaseModel):
    id: str
    name: str
    category_id: str
    price: float

class ClusterRequest(BaseModel):
    orders: List[OrderData]
    n_clusters: Optional[int] = 4

class RecommendRequest(BaseModel):
    cluster_id: int
    products: List[ProductData]
    orders: List[OrderData]
    top_n: Optional[int] = 10

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


# Pipeline instance (singleton)
pipeline = None

def get_pipeline(n_clusters: int = 4) -> ClusteringPipeline:
    global pipeline
    if pipeline is None or pipeline.n_clusters != n_clusters:
        pipeline = ClusteringPipeline(n_clusters=n_clusters)
    return pipeline


@app.get("/", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        service="KhoaLuan ML Service",
        version="1.0.0",
    )


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/cluster/run")
async def run_clustering(request: ClusterRequest):
    """
    Chạy phân cụm khách hàng dựa trên dữ liệu đơn hàng
    """
    try:
        logger.info(f"Received clustering request: {len(request.orders)} orders, {request.n_clusters} clusters")

        orders_data = [
            {
                'user_id': o.user_id,
                'total_amount': o.total_amount,
                'created_at': o.created_at,
            }
            for o in request.orders
        ]

        pipeline = get_pipeline(request.n_clusters)
        result = pipeline.run(orders_data)

        return {
            "success": True,
            "data": result,
        }
    except Exception as e:
        logger.error(f"Clustering failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/cluster/recommend")
async def get_cluster_recommendations(request: RecommendRequest):
    """
    Gợi ý sản phẩm cho một cụm khách hàng
    """
    try:
        import pandas as pd

        products_df = pd.DataFrame([p.dict() for p in request.products])
        orders_data = [
            {
                'user_id': o.user_id,
                'total_amount': o.total_amount,
                'created_at': o.created_at,
            }
            for o in request.orders
        ]

        pipeline = get_pipeline()
        recommendations = pipeline.get_recommendations(
            cluster_id=request.cluster_id,
            products_df=products_df,
            orders_data=orders_data,
            top_n=request.top_n,
        )

        return {
            "success": True,
            "data": recommendations,
        }
    except Exception as e:
        logger.error(f"Recommendation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/cluster/profiles")
async def get_cluster_profiles():
    """Lấy thông tin hồ sơ các cụm khách hàng"""
    profiles = []
    for cluster_id in range(4):
        profile = ClusterProfile.get_cluster_profile(cluster_id)
        profiles.append({
            'id': cluster_id,
            **profile,
        })

    return {
        "success": True,
        "data": profiles,
    }


if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
