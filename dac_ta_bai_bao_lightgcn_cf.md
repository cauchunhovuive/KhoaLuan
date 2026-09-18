# Tài liệu tham khảo: LightGCN-CF — Hybrid Recommendation Algorithm

> **Bài báo:** *LightGCN-CF Hybrid Recommendation Algorithm Integrating Graph Convolutional Networks and Collaborative Filtering for Cross-Border Product Selection Optimization*
>
> **Tác giả:** Benli Li, Hainian Zhang — Chongqing College of Architecture and Technology, Trung Quốc
>
> **Hội nghị:** Proceedings of the 2025 6th International Conference on Big Data Economy and Information Management (BDEIM 2025), ACM, trang 1382–1388
>
> **DOI:** [10.1145/3800000.3800213](https://doi.org/10.1145/3800000.3800213) — **Giấy phép: CC BY 4.0 (open access)**

---

## 1. BibTeX

```bibtex
@inproceedings{li2025lightgcncf,
  author    = {Li, Benli and Zhang, Hainian},
  title     = {LightGCN-CF Hybrid Recommendation Algorithm Integrating Graph
               Convolutional Networks and Collaborative Filtering for
               Cross-Border Product Selection Optimization},
  booktitle = {Proceedings of the 2025 6th International Conference on Big Data
               Economy and Information Management (BDEIM 2025)},
  pages     = {1382--1388},
  year      = {2025},
  publisher = {ACM},
  doi       = {10.1145/3800000.3800213}
}
```

---

## 2. Tóm tắt bài báo

Bài báo đề xuất **LightGCN-CF** — thuật toán gợi ý kết hợp (hybrid) hai kỹ thuật
chính trong hệ thống gợi ý thương mại điện tử xuyên biên giới:

1. **LightGCN** (He et al., SIGIR 2020) — GCN nhẹ trên đồ thị hai phía
   *user–item*: lan truyền tín hiệu cộng tác bậc cao qua nhiều lớp gộp
   (embedding propagation + mean-combine), **không dùng phép biến đổi phi tuyến
   hay ma trận trọng số lớp** → đơn giản, nhanh, tránh over-smoothing.
2. **Collaborative Filtering (CF)** — module sinh **pseudo-interactions** cho
   sản phẩm **cold-start** (sản phẩm mới chưa có lượt tương tác) dựa trên độ
   tương tự thuộc tính, giúp sản phẩm mới vẫn được gợi ý.

Điểm mấu chốt (khác LightGCN gốc):

- Đồ thị hai phía được tăng cường **đặc trưng xuyên biên giới**: phí vận chuyển
  (shipping cost), thời gian giao hàng (delivery time), thuế quan (tariff rates)
  → node features.
- Dự đoán cuối là **tổ hợp tuyến tính học được** giữa điểm GCN và điểm CF bằng
  trọng số fusion `w`, tối ưu end-to-end bằng **Bayesian Personalized Ranking
  (BPR) loss**.

### Kết quả chính

| Chỉ số | Mức cải thiện so với baseline |
|---|---|
| **Recall@10** | **+9.7%** |
| **Recall@10 kịch bản cold-start** | **+18.2%** |
| Ablation — bỏ đặc trưng logistics | −5.6% Recall |
| Ablation — bỏ thuế quan (tariff) | −4.2% Recall |

→ Cả hai module bổ trợ (đặc trưng logistics và CF cold-start) đều đóng góp
thực chất; phương pháp hybrid vượt cả LightGCN thuần và CF thuần.

---

## 3. Phương pháp chi tiết (LightGCN-CF)

### 3.1 Đồ thị hai phía user–item tăng cường đặc trưng

- Xây đồ thị `G = (U ∪ I, E)` với cạnh `(u, i)` = có tương tác (mua, xem, click).
- Ma trận kề được chuẩn hóa đối xứng:

  ```
  Â = D^(-1/2) A D^(-1/2)
  ```

- Đặc trưng logistics (phí vận chuyển, thời gian giao, thuế quan) được gắn làm
  node features của item, đưa vào quá trình học embedding ban đầu.

### 3.2 Lan truyền LightGCN

Với embedding khởi tạo `e^(0)` (user + item), qua L lớp:

```
e^(k+1) = Â · e^(k)                     # chỉ lan truyền, không biến đổi phi tuyến
e_final = (1/(L+1)) · Σ_(k=0..L) e^(k)  # mean-combine tất cả lớp
```

Điểm GCN giữa user u và item i: `s_gcn(u, i) = ⟨e_u, e_i⟩`.

### 3.3 CF module + pseudo-interactions (cold-start)

- Với sản phẩm **cold-start** (chưa có tương tác trong train):
  - Tìm các sản phẩm tương tự nhất theo **độ tương tự thuộc tính** (hoặc cosine
    giữa cột item của ma trận tương tác).
  - Sinh **cạnh ảo** `(u, i_cold)` với trọng số bằng độ tương tự, từ các user đã
    tương tác với sản phẩm tương tự → sản phẩm mới có "hàng xóm" để gợi ý.
- Điểm CF: `s_cf(u, i) = Σ_j∈pseudo(u) sim(j, i)` (item-based CF trên ma trận
  đã augmented).

### 3.4 Fusion học được + BPR loss

```
s(u, i) = w · s_gcn(u, i) + (1 − w) · s_cf(u, i)
```

- `w ∈ (0,1)` là **trọng số học được** (tham số trainable, qua sigmoid để khóa
  khoảng), học đồng thời với embeddings.
- BPR loss (pairwise ranking):

  ```
  L = −Σ_(u,i⁺,i⁻) log σ( s(u,i⁺) − s(u,i⁻) ) + λ·‖Θ‖²
  ```

  với `i⁺` là item dương (user đã tương tác), `i⁻` là item âm (negative sample).

---

## 4. Dataset

### 4.1 Dataset của bài báo (dữ liệu RIÊNG TƯ)

| Dataset | Nền tảng | Trạng thái |
|---|---|---|
| Shopee | Thương mại điện tử Đông Nam Á | 🔒 Riêng tư — không công bố |
| Lazada | Thương mại điện tử Đông Nam Á | 🔒 Riêng tư — không công bố |

→ Không có bản benchmark công khai, không thể tải về. (Đặc điểm chung của bài
báo này là dữ liệu phải tự thu thập.)

### 4.2 Dataset benchmark công khai dùng thay thế (đã tải trong đề tài)

Đây là 3 benchmark chuẩn của **LightGCN gốc** (He et al. SIGIR 2020) — nguồn
[github.com/gusye1234/LightGCN-PyTorch](https://github.com/gusye1234/LightGCN-PyTorch):

| Dataset | Users | Items | Tương tác train | Độ thưa (sparsity) |
|---|---|---|---|---|
| **Gowalla** | 29,858 | 40,981 | 810,128 | ~99.93% |
| **Yelp2018** | 31,668 | 38,048 | 1,561,406 | ~99.87% |
| **Amazon-book** | 52,643 | 91,599 | 2,984,108 | ~99.94% |

Định dạng `train.txt`/`test.txt`: mỗi dòng `user_id item1 item2 ...` (index từ 0).

📂 Đã tải tại: `backend/ml/datasets/{gowalla,yelp2018,amazon-book}/`

---

## 5. Cài đặt trong đề tài

### Các module mới

| File | Nội dung |
|---|---|
| `backend/ml/collaborative/lightgcn_cf.py` | **LightGCN-CF (PyTorch)** — `LightGCNCFDataset` (loader + đồ thị chuẩn hóa), `LightGCNCF` (backbone GCN + BPR + trọng số fusion), `LightGCNCFRecommender` (huấn luyện, gợi ý, đánh giá) |
| `backend/ml/collaborative/graph_cf.py` | **Graph CF nhẹ (numpy/scipy, không cần PyTorch)** — `GraphCFRecommender` lan truyền LightGCN-like, chạy được trên máy thường |
| `backend/ml/collaborative/benchmark_lightgcn_cf.py` | Benchmark Recall@K / NDCG@K trên 3 dataset |
| `backend/ml/test_lightgcn_cf_smoke.py` | Smoke test (đã PASS) |

### Thiết kế tránh OOM (điểm cải tiến so với bài báo)

- Ma trận item-similarity giữ dạng **SPARSE**, chỉ giữ top-k hàng xóm / item
  (`sim_k`).
- Điểm CF tính theo **từng batch bằng sparse matmul** (không materialize ma trận
  dense `n_users × n_items`).
- Pseudo-interactions chỉ sinh cho item **cold-start** thật sự, có giới hạn
  (`max_sim_items`, `max_users_per_item`).

### Cách chạy

```bash
# Smoke test nhanh
cd backend/ml && python test_lightgcn_cf_smoke.py

# Benchmark trên Gowalla (15 epochs, 2000 user đánh giá)
cd backend/ml && python -m collaborative.benchmark_lightgcn_cf \
    --dataset gowalla --epochs 15 --n_eval 2000
```

---

## 6. Kết quả benchmark thực tế (máy CPU, dim=64)

**Gowalla** (15 epochs, 2000 user test):

| Phương pháp | Recall@10 | Recall@20 | NDCG@10 | NDCG@20 |
|---|---|---|---|---|
| Graph CF nhẹ (no PyTorch) | 0.0035 | 0.0045 | 0.0005 | 0.0006 |
| **LightGCN-CF (PyTorch)** | **0.3405** | **0.4545** | **0.0878** | **0.1039** |

Trọng số fusion học được `w ≈ 0.573` — hệ thống tự cân bằng: dựa hơi nghiêng
về điểm GCN (0.573) hơn điểm CF (0.427), phù hợp với kết luận bài báo về hiệu
quả của lan truyền đồ thị bậc cao.

> ⚠️ *Graph CF nhẹ có Recall thấp vì embeddings khởi tạo ngẫu nhiên chỉ lan
> truyền qua đồ thị, **không qua huấn luyện BPR end-to-end** như LightGCN gốc —
> đây là bản chất của bản "nhẹ" (linear algebra thuần). Nó phù hợp làm baseline
> nhanh / fallback khi không có PyTorch, không phải để cạnh tranh chất lượng.*

---

## 7. Liên hệ với đề tài

- Bổ sung hướng **gợi ý dựa trên đồ thị + collaborative filtering** (bên cạnh
  session-based HSP/RIC đã cài đặt trước đó) → đa dạng hóa phần "Hệ thống gợi ý
  thông minh" của luận văn.
- Ý tưởng **pseudo-interactions cho cold-start** rất hữu ích cho sàn TMĐT thực
  tế (sản phẩm mới lên kệ chưa có lượt tương tác) — áp dụng được cho chính dữ
  liệu sản phẩm của đề tài.
- Phần **Graph CF nhẹ (no PyTorch)** dễ tích hợp vào backend hiện tại
  (`backend/ml/collaborative/collaborative_filtering.py` đã có Item-Item,
  User-User, ALS, Hybrid) mà không cần thêm phụ thuộc nặng.

---

## 8. Tài liệu gốc liên quan

- LightGCN gốc: Xiangnan He, Kuan Deng, et al., *"LightGCN: Simplifying and
  Powering Graph Convolution Network for Recommendation"*, SIGIR 2020.
  [github.com/gusye1234/LightGCN-PyTorch](https://github.com/gusye1234/LightGCN-PyTorch)
- BPR: Steffen Rendle et al., *"BPR: Bayesian Personalized Ranking from Implicit
  Feedback"*, UAI 2009.
