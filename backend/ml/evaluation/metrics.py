"""
Evaluation Metrics Module

Các metrics đánh giá chất lượng recommendation system:
1. Precision, Recall, F1 Score
2. Hit Rate (HR)
3. Mean Average Precision (MAP)
4. Normalized Discounted Cumulative Gain (NDCG)
5. CTR (Click-Through Rate) Estimation
6. A/B Test Framework
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any
from collections import defaultdict
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class EvaluationResult:
    """Kết quả đánh giá recommendation"""
    precision: float
    recall: float
    f1_score: float
    hit_rate: float
    map_score: float
    ndcg_score: float
    coverage: float
    popularity_bias: float
    n_samples: int
    details: Optional[Dict] = None


class RecommendationMetrics:
    """
    Tính toán các metrics đánh giá recommendation system.
    
    Các metrics này đo lường:
    - Độ chính xác: precision, recall, F1
    - Độ xếp hạng: MAP, NDCG
    - Độ phủ: coverage (bao nhiêu % sản phẩm được recommend)
    - Độ đa dạng: popularity bias
    """

    @staticmethod
    def precision_at_k(
        recommended: List[str],
        relevant: set,
        k: int = 10,
    ) -> float:
        """
        Precision@K = số lượng relevant trong top-K / K
        
        Bao nhiêu % gợi ý trong top-K là phù hợp?
        """
        if k <= 0 or not recommended:
            return 0.0
        
        top_k = recommended[:k]
        if len(top_k) == 0:
            return 0.0
        
        hits = sum(1 for pid in top_k if pid in relevant)
        return hits / k

    @staticmethod
    def recall_at_k(
        recommended: List[str],
        relevant: set,
        k: int = 10,
    ) -> float:
        """
        Recall@K = số lượng relevant trong top-K / tổng số relevant
        
        Bao nhiêu % sản phẩm phù hợp được recommend trong top-K?
        """
        if not relevant:
            return 0.0
        
        top_k = recommended[:k]
        if len(top_k) == 0:
            return 0.0
        
        hits = sum(1 for pid in top_k if pid in relevant)
        return hits / len(relevant)

    @staticmethod
    def f1_score(precision: float, recall: float) -> float:
        """F1 Score = 2 * precision * recall / (precision + recall)"""
        if precision + recall == 0:
            return 0.0
        return 2 * precision * recall / (precision + recall)

    @staticmethod
    def hit_rate(
        recommendations_list: List[List[str]],
        relevant_list: List[set],
        k: int = 10,
    ) -> float:
        """
        Hit Rate@K = % users có ít nhất 1 relevant product trong top-K
        
        Bao nhiêu % người dùng có gợi ý phù hợp trong top-K?
        """
        if not recommendations_list or len(recommendations_list) != len(relevant_list):
            return 0.0
        
        hits = 0
        for recs, relevant in zip(recommendations_list, relevant_list):
            top_k = set(recs[:k])
            if top_k & relevant:  # Intersection
                hits += 1
        
        return hits / len(recommendations_list)

    @staticmethod
    def average_precision_at_k(
        recommended: List[str],
        relevant: set,
        k: int = 10,
    ) -> float:
        """
        Average Precision@K
        
        AP@K = sum(P@k * rel(k)) / min(K, |relevant|)
        với rel(k) = 1 nếu item thứ k là relevant
        """
        if not relevant:
            return 0.0
        
        top_k = recommended[:k]
        if not top_k:
            return 0.0
        
        score = 0.0
        hits = 0
        
        for i, pid in enumerate(top_k):
            if pid in relevant:
                hits += 1
                score += hits / (i + 1)
        
        return score / min(k, len(relevant))

    @staticmethod
    def mean_average_precision(
        recommendations_list: List[List[str]],
        relevant_list: List[set],
        k: int = 10,
    ) -> float:
        """
        MAP@K = mean của AP@K trên tất cả users
        
        MAP là metric tổng hợp phổ biến nhất cho recommendation systems.
        """
        if not recommendations_list:
            return 0.0
        
        ap_scores = [
            RecommendationMetrics.average_precision_at_k(recs, rel, k)
            for recs, rel in zip(recommendations_list, relevant_list)
        ]
        
        return float(np.mean(ap_scores)) if ap_scores else 0.0

    @staticmethod
    def dcg_at_k(
        recommended: List[str],
        relevant: set,
        k: int = 10,
    ) -> float:
        """
        DCG@K = sum(rel(i) / log2(i+1))
        
        Discounted Cumulative Gain: đánh giá thứ tự xếp hạng,
        items relevant ở vị trí cao hơn được thưởng nhiều hơn.
        """
        top_k = recommended[:k]
        if not top_k:
            return 0.0
        
        dcg = 0.0
        for i, pid in enumerate(top_k):
            if pid in relevant:
                dcg += 1.0 / np.log2(i + 2)  # i+2 vì log2(1) = 0
        
        return dcg

    @staticmethod
    def ndcg_at_k(
        recommended: List[str],
        relevant: set,
        k: int = 10,
    ) -> float:
        """
        NDCG@K = DCG@K / IDCG@K
        
        Normalized DCG: chuẩn hóa DCG về [0, 1].
        IDCG = DCG của xếp hạng lý tưởng (tất cả relevant items ở đầu).
        """
        top_k = recommended[:k]
        if not top_k or not relevant:
            return 0.0
        
        dcg = RecommendationMetrics.dcg_at_k(recommended, relevant, k)
        
        # Ideal DCG: tất cả relevant items ở đầu
        ideal_count = min(k, len(relevant))
        idcg = sum(1.0 / np.log2(i + 2) for i in range(ideal_count))
        
        return dcg / idcg if idcg > 0 else 0.0

    @staticmethod
    def coverage(
        all_recommendations: List[List[str]],
        total_products: int,
    ) -> float:
        """
        Coverage = số lượng sản phẩm unique được recommend / tổng số sản phẩm
        
        Đo lường độ phủ của recommendation system.
        Coverage cao = system có thể recommend nhiều sản phẩm khác nhau.
        """
        if total_products == 0:
            return 0.0
        
        recommended_products = set()
        for recs in all_recommendations:
            recommended_products.update(recs)
        
        return len(recommended_products) / total_products

    @staticmethod
    def popularity_bias(
        all_recommendations: List[List[str]],
        product_popularity: Dict[str, int],
    ) -> float:
        """
        Popularity Bias: đo lường xu hướng recommend sản phẩm phổ biến.
        
        Gini coefficient thấp = ít bias (recommend cả sản phẩm ít phổ biến)
        Gini coefficient cao = bias nhiều (chỉ recommend sản phẩm hot)
        """
        if not all_recommendations or not product_popularity:
            return 0.0
        
        # Đếm tần suất mỗi sản phẩm được recommend
        rec_counts = defaultdict(int)
        for recs in all_recommendations:
            for pid in recs:
                rec_counts[pid] += 1
        
        if not rec_counts:
            return 0.0
        
        # Tính Gini coefficient
        values = np.array(list(rec_counts.values()), dtype=float)
        values.sort()
        
        n = len(values)
        if n == 0:
            return 0.0
        
        # Gini = 2 * sum(i * v_i) / (n * sum(v)) - (n+1)/n
        index = np.arange(1, n + 1)
        gini = (2 * np.sum(index * values) / (n * np.sum(values))) - (n + 1) / n
        
        return float(gini)

    @staticmethod
    def evaluate_all(
        recommendations_list: List[List[str]],
        relevant_list: List[set],
        product_popularity: Optional[Dict[str, int]] = None,
        total_products: int = 0,
        k: int = 10,
    ) -> EvaluationResult:
        """
        Tính toán tất cả metrics cùng một lúc.
        
        Args:
            recommendations_list: Danh sách recommendations cho từng user
            relevant_list: Danh sách relevant products cho từng user
            product_popularity: Dict product_id -> popularity count
            total_products: Tổng số sản phẩm trong hệ thống
            k: Top-K
        
        Returns:
            EvaluationResult với tất cả metrics
        """
        if not recommendations_list or not relevant_list:
            return EvaluationResult(
                precision=0.0, recall=0.0, f1_score=0.0,
                hit_rate=0.0, map_score=0.0, ndcg_score=0.0,
                coverage=0.0, popularity_bias=0.0, n_samples=0,
            )
        
        n = len(recommendations_list)
        
        precisions = []
        recalls = []
        
        for recs, rel in zip(recommendations_list, relevant_list):
            precisions.append(
                RecommendationMetrics.precision_at_k(recs, rel, k)
            )
            recalls.append(
                RecommendationMetrics.recall_at_k(recs, rel, k)
            )
        
        precision = float(np.mean(precisions)) if precisions else 0.0
        recall = float(np.mean(recalls)) if recalls else 0.0
        
        map_score = RecommendationMetrics.mean_average_precision(
            recommendations_list, relevant_list, k
        )
        
        ndcg_list = [
            RecommendationMetrics.ndcg_at_k(recs, rel, k)
            for recs, rel in zip(recommendations_list, relevant_list)
        ]
        ndcg_score = float(np.mean(ndcg_list)) if ndcg_list else 0.0
        
        hit_rate = RecommendationMetrics.hit_rate(
            recommendations_list, relevant_list, k
        )
        
        cov = RecommendationMetrics.coverage(
            recommendations_list, total_products
        ) if total_products > 0 else 0.0
        
        pop_bias = RecommendationMetrics.popularity_bias(
            recommendations_list, product_popularity or {}
        ) if product_popularity else 0.0
        
        return EvaluationResult(
            precision=precision,
            recall=recall,
            f1_score=RecommendationMetrics.f1_score(precision, recall),
            hit_rate=hit_rate,
            map_score=map_score,
            ndcg_score=ndcg_score,
            coverage=cov,
            popularity_bias=pop_bias,
            n_samples=n,
            details={
                'individual_precisions': precisions,
                'individual_recalls': recalls,
                'individual_ndcg': ndcg_list,
            },
        )


class ABTestFramework:
    """
    A/B Test Framework cho Recommendation Systems.
    
    Cho phép so sánh hiệu quả giữa các phương pháp recommendation:
    - Control group: phương pháp hiện tại
    - Treatment group: phương pháp mới
    
    Metrics so sánh:
    - Click-through rate (CTR)
    - Conversion rate
    - Revenue per user
    - Average order value
    """

    def __init__(self, confidence_level: float = 0.95):
        """
        Args:
            confidence_level: Mức độ tin cậy cho statistical significance
        """
        self.confidence_level = confidence_level
        self.results: Dict[str, List[Dict]] = defaultdict(list)

    def log_interaction(
        self,
        group: str,
        user_id: str,
        product_id: str,
        action: str,  # 'impression', 'click', 'add_to_cart', 'purchase'
        timestamp: Optional[str] = None,
        revenue: float = 0.0,
        **kwargs,
    ):
        """
        Ghi nhận tương tác của user với recommendation.
        
        Args:
            group: Tên nhóm ('control' hoặc 'treatment')
            user_id: ID người dùng
            product_id: ID sản phẩm
            action: Hành động
            timestamp: Thời gian
            revenue: Doanh thu (nếu action = 'purchase')
        """
        self.results[group].append({
            'user_id': user_id,
            'product_id': product_id,
            'action': action,
            'timestamp': timestamp or datetime.now().isoformat(),
            'revenue': revenue,
            **kwargs,
        })

    def get_ctr(self, group: str) -> float:
        """
        Tính CTR (Click-Through Rate) cho một nhóm.
        
        CTR = số clicks / số impressions
        """
        logs = self.results.get(group, [])
        if not logs:
            return 0.0
        
        impressions = sum(1 for log in logs if log['action'] == 'impression')
        clicks = sum(1 for log in logs if log['action'] == 'click')
        
        return clicks / impressions if impressions > 0 else 0.0

    def get_conversion_rate(self, group: str) -> float:
        """
        Tính conversion rate.
        
        CR = số purchases / số clicks
        """
        logs = self.results.get(group, [])
        if not logs:
            return 0.0
        
        clicks = sum(1 for log in logs if log['action'] == 'click')
        purchases = sum(1 for log in logs if log['action'] == 'purchase')
        
        return purchases / clicks if clicks > 0 else 0.0

    def get_revenue_per_user(self, group: str) -> float:
        """Tính doanh thu trung bình trên mỗi user"""
        logs = self.results.get(group, [])
        if not logs:
            return 0.0
        
        unique_users = set(log['user_id'] for log in logs)
        total_revenue = sum(log['revenue'] for log in logs if log['action'] == 'purchase')
        
        return total_revenue / len(unique_users) if unique_users else 0.0

    def get_funnel_metrics(self, group: str) -> Dict:
        """
        Lấy metrics theo funnel: impression -> click -> add_to_cart -> purchase.
        
        Returns:
            Dict với các metrics từng bước
        """
        logs = self.results.get(group, [])
        if not logs:
            return {
                'impressions': 0,
                'clicks': 0,
                'add_to_carts': 0,
                'purchases': 0,
                'ctr': 0.0,
                'click_to_cart': 0.0,
                'cart_to_purchase': 0.0,
                'overall_conversion': 0.0,
                'revenue': 0.0,
            }
        
        impressions = sum(1 for log in logs if log['action'] == 'impression')
        clicks = sum(1 for log in logs if log['action'] == 'click')
        add_to_carts = sum(1 for log in logs if log['action'] == 'add_to_cart')
        purchases = sum(1 for log in logs if log['action'] == 'purchase')
        revenue = sum(log['revenue'] for log in logs if log['action'] == 'purchase')
        
        unique_users = set(log['user_id'] for log in logs)

        return {
            'total_events': len(logs),
            'impressions': impressions,
            'clicks': clicks,
            'add_to_carts': add_to_carts,
            'purchases': purchases,
            'revenue': revenue,
            'unique_users': len(unique_users),
            'ctr': (clicks / impressions) if impressions > 0 else 0.0,
            'click_to_cart': (add_to_carts / clicks) if clicks > 0 else 0.0,
            'cart_to_purchase': (purchases / add_to_carts) if add_to_carts > 0 else 0.0,
            'overall_conversion': (purchases / impressions) if impressions > 0 else 0.0,
        }

    def compare_groups(self, group_a: str, group_b: str) -> Dict:
        """
        So sánh hiệu quả giữa 2 nhóm.
        
        Args:
            group_a: Control group
            group_b: Treatment group
        
        Returns:
            Dict với kết quả so sánh
        """
        metrics_a = self.get_funnel_metrics(group_a)
        metrics_b = self.get_funnel_metrics(group_b)
        
        comparison = {}
        for metric in ['ctr', 'click_to_cart', 'cart_to_purchase', 'overall_conversion']:
            val_a = metrics_a[metric]
            val_b = metrics_b[metric]
            
            if val_a > 0:
                improvement = ((val_b - val_a) / val_a) * 100
            elif val_b > 0:
                improvement = 999.99  # Không có dữ liệu cũ, ước lượng cải thiện rất lớn
            else:
                improvement = 0.0
            
            comparison[metric] = {
                f'{group_a}': val_a,
                f'{group_b}': val_b,
                'improvement_pct': round(improvement, 2),
                'winner': group_b if val_b > val_a else group_a,
            }
        
        comparison['revenue'] = {
            f'{group_a}': metrics_a['revenue'],
            f'{group_b}': metrics_b['revenue'],
            'improvement_pct': (
                ((metrics_b['revenue'] - metrics_a['revenue']) / metrics_a['revenue']) * 100
                if metrics_a['revenue'] > 0 else 0
            ),
        }
        
        comparison['sample_size'] = {
            f'{group_a}': metrics_a['impressions'],
            f'{group_b}': metrics_b['impressions'],
        }
        
        return comparison

    def get_summary_report(self) -> Dict:
        """Lấy báo cáo tổng hợp cho tất cả nhóm"""
        groups = list(self.results.keys())
        
        if len(groups) < 2:
            return {
                'groups': groups,
                'message': 'Cần ít nhất 2 nhóm để so sánh. Thêm group với log_interaction().',
                'metrics_per_group': {
                    group: self.get_funnel_metrics(group)
                    for group in groups
                },
            }
        
        # So sánh tất cả cặp
        comparisons = {}
        for i in range(len(groups)):
            for j in range(i + 1, len(groups)):
                key = f'{groups[i]}_vs_{groups[j]}'
                comparisons[key] = self.compare_groups(groups[i], groups[j])
        
        return {
            'groups': groups,
            'confidence_level': self.confidence_level,
            'comparisons': comparisons,
            'metrics_per_group': {
                group: self.get_funnel_metrics(group)
                for group in groups
            },
        }

    def reset(self):
        """Reset tất cả dữ liệu"""
        self.results.clear()


# Utility functions

def train_test_split_by_time(
    orders_data: List[Dict],
    test_ratio: float = 0.2,
) -> Tuple[List[Dict], List[Dict]]:
    """
    Chia dữ liệu train/test theo thời gian.
    
    Args:
        orders_data: Danh sách đơn hàng [{user_id, product_id, created_at, ...}]
        test_ratio: Tỷ lệ dữ liệu test
    
    Returns:
        (train_data, test_data)
    """
    if not orders_data:
        return [], []
    
    # Sắp xếp theo thời gian
    sorted_data = sorted(
        orders_data,
        key=lambda x: x.get('created_at', ''),
    )
    
    split_idx = int(len(sorted_data) * (1 - test_ratio))
    
    train_data = sorted_data[:split_idx]
    test_data = sorted_data[split_idx:]
    
    return train_data, test_data


def build_relevant_set(
    orders_data: List[Dict],
    user_id: str,
) -> set:
    """
    Xây dựng set các sản phẩm relevant cho user.
    
    Args:
        orders_data: Danh sách đơn hàng
        user_id: ID người dùng
    
    Returns:
        Set product IDs đã mua
    """
    return set(
        o['product_id'] for o in orders_data
        if o.get('user_id') == user_id and 'product_id' in o
    )
