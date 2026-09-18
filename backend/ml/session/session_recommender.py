"""
Session-Based Recommendation Engine

Gợi ý sản phẩm dựa trên hành vi trong phiên hiện tại:
1. Co-occurrence Matrix: Sản phẩm nào thường được xem/mua cùng nhau trong 1 phiên
2. Sequence-based: Dựa trên thứ tự sản phẩm được xem trong phiên
3. Popularity-based: Sản phẩm phổ biến trong phiên hiện tại
"""

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


class HSPRecommender:
    """
    Hierarchical Sequence Probability (HSP) — Delianidi et al. (2023).

    Nguồn: "Session-Based Recommendations for e-Commerce with Graph-Based Data Modeling",
    Applied Sciences 13(1), 394, DOI 10.3390/app13010394.

    Dùng các xác suất xuất hiện theo thứ tự (Next relationship):
    - P0(A) — single item probability (cold-start): số lần A xuất hiện / tổng số lần xuất hiện.
    - P1(A,B) — pair sequence probability: P(item_t = B | item_{t-1} = A).
    - P2(A,B,C) — triplet sequence probability: P(item_t = C | item_{t-2} = A, item_{t-1} = B).

    Quy tắc gợi ý theo hierarchy (bài báo Figure 2):
    - Bước 1 (t=1): recommend theo P0 (cold start).
    - Bước 2 (t=2): recommend theo P1(item_1, B), bổ sung P0 nếu chưa đủ.
    - Bước >=3 (t>=3): recommend theo P2(item_{t-2}, item_{t-1}, C),
      bổ sung P1(item_{t-1}, B), rồi mới bổ sung P0. Không trùng lặp item.
    """

    def __init__(self, config: Optional[SessionConfig] = None):
        self.config = config or SessionConfig()
        self.item_counts: Dict[str, int] = defaultdict(int)       # ItemInSession counts
        self.pair_counts: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        self.triplet_counts: Dict[Tuple[str, str], Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        self.total_appearances: int = 0
        self.p0: Dict[str, float] = {}                            # cold-start probability
        self.p1: Dict[str, Dict[str, float]] = {}                 # pair sequence probability
        self.p2: Dict[Tuple[str, str], Dict[str, float]] = {}     # triplet sequence probability
        self.is_fitted = False

    def fit_from_sessions(self, sessions: List[Dict]):
        """
        Học các xác suất P0, P1, P2 từ chuỗi item trong các phiên.

        Args:
            sessions: Danh sách phiên [{session_id, items: [product_id, ...], created_at}]
        """
        logger.info(f"Fitting HSP model from {len(sessions)} sessions")

        for session in sessions:
            items = session.get('items', [])
            n = len(items)

            for i in range(n):
                self.item_counts[items[i]] += 1
                self.total_appearances += 1

                if i + 1 < n:
                    self.pair_counts[items[i]][items[i + 1]] += 1
                if i + 2 < n:
                    key = (items[i], items[i + 1])
                    self.triplet_counts[key][items[i + 2]] += 1

        # P0(A) = appearances(A) / total appearances
        denom = self.total_appearances or 1
        self.p0 = {pid: c / denom for pid, c in self.item_counts.items()}

        # P1(A,B) = count(A,B consecutive) / count(A)
        for a, transitions in self.pair_counts.items():
            denom_a = self.item_counts.get(a, 0) or 1
            self.p1[a] = {b: c / denom_a for b, c in transitions.items()}

        # P2(A,B,C) = count(A,B,C consecutive) / count(A,B consecutive)
        for (a, b), candidates in self.triplet_counts.items():
            denom_ab = self.pair_counts.get(a, {}).get(b, 0) or 1
            self.p2[(a, b)] = {c: cnt / denom_ab for c, cnt in candidates.items()}

        self.is_fitted = True
        logger.info(
            f"HSP built: {len(self.p0)} items, {len(self.p1)} pairs, "
            f"{sum(len(v) for v in self.p2.values())} triplets"
        )

    def _sorted_p0(self) -> List[str]:
        """Các item sắp theo P0 giảm dần"""
        return [pid for pid, _ in sorted(self.p0.items(), key=lambda x: x[1], reverse=True)]

    def recommend(
        self,
        session_items: List[str],
        top_n: Optional[int] = None,
        exclude_ids: Optional[List[str]] = None,
    ) -> List[Dict]:
        """
        Gợi ý item kế tiếp theo hierarchy: triplet (P2) -> pair (P1) -> single (P0).

        Args:
            session_items: Chuỗi item trong phiên hiện tại (đã xem)
            top_n: Số lượng gợi ý
            exclude_ids: Các item cần loại trừ

        Returns:
            Danh sách gợi ý
        """
        if not self.is_fitted or not session_items:
            return []

        top_n = top_n or self.config.top_n
        exclude_set = set(exclude_ids or [])
        exclude_set.update(session_items)  # Không gợi ý lại item đã xem trong phiên
        results: List[Dict] = []
        included = set(exclude_set)

        def _append(pid: str, prob: float, level: str):
            if pid in included:
                return
            included.add(pid)
            results.append({
                'product_id': pid,
                'probability': round(prob, 6),
                'hsp_level': level,
                'reason': {
                    'P0': 'Sản phẩm phổ biến nhất (cold-start)',
                    'P1': 'Sản phẩm thường xem ngay sau sản phẩm gần nhất',
                    'P2': 'Sản phẩm thường xem sau cặp sản phẩm gần nhất',
                }[level],
            })

        n = len(session_items)

        # Bước t >= 3: dùng triplet sequence probability P2
        if n >= 3:
            key = (session_items[-2], session_items[-1])
            for c, prob in sorted(self.p2.get(key, {}).items(), key=lambda x: x[1], reverse=True):
                _append(c, prob, 'P2')
                if len(results) >= top_n:
                    break

        # Bước t >= 2: dùng pair sequence probability P1 (item gần nhất)
        if len(results) < top_n and n >= 2:
            last = session_items[-1]
            for b, prob in sorted(self.p1.get(last, {}).items(), key=lambda x: x[1], reverse=True):
                _append(b, prob, 'P1')
                if len(results) >= top_n:
                    break

        # Bổ sung 0-history predictions (P0) nếu vẫn chưa đủ
        if len(results) < top_n:
            for pid in self._sorted_p0():
                _append(pid, self.p0.get(pid, 0.0), 'P0')
                if len(results) >= top_n:
                    break

        return results[:top_n]


class RICRecommender:
    """
    Recurrent Item Co-occurrence (RIC) — Delianidi et al. (2023).

    Nguồn: "Session-Based Recommendations for e-Commerce with Graph-Based Data Modeling",
    Applied Sciences 13(1), 394, DOI 10.3390/app13010394.

    Dùng quan hệ InSameSession (co-occurrence, không quan tâm thứ tự):
    - gamma(o_i | x) = count(InSameSession(x, o_i)) / count(ItemInSession(x))
      (= confidence of association rule x => o_i)
    - c_i = gamma(o_i | x) nếu gamma > 0, ngược lại c_i = P0(o_i) (cold-start fallback)
    - Bộ nhớ hồi quy bậc 1: w_i(t) = alpha * w_i(t-1) + (1 - alpha) * c_i(t),
      khởi tạo w_i(0) = P0(o_i)

    Hai phiên bản:
    - Plain RIC: giữ nguyên thứ tự (item hiện tại thường ở top vì gamma(x|x)=1)
    - RIC-CiL (Current-item-Last): đẩy item hiện tại xuống cuối danh sách

    Tối ưu: item không co-occurrence với phiên thì c_i = P0 không đổi,
    nên w_i(t) = P0(o_i) suốt phiên — chỉ cần track các item co-occurrence.
    """

    def __init__(self, config: Optional[SessionConfig] = None):
        self.config = config or SessionConfig()
        self.item_session_counts: Dict[str, int] = defaultdict(int)   # ItemInSession counts
        self.cooc_counts: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        self.p0: Dict[str, float] = {}
        self.is_fitted = False

    def fit_from_sessions(self, sessions: List[Dict]):
        """
        Học co-occurrence counts và cold-start probabilities.

        Args:
            sessions: Danh sách phiên [{session_id, items: [product_id, ...], created_at}]
        """
        logger.info(f"Fitting RIC model from {len(sessions)} sessions")

        for session in sessions:
            items = session.get('items', [])
            unique_items = list(dict.fromkeys(items))  # dedup giữ thứ tự

            for item in unique_items:
                self.item_session_counts[item] += 1

            # InSameSession: cặp item xuất hiện cùng phiên (không quan tâm thứ tự)
            for i in range(len(unique_items)):
                for j in range(i + 1, len(unique_items)):
                    a, b = unique_items[i], unique_items[j]
                    self.cooc_counts[a][b] += 1
                    self.cooc_counts[b][a] += 1

        total = sum(self.item_session_counts.values()) or 1
        self.p0 = {pid: c / total for pid, c in self.item_session_counts.items()}
        self.is_fitted = True

        logger.info(
            f"RIC built: {len(self.p0)} items, "
            f"{sum(len(v) for v in self.cooc_counts.values())} co-occurrence pairs"
        )

    def _confidence(self, x: str, oi: str) -> float:
        """gamma(o_i | x) = cooc(x, o_i) / sessions(x)"""
        denom = self.item_session_counts.get(x, 0)
        if denom == 0:
            return 0.0
        return self.cooc_counts.get(x, {}).get(oi, 0) / denom

    def recommend(
        self,
        session_items: List[str],
        top_n: Optional[int] = None,
        exclude_ids: Optional[List[str]] = None,
        alpha: float = 0.5,
        current_item_last: bool = True,
    ) -> List[Dict]:
        """
        Gợi ý item kế tiếp bằng mô hình hồi quy co-occurrence.

        Args:
            session_items: Chuỗi item trong phiên hiện tại
            top_n: Số lượng gợi ý
            exclude_ids: Các item cần loại trừ
            alpha: forgetting factor — trọng số của item đã xem trước đó
                   (bài báo test 0.1–0.9, xem Table 3)
            current_item_last: nếu True (RIC-CiL), đảm bảo item hiện tại
                   không xuất hiện trong top-N. Nếu False (plain RIC), cho
                   phép item hiện tại xuất hiện như trong bài báo.

        Returns:
            Danh sách gợi ý
        """
        if not self.is_fitted or not session_items:
            return []

        top_n = top_n or self.config.top_n
        exclude_set = set(exclude_ids or [])
        current_item = session_items[-1] if session_items else None

        # Candidate set: các item co-occurrence với ít nhất 1 item trong phiên
        candidate_pids = set()
        for item in session_items:
            candidate_pids.update(self.cooc_counts.get(item, {}).keys())

        # Khởi tạo w_i(0) = P0(o_i) cho tất cả item (implicit).
        # Chỉ track trọng số của candidate items.
        weights: Dict[str, float] = {}
        alpha = float(alpha)

        for pid in candidate_pids:
            w = self.p0.get(pid, 0.0)
            for x in session_items:
                gamma = self._confidence(x, pid)
                c_i = gamma if gamma > 0 else self.p0.get(pid, 0.0)
                w = alpha * w + (1 - alpha) * c_i
            weights[pid] = w

        # Non-candidates giữ w = P0 (hằng số) — thêm vào để đủ top_n
        ranked = sorted(weights.items(), key=lambda x: x[1], reverse=True)
        results: List[Dict] = []
        included = set(exclude_set)
        included.update(session_items)

        for pid, w in ranked:
            if pid in included:
                continue
            included.add(pid)
            results.append({
                'product_id': pid,
                'score': float(w),
                'reason': 'Gợi ý dựa trên co-occurrence hồi quy (RIC)' if w > self.p0.get(pid, 0) else 'Gợi ý cold-start theo độ phổ biến',
            })
            if len(results) >= top_n:
                break

        if len(results) < top_n:
            for pid, prob in sorted(self.p0.items(), key=lambda x: x[1], reverse=True):
                if pid in included:
                    continue
                included.add(pid)
                results.append({
                    'product_id': pid,
                    'score': float(prob),
                    'reason': 'Gợi ý cold-start theo độ phổ biến',
                })
                if len(results) >= top_n:
                    break

        # RIC-CiL: đảm bảo item hiện tại không nằm trong top-N.
        # (Session items đã bị loại khỏi kết quả ở trên nên filter này chỉ
        #  phòng trường hợp item hiện tại nằm trong candidate set.)
        if current_item_last and current_item:
            results = [r for r in results if r['product_id'] != current_item]

        return results[:top_n]


class SessionRecommender:
    """
    Session-based Recommender tổng hợp.
    
    Kết hợp:
    1. Co-occurrence matrix
    2. Sequence-based prediction
    3. HSP (Hierarchical Sequence Probability)
    4. RIC (Recurrent Item Co-occurrence)
    5. Popularity trong phiên
    
    Có fallback giữa các phương pháp.
    """

    def __init__(
        self,
        config: Optional[SessionConfig] = None,
        alpha: float = 0.5,
    ):
        self.config = config or SessionConfig()
        self.alpha = float(alpha)  # forgetting factor mặc định cho RIC
        self.cooccurrence = CoOccurrenceMatrix(config)
        self.sequence = SequenceBasedRecommender(config)
        self.hsp = HSPRecommender(config)
        self.ric = RICRecommender(config)

    def fit(self, sessions: List[Dict]):
        """
        Huấn luyện tất cả sub-models.
        
        Args:
            sessions: Danh sách phiên [{session_id, items, created_at}]
        """
        logger.info("Fitting Session Recommender...")
        self.cooccurrence.fit_from_sessions(sessions)
        self.sequence.fit_from_sessions(sessions)
        self.hsp.fit_from_sessions(sessions)
        self.ric.fit_from_sessions(sessions)
        logger.info("Session Recommender training completed")

    def recommend(
        self,
        session_items: List[str],
        top_n: Optional[int] = None,
        exclude_ids: Optional[List[str]] = None,
        strategy: str = 'hybrid',
        alpha: Optional[float] = None,
    ) -> List[Dict]:
        """
        Gợi ý sản phẩm cho phiên hiện tại.
        
        Args:
            session_items: Danh sách sản phẩm trong phiên
            top_n: Số lượng gợi ý
            exclude_ids: Các sản phẩm cần loại trừ
            strategy: 'hybrid', 'cooccurrence', 'sequence', 'hsp', 'ric', 'ric_cil', hoặc 'popularity'
            alpha: forgetting factor cho RIC (chỉ dùng khi strategy là ric/ric_cil;
                   mặc định lấy từ constructor)
        
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
        elif strategy == 'hsp':
            return self.hsp.recommend(session_items, top_n, exclude_ids)
        elif strategy in ('ric', 'ric_cil'):
            # Lưu ý: session items luôn bị loại khỏi kết quả (theo convention dự án),
            # nên 'ric' và 'ric_cil' cho kết quả tương đương nhau trong bản cài đặt này.
            # Khác biệt so với bài báo: plain RIC (γ(x|x)=1) đặt item hiện tại ở top —
            # ở đây item hiện tại bị loại bỏ như một lựa chọn thiết kế cho e-commerce.
            cil = (strategy == 'ric_cil')
            return self.ric.recommend(
                session_items, top_n, exclude_ids,
                alpha=alpha if alpha is not None else self.alpha,
                current_item_last=cil,
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
    
    # Lazy import: chỉ hàm này cần pandas (phần HSP/RIC/co-occurrence thuần Python)
    import pandas as pd
    
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
