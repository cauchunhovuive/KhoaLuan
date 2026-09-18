"""
Graph CF nhẹ — LightGCN-like Collaborative Filtering (không cần PyTorch)
========================================================================

Mô phỏng ý tưởng lan truyền tín hiệu cộng tác của LightGCN (He et al. 2020)
chỉ dùng numpy + scipy sparse matrix, dựa trên bài báo:
    Benli Li, Hainian Zhang, "LightGCN-CF Hybrid Recommendation Algorithm...",
    ACM BDEIM 2025, DOI 10.1145/3800000.3800213.

Điểm mạnh:
- Không cần GPU / PyTorch — chạy được trên máy thường
- Lan truyền embedding qua đồ thị hai phía user-item (chuẩn hóa D^-1/2 A D^-1/2)
- Kết hợp embedding các lớp bằng mean pooling (giống LightGCN)
- Tích hợp được với `build_user_product_matrix` của collaborative_filtering hiện có

Lưu ý: đây là phiên bản nhẹ (linear algebra thuần), không có BPR loss học
end-to-end như LightGCN gốc — dùng Random Walk / PageRank-style propagation.
"""

import time
import logging
from typing import Dict, List, Optional, Tuple

import numpy as np
import scipy.sparse as sp

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GraphCFRecommender:
    """
    Graph-based CF nhẹ (LightGCN-like).

    Ý tưởng:
    1. Xây đồ thị hai phía user-item từ ma trận tương tác.
    2. Chuẩn hóa adjacency: A_norm = D^-1/2 * A * D^-1/2 (như LightGCN).
    3. Gán embedding khởi tạo ngẫu nhiên cho user & item.
    4. Lan truyền L lớp: E^(k+1) = A_norm * E^k.
    5. Embedding cuối = mean của các lớp (mean pooling).
    6. Score(u,i) = <user_emb[u], item_emb[i]>.
    """

    def __init__(
        self,
        n_layers: int = 3,
        latent_dim: int = 64,
        random_state: int = 42,
    ):
        self.n_layers = n_layers
        self.latent_dim = latent_dim
        self.random_state = random_state

        self.n_users: int = 0
        self.n_items: int = 0
        self.user_emb: Optional[np.ndarray] = None
        self.item_emb: Optional[np.ndarray] = None
        self.dataset = None
        self.is_fitted = False

    # ---- Dữ liệu: nhận dataset LightGCN hoặc ma trận thưa ----
    def fit(
        self,
        dataset=None,
        user_item_matrix: Optional[sp.csr_matrix] = None,
        user_ids: Optional[List[str]] = None,
        product_ids: Optional[List[str]] = None,
    ):
        """
        Huấn luyện Graph CF.

        Args:
            dataset: LightGCNCFDataset (có .UserItemNet, .n_users, .n_items)
            user_item_matrix: user-item sparse matrix (n_users x n_items)
            user_ids, product_ids: danh sách ID tương ứng
        """
        if dataset is not None:
            self.n_users = dataset.n_users
            self.n_items = dataset.n_items
            self.UserItemNet = dataset.UserItemNet
            self._user_ids = list(range(self.n_users))
            self._product_ids = list(range(self.n_items))
            self.dataset = dataset
        else:
            if user_item_matrix is None:
                raise ValueError("Cần dataset hoặc user_item_matrix")
            self.UserItemNet = user_item_matrix.tocsr()
            self.n_users, self.n_items = self.UserItemNet.shape
            self._user_ids = user_ids or [str(i) for i in range(self.n_users)]
            self._product_ids = product_ids or [str(i) for i in range(self.n_items)]
            self.dataset = None

        logger.info(
            f"Graph CF: {self.n_users} users x {self.n_items} items, "
            f"{self.n_layers} layers, dim={self.latent_dim}"
        )

        A_norm = self._build_normalized_graph()

        # Embedding khởi tạo
        rng = np.random.RandomState(self.random_state)
        emb = rng.randn(self.n_users + self.n_items, self.latent_dim) * 0.1

        # Lan truyền L lớp
        embs = [emb]
        current = emb
        for _ in range(self.n_layers):
            current = A_norm.dot(current)
            embs.append(current)

        # Mean pooling (như LightGCN)
        final = np.mean(np.stack(embs, axis=0), axis=0)

        self.user_emb = final[:self.n_users]
        self.item_emb = final[self.n_users:]
        self.is_fitted = True
        logger.info("Graph CF training completed")
        return self

    def _build_normalized_graph(self) -> sp.csr_matrix:
        """Xây adjacency chuẩn hóa D^-1/2 A D^-1/2 của đồ thị hai phía."""
        n = self.n_users + self.n_items
        R = self.UserItemNet.tolil()

        adj = sp.lil_matrix((n, n), dtype=np.float32)
        adj[:self.n_users, self.n_users:] = R
        adj[self.n_users:, :self.n_users] = R.T
        adj = adj.tocsr()

        rowsum = np.array(adj.sum(axis=1)).flatten()
        d_inv = np.power(rowsum, -0.5)
        d_inv[np.isinf(d_inv)] = 0.0
        d_mat = sp.diags(d_inv)

        norm_adj = d_mat.dot(adj).dot(d_mat)
        return norm_adj.tocsr()

    # ---- Recommendation ----
    def _resolve_user_idx(self, user_id) -> Optional[int]:
        """Chuyển user_id (string hoặc int index) về row index."""
        if isinstance(user_id, str):
            if user_id not in self._user_ids:
                return None
            return self._user_ids.index(user_id)
        u = int(user_id)
        if not (0 <= u < self.n_users):
            return None
        return u

    def recommend(
        self,
        user_id,
        top_n: int = 10,
        exclude_ids: Optional[List[str]] = None,
    ) -> List[Dict]:
        """Gợi ý top-N item cho user (hỗ trợ user_id string hoặc int index)."""
        if not self.is_fitted:
            raise RuntimeError("Model chưa được huấn luyện!")

        u = self._resolve_user_idx(user_id)
        if u is None:
            return []

        scores = self.user_emb[u].dot(self.item_emb.T)

        exclude_set = set(exclude_ids or [])
        if self.dataset is not None:
            exclude_set.update(
                self._product_ids[p] for p in self.dataset.all_pos[u]
            )

        results = []
        for idx in np.argsort(scores)[::-1]:
            pid = self._product_ids[idx]
            if pid in exclude_set:
                continue
            if scores[idx] <= 0:
                continue
            results.append({
                'product_id': pid,
                'score': float(scores[idx]),
                'reason': 'Gợi ý lan truyền tín hiệu cộng tác trên đồ thị (Graph CF)',
            })
            if len(results) >= top_n:
                break
        return results

    def evaluate(self, ks: List[int] = (10, 20), n_eval_users: Optional[int] = None) -> Dict:
        """Đánh giá Recall@K và NDCG@K trên test set (cần dataset LightGCN)."""
        if self.dataset is None:
            raise ValueError("evaluate() cần dataset LightGCN (test_dict)")
        ds = self.dataset

        test_users = list(ds.test_dict.keys())
        if n_eval_users:
            rng = np.random.RandomState(42)
            test_users = rng.choice(
                test_users, min(n_eval_users, len(test_users)), replace=False
            )

        # Tính điểm theo từng user (tránh materialize ma trận dense n_users x n_items)
        rec = {k: 0 for k in ks}
        ndcg = {k: 0.0 for k in ks}

        for u in test_users:
            scores = self.user_emb[u].dot(self.item_emb.T)
            exclude = set(ds.all_pos[u].tolist())
            order = [i for i in np.argsort(scores)[::-1] if i not in exclude]
            top_items = order[:max(ks)]
            pos_set = set(ds.test_dict[u])

            for k in ks:
                top_k = top_items[:k]
                hits = sum(1 for i in top_k if i in pos_set)
                if hits > 0:
                    rec[k] += 1
                dcg = sum(
                    1.0 / np.log2(r_i + 2)
                    for r_i, item in enumerate(top_k)
                    if item in pos_set
                )
                idcg = sum(
                    1.0 / np.log2(r_i + 2)
                    for r_i in range(min(k, len(pos_set)))
                )
                ndcg[k] += dcg / idcg if idcg > 0 else 0.0

        n = len(test_users)
        return {
            **{f'recall@{k}': round(rec[k] / n, 4) for k in ks},
            **{f'ndcg@{k}': round(ndcg[k] / n, 4) for k in ks},
            'n_eval_users': n,
        }
