"""
Clustering Service - RFM Analysis + K-Means Clustering

Phân cụm khách hàng dựa trên:
- R (Recency): Thời gian từ lần mua cuối
- F (Frequency): Tần suất mua hàng
- M (Monetary): Tổng chi tiêu
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ClusterResult:
    """Kết quả phân cụm"""
    user_id: str
    cluster_id: int
    cluster_name: str
    rfm_scores: Dict[str, float]


class RFMAnalyzer:
    """
    RFM Analysis Engine
    Tính toán R (Recency), F (Frequency), M (Monetary) cho từng khách hàng
    """

    def __init__(self):
        self.scaler = StandardScaler()
        self.kmeans = None
        self.rfm_columns = ['recency', 'frequency', 'monetary']

    def calculate_rfm(self, orders_df: pd.DataFrame) -> pd.DataFrame:
        """
        Tính toán RFM từ dữ liệu đơn hàng

        Args:
            orders_df: DataFrame với các cột [user_id, total_amount, created_at]

        Returns:
            DataFrame với các cột [user_id, recency, frequency, monetary]
        """
        logger.info("Calculating RFM metrics...")

        # Chuyển đổi created_at sang datetime
        orders_df['created_at'] = pd.to_datetime(orders_df['created_at'])
        now = orders_df['created_at'].max()

        # Tính RFM cho từng khách hàng
        rfm = orders_df.groupby('user_id').agg({
            'created_at': lambda x: (now - x.max()).days,  # Recency
            'user_id': 'count',  # Frequency
            'total_amount': 'sum',  # Monetary
        }).rename(columns={
            'created_at': 'recency',
            'user_id': 'frequency',
            'total_amount': 'monetary',
        }).reset_index()

        logger.info(f"RFM calculated for {len(rfm)} customers")
        return rfm

    def assign_rfm_scores(self, rfm_df: pd.DataFrame) -> pd.DataFrame:
        """
        Gán điểm RFM (1-5) cho từng khách hàng

        Args:
            rfm_df: DataFrame RFM

        Returns:
            DataFrame với điểm RFM đã được chuẩn hóa
        """
        logger.info("Assigning RFM scores (1-5)...")

        # Recency: thấp hơn = tốt hơn (mua gần đây)
        rfm_df['r_score'] = pd.qcut(
            rfm_df['recency'].rank(method='first'),
            q=5,
            labels=[5, 4, 3, 2, 1]
        ).astype(int)

        # Frequency: cao hơn = tốt hơn
        rfm_df['f_score'] = pd.qcut(
            rfm_df['frequency'].rank(method='first'),
            q=5,
            labels=[1, 2, 3, 4, 5]
        ).astype(int)

        # Monetary: cao hơn = tốt hơn
        rfm_df['m_score'] = pd.qcut(
            rfm_df['monetary'].rank(method='first'),
            q=5,
            labels=[1, 2, 3, 4, 5]
        ).astype(int)

        # RFM tổng hợp
        rfm_df['rfm_score'] = (
            rfm_df['r_score'] +
            rfm_df['f_score'] +
            rfm_df['m_score']
        )

        return rfm_df


class KMeansClusterer:
    """
    K-Means Clustering Engine
    Phân cụm khách hàng dựa trên RFM
    """

    def __init__(self, n_clusters: int = 4, random_state: int = 42):
        self.n_clusters = n_clusters
        self.random_state = random_state
        self.kmeans = KMeans(
            n_clusters=n_clusters,
            random_state=random_state,
            n_init=10
        )
        self.scaler = StandardScaler()
        self.feature_names = ['recency', 'frequency', 'monetary']

    def find_optimal_k(
        self,
        rfm_df: pd.DataFrame,
        max_k: int = 10
    ) -> Tuple[int, Dict]:
        """
        Tìm số cụm tối ưu bằng Elbow Method và Silhouette Score

        Args:
            rfm_df: DataFrame RFM
            max_k: Số cụm tối đa

        Returns:
            Số cụm tối ưu và dictionary điểm số
        """
        features = rfm_df[self.feature_names].values
        features_scaled = self.scaler.fit_transform(features)

        scores = {}
        for k in range(2, max_k + 1):
            kmeans = KMeans(n_clusters=k, random_state=self.random_state, n_init=10)
            labels = kmeans.fit_predict(features_scaled)

            inertia = kmeans.inertia_
            silhouette = silhouette_score(features_scaled, labels)

            scores[k] = {
                'inertia': inertia,
                'silhouette_score': silhouette,
            }
            logger.info(f"K={k}: Inertia={inertia:.2f}, Silhouette={silhouette:.4f}")

        # Chọn K tối ưu dựa trên Silhouette Score
        optimal_k = max(scores, key=lambda k: scores[k]['silhouette_score'])
        logger.info(f"Optimal K: {optimal_k}")

        return optimal_k, scores

    def fit(self, rfm_df: pd.DataFrame) -> np.ndarray:
        """
        Huấn luyện K-Means trên dữ liệu RFM

        Args:
            rfm_df: DataFrame RFM đã được chuẩn hóa

        Returns:
            Nhãn cụm cho từng khách hàng
        """
        features = rfm_df[self.feature_names].values
        features_scaled = self.scaler.fit_transform(features)

        self.kmeans.fit(features_scaled)
        labels = self.kmeans.labels_

        logger.info(f"K-Means clustering completed: {self.n_clusters} clusters")
        return labels

    def predict(self, rfm_df: pd.DataFrame) -> np.ndarray:
        """Dự đoán cụm cho dữ liệu mới"""
        features = rfm_df[self.feature_names].values
        features_scaled = self.scaler.transform(features)
        return self.kmeans.predict(features_scaled)

    def get_cluster_centers(self) -> pd.DataFrame:
        """Lấy tâm cụm"""
        centers = self.scaler.inverse_transform(self.kmeans.cluster_centers_)
        return pd.DataFrame(
            centers,
            columns=self.feature_names
        )


class ClusterProfile:
    """
    Định nghĩa hồ sơ cho từng cụm khách hàng
    """

    CLUSTER_NAMES = {
        0: "Khách hàng VIP",
        1: "Khách hàng Tiềm năng",
        2: "Khách hàng Mới",
        3: "Khách hàng Rời rạc",
    }

    CLUSTER_DESCRIPTIONS = {
        0: "Khách hàng thân thiết, chi tiêu cao, mua sắm thường xuyên",
        1: "Khách hàng có tiềm năng phát triển, cần được chăm sóc",
        2: "Khách hàng mới, cần trải nghiệm tốt để giữ chân",
        3: "Khách hàng ít tương tác, cần chiến dịch tái kích hoạt",
    }

    CLUSTER_COLORS = {
        0: "#10B981",  # Green - VIP
        1: "#3B82F6",  # Blue - Potential
        2: "#F59E0B",  # Amber - New
        3: "#EF4444",  # Red - At risk
    }

    @classmethod
    def get_cluster_profile(cls, cluster_id: int) -> Dict:
        """Lấy thông tin hồ sơ cụm"""
        return {
            'name': cls.CLUSTER_NAMES.get(cluster_id, f'Cluster {cluster_id}'),
            'description': cls.CLUSTER_DESCRIPTIONS.get(
                cluster_id,
                'Khách hàng trong nhóm này'
            ),
            'color': cls.CLUSTER_COLORS.get(cluster_id, '#6366F1'),
        }


class ClusteringPipeline:
    """
    Pipeline phân cụm khách hàng hoàn chỉnh
    """

    def __init__(self, n_clusters: int = 4):
        self.n_clusters = n_clusters
        self.rfm_analyzer = RFMAnalyzer()
        self.clusterer = KMeansClusterer(n_clusters=n_clusters)

    def run(self, orders_data: List[Dict]) -> Dict:
        """
        Chạy pipeline phân cụm

        Args:
            orders_data: Danh sách đơn hàng [{user_id, total_amount, created_at}]

        Returns:
            Kết quả phân cụm với thông tin chi tiết
        """
        logger.info("Starting clustering pipeline...")

        # Convert to DataFrame
        orders_df = pd.DataFrame(orders_data)
        if orders_df.empty:
            logger.warning("No orders data provided")
            return {'clusters': [], 'total_users': 0}

        # Tính RFM
        rfm_df = self.rfm_analyzer.calculate_rfm(orders_df)
        rfm_df = self.rfm_analyzer.assign_rfm_scores(rfm_df)

        n_users = len(rfm_df)
        # Tự động điều chỉnh số cụm nếu dữ liệu quá ít
        # K-Means yêu cầu n_samples >= n_clusters
        adjusted_clusters = min(self.n_clusters, n_users)
        if adjusted_clusters < 2 and n_users > 0:
            adjusted_clusters = 1
        if adjusted_clusters != self.n_clusters:
            logger.warning(f"Too few users ({n_users}) for {self.n_clusters} clusters. Adjusting to {adjusted_clusters}.")
            # Tạo clusterer mới với số cụm đã điều chỉnh
            self.clusterer = KMeansClusterer(n_clusters=adjusted_clusters, random_state=self.clusterer.random_state)
            self.n_clusters = adjusted_clusters

        # Phân cụm
        labels = self.clusterer.fit(rfm_df)
        centers = self.clusterer.get_cluster_centers()

        # Gán nhãn và tạo kết quả
        clusters = {}
        for idx, row in rfm_df.iterrows():
            cluster_id = int(labels[idx])
            profile = ClusterProfile.get_cluster_profile(cluster_id)

            if cluster_id not in clusters:
                clusters[cluster_id] = {
                    'id': f'cluster_{cluster_id}',
                    'name': profile['name'],
                    'description': profile['description'],
                    'color': profile['color'],
                    'users': [],
                    'center': centers.loc[cluster_id].to_dict() if cluster_id in centers.index else {},
                }

            clusters[cluster_id]['users'].append({
                'user_id': row['user_id'],
                'rfm_scores': {
                    'recency': int(row['r_score']),
                    'frequency': int(row['f_score']),
                    'monetary': int(row['m_score']),
                    'total': int(row['rfm_score']),
                },
            })

        result = {
            'clusters': list(clusters.values()),
            'total_users': len(rfm_df),
            'parameters': {
                'n_clusters': self.n_clusters,
                'features': self.clusterer.feature_names,
            },
        }

        logger.info(f"Clustering completed: {len(clusters)} clusters, {len(rfm_df)} users")
        return result

    def get_recommendations(
        self,
        cluster_id: int,
        products_df: pd.DataFrame,
        orders_data: List[Dict],
        top_n: int = 10
    ) -> List[Dict]:
        """
        Gợi ý sản phẩm cho một cụm khách hàng

        Args:
            cluster_id: ID của cụm
            products_df: DataFrame sản phẩm
            orders_data: Dữ liệu đơn hàng
            top_n: Số sản phẩm gợi ý

        Returns:
            Danh sách sản phẩm được gợi ý
        """
        # Lấy users trong cụm
        orders_df = pd.DataFrame(orders_data)
        rfm_df = self.rfm_analyzer.calculate_rfm(orders_df)
        labels = self.clusterer.predict(rfm_df)

        cluster_users = rfm_df[labels == cluster_id]['user_id'].tolist()

        if not cluster_users:
            return []

        # Lấy sản phẩm được mua nhiều nhất trong cụm
        cluster_orders = orders_df[orders_df['user_id'].isin(cluster_users)]

        if 'product_id' not in cluster_orders.columns:
            return []

        product_counts = cluster_orders.groupby('product_id').size().sort_values(ascending=False)

        recommendations = []
        for product_id, count in product_counts.head(top_n).items():
            product_info = products_df[products_df['id'] == product_id]
            if not product_info.empty:
                recommendations.append({
                    'product_id': product_id,
                    'product_name': product_info.iloc[0].get('name', ''),
                    'score': float(count),
                    'reason': f'Sản phẩm phổ biến trong nhóm {ClusterProfile.CLUSTER_NAMES.get(cluster_id, "khách hàng")}',
                })

        return recommendations
