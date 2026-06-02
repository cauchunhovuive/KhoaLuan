"""
Collaborative Filtering Engine

Cung cấp các phương pháp lọc cộng tác:
1. Item-Item Collaborative Filtering (dựa trên độ tương tự giữa các sản phẩm)
2. User-User Collaborative Filtering (dựa trên độ tương tự giữa người dùng)
3. Alternating Least Squares (ALS) Matrix Factorization
4. Weighted Hybrid Recommender (kết hợp nhiều phương pháp)
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any
from scipy.sparse import csr_matrix, lil_matrix, vstack
from sklearn.metrics.pairwise import cosine_similarity
import logging
from dataclasses import dataclass, field
from collections import defaultdict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class CFConfig:
    """Cấu hình cho Collaborative Filtering"""
    n_neighbors: int = 20          # Số lượng neighbors cho KNN
    min_sim_threshold: float = 0.1 # Ngưỡng tương tự tối thiểu
    n_factors: int = 50            # Số factors cho Matrix Factorization
    n_iterations: int = 15         # Số vòng lặp ALS
    reg_param: float = 0.1         # Regularization parameter
    alpha: float = 40.0            # Confidence weight cho implicit feedback
    top_n: int = 10                # Số lượng gợi ý mặc định


class ItemItemCF:
    """
    Item-Item Collaborative Filtering
    "Người mua sản phẩm A cũng mua sản phẩm B"
    
    Dựa trên ma trận co-occurrence: Nếu user mua sản phẩm A và B cùng nhau,
    thì A và B có độ tương tự cao.
    """

    def __init__(self, config: Optional[CFConfig] = None):
        self.config = config or CFConfig()
        self.similarity_matrix: Optional[np.ndarray] = None
        self.product_ids: List[str] = []
        self.product_to_idx: Dict[str, int] = {}
        self.idx_to_product: Dict[int, str] = {}
        self.is_fitted = False

    def _build_cooccurrence_matrix(
        self,
        user_product_matrix: csr_matrix
    ) -> csr_matrix:
        """
        Xây dựng ma trận co-occurrence sản phẩm.
        
        C[i][j] = số lượng user đã mua cả sản phẩm i và j
        
        Args:
            user_product_matrix: User-Item interaction matrix (users x products)
        
        Returns:
            Co-occurrence matrix (products x products)
        """
        # Nếu A.T * A: mỗi phần tử (i,j) = số user đã mua cả i và j
        cooc = user_product_matrix.T.dot(user_product_matrix).astype(np.float32)
        return cooc

    def _compute_cosine_similarity(self, cooc_matrix: csr_matrix) -> np.ndarray:
        """
        Tính cosine similarity từ ma trận co-occurrence.
        
        Sử dụng sklearn's cosine_similarity để xử lý ma trận thưa hiệu quả,
        tránh chuyển đổi sang dense matrix (tiết kiệm bộ nhớ).
        
        sim(i,j) = cooc[i][j] / sqrt(cooc[i][i] * cooc[j][j])
        Đây là phép đo: "bao nhiêu % user mua i cũng mua j"
        """
        # sklearn's cosine_similarity xử lý sparse matrix natively
        # và trả về dense array
        similarity = cosine_similarity(cooc_matrix, dense_output=True)
        
        # Giới hạn trong [0, 1] (cosine_similarity trả về [-1, 1])
        similarity = np.clip(similarity, 0, 1)
        
        return similarity

    def fit(self, user_product_matrix: csr_matrix, product_ids: List[str]):
        """
        Huấn luyện Item-Item CF
        
        Args:
            user_product_matrix: User-Item matrix (users x products)
            product_ids: Danh sách product IDs tương ứng với cột
        """
        logger.info(
            f"Fitting Item-Item CF with "
            f"{user_product_matrix.shape[0]} users x {user_product_matrix.shape[1]} products"
        )
        
        self.product_ids = product_ids
        self.product_to_idx = {pid: idx for idx, pid in enumerate(product_ids)}
        self.idx_to_product = {idx: pid for idx, pid in enumerate(product_ids)}
        
        # Build co-occurrence matrix -> similarity matrix
        cooc = self._build_cooccurrence_matrix(user_product_matrix)
        self.similarity_matrix = self._compute_cosine_similarity(cooc)
        
        self.is_fitted = True
        logger.info("Item-Item CF training completed")

    def recommend(
        self,
        user_product_vector: np.ndarray,
        top_n: Optional[int] = None,
        exclude_ids: Optional[List[str]] = None
    ) -> List[Dict]:
        """
        Gợi ý sản phẩm dựa trên các sản phẩm user đã mua.
        
        Args:
            user_product_vector: Vector nhị phân các sản phẩm user đã mua
            top_n: Số lượng gợi ý
            exclude_ids: Các sản phẩm cần loại trừ (đã mua)
        
        Returns:
            Danh sách gợi ý [{'product_id': str, 'score': float, 'reason': str}]
        """
        if not self.is_fitted:
            raise RuntimeError("Model chưa được huấn luyện!")
        
        top_n = top_n or self.config.top_n
        exclude_set = set(exclude_ids or [])
        
        # Tính recommendation scores = similarity * user_vector
        scores = user_product_vector.dot(self.similarity_matrix)
        
        # Tạo danh sách kết quả
        results = []
        for idx in np.argsort(scores)[::-1]:
            product_id = self.idx_to_product[idx]
            if product_id in exclude_set:
                continue
            if scores[idx] <= 0:
                continue
            
            results.append({
                'product_id': product_id,
                'score': float(scores[idx]),
                'reason': 'Sản phẩm liên quan đến sản phẩm bạn đã mua (Item-Item CF)',
            })
            
            if len(results) >= top_n:
                break
        
        return results

    def get_similar_products(
        self,
        product_id: str,
        top_n: int = 10
    ) -> List[Dict]:
        """
        Lấy sản phẩm tương tự với một sản phẩm cụ thể.
        
        Args:
            product_id: ID sản phẩm
            top_n: Số lượng sản phẩm tương tự
        
        Returns:
            Danh sách sản phẩm tương tự
        """
        if not self.is_fitted:
            raise RuntimeError("Model chưa được huấn luyện!")
        
        if product_id not in self.product_to_idx:
            return []
        
        idx = self.product_to_idx[product_id]
        sim_scores = self.similarity_matrix[idx]
        
        results = []
        for neighbor_idx in np.argsort(sim_scores)[::-1]:
            if neighbor_idx == idx:
                continue
            if sim_scores[neighbor_idx] < self.config.min_sim_threshold:
                break
            
            results.append({
                'product_id': self.idx_to_product[neighbor_idx],
                'similarity_score': float(sim_scores[neighbor_idx]),
            })
            
            if len(results) >= top_n:
                break
        
        return results


class UserUserCF:
    """
    User-User Collaborative Filtering
    "Những người dùng tương tự bạn đã mua..."
    
    Dựa trên: Tìm users tương tự với user hiện tại,
    sau đó gợi ý sản phẩm mà họ đã mua.
    """

    def __init__(self, config: Optional[CFConfig] = None):
        self.config = config or CFConfig()
        self.user_product_matrix: Optional[csr_matrix] = None
        self.user_ids: List[str] = []
        self.product_ids: List[str] = []
        self.user_to_idx: Dict[str, int] = {}
        self.product_to_idx: Dict[str, int] = {}
        self.idx_to_product: Dict[int, str] = {}
        self.is_fitted = False

    def fit(self, user_product_matrix: csr_matrix, user_ids: List[str], product_ids: List[str]):
        """
        Huấn luyện User-User CF
        
        Args:
            user_product_matrix: User-Item matrix (users x products)
            user_ids: Danh sách user IDs tương ứng với hàng
            product_ids: Danh sách product IDs tương ứng với cột
        """
        logger.info(
            f"Fitting User-User CF with "
            f"{len(user_ids)} users, {len(product_ids)} products"
        )
        
        self.user_product_matrix = user_product_matrix
        self.user_ids = user_ids
        self.product_ids = product_ids
        self.user_to_idx = {uid: idx for idx, uid in enumerate(user_ids)}
        self.product_to_idx = {pid: idx for idx, pid in enumerate(product_ids)}
        self.idx_to_product = {idx: pid for idx, pid in enumerate(product_ids)}
        
        self.is_fitted = True
        logger.info("User-User CF training completed")

    def _get_user_similarities(self, user_idx: int) -> np.ndarray:
        """
        Tính độ tương tự giữa một user và tất cả users khác.
        
        Sử dụng sklearn cosine_similarity trên sparse matrix để:
        - Tránh loop O(n_users^2) với .toarray() mỗi lần
        - Tránh chuyển sparse -> dense gây tốn bộ nhớ
        - Nhanh hơn hàng trăm lần với nhiều users
        """
        similarities = cosine_similarity(
            self.user_product_matrix[user_idx],
            self.user_product_matrix,
            dense_output=True,
        ).flatten()
        # Loại bỏ self-similarity (so sánh user với chính mình)
        similarities[user_idx] = 0.0
        return similarities

    def recommend(
        self,
        user_id: str,
        top_n: Optional[int] = None,
        exclude_ids: Optional[List[str]] = None
    ) -> List[Dict]:
        """
        Gợi ý sản phẩm dựa trên users tương tự.
        
        Args:
            user_id: ID người dùng
            top_n: Số lượng gợi ý
            exclude_ids: Các sản phẩm cần loại trừ
        
        Returns:
            Danh sách gợi ý
        """
        if not self.is_fitted:
            raise RuntimeError("Model chưa được huấn luyện!")
        
        if user_id not in self.user_to_idx:
            return []
        
        top_n = top_n or self.config.top_n
        exclude_set = set(exclude_ids or [])
        
        user_idx = self.user_to_idx[user_id]
        
        # Tìm users tương tự
        similarities = self._get_user_similarities(user_idx)
        similar_users = np.argsort(similarities)[::-1][:self.config.n_neighbors]
        
        # Gợi ý sản phẩm từ similar users
        product_scores = defaultdict(float)
        for similar_idx in similar_users:
            sim_score = similarities[similar_idx]
            if sim_score < self.config.min_sim_threshold:
                continue
            
            similar_vector = self.user_product_matrix[similar_idx].toarray().flatten()
            for prod_idx, bought in enumerate(similar_vector):
                if bought > 0:
                    product_scores[prod_idx] += sim_score * bought
        
        # Sắp xếp và trả về
        sorted_products = sorted(
            product_scores.items(),
            key=lambda x: x[1],
            reverse=True,
        )
        
        results = []
        for prod_idx, score in sorted_products:
            product_id = self.idx_to_product[prod_idx]
            if product_id in exclude_set:
                continue
            
            results.append({
                'product_id': product_id,
                'score': float(score),
                'reason': 'Sản phẩm được ưa chuộng bởi người dùng tương tự bạn (User-User CF)',
            })
            
            if len(results) >= top_n:
                break
        
        return results


class ALSMatrixFactorization:
    """
    Alternating Least Squares Matrix Factorization
    
    Phân rã ma trận User-Item thành 2 ma trận con:
    - User factors (U): ma trận [n_users x n_factors]
    - Item factors (V): ma trận [n_items x n_factors]
    
    R ≈ U * V.T
    
    Sử dụng implicit feedback (confidence-weighted):
    - purchase = 1 với confidence = 1 + alpha * quantity
    - không purchase = 0 với confidence = 1
    """
    
    def __init__(self, config: Optional[CFConfig] = None):
        self.config = config or CFConfig()
        self.user_factors: Optional[np.ndarray] = None
        self.item_factors: Optional[np.ndarray] = None
        self.user_ids: List[str] = []
        self.product_ids: List[str] = []
        self.user_to_idx: Dict[str, int] = {}
        self.product_to_idx: Dict[str, int] = {}
        self.idx_to_product: Dict[int, str] = {}
        self.idx_to_user: Dict[int, str] = {}
        self.is_fitted = False

    def fit(
        self,
        user_product_matrix: csr_matrix,
        user_ids: List[str],
        product_ids: List[str],
        confidence_weights: Optional[np.ndarray] = None
    ):
        """
        Huấn luyện ALS Matrix Factorization.
        
        Args:
            user_product_matrix: User-Item matrix (users x products)
            user_ids: Danh sách user IDs
            product_ids: Danh sách product IDs
            confidence_weights: Ma trận confidence (optional)
        """
        logger.info(
            f"Fitting ALS with {user_product_matrix.shape[0]} users, "
            f"{user_product_matrix.shape[1]} products, "
            f"{self.config.n_factors} factors"
        )
        
        n_users, n_items = user_product_matrix.shape
        self.user_ids = user_ids
        self.product_ids = product_ids
        self.user_to_idx = {uid: idx for idx, uid in enumerate(user_ids)}
        self.product_to_idx = {pid: idx for idx, pid in enumerate(product_ids)}
        self.idx_to_product = {idx: pid for idx, pid in enumerate(product_ids)}
        self.idx_to_user = {idx: uid for idx, uid in enumerate(user_ids)}
        
        # Khởi tạo factors ngẫu nhiên
        np.random.seed(42)
        self.user_factors = np.random.randn(n_users, self.config.n_factors) * 0.01
        self.item_factors = np.random.randn(n_items, self.config.n_factors) * 0.01
        
        # Confidence weights: nếu không có confidence_weights, dùng mặc định
        # C[i][u] = 1 + alpha * R[u][i]
        if confidence_weights is not None:
            confidence = confidence_weights
        else:
            confidence = user_product_matrix.toarray().copy()
            confidence = 1 + self.config.alpha * confidence
        
        reg = self.config.reg_param
        lambda_eye = reg * np.eye(self.config.n_factors)
        
        # ALS iterations
        for iteration in range(self.config.n_iterations):
            # Update user factors: fix item factors, optimize user factors
            for u in range(n_users):
                # Chỉ lấy items user này đã tương tác
                user_items = user_product_matrix[u].nonzero()[1]
                if len(user_items) == 0:
                    continue
                
                Cu = confidence[u, user_items]
                Vu = self.item_factors[user_items]
                
                # X' * Cu * X + lambda*I
                Xt_Cu_X = Vu.T.dot(np.diag(Cu)).dot(Vu) + lambda_eye
                # X' * Cu * p(u)  (p(u) = 1 for positive feedback)
                Xt_Cu_p = Vu.T.dot(Cu)
                
                self.user_factors[u] = np.linalg.solve(Xt_Cu_X, Xt_Cu_p)
            
            # Update item factors: fix user factors, optimize item factors
            for i in range(n_items):
                # Chỉ lấy users đã tương tác với item này
                item_users = user_product_matrix[:, i].nonzero()[0]
                if len(item_users) == 0:
                    continue
                
                Ci = confidence[item_users, i]
                Ui = self.user_factors[item_users]
                
                # X' * Ci * X + lambda*I
                Xt_Ci_X = Ui.T.dot(np.diag(Ci)).dot(Ui) + lambda_eye
                Xt_Ci_p = Ui.T.dot(Ci)
                
                self.item_factors[i] = np.linalg.solve(Xt_Ci_X, Xt_Ci_p)
            
            if (iteration + 1) % 10 == 0:
                loss = self._compute_loss(user_product_matrix, confidence)
                logger.info(f"ALS Iteration {iteration + 1}/{self.config.n_iterations}, Loss: {loss:.4f}")
        
        self.is_fitted = True
        logger.info("ALS training completed")

    def _compute_loss(self, user_product_matrix: csr_matrix, confidence: np.ndarray) -> float:
        """Tính loss function cho ALS"""
        R_pred = self.user_factors.dot(self.item_factors.T)
        diff = (confidence - 1) * (user_product_matrix.toarray() - R_pred)
        loss = np.sum(diff ** 2)
        reg_loss = self.config.reg_param * (
            np.sum(self.user_factors ** 2) + np.sum(self.item_factors ** 2)
        )
        return loss + reg_loss

    def predict(self, user_id: str, product_id: str) -> float:
        """Dự đoán score cho một cặp user-product cụ thể"""
        if not self.is_fitted:
            raise RuntimeError("Model chưa được huấn luyện!")
        
        if user_id not in self.user_to_idx or product_id not in self.product_to_idx:
            return 0.0
        
        u = self.user_to_idx[user_id]
        i = self.product_to_idx[product_id]
        
        return float(np.dot(self.user_factors[u], self.item_factors[i]))

    def recommend(
        self,
        user_id: str,
        top_n: Optional[int] = None,
        exclude_ids: Optional[List[str]] = None
    ) -> List[Dict]:
        """
        Gợi ý sản phẩm cho user dựa trên ALS factors.
        
        Args:
            user_id: ID người dùng
            top_n: Số lượng gợi ý
            exclude_ids: Các sản phẩm cần loại trừ
        
        Returns:
            Danh sách gợi ý
        """
        if not self.is_fitted:
            raise RuntimeError("Model chưa được huấn luyện!")
        
        if user_id not in self.user_to_idx:
            return []
        
        top_n = top_n or self.config.top_n
        exclude_set = set(exclude_ids or [])
        
        u = self.user_to_idx[user_id]
        user_vector = self.user_factors[u]
        
        # Score tất cả sản phẩm
        scores = user_vector.dot(self.item_factors.T)
        
        results = []
        for idx in np.argsort(scores)[::-1]:
            product_id = self.idx_to_product[idx]
            if product_id in exclude_set:
                continue
            if scores[idx] <= 0:
                continue
            
            results.append({
                'product_id': product_id,
                'score': float(scores[idx]),
                'reason': 'Gợi ý dựa trên phân tích ma trận hành vi mua sắm (ALS Matrix Factorization)',
            })
            
            if len(results) >= top_n:
                break
        
        return results


class HybridRecommender:
    """
    Hybrid Recommender - Kết hợp nhiều phương pháp collaborative filtering
    
    Weighted ensemble của:
    - Item-Item CF (trọng số w1)
    - User-User CF (trọng số w2)
    - ALS Matrix Factorization (trọng số w3)
    
    Với fallback strategy khi một phương pháp không có kết quả.
    """

    def __init__(
        self,
        item_cf: ItemItemCF,
        user_cf: UserUserCF,
        als: ALSMatrixFactorization,
        weights: Optional[Tuple[float, float, float]] = None,
        config: Optional[CFConfig] = None,
    ):
        """
        Args:
            item_cf: Item-Item CF instance
            user_cf: User-User CF instance
            als: ALS instance
            weights: Trọng số (w_item, w_user, w_als). Mặc định (0.3, 0.3, 0.4)
        """
        self.item_cf = item_cf
        self.user_cf = user_cf
        self.als = als
        self.weights = weights or (0.3, 0.3, 0.4)
        self.config = config or CFConfig()

    def recommend(
        self,
        user_id: str,
        user_product_vector: np.ndarray,
        top_n: Optional[int] = None,
        exclude_ids: Optional[List[str]] = None,
    ) -> List[Dict]:
        """
        Gợi ý kết hợp từ nhiều phương pháp.
        
        Args:
            user_id: ID người dùng
            user_product_vector: Vector sản phẩm user đã mua
            top_n: Số lượng gợi ý
            exclude_ids: Các sản phẩm cần loại trừ
        
        Returns:
            Danh sách gợi ý tổng hợp
        """
        top_n = top_n or self.config.top_n
        exclude_set = set(exclude_ids or [])
        
        # Lấy kết quả từ từng phương pháp
        results = {}  # product_id -> weighted_score
        item_recs = []
        user_recs = []
        als_recs = []
        
        # 1. Item-Item CF
        try:
            item_recs = self.item_cf.recommend(
                user_product_vector, top_n=top_n * 3, exclude_ids=exclude_ids
            )
            for rec in item_recs:
                results[rec['product_id']] = results.get(
                    rec['product_id'], 0
                ) + self.weights[0] * rec['score']
        except Exception as e:
            logger.warning(f"Item-Item CF failed: {e}")
        
        # 2. User-User CF
        try:
            user_recs = self.user_cf.recommend(
                user_id, top_n=top_n * 3, exclude_ids=exclude_ids
            )
            for rec in user_recs:
                results[rec['product_id']] = results.get(
                    rec['product_id'], 0
                ) + self.weights[1] * rec['score']
        except Exception as e:
            logger.warning(f"User-User CF failed: {e}")
        
        # 3. ALS Matrix Factorization
        try:
            als_recs = self.als.recommend(
                user_id, top_n=top_n * 3, exclude_ids=exclude_ids
            )
            for rec in als_recs:
                results[rec['product_id']] = results.get(
                    rec['product_id'], 0
                ) + self.weights[2] * rec['score']
        except Exception as e:
            logger.warning(f"ALS failed: {e}")
        
        # Sắp xếp theo weighted score
        sorted_results = sorted(
            results.items(),
            key=lambda x: x[1],
            reverse=True,
        )
        
        final_results = []
        for product_id, score in sorted_results:
            final_results.append({
                'product_id': product_id,
                'score': float(score),
                'reason': 'Gợi ý kết hợp từ nhiều phương pháp Collaborative Filtering (Hybrid)',
            })
            if len(final_results) >= top_n:
                break
        
        # Fallback: nếu hybrid không có kết quả, thử từng phương pháp riêng lẻ
        if not final_results:
            for method_name, method_recs in [
                ('Item-Item', item_recs),
                ('User-User', user_recs),
                ('ALS', als_recs),
            ]:
                if method_recs:
                    for rec in method_recs[:top_n]:
                        final_results.append(rec)
                    break
        
        return final_results

    def get_recommendation_explanation(
        self,
        user_id: str,
        user_product_vector: np.ndarray,
        top_n: int = 10,
        exclude_ids: Optional[List[str]] = None,
    ) -> Dict:
        """
        Trả về gợi ý kèm giải thích chi tiết từ từng phương pháp.
        
        Useful cho admin để hiểu tại sao sản phẩm được recommend.
        """
        exclude_set = set(exclude_ids or [])
        
        explanations = {}
        
        # Thu thập từ từng phương pháp
        methods = [
            ('item_cf', 'Item-Item Collaborative Filtering', self.item_cf),
            ('user_cf', 'User-User Collaborative Filtering', self.user_cf),
            ('als', 'ALS Matrix Factorization', self.als),
        ]
        
        for method_key, method_name, method in methods:
            try:
                if method_key == 'item_cf':
                    recs = method.recommend(user_product_vector, top_n=top_n, exclude_ids=exclude_ids)
                else:
                    recs = method.recommend(user_id, top_n=top_n, exclude_ids=exclude_ids)
                
                for rec in recs:
                    if rec['product_id'] not in explanations:
                        explanations[rec['product_id']] = {
                            'product_id': rec['product_id'],
                            'methods': [],
                            'max_score': 0,
                        }
                    explanations[rec['product_id']]['methods'].append({
                        'method': method_name,
                        'score': rec['score'],
                    })
                    explanations[rec['product_id']]['max_score'] = max(
                        explanations[rec['product_id']]['max_score'],
                        rec['score'],
                    )
            except Exception as e:
                logger.warning(f"{method_name} failed for explanation: {e}")
        
        # Sắp xếp
        sorted_explanations = sorted(
            explanations.values(),
            key=lambda x: x['max_score'],
            reverse=True,
        )[:top_n]
        
        return {
            'recommendations': sorted_explanations,
            'weights': {
                'item_cf': self.weights[0],
                'user_cf': self.weights[1],
                'als': self.weights[2],
            },
        }


def build_user_product_matrix(
    orders_data: List[Dict],
    products_data: List[Dict],
) -> Tuple[csr_matrix, List[str], List[str]]:
    """
    Xây dựng User-Product matrix từ dữ liệu đơn hàng.
    
    Args:
        orders_data: Danh sách đơn hàng [{user_id, product_id, quantity, created_at}]
        products_data: Danh sách sản phẩm [{id, name, ...}]
    
    Returns:
        user_product_matrix (csr_matrix): Ma trận thưa users x products
        user_ids: Danh sách user IDs
        product_ids: Danh sách product IDs
    """
    # Lấy danh sách users và products
    user_ids = list(set(o['user_id'] for o in orders_data))
    product_ids = [p['id'] for p in products_data]
    
    user_to_idx = {uid: idx for idx, uid in enumerate(user_ids)}
    product_to_idx = {pid: idx for idx, pid in enumerate(product_ids)}
    
    # Xây dựng ma trận thưa
    matrix = lil_matrix((len(user_ids), len(product_ids)), dtype=np.float32)
    
    for order in orders_data:
        user_idx = user_to_idx.get(order['user_id'])
        product_idx = product_to_idx.get(order['product_id'])
        if user_idx is not None and product_idx is not None:
            quantity = order.get('quantity', 1)
            matrix[user_idx, product_idx] += quantity
    
    return matrix.tocsr(), user_ids, product_ids
