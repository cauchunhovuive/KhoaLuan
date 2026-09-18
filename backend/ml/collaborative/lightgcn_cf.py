"""
LightGCN-CF — Hybrid Recommendation Algorithm
==============================================

Nguồn: Benli Li, Hainian Zhang, "LightGCN-CF Hybrid Recommendation Algorithm
Integrating Graph Convolutional Networks and Collaborative Filtering for
Cross-Border Product Selection Optimization", ACM BDEIM 2025,
DOI 10.1145/3800000.3800213.

Bài báo kết hợp:
1. LightGCN (He et al., SIGIR 2020) — GCN trên đồ thị hai phía user-item,
   lan truyền tín hiệu cộng tác bậc cao qua nhiều lớp gộp nhẹ.
2. CF module — sinh pseudo-interactions cho sản phẩm cold-start dựa trên độ
   tương tự item, giúp sản phẩm mới vẫn được gợi ý.
3. Hybrid prediction — kết hợp điểm đồ thị (GCN) và điểm CF bằng trọng số học
   được (learnable weight), tối ưu bằng Bayesian Personalized Ranking (BPR) loss.

Chạy benchmark:
    python -m collaborative.benchmark_lightgcn_cf --dataset gowalla --epochs 30

Ghi chú thiết kế (tránh OOM):
- Ma trận item-similarity giữ dạng SPARSE, chỉ giữ top-k hàng xóm / item.
- Điểm CF tính theo user (không materialize ma trận dense n_users x n_items).
- Pseudo-interactions chỉ sinh cho item COLD-START (không có tương tác trong train).
"""

import os
import time
import logging
from typing import Dict, List, Optional, Tuple

import numpy as np
import scipy.sparse as sp
import torch
import torch.nn as nn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

DATASET_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'datasets'
)


# ============================================================
# Dataset loader (LightGCN format)
# ============================================================

class LightGCNCFDataset:
    """
    Load dataset benchmark của LightGCN.

    Định dạng train.txt / test.txt: mỗi dòng "user_id item1 item2 ..."
    (index bắt đầu từ 0). Xây ma trận UserItemNet và đồ thị chuẩn hóa.
    """

    def __init__(self, path: str):
        self.path = path
        self.n_users = 0
        self.n_items = 0
        self.train_user: List[int] = []
        self.train_item: List[int] = []
        self.test_dict: Dict[int, List[int]] = {}
        self.all_pos: List[np.ndarray] = []
        self.UserItemNet: Optional[sp.csr_matrix] = None
        self._graph = None

        self._load()

    def _load(self):
        train_file = os.path.join(self.path, 'train.txt')
        test_file = os.path.join(self.path, 'test.txt')

        if not os.path.exists(train_file) or not os.path.exists(test_file):
            raise FileNotFoundError(
                f"Không tìm thấy dataset trong {self.path}. "
                "Tải về từ: https://github.com/gusye1234/LightGCN-PyTorch "
                "(thư mục data/gowalla, data/yelp2018, data/amazon-book)"
            )

        # Đọc train
        with open(train_file) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                parts = line.split(' ')
                uid = int(parts[0])
                items = [int(x) for x in parts[1:] if x != '']
                if not items:
                    continue
                self.train_user.extend([uid] * len(items))
                self.train_item.extend(items)
                self.n_users = max(self.n_users, uid)
                self.n_items = max(self.n_items, max(items))

        # Đọc test
        with open(test_file) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                parts = line.split(' ')
                uid = int(parts[0])
                items = [int(x) for x in parts[1:] if x != '']
                if not items:
                    continue
                self.test_dict[uid] = items
                self.n_users = max(self.n_users, uid)
                self.n_items = max(self.n_items, max(items))

        self.n_users += 1
        self.n_items += 1

        # Ma trận user-item (binary)
        self.UserItemNet = sp.csr_matrix(
            (np.ones(len(self.train_user)), (self.train_user, self.train_item)),
            shape=(self.n_users, self.n_items),
        )

        # allPos: list index theo user
        self.all_pos = self.get_user_pos_items(list(range(self.n_users)))

        logger.info(
            f"Dataset: {self.n_users} users, {self.n_items} items, "
            f"{len(self.train_user)} train interactions, "
            f"{sum(len(v) for v in self.test_dict.values())} test interactions"
        )

    def get_user_pos_items(self, users: List[int]) -> List[np.ndarray]:
        return [self.UserItemNet[u].nonzero()[1] for u in users]

    @classmethod
    def from_matrix(
        cls,
        matrix: sp.csr_matrix,
        user_ids: Optional[List[str]] = None,
        product_ids: Optional[List[str]] = None,
    ) -> "LightGCNCFDataset":
        """
        Xây dataset từ ma trận user-item thưa có sẵn (không cần file).

        Dùng khi tích hợp API: nhận ma trận từ build_user_product_matrix()
        của collaborative_filtering và map lại ID string → index.
        """
        obj = cls.__new__(cls)
        obj.path = ""
        obj.n_users, obj.n_items = matrix.shape
        obj.UserItemNet = matrix.tocsr()
        obj.train_user = []
        obj.train_item = []
        obj.test_dict = {}
        obj.all_pos = obj.get_user_pos_items(list(range(obj.n_users)))
        obj._graph = None
        obj.user_ids = user_ids or [str(i) for i in range(obj.n_users)]
        obj.product_ids = product_ids or [str(i) for i in range(obj.n_items)]
        return obj

    # ---- Graph construction (LightGCN normalized adjacency) ----
    def _convert_sp_mat_to_sp_tensor(self, X: sp.spmatrix) -> torch.Tensor:
        coo = X.tocoo().astype(np.float32)
        index = torch.LongTensor(np.vstack([coo.row, coo.col]))
        data = torch.FloatTensor(coo.data)
        return torch.sparse_coo_tensor(index, data, torch.Size(coo.shape))

    def get_sparse_graph(self) -> torch.Tensor:
        """
        Xây đồ thị hai phía chuẩn hóa: A = [[0, R], [R^T, 0]],
        normalize: D^-1/2 * A * D^-1/2.
        """
        if self._graph is not None:
            return self._graph

        adj_mat = sp.dok_matrix(
            (self.n_users + self.n_items, self.n_users + self.n_items),
            dtype=np.float32,
        ).tolil()
        R = self.UserItemNet.tolil()
        adj_mat[:self.n_users, self.n_users:] = R
        adj_mat[self.n_users:, :self.n_users] = R.T
        adj_mat = adj_mat.todok()

        rowsum = np.array(adj_mat.sum(axis=1))
        d_inv = np.power(rowsum, -0.5).flatten()
        d_inv[np.isinf(d_inv)] = 0.
        d_mat = sp.diags(d_inv)

        norm_adj = d_mat.dot(adj_mat)
        norm_adj = norm_adj.dot(d_mat)
        norm_adj = norm_adj.tocsr()

        self._graph = self._convert_sp_mat_to_sp_tensor(norm_adj).coalesce().to(DEVICE)
        return self._graph


# ============================================================
# LightGCN-CF Model (backbone GCN + learnable fusion weight)
# ============================================================

class LightGCNCF(nn.Module):
    """
    LightGCN backbone với trọng số fusion học được.

    Điểm CF được tính ngoài (scipy sparse, xem LightGCNCFRecommender) và truyền
    vào bpr_loss — tránh indexing sparse tensor theo batch (PyTorch không hỗ trợ).
    """

    def __init__(
        self,
        n_users: int,
        n_items: int,
        graph: torch.Tensor,
        latent_dim: int = 64,
        n_layers: int = 3,
        fusion_init: float = 0.5,
    ):
        super().__init__()
        self.n_users = n_users
        self.n_items = n_items
        self.latent_dim = latent_dim
        self.n_layers = n_layers
        self.graph = graph

        self.embedding_user = nn.Embedding(n_users, latent_dim)
        self.embedding_item = nn.Embedding(n_items, latent_dim)
        nn.init.normal_(self.embedding_user.weight, std=0.1)
        nn.init.normal_(self.embedding_item.weight, std=0.1)

        # Trọng số fusion học được: final = w * gcn + (1-w) * cf
        self.fusion_weight = nn.Parameter(torch.tensor(float(fusion_init)))

    def computer(self) -> Tuple[torch.Tensor, torch.Tensor]:
        """Lan truyền LightGCN qua L lớp rồi mean-combine."""
        users_emb = self.embedding_user.weight
        items_emb = self.embedding_item.weight
        all_emb = torch.cat([users_emb, items_emb])

        embs = [all_emb]
        for _ in range(self.n_layers):
            all_emb = torch.sparse.mm(self.graph, all_emb)
            embs.append(all_emb)

        light_out = torch.mean(torch.stack(embs, dim=1), dim=1)
        users, items = torch.split(light_out, [self.n_users, self.n_items])
        return users, items

    def bpr_loss(
        self,
        users: torch.Tensor,
        pos: torch.Tensor,
        neg: torch.Tensor,
        pos_cf: torch.Tensor,
        neg_cf: torch.Tensor,
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        BPR loss trên điểm fusion (GCN + CF).

        Args:
            users, pos, neg: index user, item dương, item âm (LongTensor)
            pos_cf, neg_cf: điểm CF tương ứng (tính sẵn từ recommender)

        Returns:
            (bpr_loss, reg_loss)
        """
        all_users, all_items = self.computer()
        users_emb = all_users[users.long()]
        pos_emb = all_items[pos.long()]
        neg_emb = all_items[neg.long()]

        pos_gcn = torch.sum(users_emb * pos_emb, dim=1)
        neg_gcn = torch.sum(users_emb * neg_emb, dim=1)

        w = torch.sigmoid(self.fusion_weight)
        pos_scores = w * pos_gcn + (1 - w) * pos_cf
        neg_scores = w * neg_gcn + (1 - w) * neg_cf

        loss = torch.mean(torch.nn.functional.softplus(neg_scores - pos_scores))

        users_emb_ego = self.embedding_user(users.long())
        pos_emb_ego = self.embedding_item(pos.long())
        neg_emb_ego = self.embedding_item(neg.long())
        reg_loss = (1 / 2) * (
            users_emb_ego.norm(2).pow(2)
            + pos_emb_ego.norm(2).pow(2)
            + neg_emb_ego.norm(2).pow(2)
        ) / float(len(users))

        return loss, reg_loss


# ============================================================
# Recommender wrapper (CF scores + pseudo-interactions)
# ============================================================

class LightGCNCFRecommender:
    """
    Wrapper huấn luyện + gợi ý bằng LightGCN-CF.

    - Sinh pseudo-interactions cho item cold-start (không có tương tác trong
      train): tìm top-k item tương tự (cosine theo cột UserItemNet) và tạo cạnh
      ảo từ các user đã tương tác với item tương tự đó.
    - Điểm CF: cf_score(u, i) = sum_{j trong interactions_pseudo(u)} sim(j, i),
      tính bằng sparse matmul (an toàn bộ nhớ).
    """

    def __init__(
        self,
        latent_dim: int = 64,
        n_layers: int = 3,
        epochs: int = 50,
        batch_size: int = 2048,
        lr: float = 0.001,
        reg: float = 1e-4,
        fusion_init: float = 0.5,
        sim_k: int = 50,
    ):
        self.latent_dim = latent_dim
        self.n_layers = n_layers
        self.epochs = epochs
        self.batch_size = batch_size
        self.lr = lr
        self.reg = reg
        self.fusion_init = fusion_init
        self.sim_k = sim_k  # số hàng xóm top-k cho ma trận item similarity

        self.dataset: Optional[LightGCNCFDataset] = None
        self.model: Optional[LightGCNCF] = None
        self.item_sim: Optional[sp.csr_matrix] = None        # sparse n_items x n_items
        self.pseudo_user_item: Optional[sp.csr_matrix] = None  # sparse n_users x n_items
        self._pos_sets: Optional[List[set]] = None
        self.user_ids: List[str] = []
        self.product_ids: List[str] = []
        self.is_fitted = False

    # ---- Item similarity (sparse top-k) ----
    def _build_item_similarity(self) -> sp.csr_matrix:
        """
        Xây ma trận cosine similarity giữa item (sparse, giữ top-k hàng xóm).

        sim(i,j) = cosine giữa cột i và cột j của UserItemNet.
        """
        R = self.dataset.UserItemNet.astype(np.float32)

        # Chuẩn hóa cột (L2)
        col_norms = np.sqrt(np.array(R.power(2).sum(axis=0)).flatten())
        col_norms[col_norms == 0] = 1
        R_norm = R @ sp.diags(1.0 / col_norms)

        # Sparse product: R_norm.T @ R_norm → similarity (chỉ entry khác 0)
        sim = (R_norm.T @ R_norm).tocsr()
        # Bỏ tự tương tự
        sim = sim - sp.diags(sim.diagonal())
        sim.eliminate_zeros()

        # Giữ top-k hàng xóm / item để giới hạn nnz
        topk = self.sim_k
        new_rows, new_cols, new_vals = [], [], []
        indptr = sim.indptr
        indices = sim.indices
        data = sim.data

        for i in range(self.dataset.n_items):
            start, end = indptr[i], indptr[i + 1]
            if end - start == 0:
                continue
            row_vals = data[start:end]
            row_idx = indices[start:end]
            if len(row_vals) > topk:
                keep = np.argpartition(-row_vals, topk - 1)[:topk]
                row_vals = row_vals[keep]
                row_idx = row_idx[keep]
            new_rows.extend([i] * len(row_vals))
            new_cols.extend(row_idx.tolist())
            new_vals.extend(row_vals.tolist())

        item_sim = sp.csr_matrix(
            (new_vals, (new_rows, new_cols)),
            shape=(self.dataset.n_items, self.dataset.n_items),
            dtype=np.float32,
        )
        item_sim.eliminate_zeros()
        logger.info(f"Item similarity sparse: {item_sim.nnz} edges (top-{topk})")
        return item_sim

    # ---- Pseudo-interactions cho cold-start ----
    def _build_pseudo_interactions(self) -> sp.csr_matrix:
        """
        Sinh pseudo-interactions cho item COLD-START (không có tương tác train).

        Với mỗi item cold-start i: tìm top-k item tương tự nhất j; với mỗi user
        u đã tương tác với j, thêm cạnh ảo (u, i) có trọng số sim(i, j).
        """
        ds = self.dataset
        R = ds.UserItemNet.astype(np.float32)

        # Item cold-start = item không có tương tác nào trong train
        col_counts = np.array(R.sum(axis=0)).flatten()
        cold_items = np.where(col_counts == 0)[0]
        if len(cold_items) == 0:
            logger.info("Không có item cold-start (mọi item đều có tương tác)")
            return R.copy()

        # top-k item tương tự nhất cho từng cold item (dùng item_sim)
        sim = self.item_sim

        # Giới hạn để tránh bùng nổ số cạnh ảo (item tương tự / user / item)
        max_sim_items = 20
        max_users_per_item = 200

        rows, cols, vals = [], [], []
        for i in cold_items:
            row = sim.getrow(i)
            if row.nnz == 0:
                continue
            coo = row.tocoo()
            # Sắp giảm dần theo similarity, giữ tối đa max_sim_items item
            order = np.argsort(-coo.data)[:max_sim_items]
            sim_items = coo.col[order]
            sim_vals = coo.data[order]

            for j, s_ij in zip(sim_items, sim_vals):
                # Users đã tương tác với item j (giới hạn để kiểm soát kích thước)
                users_j = R[:, j].nonzero()[0][:max_users_per_item]
                for u in users_j:
                    rows.append(u)
                    cols.append(i)
                    vals.append(float(s_ij))

        pseudo = sp.csr_matrix(
            (vals, (rows, cols)),
            shape=(ds.n_users, ds.n_items),
            dtype=np.float32,
        )
        pseudo.eliminate_zeros()

        # Hợp nhất với ma trận tương tác thật (user-item đã augmented)
        augmented = (R + pseudo).tocsr()
        augmented.eliminate_zeros()
        logger.info(
            f"Pseudo-interactions: {len(cold_items)} cold-start items, "
            f"{pseudo.nnz} cạnh ảo"
        )
        return augmented

    # ---- CF scores cho batch (sparse, tránh OOM) ----
    def _batch_cf_scores(
        self,
        users: np.ndarray,
        pos: np.ndarray,
        neg: np.ndarray,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Tính điểm CF cho batch: cf(u, i) = <row_pseudo(u), col_sim(i)>.

        Dùng sparse matmul an toàn bộ nhớ, trả về scores tại pos và neg.
        """
        # pseudo rows của batch users: [batch, n_items] sparse
        batch_mat = self.pseudo_user_item[users].tocsr()
        # Sparse @ Sparse → [batch, n_items] sparse
        cf_all = batch_mat.dot(self.item_sim).tocsr()

        # Lấy giá trị tại các cột pos/neg (CSR fancy indexing)
        row_idx = np.arange(len(users))
        pos_cf = np.asarray(cf_all[row_idx, pos]).flatten()
        neg_cf = np.asarray(cf_all[row_idx, neg]).flatten()
        return pos_cf, neg_cf

    def fit(self, dataset: LightGCNCFDataset):
        """Huấn luyện LightGCN-CF với BPR loss."""
        self.dataset = dataset
        self.n_users = dataset.n_users
        self.n_items = dataset.n_items
        self.user_ids = list(getattr(dataset, 'user_ids', [])) or \
            [str(i) for i in range(dataset.n_users)]
        self.product_ids = list(getattr(dataset, 'product_ids', [])) or \
            [str(i) for i in range(dataset.n_items)]
        self._pos_sets = [set(p) for p in dataset.all_pos]

        graph = dataset.get_sparse_graph()
        self.model = LightGCNCF(
            dataset.n_users, dataset.n_items, graph,
            latent_dim=self.latent_dim, n_layers=self.n_layers,
            fusion_init=self.fusion_init,
        ).to(DEVICE)

        self.item_sim = self._build_item_similarity()
        self.pseudo_user_item = self._build_pseudo_interactions()

        optimizer = torch.optim.Adam(self.model.parameters(), lr=self.lr)

        # Users có tương tác train (để sample positive)
        active_users = np.array(
            [u for u in range(dataset.n_users) if len(dataset.all_pos[u]) > 0]
        )
        # Ceil division: đảm bảo user cuối cũng được huấn luyện mỗi epoch
        n_batches = max(1, (len(active_users) + self.batch_size - 1) // self.batch_size)

        t0 = time.time()
        for epoch in range(self.epochs):
            np.random.shuffle(active_users)
            epoch_loss = 0.0

            for b in range(n_batches):
                batch_users = active_users[
                    b * self.batch_size: (b + 1) * self.batch_size
                ]
                if len(batch_users) == 0:
                    continue
                batch_users = batch_users.tolist()

                pos_items, neg_items = [], []
                for u in batch_users:
                    # active_users đã lọc trước: mọi user đều có >= 1 positive
                    pos = dataset.all_pos[u]
                    pos_items.append(np.random.choice(pos))
                    neg = np.random.randint(0, dataset.n_items)
                    while neg in self._pos_sets[u]:
                        neg = np.random.randint(0, dataset.n_items)
                    neg_items.append(neg)

                pos_items = np.array(pos_items)
                neg_items = np.array(neg_items)

                # CF scores bằng scipy sparse
                pos_cf, neg_cf = self._batch_cf_scores(
                    batch_users, pos_items, neg_items
                )

                users_t = torch.LongTensor(batch_users).to(DEVICE)
                pos_t = torch.LongTensor(pos_items).to(DEVICE)
                neg_t = torch.LongTensor(neg_items).to(DEVICE)
                pos_cf_t = torch.FloatTensor(pos_cf).to(DEVICE)
                neg_cf_t = torch.FloatTensor(neg_cf).to(DEVICE)

                optimizer.zero_grad()
                loss, reg_loss = self.model.bpr_loss(
                    users_t, pos_t, neg_t, pos_cf_t, neg_cf_t
                )
                total_loss = loss + self.reg * reg_loss
                total_loss.backward()
                optimizer.step()
                epoch_loss += total_loss.item()

            if (epoch + 1) % 10 == 0 or epoch == 0:
                logger.info(
                    f"Epoch {epoch + 1}/{self.epochs}, "
                    f"Loss: {epoch_loss / max(1, n_batches):.4f}, "
                    f"Fusion w={torch.sigmoid(self.model.fusion_weight).item():.4f}"
                )

        self.is_fitted = True
        logger.info(f"LightGCN-CF training done in {time.time() - t0:.1f}s")
        return self

    def _user_scores(self, user_id: int) -> Tuple[np.ndarray, np.ndarray, float]:
        """
        Tính điểm GCN và CF cho một user (không materialize ma trận lớn).

        Returns:
            (gcn_scores, cf_scores, w)
        """
        with torch.no_grad():
            all_users, all_items = self.model.computer()
            gcn_scores = (
                all_users[user_id] @ all_items.t()
            ).cpu().numpy()

            w = torch.sigmoid(self.model.fusion_weight).item()
            pseudo_row = self.pseudo_user_item[user_id].tocsr()
            cf_scores = np.asarray(
                pseudo_row.dot(self.item_sim).todense()
            ).flatten()

        return gcn_scores, cf_scores, w

    def _resolve_user_idx(self, user_id) -> Optional[int]:
        """Chuyển user_id (string hoặc int index) về row index."""
        if isinstance(user_id, str):
            if user_id not in self.user_ids:
                return None
            return self.user_ids.index(user_id)
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
        """Gợi ý top-N sản phẩm cho user (hỗ trợ user_id string hoặc int index)."""
        if not self.is_fitted:
            raise RuntimeError("Model chưa được huấn luyện!")

        u = self._resolve_user_idx(user_id)
        if u is None:
            return []

        gcn_scores, cf_scores, w = self._user_scores(u)
        scores = w * gcn_scores + (1 - w) * cf_scores

        exclude_set = set(exclude_ids or [])
        exclude_set.update(
            self.product_ids[p] for p in self.dataset.all_pos[u]
        )

        results = []
        for idx in np.argsort(scores)[::-1]:
            pid = self.product_ids[idx]
            if pid in exclude_set:
                continue
            if scores[idx] <= 0:
                continue
            results.append({
                'product_id': pid,
                'score': float(scores[idx]),
                'gcn_score': float(gcn_scores[idx]),
                'cf_score': float(cf_scores[idx]),
                'fusion_weight': w,
                'reason': 'Gợi ý kết hợp LightGCN + CF (fusion weight học được)',
            })
            if len(results) >= top_n:
                break
        return results

    # ---- Evaluation ----
    def evaluate(self, ks: List[int] = (10, 20), n_eval_users: Optional[int] = None) -> Dict:
        """Đánh giá Recall@K và NDCG@K trên test set."""
        ds = self.dataset
        test_users = list(ds.test_dict.keys())
        if n_eval_users:
            rng = np.random.RandomState(42)
            test_users = rng.choice(
                test_users, min(n_eval_users, len(test_users)), replace=False
            )

        with torch.no_grad():
            all_users, all_items = self.model.computer()
            w = torch.sigmoid(self.model.fusion_weight).item()

            rec = {k: 0 for k in ks}
            ndcg = {k: 0.0 for k in ks}

            for u in test_users:
                gcn_scores = (all_users[u] @ all_items.t()).cpu().numpy()
                pseudo_row = self.pseudo_user_item[u].tocsr()
                cf_scores = np.asarray(
                    pseudo_row.dot(self.item_sim).todense()
                ).flatten()
                scores = w * gcn_scores + (1 - w) * cf_scores

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
            'fusion_weight': round(w, 4),
        }


def load_benchmark_dataset(name: str) -> LightGCNCFDataset:
    """Load một dataset benchmark LightGCN."""
    path = os.path.join(DATASET_DIR, name)
    return LightGCNCFDataset(path)
