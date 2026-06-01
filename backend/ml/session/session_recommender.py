"""
Session-Based Recommendation Engine

Gợi ý sản phẩm dựa trên hành vi trong phiên hiện tại:
1. Co-occurrence Matrix: Sản phẩm nào thường được xem/mua cùng nhau trong 1 phiên
2. Sequence-based: Dựa trên thứ tự sản phẩm được xem trong phiên
3. Popularity-based: Sản phẩm phổ biến trong phiên hiện tại
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any
from collections import defaultdict, Counter
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class SessionConfig:
    """Cấu hình cho Session-based Recommender"""
    session_timeout_minutes: int = 30   # Thời gian timeout của 1 phiên (phút)
    max_session_items: int = 50         # Số items tối đa trong 1 phiên
    cooc_top_k: int = 20                # Số neighbors cho co-occurrence
    min_cooc_count: int = 2             # Ngưỡng co-occurrence tối thiểu
    decay_factor: float = 0.8           # Hệ số giảm dần theo thời gian
    top_n: int = 10                     # Số gợi ý mặc định


class CoOccurrenceMatrix:
    """
    Ma trận Co-occurrence cho Session-based recommendations.
    
    "Sản phẩm A thường được xem cùng với sản phẩm B trong cùng một phiên"
    
    Khác với Item-Item CF (dựa trên purchase history),
    Co-occurrence này dựa trên các sản phẩm được xem trong cùng một phiên.
    """

    def __init__(self, config: Optional[SessionConfig] = None):
        self.config = config or SessionConfig()
        self.cooc_matrix: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        self.product_popularity: Dict[str, int] = defaultdict(int)
        self.product_ids: List[str] = []
        self.is_fitted = False

    def fit_from_sessions(self, sessions: List[Dict]):
        """
        Xây dựng ma trận co-occurrence từ lịch sử phiên.
        
        Args:
            sessions: Danh sách phiên [{session_id, items: [product_id, ...], created_at}]
        """
        logger.info(f"Fitting Co-occurrence matrix from {len(sessions)} sessions")
        
        for session in sessions:
            items = session.get('items', [])
            unique_items = list(set(items))  # Dedup trong cùng phiên
            
            # Cập nhật popularity
            for item in unique_items:
                self.product_popularity[item] += 1
            
            # Cập nhật co-occurrence (cặp sản phẩm xuất hiện cùng phiên)
            for i in range(len(unique_items)):
                for j in range(i + 1, len(unique_items)):
                    a, b = unique_items[i], unique_items[j]
                    self.cooc_matrix[a][b] += 1
                    self.cooc_matrix[b][a] += 1
        
        self.product_ids = list(self.product_popularity.keys())
        self.is_fitted = True
        
        logger.info(
            f"Co-occurrence built: {len(self.product_ids)} products, "
            f"{sum(len(v) for v in self.cooc_matrix.values())} pairs"
        )

    def get_cooccurring_products(
        self,
        product_id: str,
        top_n: Optional[int] = None,
    ) -> List[Dict]:
        """
        Lấy sản phẩm thường được xem cùng với product_id.
        
        Args:
            product_id: ID sản phẩm
            top_n: Số lượng kết quả
        
        Returns:
            Danh sách sản phẩm co-occurring
        """
        if not self.is_fitted or product_id not in self.cooc_matrix:
            return []
        
        top_n = top_n or self.config.cooc_top_k
        coocs = self.cooc_matrix[product_id]
        
        # Lọc theo ngưỡng tối thiểu
        filtered = {
            pid: count for pid, count in coocs.items()
            if count >= self.config.min_cooc_count
        }
        
        # Sắp xếp và trả về
        sorted_coocs = sorted(
            filtered.items(),
            key=lambda x: x[1],
            reverse=True,
        )[:top_n]
        
        total = sum(count for _, count in sorted_coocs) or 1
        
        results = []
        for pid, count in sorted_coocs:
            results.append({
                'product_id': pid,
                'cooccurrence_count': count,
                'cooccurrence_score': round(count / total, 4),
            })
        
        return results

    def recommend_from_session(
        self,
        session_items: List[str],
        top_n: Optional[int] = None,
        exclude_ids: Optional[List[str]] = None,
    ) -> List[Dict]:
        """
        Gợi ý sản phẩm dựa trên các sản phẩm trong phiên hiện tại.
        
        Args:
            session_items: Danh sách sản phẩm trong phiên hiện tại
            top_n: Số lượng gợi ý
            exclude_ids: Các sản phẩm cần loại trừ
        
        Returns:
            Danh sách gợi ý
        """
        if not self.is_fitted or not session_items:
            return []
        
        top_n = top_n or self.config.top_n
        exclude_set = set(exclude_ids or [])
        
        # Aggregated scores từ tất cả items trong phiên
        scores = defaultdict(float)
        
        for item in session_items:
            if item in exclude_set:
                continue
            
            coocs = self.cooc_matrix.get(item, {})
            for cooc_pid, count in coocs.items():
                if cooc_pid in exclude_set:
                    continue
                if count < self.config.min_cooc_count:
                    continue
                scores[cooc_pid] += count * self.config.decay_factor
        
        # Sắp xếp
        sorted_scores = sorted(
            scores.items(),
            key=lambda x: x[1],
            reverse=True,
        )
        
        results = []
        for pid, score in sorted_scores:
            if pid in exclude_set or pid in session_items:
                continue
            results.append({
                'product_id': pid,
                'score': float(score),
                'reason': 'Sản phẩm thường được xem cùng với sản phẩm trong phiên của bạn',
            })
            if len(results) >= top_n:
                break
        
        return results


class SequenceBasedRecommender:
    """
    Sequence-based Recommendation.
    
    Dựa trên thứ tự các sản phẩm được xem trong phiên:
    "Sau khi xem sản phẩm A, người dùng thường xem sản phẩm B"
    
    Sử dụng Markov Chain đơn giản: P(next_item | current_item)
    """

    def __init__(self, config: Optional[SessionConfig] = None):
        self.config = config or SessionConfig()
        self.transition_counts: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        self.product_ids: List[str] = []
        self.is_fitted = False

    def fit_from_sessions(self, sessions: List[Dict]):
        """
        Học transition probabilities từ sequence items trong phiên.
        
        Args:
            sessions: Danh sách phiên [{session_id, items: [product_id, ...], created_at}]
        """
        logger.info(f"Fitting Sequence-based model from {len(sessions)} sessions")
        
        for session in sessions:
            items = session.get('items', [])
            
            # Học transitions: item_i -> item_{i+1}
            for i in range(len(items) - 1):
                current = items[i]
                next_item = items[i + 1]
                self.transition_counts[current][next_item] += 1
        
        self.product_ids = list(set(
            pid for trans in self.transition_counts.values()
            for pid in trans.keys()
        ))
        self.is_fitted = True
        
        logger.info(
            f"Sequence model built: {len(self.transition_counts)} source products"
        )

    def predict_next(
        self,
        current_item: str,
        top_n: int = 10,
        exclude_ids: Optional[List[str]] = None,
    ) -> List[Dict]:
        """
        Dự đoán sản phẩm tiếp theo dựa trên sản phẩm hiện tại.
        
        Args:
            current_item: Sản phẩm hiện tại user đang xem
            top_n: Số lượng gợi ý
            exclude_ids: Các sản phẩm cần loại trừ
        
        Returns:
            Danh sách gợi ý sản phẩm tiếp theo
        """
        if not self.is_fitted or current_item not in self.transition_counts:
            return []
        
        exclude_set = set(exclude_ids or [])
        transitions = self.transition_counts[current_item]
        
        total = sum(transitions.values())
        if total == 0:
            return []
        
        sorted_transitions = sorted(
            transitions.items(),
            key=lambda x: x[1],
            reverse=True,
        )
        
        results = []
        for next_pid, count in sorted_transitions:
            if next_pid in exclude_set:
                continue
            
            results.append({
                'product_id': next_pid,
                'probability': round(count / total, 4),
                'transition_count': count,
                'reason': f'Người dùng thường xem sản phẩm này sau khi xem sản phẩm hiện tại',
            })
            if len(results) >= top_n:
                break
        
        return results

    def predict_sequence(
        self,
        session_items: List[str],
        top_n: int = 10,
        exclude_ids: Optional[List[str]] = None,
    ) -> List[Dict]:
        """
        Dự đoán dựa trên toàn bộ sequence trong phiên.
        
        Args:
            session_items: Danh sách sản phẩm trong phiên
            top_n: Số lượng gợi ý
            exclude_ids: Các sản phẩm cần loại trừ
        
        Returns:
            Danh sách gợi ý
        """
        if not self.is_fitted or not session_items:
            return []
        
        exclude_set = set(exclude_ids or [])
        scores = defaultdict(float)
        
        # Weighted sum: items gần cuối phiên có trọng số cao hơn
        for i, item in enumerate(session_items):
            weight = self.config.decay_factor ** (len(session_items) - 1 - i)
            
            transitions = self.transition_counts.get(item, {})
            total = sum(transitions.values())
            if total == 0:
                continue
            
            for next_pid, count in transitions.items():
                prob = count / total
                scores[next_pid] += prob * weight
        
        sorted_scores = sorted(
            scores.items(),
            key=lambda x: x[1],
            reverse=True,
        )
        
        results = []
        for pid, score in sorted_scores:
            if pid in exclude_set or pid in session_items:
                continue
            results.append({
                'product_id': pid,
                'score': float(score),
                'reason': 'Dựa trên chuỗi sản phẩm bạn đã xem trong phiên này',
            })
            if len(results) >= top_n:
                break
        
        return results


class SessionRecommender:
    """
    Session-based Recommender tổng hợp.
    
    Kết hợp:
    1. Co-occurrence matrix
    2. Sequence-based prediction
    3. Popularity trong phiên
    
    Có fallback giữa các phương pháp.
    """

    def __init__(
        self,
        config: Optional[SessionConfig] = None,
    ):
        self.config = config or SessionConfig()
        self.cooccurrence = CoOccurrenceMatrix(config)
        self.sequence = SequenceBasedRecommender(config)

    def fit(self, sessions: List[Dict]):
        """
        Huấn luyện tất cả sub-models.
        
        Args:
            sessions: Danh sách phiên [{session_id, items, created_at}]
        """
        logger.info("Fitting Session Recommender...")
        self.cooccurrence.fit_from_sessions(sessions)
        self.sequence.fit_from_sessions(sessions)
        logger.info("Session Recommender training completed")

    def recommend(
        self,
        session_items: List[str],
        top_n: Optional[int] = None,
        exclude_ids: Optional[List[str]] = None,
        strategy: str = 'hybrid',
    ) -> List[Dict]:
        """
        Gợi ý sản phẩm cho phiên hiện tại.
        
        Args:
            session_items: Danh sách sản phẩm trong phiên
            top_n: Số lượng gợi ý
            exclude_ids: Các sản phẩm cần loại trừ
            strategy: 'hybrid', 'cooccurrence', 'sequence', hoặc 'popularity'
        
        Returns:
            Danh sách gợi ý
        """
        if not session_items:
            return self._popular_fallback(top_n)
        
        top_n = top_n or self.config.top_n
        
        if strategy == 'cooccurrence':
            return self.cooccurrence.recommend_from_session(
                session_items, top_n, exclude_ids
            )
        elif strategy == 'sequence':
            return self.sequence.predict_sequence(
                session_items, top_n, exclude_ids
            )
        elif strategy == 'popularity':
            return self._popular_fallback(top_n)
        else:
            # Hybrid: kết hợp co-occurrence + sequence
            return self._hybrid_recommend(session_items, top_n, exclude_ids)

    def _hybrid_recommend(
        self,
        session_items: List[str],
        top_n: int,
        exclude_ids: Optional[List[str]] = None,
    ) -> List[Dict]:
        """Kết hợp co-occurrence và sequence"""
        # exclude_ids được dùng để loại trừ sản phẩm KHỎI KẾT QUẢ,
        # các sub-method tự xử lý exclude + không recommend lại session_items
        exclude_set = set(exclude_ids or [])
        
        scores = defaultdict(float)
        
        # Co-occurrence scores (weight: 0.6)
        cooc_recs = self.cooccurrence.recommend_from_session(
            session_items, top_n=top_n * 2, exclude_ids=list(exclude_set)
        )
        for rec in cooc_recs:
            scores[rec['product_id']] += 0.6 * rec['score']
        
        # Sequence scores (weight: 0.4)
        seq_recs = self.sequence.predict_sequence(
            session_items, top_n=top_n * 2, exclude_ids=list(exclude_set)
        )
        for rec in seq_recs:
            scores[rec['product_id']] += 0.4 * rec['score']
        
        # Sort và trả về
        sorted_scores = sorted(
            scores.items(),
            key=lambda x: x[1],
            reverse=True,
        )
        
        results = []
        for pid, score in sorted_scores:
            results.append({
                'product_id': pid,
                'score': float(score),
                'reason': 'Gợi ý dựa trên hành vi của bạn trong phiên mua sắm này',
            })
            if len(results) >= top_n:
                break
        
        # Fallback: nếu hybrid không có kết quả
        if not results and cooc_recs:
            results = cooc_recs[:top_n]
        
        return results

    def _popular_fallback(self, top_n: Optional[int] = None) -> List[Dict]:
        """Fallback: trả về sản phẩm phổ biến nhất"""
        if not self.cooccurrence.is_fitted:
            return []
        
        top_n = top_n or self.config.top_n
        sorted_pop = sorted(
            self.cooccurrence.product_popularity.items(),
            key=lambda x: x[1],
            reverse=True,
        )[:top_n]
        
        return [
            {
                'product_id': pid,
                'score': float(count),
                'reason': 'Sản phẩm phổ biến nhất',
            }
            for pid, count in sorted_pop
        ]


def build_sessions_from_views(
    view_logs: List[Dict],
    timeout_minutes: int = 30,
) -> List[Dict]:
    """
    Xây dựng sessions từ dữ liệu view logs.
    
    Args:
        view_logs: Danh sách view logs [{user_id, product_id, timestamp}]
        timeout_minutes: Thời gian timeout để bắt đầu phiên mới
    
    Returns:
        Danh sách sessions [{session_id, user_id, items, created_at}]
    """
    if not view_logs:
        return []
    
    # Sắp xếp theo user và thời gian
    df = pd.DataFrame(view_logs)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values(['user_id', 'timestamp'])
    
    sessions = []
    session_counter = 0
    
    for user_id, user_logs in df.groupby('user_id'):
        user_logs = user_logs.sort_values('timestamp')
        
        current_session_items = []
        session_start = None
        
        for _, log in user_logs.iterrows():
            ts = log['timestamp']
            product_id = log['product_id']
            
            if session_start is None:
                session_start = ts
                current_session_items = [product_id]
            elif (ts - session_start).total_seconds() / 60 > timeout_minutes:
                # Lưu phiên cũ
                if current_session_items:
                    sessions.append({
                        'session_id': f'session_{session_counter}',
                        'user_id': user_id,
                        'items': current_session_items,
                        'created_at': session_start.isoformat(),
                    })
                    session_counter += 1
                
                # Bắt đầu phiên mới
                session_start = ts
                current_session_items = [product_id]
            else:
                current_session_items.append(product_id)
        
        # Lưu phiên cuối
        if current_session_items:
            sessions.append({
                'session_id': f'session_{session_counter}',
                'user_id': user_id,
                'items': current_session_items,
                'created_at': session_start.isoformat() if session_start else None,
            })
            session_counter += 1
    
    logger.info(f"Built {len(sessions)} sessions from view logs")
    return sessions
