# Đặc tả Use Case — Nhóm chức năng AI

---

## 1. Gợi ý sản phẩm theo phiên (Session-based Recommendation)

| Mục | Nội dung |
|---|---|
| **Tên usecase** | Gợi ý sản phẩm theo phiên |
| **Mô tả sơ lược** | Hệ thống phân tích các sản phẩm khách đang xem trong phiên hiện tại để gợi ý sản phẩm liên quan, kết hợp Co-occurrence Matrix và Markov Chain. |
| **Actor chính** | Khách / Khách hàng |
| **Actor phụ** | Không |
| **Tiền điều kiện** | Khách đã xem ít nhất 1 sản phẩm trong phiên hiện tại. |
| **Hậu điều kiện** | Danh sách Top-N sản phẩm gợi ý được hiển thị cho khách. |

**Luồng sự kiện chính (main flow)**

| Actor | System |
|---|---|
| 1. Xem một hoặc nhiều sản phẩm trong phiên. | 2. Ghi nhận `session_items` vào bộ nhớ phiên. |
| | 3. Tính điểm Co-occurrence (SP nào thường xem cùng nhau). |
| | 4. Tính điểm Sequence Prediction bằng Markov Chain (SP nào thường xem tiếp theo). |
| | 5. Kết hợp 2 điểm số (hybrid) và xếp hạng sản phẩm. |
| | 6. Kiểm tra có kết quả phù hợp không: nếu có → hiển thị Top-N; nếu không → dùng Popularity fallback. |
| 7. Xem danh sách gợi ý. | |

**Luồng phụ (alternative flow)**
- A1: Chưa train model → hệ thống tự động train trước khi thực hiện bước 3.
- A2: Không tìm được kết quả co-occurrence lẫn sequence → chuyển thẳng sang Popularity fallback.

---

## 2. Gợi ý theo lịch sử mua hàng (Collaborative Filtering)

| Mục | Nội dung |
|---|---|
| **Tên usecase** | Gợi ý sản phẩm theo Collaborative Filtering |
| **Mô tả sơ lược** | Hệ thống gợi ý sản phẩm dựa trên lịch sử mua hàng của toàn bộ người dùng, sử dụng 4 mô hình: Item-Item CF, User-User CF, ALS Matrix Factorization và Hybrid ensemble. |
| **Actor chính** | Khách hàng |
| **Actor phụ** | Admin (huấn luyện/giám sát model) |
| **Tiền điều kiện** | Khách hàng đã đăng nhập và có lịch sử đơn hàng (hoặc hệ thống đã có dữ liệu đơn hàng toàn hệ thống). |
| **Hậu điều kiện** | Danh sách sản phẩm được gợi ý cá nhân hóa hiển thị cho khách hàng. |

**Luồng sự kiện chính (main flow)**

| Actor | System |
|---|---|
| 1. Truy cập trang chủ/trang sản phẩm sau khi đăng nhập. | 2. Lấy ma trận user-product từ lịch sử đơn hàng. |
| | 3. Tính Item-Item CF (cosine similarity giữa sản phẩm). |
| | 4. Tính User-User CF (độ tương đồng giữa người dùng). |
| | 5. Tính ALS Matrix Factorization (R ≈ U × Vᵀ với implicit feedback). |
| | 6. Kết hợp 3 kết quả theo trọng số Hybrid (item=0.3, user=0.3, als=0.4). |
| | 7. Trả về danh sách gợi ý cá nhân hóa. |
| 8. Xem sản phẩm được gợi ý. | |

**Luồng phụ (alternative flow)**
- A1: Một model trong Hybrid bị lỗi → hệ thống bỏ qua model đó và fallback sang các model còn lại.
- A2: Không đủ dữ liệu đơn hàng → chuyển sang gợi ý phổ biến (Popular products).

---

## 3. Phân khúc khách hàng (RFM Analysis + K-Means Clustering)

| Mục | Nội dung |
|---|---|
| **Tên usecase** | Phân khúc khách hàng theo RFM |
| **Mô tả sơ lược** | Hệ thống phân tích Recency – Frequency – Monetary của từng khách hàng, sau đó dùng K-Means để phân nhóm (VIP, Tiềm năng, Mới, Rời rạc) phục vụ cá nhân hóa marketing. |
| **Actor chính** | Admin |
| **Actor phụ** | Hệ thống gợi ý (sử dụng kết quả cluster) |
| **Tiền điều kiện** | Đã có dữ liệu đơn hàng của khách hàng trong hệ thống. |
| **Hậu điều kiện** | Mỗi khách hàng được gán một `clusterId`; cluster có quy tắc (rule) rõ ràng. |

**Luồng sự kiện chính (main flow)**

| Actor | System |
|---|---|
| 1. Chọn chức năng "Phân tích RFM" trên trang quản trị. | 2. Tính chỉ số Recency, Frequency, Monetary cho từng khách hàng. |
| | 3. Chuẩn hóa điểm RFM theo thang 1–5 (quintile scoring). |
| | 4. Chuẩn hóa dữ liệu (StandardScaler) và tìm số cụm tối ưu (Elbow Method + Silhouette Score). |
| | 5. Chạy K-Means (k=4) để phân nhóm khách hàng. |
| | 6. Gán nhãn cụm (VIP / Tiềm năng / Mới / Rời rạc) và lưu `clusterId` vào User. |
| 7. Xem báo cáo phân khúc khách hàng. | |

**Luồng phụ (alternative flow)**
- A1: Dữ liệu khách hàng quá ít (< số cụm yêu cầu) → hệ thống báo không đủ dữ liệu để phân cụm.

---

## 4. Đánh giá chất lượng gợi ý (Offline Evaluation Pipeline)

| Mục | Nội dung |
|---|---|
| **Tên usecase** | Đánh giá offline chất lượng recommendation |
| **Mô tả sơ lược** | Hệ thống đo lường hiệu quả các mô hình gợi ý bằng tập dữ liệu giữ lại (hold-out set), tính các chỉ số Precision, Recall, F1, NDCG, Coverage... |
| **Actor chính** | Admin |
| **Actor phụ** | Không |
| **Tiền điều kiện** | Các model gợi ý (CF, Session-based) đã được huấn luyện. |
| **Hậu điều kiện** | Báo cáo chỉ số đánh giá được lưu và hiển thị cho Admin. |

**Luồng sự kiện chính (main flow)**

| Actor | System |
|---|---|
| 1. Chọn chức năng "Đánh giá model" và bấm chạy. | 2. Tách 20% đơn hàng làm tập test (hold-out). |
| | 3. Chạy dự đoán gợi ý trên tập test bằng model hiện tại. |
| | 4. Tính Precision@K, Recall@K, F1, Hit Rate. |
| | 5. Tính MAP@K, NDCG@K (đánh giá thứ hạng). |
| | 6. Tính Coverage và Popularity Bias (Gini coefficient). |
| | 7. Tổng hợp và hiển thị báo cáo kết quả. |
| 8. Xem báo cáo, so sánh giữa các phiên bản model. | |

---

## 5. So sánh hiệu quả thuật toán (A/B Testing Framework)

| Mục | Nội dung |
|---|---|
| **Tên usecase** | So sánh Control vs Treatment (A/B Testing) |
| **Mô tả sơ lược** | Hệ thống chia người dùng thành 2 nhóm (Control dùng thuật toán hiện tại, Treatment dùng thuật toán mới), ghi log hành vi và so sánh tỉ lệ chuyển đổi bằng kiểm định Chi-squared. |
| **Actor chính** | Admin |
| **Actor phụ** | Khách hàng (nguồn dữ liệu hành vi) |
| **Tiền điều kiện** | Đã cấu hình 2 nhóm thử nghiệm (Control/Treatment) và các thuật toán tương ứng. |
| **Hậu điều kiện** | Báo cáo kết luận thuật toán nào tốt hơn được lưu lại. |

**Luồng sự kiện chính (main flow)**

| Actor | System |
|---|---|
| 1. Khởi tạo thử nghiệm A/B trên trang quản trị. | 2. Phân chia người dùng ngẫu nhiên vào nhóm Control/Treatment. |
| 3. Khách hàng tương tác (xem, click, mua) trong quá trình dùng web. | 4. Ghi log tương tác của từng nhóm (`/abtest/log`). |
| 5. Admin bấm "So sánh kết quả". | 6. Tính tỉ lệ chuyển đổi từng nhóm (`/abtest/compare`). |
| | 7. Thực hiện kiểm định Chi-squared để xác định ý nghĩa thống kê. |
| | 8. Xuất báo cáo kết luận (`/abtest/report`). |
| 9. Xem báo cáo và quyết định áp dụng thuật toán mới hay giữ nguyên. | |

**Luồng phụ (alternative flow)**
- A1: Kết quả không có ý nghĩa thống kê (p-value cao) → hệ thống khuyến nghị giữ nguyên Control.

---

## 6. Trò chuyện với AI hỗ trợ (RAG Chat AI)

| Mục | Nội dung |
|---|---|
| **Tên usecase** | Chat với AI - RAG |
| **Mô tả sơ lược** | Khách hàng đặt câu hỏi, hệ thống tìm kiếm dữ liệu liên quan (sản phẩm, chính sách, FAQ) qua ChromaDB rồi dùng Ollama sinh câu trả lời tiếng Việt; nếu AI offline thì trả lời theo mẫu có sẵn. |
| **Actor chính** | Khách hàng |
| **Actor phụ** | Khách (chưa đăng nhập vẫn có thể chat) |
| **Tiền điều kiện** | Cửa sổ chat AI đã được mở. |
| **Hậu điều kiện** | Câu trả lời được hiển thị cho người dùng. |

**Luồng sự kiện chính (main flow)**

| Actor | System |
|---|---|
| 1. Nhập câu hỏi vào khung chat. | 2. Chuyển câu hỏi thành vector bằng sentence-transformers. |
| | 3. Tìm kiếm dữ liệu liên quan trong ChromaDB (sản phẩm, danh mục, chính sách, FAQ). |
| | 4. Ghép ngữ cảnh tìm được với câu hỏi, gửi cho Ollama (llama3.2:3b). |
| | 5. Sinh câu trả lời bằng tiếng Việt. |
| 6. Nhận và đọc câu trả lời. | |

**Luồng phụ (alternative flow)**
- A1: Ollama không khả dụng (offline) → hệ thống chuyển sang trả lời bằng keyword matching (template có sẵn).

---

## 7. Gợi ý cá nhân hóa tích hợp (Personalized Recommendations)

| Mục | Nội dung |
|---|---|
| **Tên usecase** | Xem gợi ý cá nhân hóa |
| **Mô tả sơ lược** | Sau khi đăng nhập, hệ thống kết hợp nhiều tầng AI (CF Hybrid → phân khúc khách hàng → sản phẩm phổ biến) để đưa ra gợi ý phù hợp nhất, có cache Redis để tăng tốc. |
| **Actor chính** | Khách hàng |
| **Actor phụ** | Không |
| **Tiền điều kiện** | Khách hàng đã đăng nhập. |
| **Hậu điều kiện** | Danh sách sản phẩm gợi ý cá nhân hóa hiển thị trên trang chủ/trang cá nhân. |

**Luồng sự kiện chính (main flow)**

| Actor | System |
|---|---|
| 1. Đăng nhập và truy cập trang chủ. | 2. Kiểm tra cache Redis (personalized 10 phút) — nếu có thì trả kết quả ngay. |
| | 3. Nếu chưa có cache: gọi ML Service (CF Hybrid), train nếu cần rồi lấy giải thích gợi ý (`/cf/explain`). |
| | 4. Nếu ML Service lỗi/không đủ dữ liệu: tìm khách hàng cùng cluster (RFM) và lấy sản phẩm phổ biến trong cluster đó. |
| | 5. Nếu vẫn không có kết quả: fallback lấy sản phẩm phổ biến toàn hệ thống (sắp theo `soldCount`, `rating`). |
| | 6. Lưu kết quả vào cache Redis và trả về danh sách gợi ý. |
| 7. Xem sản phẩm được gợi ý. | |

**Luồng phụ (alternative flow)**
- A1: Cả 3 tầng đều lỗi → hiển thị danh sách sản phẩm mặc định (best-seller chung).
