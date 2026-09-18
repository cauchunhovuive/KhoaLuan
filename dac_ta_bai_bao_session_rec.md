# Tài liệu tham khảo — Bài báo khoa học & Dữ liệu

## 📄 Thông tin bài báo

| Mục | Nội dung |
|---|---|
| **Tiêu đề** | Session-Based Recommendations for e-Commerce with Graph-Based Data Modeling |
| **Tác giả** | Marina Delianidi, Konstantinos Diamantaras, Dimitrios Tektonidis, Michail Salampasis |
| **Tổ chức** | Department of Information and Electronic Engineering, International Hellenic University, Thessaloniki, Greece |
| **Tạp chí** | Applied Sciences (MDPI), 2023, Volume 13, Issue 1, Article 394 |
| **DOI** | 10.3390/app13010394 |
| **Ngày xuất bản** | 28/12/2022 (số tháng 1/2023) |
| **Giấy phép** | CC BY 4.0 — **được phép sử dụng miễn phí** cho mục đích học thuật khi trích dẫn đầy đủ |
| **Lĩnh vực** | Session-based Recommendation (gợi ý theo phiên), E-commerce, Graph-based modeling |

**Trích dẫn chuẩn (BibTeX):**
```bibtex
@article{delianidi2023session,
  title={Session-Based Recommendations for e-Commerce with Graph-Based Data Modeling},
  author={Delianidi, Marina and Diamantaras, Konstantinos and Tektonidis, Dimitrios and Salampasis, Michail},
  journal={Applied Sciences},
  volume={13},
  number={1},
  pages={394},
  year={2023},
  publisher={MDPI},
  doi={10.3390/app13010394}
}
```

---

## 🎯 Tóm tắt nội dung

Các phương pháp gợi ý truyền thống như **Collaborative Filtering (CF)** không áp dụng được khi không có mô hình người dùng dài hạn (người dùng ẩn danh). Bài báo đề xuất **2 phương pháp gợi ý theo phiên (session-based)** cho người dùng ẩn danh trong e-commerce, biểu diễn dữ liệu dưới dạng **đồ thị** với 2 loại nút (item, session) và các quan hệ:

- **ItemInSession** — item xuất hiện trong session
- **Next** — item xuất hiện liên tiếp (có thứ tự)
- **InSameSession** — item cùng xuất hiện trong 1 session (không quan tâm thứ tự)

### 1. HSP — Hierarchical Sequence Probability

Dựa trên quan hệ **Next** (thứ tự xuất hiện), định nghĩa 3 mức xác suất:

| Ký hiệu | Ý nghĩa | Công thức |
|---|---|---|
| **P₀(A)** | Single item probability (cold-start) | số lần A xuất hiện / tổng số lần xuất hiện |
| **P₁(A,B)** | Pair sequence probability | số cặp liên tiếp (A,B) / số lần A xuất hiện = P(item_t=B \| item_{t-1}=A) |
| **P₂(A,B,C)** | Triplet sequence probability | số bộ ba liên tiếp (A,B,C) / số cặp liên tiếp (A,B) |

**Thuật toán gợi ý (hierarchy):**
1. **Bước t=1 (cold start):** danh sách theo P₀ giảm dần
2. **Bước t=2:** các item B có P₁(item₁, B) > 0, sắp giảm dần; bổ sung P₀ nếu chưa đủ
3. **Bước t≥3:** các item C có P₂(item_{t-2}, item_{t-1}, C) > 0 → bổ sung P₁(item_{t-1}, B) → bổ sung P₀. Không trùng lặp item.

### 2. RIC — Recurrent Item Co-occurrence

Dựa trên quan hệ **InSameSession** (co-occurrence, bỏ qua thứ tự):

- **Độ tin cậy:** γ(oᵢ|x) = count(InSameSession(x, oᵢ)) / count(ItemInSession(x)) — tương đương confidence của luật kết hợp x ⇒ oᵢ
- **Cold-start fallback:** cᵢ = γ(oᵢ|x) nếu γ > 0, ngược lại cᵢ = P₀(oᵢ)
- **Mô hình hồi quy bậc 1 (bộ nhớ):** wᵢ(t) = α·wᵢ(t−1) + (1−α)·cᵢ(t), khởi tạo wᵢ(0) = P₀(oᵢ)
  - α: forgetting factor (bài báo test α = 0.1, 0.3, 0.5, 0.7, 0.9)
  - (1−α) = 0 → vô hạn bộ nhớ; (1−α) = 1 → không bộ nhớ
- **2 phiên bản:**
  - **Plain RIC:** giữ nguyên — item hiện tại thường ở top (vì γ(x|x)=1)
  - **RIC-CiL (Current-item-Last):** đẩy item hiện tại xuống cuối danh sách

### 3. So sánh với GNN

So sánh với 3 mô hình GNN state-of-the-art: **SR-GNN, GCE-GNN, IC-GAR**.
Metrics: **MRR@K** và **Recall@K** (K = 10, 20, 30).

**Kết quả chính của bài báo:**
- **RIC-CiL đạt MRR tốt nhất** trên dataset Leather và eElectronics (không lặp item liên tiếp)
- **RIC-plain tốt hơn** trên Diginetica và Yoochoose (có lặp item liên tiếp)
- **GCE-GNN đạt Recall tốt nhất** trên mọi dataset nhưng MRR thấp hơn RIC
- **HSP thường thua RIC** → kết luận: co-occurrence quan trọng hơn thứ tự xuất hiện
- **Hiệu năng:** HSP/RIC nhanh hơn GNN **10×–180×**, chỉ cần CPU (không cần GPU)

---

## 🗂️ Dữ liệu (Dataset) của bài báo

| Dataset | Mô tả | Thống kê | Khả dụng |
|---|---|---|---|
| **Leather** | Cửa hàng đồ da (áo khoác, lông thú) — web log 6 tháng (3–8/2021) | 19.236 phiên, 1.448 item | 🔒 Riêng tư (xin từ tác giả) |
| **eElectronics** | Cửa hàng điện tử lớn — web log 5 tháng (10/2019–2/2020) | 68.973 phiên, 33.130 item | 🔒 Riêng tư (xin từ tác giả) |
| **Yoochoose1/64** | RecSys Challenge 2015 (cửa hàng bán lẻ châu Âu) | 17.740 item | ✅ Công khai |
| **Diginetica** | CIKM Cup 2016 (cửa hàng diginetica.com) | 43.097 item | ✅ Công khai |

> **Ghi chú:** Data Availability Statement của bài báo ghi *"Data for this study are available on request from the corresponding authors."* — 2 dataset riêng tư (Leather, eElectronics) cần liên hệ tác giả để xin.

### 📥 Nguồn tải dataset công khai (đã dùng trong đề tài)

Đã tải vào thư mục `backend/ml/datasets/`:

```
backend/ml/datasets/
├── yoochoose/
│   ├── train.txt   (8.6 MB — pickle: (prefixes, targets))
│   └── test.txt    (1.3 MB — pickle)
└── diginetica/
    └── train-item-views.csv  (42 MB — sessionId;userId;itemId;timeframe;eventdate)
```

| Dataset | Nguồn gốc | Link |
|---|---|---|
| Yoochoose | GitHub RecoHut-Datasets | https://github.com/RecoHut-Datasets/yoochoose |
| Diginetica | GitHub RecoHut-Datasets | https://github.com/RecoHut-Datasets/diginetica |
| Yoochoose (Kaggle) | RecSys 2015 | https://www.kaggle.com/datasets/chadgostopp/recsys-challenge-2015 |
| Diginetica (Kaggle) | CIKM 2016 | https://www.kaggle.com/datasets/profalbusdumbledore/diginetica-dataset |
| RetailRocket | Kaggle | https://www.kaggle.com/datasets/retailrocket/ecommerce-dataset |

---

## 🔗 Liên hệ với đề tài (KhoaLuan)

### Điểm tương đồng
Code hiện có `backend/ml/session/session_recommender.py` đã triển khai:
- ✅ Co-occurrence Matrix (giống quan hệ InSameSession của RIC)
- ✅ Sequence-based / Markov Chain (giống quan hệ Next của HSP)
- ✅ Popularity fallback (giống P₀ cold-start của HSP)
- ✅ Hybrid kết hợp co-occurrence + sequence
- ✅ Metrics Precision/Recall/MAP/NDCG (bài báo dùng MRR/Recall)

### Điểm mới đã cài đặt từ bài báo
1. **`HSPRecommender`** — xác suất triplet → pair → single (P₂ → P₁ → P₀)
2. **`RICRecommender`** — co-occurrence hồi quy w(t) = α·w(t−1) + (1−α)·c(t) với cold-start fallback, 2 phiên bản **RIC** (plain) và **RIC-CiL**
3. **`SessionRecommender`** — tích hợp thêm 3 chiến lược: `hsp`, `ric`, `ric_cil`
4. **`benchmark_hsp_ric.py`** — script đánh giá MRR@K / Recall@K trên Yoochoose & Diginetica

### Kết quả benchmark (chạy thực tế trong đề tài)

**Yoochoose** (max_test=1000):

| Method | MRR@10 | MRR@20 | Rec@10 | Rec@20 |
|---|---|---|---|---|
| cooccurrence | 0.1532 | 0.1586 | 0.3270 | 0.4060 |
| sequence | 0.1744 | 0.1798 | 0.3730 | 0.4490 |
| hsp | 0.1177 | 0.1233 | 0.2640 | 0.3450 |
| **ric** | **0.1784** | **0.1831** | 0.3690 | 0.4360 |
| **ric_cil** | **0.1784** | **0.1831** | 0.3690 | 0.4360 |

**Diginetica** (max_test=1000):

| Method | MRR@10 | MRR@20 | Rec@10 | Rec@20 |
|---|---|---|---|---|
| cooccurrence | 0.0738 | 0.0782 | 0.1730 | 0.2380 |
| sequence | 0.0754 | 0.0789 | 0.1750 | 0.2230 |
| hsp | 0.0451 | 0.0466 | 0.1060 | 0.1270 |
| **ric** | **0.0861** | **0.0917** | **0.1920** | **0.2730** |
| **ric_cil** | **0.0861** | **0.0917** | **0.1920** | **0.2730** |

> **Nhận xét:** Kết quả khớp với kết luận của bài báo — **RIC vượt trội so với co-occurrence thường và HSP** trên cả 2 dataset. HSP hiệu quả hơn trên dataset có cấu trúc chuỗi rõ ràng nhưng nhìn chung co-occurrence (RIC) quan trọng hơn thứ tự xuất hiện.

### Cách chạy benchmark

```bash
# Từ backend/ml/
python -m session.benchmark_hsp_ric --dataset yoochoose --max_test 5000
python -m session.benchmark_hsp_ric --dataset diginetica --max_test 5000
python -m session.benchmark_hsp_ric --dataset all --max_test 3000
```

### Sử dụng trong API

Tham số `strategy` của `/api/ml/session/recommend` giờ hỗ trợ thêm:
- `hsp` — Hierarchical Sequence Probability
- `ric` — Recurrent Item Co-occurrence (plain)
- `ric_cil` — RIC Current-item-Last

---

## 📚 Ứng dụng cho luận văn

1. **Chương tổng quan (Literature Review):** trích dẫn bài báo khi trình bày các phương pháp gợi ý theo phiên: Pair Popularity → HSP/RIC → GNN (SR-GNN, GCE-GNN, IC-GAR)
2. **Chương đề xuất (Proposed Method):** mô tả cải tiến hệ thống — thay Pair Popularity bằng RIC, thêm HSP làm phương pháp so sánh
3. **Chương thực nghiệm (Experiments):** dùng Yoochoose/Diginetica làm benchmark để chứng minh tính hiệu quả; so sánh bằng MRR@K, Recall@K
4. **So sánh hiệu năng:** chỉ ra hệ thống chạy nhanh (CPU) so với GNN (GPU) — điểm mạnh cho luận văn

---

## ⚠️ Lưu ý bản quyền

- Bài báo được phát hành theo **CC BY 4.0** → được phép sao chép, phân phối, điều chỉnh miễn là **ghi công tác giả**.
- **Yoochoose** và **Diginetica** là dataset benchmark công khai dùng rộng rãi trong nghiên cứu — khi dùng cần trích dẫn nguồn gốc.
- **Leather/eElectronics** là dữ liệu riêng tư — nếu muốn dùng phải email xin phép tác giả: *Marina Delianidi, Konstantinos Diamantaras* (International Hellenic University).
