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

## 2. Gợi ý theo phân khúc khách hàng (Clustering-based)

| Mục | Nội dung |
|---|---|
| **Tên usecase** | Gợi ý sản phẩm theo phân khúc khách hàng |
| **Mô tả sơ lược** | Hệ thống phân cụm khách hàng theo RFM + K-Means trên toàn bộ lịch sử đơn hàng, rồi gợi ý những sản phẩm được mua nhiều nhất trong cùng cụm khách hàng. |
| **Actor chính** | Khách hàng |
| **Actor phụ** | Admin (huấn luyện/giám sát model) |
| **Tiền điều kiện** | Hệ thống đã chạy phân cụm (RFM + K-Means) trên dữ liệu đơn hàng. |
| **Hậu điều kiện** | Danh sách sản phẩm được gợi ý hiển thị cho khách hàng. |

**Luồng sự kiện chính (main flow)**

| Actor | System |
|---|---|
| 1. Truy cập trang chủ/trang sản phẩm sau khi đăng nhập. | 2. Lấy clusterId của khách hàng. |
| | 3. Lấy danh sách khách hàng trong cùng cụm. |
| | 4. Tổng hợp các sản phẩm được mua nhiều nhất trong cụm (loại trừ sản phẩm đã mua). |
| | 5. Sắp xếp theo điểm số (tổng số lượng bán) và trả về top-N. |
| 6. Xem sản phẩm được gợi ý. | |

**Luồng phụ (alternative flow)**
- A1: Khách hàng chưa có cluster (cold start) → chuyển sang gợi ý phổ biến (Popular products).

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

## 4. Trò chuyện với AI hỗ trợ (RAG Chat AI)

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

## 5. Gợi ý cá nhân hóa tích hợp (Personalized Recommendations)

| Mục | Nội dung |
|---|---|
| **Tên usecase** | Xem gợi ý cá nhân hóa |
| **Mô tả sơ lược** | Sau khi đăng nhập, hệ thống kết hợp nhiều tầng AI (phân khúc khách hàng → sản phẩm phổ biến) để đưa ra gợi ý phù hợp nhất, có cache Redis để tăng tốc. |
| **Actor chính** | Khách hàng |
| **Actor phụ** | Không |
| **Tiền điều kiện** | Khách hàng đã đăng nhập. |
| **Hậu điều kiện** | Danh sách sản phẩm gợi ý cá nhân hóa hiển thị trên trang chủ/trang cá nhân. |

**Luồng sự kiện chính (main flow)**

| Actor | System |
|---|---|
| 1. Đăng nhập và truy cập trang chủ. | 2. Kiểm tra cache Redis (personalized 10 phút) — nếu có thì trả kết quả ngay. |
| | 3. Nếu chưa có cache: tìm khách hàng cùng cluster (RFM) và lấy sản phẩm được mua nhiều nhất trong cluster đó. |
| | 4. Nếu khách hàng chưa có cluster hoặc dữ liệu không đủ: fallback lấy sản phẩm phổ biến toàn hệ thống (sắp theo `soldCount`, `rating`). |
| | 5. Lưu kết quả vào cache Redis và trả về danh sách gợi ý. |
| 6. Xem sản phẩm được gợi ý. | |

**Luồng phụ (alternative flow)**
- A1: Cả 2 tầng đều lỗi → hiển thị danh sách sản phẩm mặc định (best-seller chung).
