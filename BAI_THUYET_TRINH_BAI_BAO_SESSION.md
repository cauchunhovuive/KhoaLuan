# 📖 THUYẾT TRÌNH BÀI BÁO — SESSION-BASED RECOMMENDATION (HSP & RIC)

> **Bài báo:** "Session-Based Recommendations for e-Commerce with Graph-Based Data Modeling"
> — Delianidi, O.; Daskalakis, A.; Batziakas, S.; Kameas, A.; Plessas, A.
> *Applied Sciences* **2023**, 13(1), 394. DOI: [10.3390/app13010394](https://doi.org/10.3390/app13010394)
>
> **Cài đặt trong đồ án:** `backend/ml/session/session_recommender.py`
> **Demo trên web:** `/admin/paper-demo` — menu "Demo bài báo" trong trang Admin
> **Demo dự phòng (CLI):** `python -m session.demo_paper` (offline, không cần server)
> **Benchmark:** `backend/ml/session/benchmark_hsp_ric.py` → kết quả trong `benchmark_yoochoose_results.txt`

---

## 🧭 LỘ TRÌNH PHẦN BÀI BÁO — 4 CÂU HỎI

### Phần này trả lời trọn vẹn 4 câu hỏi

| Câu hỏi | Câu trả lời ngắn |
|---------|------------------|
| **1. Data lấy ở đâu?** | 375,000 phiên mua sắm thật (Yoochoose) + bảng lượt xem của hệ thống |
| **2. Làm gì với data?** | Đếm "mẫu hành vi" → train chỉ 11 giây, không cần GPU |
| **3. Demo data thế nào?** | Chạy thật trên giao diện web Admin: khách xem thêm món → gợi ý thông minh hơn dần |
| **4. Thuật toán thế nào?** | HSP đoán theo thứ tự · RIC ghi điểm cùng phiên + bộ nhớ quên |

### 🎤 Speaker notes
> "Phần trình bày tiếp theo của em về bài báo em áp dụng vào hệ thống gợi ý theo phiên — khoảng 10 phút nói cộng 3–5 phút demo trực tiếp trên giao diện web của hệ thống. Em sẽ đi theo đúng 4 câu hỏi: dữ liệu lấy ở đâu, làm gì với dữ liệu đó, demo chạy thế nào, và bên trong thuật toán là gì. Bài báo em chọn là của Delianidi và cộng sự 2023 — đề xuất 2 thuật toán nhẹ, không cần GPU, thiết kế riêng cho thương mại điện tử."

---

## 📦 DATA LẤY Ở ĐÂU?

### 2 nguồn dữ liệu thật của hệ thống

| Nguồn | Dữ liệu | Dùng để làm gì |
|-------|---------|----------------|
| **Hệ thống đồ án** | Bảng `ProductView` (PostgreSQL): mỗi lượt xem 1 dòng — ai, xem gì, lúc nào | Gợi ý trực tiếp trên web bán hàng |
| **Bài báo / benchmark** | **Yoochoose** 375,043 phiên (RecSys 2015) + **Diginetica** 175,704 phiên (CIKM Cup 2016) — cả 2 đều trong repo | Đo độ chính xác thuật toán trên 2 dataset của bài báo |

### "Phiên" (session) là gì?

```
Khách A  09:00 xem iPhone → 09:05 xem ốp lưng → 09:12 xem củ sạc
                        ─── cùng 1 PHIÊN ───
Khách A  15:00 xem AirPods                ← cách 6 tiếng = PHIÊN MỚI
```

- Quy ước: 2 lượt xem cách nhau **dưới 30 phút** = cùng phiên (chuẩn e-commerce)
- Phần lớn khách web là **vãng lai, không đăng nhập** → chỉ có data trong phiên

### 🎤 Speaker notes
> "Nguồn data thứ nhất là chính hệ thống của em: bảng ProductView trong PostgreSQL ghi mỗi lượt xem một dòng với user, sản phẩm, timestamp. Nguồn thứ hai là dataset Yoochoose — bộ dữ liệu mua sắm thật của cuộc thi RecSys, 375 nghìn phiên, 16 nghìn sản phẩm — dùng để đánh giá. Về khái niệm phiên: các lượt xem cách nhau dưới 30 phút được gộp thành một phiên, quy ước timeout 30 phút này là chuẩn thông dụng trong thương mại điện tử, cấu hình trong SessionConfig.session_timeout_minutes. Điểm mấu chốt: khách vãng lai không đăng nhập nên hệ thống KHÔNG có lịch sử dài hạn — chỉ có chuỗi click trong phiên hiện tại. Đó chính là lý do cần session-based recommendation."

---

## 🔧 LÀM GÌ VỚI DỮ LIỆU?

### 3 bước xử lý

```
Bước 1  Ghép lượt xem thành phiên        build_sessions_from_views()
Bước 2  Học "mẫu hành vi" từ 375k phiên  SessionRecommender.fit()   → 11 giây
Bước 3  Gợi ý theo phiên hiện tại         POST /ml/session/recommend
```

### Hệ thống học được 4 loại "mẫu hành vi" — chỉ bằng ĐẾM

| Mẫu học được | Ví dụ từ dữ liệu thật |
|--------------|----------------------|
| Món nào hay xuất hiện? (P0) | iPhone xuất hiện nhiều nhất → "món mốt" |
| Sau A thường là gì? (P1) | Xem iPhone → hay xem tiếp ốp lưng |
| Xem A rồi B, tiếp theo là gì? (P2) | iPhone, ốp lưng → hay xem tiếp củ sạc |
| Gì hay đi cùng gì? (cùng phiên) | AirPods hay cùng phiên với iPhone |

- Kết quả đếm lưu vào **bảng tra (dict)** → gợi ý là tra bảng, **không GPU, train 11 giây**

### 🎤 Speaker notes
> "Với data đó, hệ thống làm 3 bước. Bước 1: ghép các lượt xem rời rạc thành phiên bằng quy tắc timeout 30 phút. Bước 2: học — thực chất là ĐẾM các mẫu hành vi: đếm từng sản phẩm xuất hiện bao nhiêu lần (cấp P0), đếm cặp A→B liền kề bao nhiêu lần (cấp P1, chia cho số lần A xuất hiện để ra xác suất), đếm bộ ba A,B→C liền kề (cấp P2, 144,915 bộ ba trên 375k phiên), và đếm cặp sản phẩm cùng phiên (cho RIC). Toàn bộ là phép đếm lưu vào dict — vì vậy train 375 nghìn phiên chỉ mất 11 giây trên CPU thường, không cần GPU. Bước 3: khi khách đang phiên mua, endpoint /ml/session/recommend nhận chuỗi sản phẩm đã xem và trả về Top-N gợi ý chỉ trong vài mili giây."

---

## 🎬 DEMO: CHẠY DỮ LIỆU THẬN THẾ NÀO?

### Kịch bản demo live — trực tiếp trên giao diện web (`/admin/paper-demo`)

| Bước | Thao tác trên màn hình | Ý nghĩa |
|------|------------------------|---------|
| 1 | Mở trang Admin → menu **"Demo bài báo"** | ML đang "Trực tuyến" — hệ thống thật đang chạy |
| 2 | Bấm chọn **iPhone 15** | Phiên = [iPhone] → chạy gợi ý: theo độ phổ biến (P0) |
| 3 | Thêm **Ốp lưng iPhone 15** | Phiên = [iPhone → Ốp] → gợi ý **củ sạc** (P1) |
| 4 | Thêm **Củ sạc 20W** | Bộ ba tin cậy (P2), tag màu P2/P1/P0 đổi theo từng bước |
| 5 | Kéo xuống panel **"Bước 2 — Model đã học được gì?"** | **2 nguồn model**: shop → 8 phiên mẫu · bài báo → **bên trong model Yoochoose 375k phiên thật** (số item/cặp P1/bộ ba P2/cặp cùng phiên đã đếm, top P0, P1/P2/γ tra theo phiên với **phân số đếm thô**) — dòng xanh lá = món trong phiên có trong model |
| 6 | Kéo slider **α từ 0.9 → 0.1** (RIC) | Thứ tự gợi ý đảo ngay — bộ nhớ quên tác động thật |
| 7 | Kéo xuống panel **"Bước 4 — HSP theo từng bước"** | Bảng t=1,2,3: tag chuyển P0 → P1 → P2 — đúng chữ H = Hierarchical |
| 8 | Kéo xuống panel **"Bước 5 — RIC bộ nhớ quên"** | 5a: mỗi gợi ý hiện **đầy đủ phép tính** w = α·w(t−1) + (1−α)·c (kèm γ) sau từng lượt xem · 5b: 3 giá trị α cạnh nhau |
| 9 | Bấm **"So sánh tất cả"** (Bước 6) | 5 chiến lược chạy song song trên cùng phiên — bảng khác biệt |
| 10 | Kéo xuống **"Bước 7 — Yoochoose & Diginetica"** | Data thật của cả 2 dataset bài báo (tab chuyển đổi) + chạy benchmark MRR/Recall live trên từng dataset |

> 💡 Từ phiên bản hiện tại, trang **tự động chạy gợi ý** khi bấm sản phẩm hoặc kéo α (không cần bấm nút "Chạy gợi ý" từng lần) — giữ nhịp thuyết trình mượt hơn. Nút vẫn còn để chạy lại thủ công khi cần.

### 💡 Khoảnh khắc vàng của demo

- Mới xem **1 món** → gợi ý "theo mốt" (tag P0)
- Xem món **thứ 2** → gợi ý "bắt sóng" hành vi (tag P1)
- → Càng xem, gợi ý càng thông minh = chữ **H** (Hierarchical) trong HSP
- Panel **Bước 2** (model đã học): mở trước hội đồng **cách model học** — chuyển qua lại 2 nguồn: model mẫu 8 phiên và **model Yoochoose 375k phiên thật** (từ endpoint `/ml/paper/insights`) — mọi xác suất là phân số đếm thô, P1/P2/γ tra trực tiếp theo món đang xem
- Panel **Bước 4** chốt ý này: một bảng duy nhất hiện cả 3 bước t=1,2,3 với tag màu P0/P1/P2 đổi dần
- Kéo slider α → thứ tự gợi ý thay đổi **trước mắt hội đồng** = bộ nhớ quên của RIC
- Panel **Bước 5a** hiện điểm w(t) **kèm nguyên phép tính** w = α·w(t−1) + (1−α)·c sau từng lượt xem (món không liên quan γ=0 tự yếu đi) · **5b** đặt 3 giá trị α cạnh nhau để chỉ tay so trực tiếp

### 🎤 Speaker notes
> "Giờ em xin demo trực tiếp trên chính giao diện web của hệ thống. [Mở /admin/paper-demo] Đây là trang demo bài báo em tích hợp vào Admin — bên trái là chuỗi sản phẩm khách đang xem, em bấm chọn iPhone 15 trước. [Chạy] Khách mới xem 1 món, hệ thống gợi ý theo độ phổ biến — tag P0. Giờ em thêm Ốp lưng — ngay lập tức hệ thống nhận ra mẫu iPhone→ốp lưng trong lịch sử và đưa củ sạc lên đầu — tag P1. Thêm củ sạc — P2 khớp bộ ba tin cậy. Tag màu P2, P1, P0 cho thấy đúng cơ chế phân cấp của bài báo. [Kéo xuống Bước 2 — Model đã học] Trước khi đi sâu, đây là toàn bộ kiến thức của model: P0, P1, P2 của HSP và sessions, γ của RIC — quý thầy cô thấy mọi xác suất đều là phân số đếm thô, chẳng hạn P2 của củ sạc sau bộ ba iPhone, ốp lưng là một chia hai bằng 0.5 — model KHÔNG học gì ngoài phép đếm, đúng tinh thần nhẹ của bài báo. [Kéo xuống Bước 4] Và đây là bảng tổng hợp đúng 3 bước vừa rồi: t=1 dùng P0, t=2 thêm P1, t=3 ưu tiên P2 — quy tắc hierarchy luôn lấp đủ Top-N, không trùng món đã xem. [Đổi sang RIC, kéo α] Với RIC, em kéo hệ số quên α từ 0.9 xuống 0.1 — quý thầy cô thấy thứ tự gợi ý thay đổi ngay — bộ nhớ của mô hình bám theo hành vi gần nhất. [Bước 5a] Bảng này còn hiện nguyên phép tính w bằng α nhân w cũ cộng một trừ α nhân c sau từng lượt xem: món không liên quan có γ bằng 0 tự yếu đi — đúng nghĩa bộ lọc hàm mũ. [Bước 6 — So sánh tất cả] Và đây là bảng so sánh 5 chiến lược trên cùng một phiên — mỗi hàng một sub-model của bài báo. Toàn bộ này chạy trên API thật của hệ thống, không phải mô phỏng. Kết quả offline trên 375 nghìn phiên thật ở panel Bước 7."

---

## 🧮 THUẬT TOÁN 1: HSP — ĐOÁN THEO THỨ TỰ

### Ý tưởng 1 câu

- Xem **càng nhiều món**, hệ thống càng đoán **chính xác** hơn — như bác bán hàng nhìn khách mua món thứ 3 là biết món thứ 4

### 3 cấp "độ thông minh" — tự hỏi câu hỏi phù hợp theo dữ liệu có được

| Cấp | Hệ thống tự hỏi | Ví dụ |
|-----|-----------------|-------|
| **P0** | Món gì đang *mốt*? | Ốp lưng bán chạy nhất |
| **P1** | Người vừa xem *X* thường xem gì tiếp? | Xem iPhone → hay tiếp ốp lưng, củ sạc |
| **P2** | Người xem *X rồi Y* thường xem gì tiếp? | iPhone, ốp lưng → củ sạc (67%) |

### Quy tắc: luôn dùng cấp cao nhất có thể, thiếu thì lùi xuống

```
mới xem 1 món   → dùng P0
mới xem 2 món   → P1 trước, thiếu thì bù P0
mới xem 3+ món  → P2 trước, thiếu thì P1, vẫn thiếu thì P0
                  (không bao giờ gợi ý trùng món đã có)
```

- Nhờ quy tắc này **luôn trả đủ Top-N** ở mọi bước — kể cả khách vừa vào trang (cold-start)

### 🎤 Speaker notes
> "Thuật toán đầu tiên — HSP, Hierarchical Sequence Probability. Ý tưởng rất tự nhiên: để đoán món kế tiếp, càng biết nhiều về quá khứ gần càng tốt. Về công thức: P0 bằng số lần sản phẩm xuất hiện chia cho tổng số lần xuất hiện của tất cả sản phẩm — tức độ phổ biến. P1 bằng số lần cặp A→B liền kề chia cho số lần A xuất hiện. P2 bằng số lần bộ ba A,B→C liền kề chia cho số lần cặp A,B xuất hiện. Điểm hay của bài báo là quy tắc dự phòng phân cấp: ưu tiên cấp cao nhất, chưa đủ danh sách thì lấp dần bằng cấp thấp hơn, tuyệt đối không trùng lặp. Nhờ vậy HSP luôn trả đủ Top-N — kể cả khách mới xem 1 món hay mới vào trang, chính là cách xử lý cold-start."

---

## 🧮 THUẬT TOÁN 2: RIC — GHI ĐIỂM "ĐI CÙNG" + BỘ NHỚ QUÊN

### Ý tưởng 1 câu

- Với **mỗi món khách vừa xem**, cộng điểm cho mọi món từng **cùng phiên** với nó — điểm cũ **tự yếu dần** theo thời gian

### Chạy tay 2 lượt xem (α = 0.5)

```
Lượt 1 — khách xem iPhone:
   AirPods = 0.60        Củ sạc = 0.40        ← điểm "cùng phiên" với iPhone
Lượt 2 — khách xem ốp lưng:
   Củ sạc  = 0.5×0.40 + 0.5×0.67 = 0.535      ← điểm cũ × α + điểm mới
   AirPods = 0.5×0.60            = 0.300      ← không liên quan → tự yếu đi
→ Xếp hạng theo điểm = Top gợi ý (Củ sạc thắng)
```

### Hệ số quên α — "nhớ bao lâu"? (bài báo tune 0.1–0.9)

| α | Tính cách | Khi nào hợp |
|---|-----------|-------------|
| **0.1** | Quên nhanh — bám món vừa xem | Click-stream đổi ý liên tục ✅ đoán đúng nhất trên Yoochoose |
| **0.5** | Cân bằng | Mặc định của hệ thống, chỉnh được qua API |
| **0.9** | Nhớ cả phiên | Phiên dài, hay quay lại món cũ |

### 🎤 Speaker notes
> "Thuật toán thứ hai — RIC, Recurrent Item Co-occurrence — đi theo hướng ngược HSP: không cần thứ tự, chỉ cần biết món nào hay đi cùng món nào trong một phiên. Công thức: mỗi món i có điểm w(i). Sau mỗi lượt khách xem món x, cập nhật w mới bằng α nhân w cũ cộng với một trừ α nhân gamma — trong đó gamma là độ tin cậy: số phiên chứa cả x và i chia cho số phiên chứa x. Đây chính là bộ lọc hàm mũ trong xử lý tín hiệu — item liên quan đến hành vi gần nhất được đẩy lên dần, item không liên quan tự yếu đi. Tham số alpha là hệ số quên: nhỏ thì sống theo hiện tại, lớn thì nhớ cả phiên. Bài báo còn biến thể RIC-CiL ép món đang xem xuống cuối danh sách để chỉ gợi ý món mới — em cũng cài đặt luôn."

---

## 📊 KẾT QUẢ: ĐÁNH GIÁ TRÊN 375,000 PHIÊN THẬT

### Đo thế nào? (protocol của bài báo)

- Giấu món cuối của phiên test → để thuật toán đoán → xem món thật đứng thứ mấy trong Top-K
- MRR@10: thứ hạng trung bình nghịch đảo · Recall@10: tỉ lệ đoán trúng Top-10

### Kết quả thật (`benchmark_yoochoose_results.txt`, 5000 phiên test)

| Phương pháp | Ý tưởng | MRR@10 | Recall@10 |
|-------------|---------|--------|-----------|
| cooccurrence | đếm cùng phiên (baseline) | 0.1595 | 0.3224 |
| sequence (Markov) | đoán theo cặp liền kề | 0.1855 | 0.3742 |
| hsp | bài báo — theo thứ tự, 3 cấp | 0.1227 | 0.2670 |
| **ric** 🏆 | bài báo — cùng phiên + bộ nhớ quên | **0.1902** | **0.3746** |

### 2 phát hiện đáng nói

1. **RIC thắng baseline +19% trên Yoochoose** (0.1902 vs co-occurrence 0.1595) → bộ nhớ có hệ số quên hiệu quả hơn đếm tĩnh, nhỉnh cả Markov
2. **Xu hướng lặp lại trên Diginetica** — RIC 0.1142 > co-occurrence 0.0985 > sequence 0.0803 → kết luận "RIC tốt nhất" không phụ thuộc 1 dataset
3. **α = 0.1 tốt nhất trên Yoochoose** (MRR@10 = 0.1993, +4.8% so với α=0.5) → khách đổi ý nhanh, "quên nhanh" là đúng

### 🎤 Speaker notes
> "Để đánh giá khách quan, em chạy benchmark trên Yoochoose — đúng dataset và đúng protocol MRR, Recall của bài báo, với 375 nghìn phiên huấn luyện, chỉ 11 giây train. Kết quả: RIC đạt MRR@10 bằng 0.19 — cao hơn baseline co-occurrence khoảng 19 phần trăm và nhỉnh cả Markov chain. Khi quét hệ số quên, alpha 0.1 cho kết quả tốt nhất — khớp tính chất phiên mua sắm: hành vi đổi rất nhanh nên bộ nhớ quên nhanh bám kịp; bài báo cũng kết luận alpha tối ưu tùy dataset. Riêng HSP thấp hơn — em nói trung thực: P2 yêu cầu bộ ba liền kề chính xác, trong khi bản dữ liệu em dùng khá thưa nên số lần khớp ít; cơ chế fallback vẫn hoạt động đúng, chỉ là chất lượng dự đoán phụ thuộc độ dày dữ liệu. Bài báo gốc train trên ~9 triệu phiên với pipeline xử lý riêng nên số tuyệt đối khác — mục tiêu của em là tái lập đúng xu hướng so sánh."

---

## ✅ KẾT LUẬN PHẦN BÀI BÁO

### Chốt lại đúng 4 câu hỏi mở đầu

| Câu hỏi | Câu trả lời |
|---------|-------------|
| Data ở đâu? | 2 dataset bài báo trong repo: Yoochoose 375k phiên + Diginetica 176k phiên, cộng bảng ProductView của hệ thống |
| Làm gì với data? | Đếm mẫu hành vi P0/P1/P2 + cùng phiên → 11 giây, không GPU | |

| Demo thế nào? | Demo trực tiếp trên web Admin (`/admin/paper-demo`): khách xem thêm món → gợi ý thông minh hơn dần theo cấp; panel riêng hiện model đã học (P0/P1/P2, γ) bằng phân số đếm thô |
| Thuật toán? | HSP đoán theo thứ tự · RIC ghi điểm cùng phiên + quên α → **RIC tốt nhất**
### Đóng góp của em so với bài báo

- Bài báo **không public code** → em cài lại từ mô tả toán học
- Tích hợp thành **API thật** trong hệ thống e-commerce (chọn strategy qua tham số)
- **Benchmark tái lập** đúng protocol để kiểm chứng + smoke test tự động

### 🎤 Speaker notes
> "Tóm lại, quay về đúng 4 câu hỏi mở đầu: data là 375 nghìn phiên thật cộng với bảng lượt xem của hệ thống; việc làm với data là đếm mẫu hành vi — 11 giây, không GPU; demo cho thấy gợi ý thông minh hơn dần khi khách xem thêm; và hai thuật toán — HSP theo thứ tự, RIC cùng phiên với bộ nhớ quên — trong đó RIC tốt nhất. Đóng góp của em: bài báo không kèm source code nên em cài đặt lại từ công thức, tích hợp thành endpoint thật, và kiểm chứng bằng benchmark đúng protocol. Trong hệ thống tổng thể, đây là mô hình thứ nhất trong các nhóm ML, đóng vai trò fallback cho cold-start. Em xin sẵn sàng trả lời câu hỏi về phần này."

---

## 🛡️ HỎI ĐÁP DỰ KIẾN (PHẦN 1)

**Q1: HSP và RIC khác nhau thế nào, khi nào dùng cái nào?**
→ HSP khai thác quan hệ **thứ tự** (Next) — mạnh khi mẫu hành vi tuần tự rõ. RIC khai thác **cùng phiên** (không thứ tự) + bộ nhớ quên — ổn định với phiên dài. Cài cả hai, chọn qua tham số `strategy`.

**Q2: Vì sao HSP thấp hơn RIC trong kết quả của em?**
→ P2 chỉ khớp khi bộ ba **liền kề chính xác**; bản Yoochoose em dùng khá thưa (144,915 bộ ba / 375k phiên) nên số lần khớp ít. Bài báo gốc dùng graph modeling đầy đủ + tiền xử lý riêng nên P2 phong phú hơn. Fallback P2→P1→P0 vẫn hoạt động đúng — HSP vẫn trả đủ Top-N.

**Q3: Vì sao số tuyệt đối thấp hơn bài báo gốc?**
→ (1) Bài báo train ~9 triệu phiên, em dùng bản Yoochoose 375k + 5000 test; (2) tiền xử lý khác nhau; (3) mục tiêu là tái lập đúng **xu hướng so sánh**, không đua SOTA. Điểm củng cố: xu hướng RIC > co-occurrence > sequence **lặp lại nhất quán trên cả 2 dataset** (Yoochoose + Diginetica đã tích hợp trong repo, chuyển tab benchmark trực tiếp trên web).

**Q4: Cold-start xử lý thế nào?**
→ Chính là cấp **P0**: item/user chưa có lịch sử thì gợi ý theo độ phổ biến toàn cục. Đây là lý do HSP/RIC luôn trả đủ Top-N.

**Q5: Tham số α chọn thế nào, vì sao không mặc định 0.1?**
→ Bài báo tune 0.1–0.9; trên Yoochoose của em α=0.1 tốt nhất (0.1993). Hệ thống mặc định 0.5 trung tính vì dữ liệu hệ thống (281 views) chưa đủ tune tin cậy — α **expose qua API** để chỉnh runtime, khi data thật đủ sẽ tune lại bằng benchmark.

---

## 🛡️ HỎI ĐÁP DỰ KIẾN (PHẦN 2)

**Q6: Tại sao không dùng deep learning (GRU4Rec, SASRec)?**
→ (1) Dữ liệu hệ thống nhỏ (281 views) — deep learning sẽ overfit; (2) HSP/RIC train vài chục ms, deploy nhẹ, phù hợp resource 1CPU/1GB; (3) GRU4Rec/SASRec đã ghi trong hướng phát triển.

**Q7: RIC có phải chỉ là co-occurrence bình thường không?**
→ Không. Co-occurrence gộp điểm tĩnh toàn phiên. RIC **cập nhật sau mỗi lượt xem** với hệ số quên α — item liên quan hành vi gần nhất được nâng dần, đúng nghĩa "recurrent".

**Q8: Độ phức tạp thuật toán?**
→ Train: O(Σ độ dài phiên) cho HSP, O(Σ phiên²) cho RIC. Recommend: O(|candidates| × |session|) — candidate set nhỏ nên vài ms. Không cần GPU.

**Q9: Lấy gì làm dữ liệu session trong hệ thống thật?**
→ Bảng `ProductView` (user_id, product_id, timestamp). `build_sessions_from_views()` chia phiên bằng timeout 30 phút — cấu hình được trong `SessionConfig`.

**Q10: Chọn sản phẩm shop ở chế độ "Model bài báo" thì sao mọi gợi ý đều P0?**
→ Đúng thiết kế: model Yoochoose chỉ biết 16,245 item ẩn danh của dataset — sản phẩm shop không nằm trong model. Trang demo hiện rõ điều này qua badge "KHÔNG có trong model → cold-start" và bảng tra P1/P2/γ trống ở panel Bước 2/Bước 4 — chính là cơ chế fallback P0 của HSP/RIC khi gặp item lạ. Muốn thấy model Yoochoose "sống" thật thì chọn sản phẩm mẫu (iPhone 15, Ốp lưng…) — model tra được P1/P2/γ thật với phân số đếm từ 375k phiên.

---

## 📋 CHECKLIST TRƯỚC KHI LÊN BỘ

- ✔ Trang demo web `/admin/paper-demo` đã build và test (Bước 1–7: phiên → model đã học → strategy → HSP từng bước → RIC/α → so sánh 5 chiến lược → benchmark Yoochoose)
- ✔ Demo dự phòng CLI `python -m session.demo_paper` đã test pass (không cần server, không cần numpy)
- ✔ Benchmark Yoochoose xong — số liệu đã vào slide KẾT QUẢ · Diginetica đã tích hợp + benchmark live qua tab dataset trên web (RIC vẫn tốt nhất)
- ☐ Trước buổi bảo vệ: khởi động ML service (`python -m clustering.api`) + backend + frontend, đăng nhập Admin
- ☐ Mở sẵn tab trình duyệt `/admin/paper-demo` + tab dự phòng `http://localhost:8000/docs`
- ☐ In/hiện DOI bài báo: 10.3390/app13010394
- ☐ Mở sẵn `session_recommender.py` tại class `HSPRecommender` (dự phòng hỏi code)

---

*Tài liệu thuyết trình bài báo — Session-Based Recommendation (HSP & RIC), Delianidi et al. 2023*
