# Đặc tả Use Case — Nhóm chức năng chính hệ thống

---

## 1. Đăng ký

| Mục | Nội dung |
|---|---|
| **Tên usecase** | Đăng ký |
| **Mô tả sơ lược** | Khách tạo tài khoản mới bằng email và mật khẩu để trở thành Khách hàng. Hỗ trợ cả đăng ký thường (qua form) và đăng ký inline (phát hiện email chưa tồn tại ngay khi đăng nhập). |
| **Actor chính** | Khách |
| **Actor phụ** | Không |
| **Tiền điều kiện** | Khách chưa có tài khoản trong hệ thống. |
| **Hậu điều kiện** | Tài khoản mới được tạo, JWT token được cấp, khách hàng tự động đăng nhập. |

**Luồng sự kiện chính**

| Actor | System |
|---|---|
| 1. Chọn "Đăng ký" hoặc nhập email tại form đăng nhập. | 2. Kiểm tra email đã tồn tại chưa. |
| 3. Nhập thông tin (họ tên, email, mật khẩu, SĐT). Nếu đăng ký inline: chỉ cần nhập thêm họ tên. | 4. Kiểm tra định dạng và tính hợp lệ dữ liệu (email hợp lệ, mật khẩu >= 6 ký tự). |
| | 5. Mã hóa mật khẩu (bcrypt, salt rounds = 12). |
| | 6. Tạo tài khoản mới trong CSDL, gán role CUSTOMER. |
| | 7. Tạo cặp JWT: access token và refresh token. |
| 8. Nhận thông báo đăng ký thành công, tự động đăng nhập vào hệ thống. | |

**Luồng phụ**
- A1: Email đã tồn tại → hệ thống báo lỗi "Email đã được đăng ký", yêu cầu nhập email khác hoặc chuyển sang đăng nhập.
- A2: Mật khẩu < 6 ký tự → báo lỗi, yêu cầu nhập lại.
- A3: Đăng ký inline: khách nhập email + mật khẩu tại form login → hệ thống kiểm tra email không tồn tại → chuyển sang form đăng ký inline (điền sẵn email, chỉ cần nhập họ tên).

---

## 2. Đăng nhập

| Mục | Nội dung |
|---|---|
| **Tên usecase** | Đăng nhập |
| **Mô tả sơ lược** | Người dùng xác thực bằng email và mật khẩu (hoặc Google OAuth) để truy cập chức năng dành riêng cho vai trò của mình. Hỗ trợ đăng ký inline khi email chưa tồn tại. |
| **Actor chính** | Khách hàng, Đối tác, Admin |
| **Actor phụ** | Google OAuth |
| **Tiền điều kiện** | Người dùng đã có tài khoản hợp lệ (hoặc đăng ký inline nếu chưa có). |
| **Hậu điều kiện** | Người dùng được xác thực, JWT access + refresh token được cấp, chuyển vào giao diện tương ứng. |

**Luồng sự kiện chính**

| Actor | System |
|---|---|
| 1. Nhập email và mật khẩu (hoặc chọn Google OAuth). | 2. Kiểm tra email tồn tại trong CSDL. |
| | 3. Kiểm tra tài khoản còn hoạt động (isActive). |
| | 4. Xác thực mật khẩu (bcrypt, so khớp hash). |
| | 5. Xác định vai trò (role), tạo cặp JWT (access + refresh). |
| 6. Được chuyển vào giao diện chính. | |

**Luồng phụ**
- A1: Sai email/mật khẩu → báo lỗi, cho phép thử lại.
- A2: Tài khoản bị khóa (isActive = false) → thông báo "Tài khoản của bạn đã bị vô hiệu hóa", không cho đăng nhập.
- A3: Tài khoản Google OAuth → loginController báo lỗi yêu cầu dùng Google.
- A4: Email chưa tồn tại → chuyển sang form đăng ký inline (điền sẵn email, cần nhập thêm họ tên).

---

## 3. Mua hàng

| Mục | Nội dung |
|---|---|
| **Tên usecase** | Mua hàng |
| **Mô tả sơ lược** | Khách hàng duyệt sản phẩm, thêm vào giỏ, chọn địa chỉ và phương thức thanh toán để đặt hàng. |
| **Actor chính** | Khách hàng |
| **Actor phụ** | Không |
| **Tiền điều kiện** | Khách hàng đã đăng nhập, giỏ hàng có ít nhất 1 sản phẩm. |
| **Hậu điều kiện** | Đơn hàng được tạo với trạng thái PENDING. |

**Luồng sự kiện chính**

| Actor | System |
|---|---|
| 1. Duyệt sản phẩm và thêm vào giỏ hàng. | 2. Cập nhật giỏ hàng, tính tạm tổng tiền. |
| 3. Nhấn "Đặt hàng", chọn địa chỉ giao. | 4. Hiển thị danh sách địa chỉ đã lưu. |
| 5. Chọn phương thức thanh toán. | 6. Kiểm tra tồn kho sản phẩm còn đủ. |
| 7. Xác nhận đặt hàng. | 8. Tạo đơn hàng, trừ tạm tồn kho, gán trạng thái PENDING. |
| 9. Nhận xác nhận đặt hàng thành công. | |

**Luồng phụ**
- A1: Sản phẩm hết hàng khi xác nhận → báo lỗi, yêu cầu cập nhật giỏ hàng.
- A2: Thanh toán online thất bại → đơn hàng không được tạo, thông báo lỗi.

---

## 4. Quy trình đơn hàng

| Mục | Nội dung |
|---|---|
| **Tên usecase** | Quy trình xử lý đơn hàng |
| **Mô tả sơ lược** | Theo dõi và cập nhật trạng thái đơn hàng qua các bước: PENDING → CONFIRMED → SHIPPING → DELIVERED (hoặc CANCELLED). |
| **Actor chính** | Đối tác |
| **Actor phụ** | Khách hàng, Admin |
| **Tiền điều kiện** | Đơn hàng đã được tạo (trạng thái PENDING). |
| **Hậu điều kiện** | Đơn hàng đạt trạng thái DELIVERED hoặc CANCELLED (nếu bị hủy/từ chối). |

**Luồng sự kiện chính**

| Actor | System |
|---|---|
| 1. Đối tác xem đơn hàng mới, xác nhận đơn. | 2. Cập nhật trạng thái CONFIRMED, gửi thông báo cho khách hàng. |
| 3. Đối tác chuẩn bị hàng, cập nhật giao vận. | 4. Cập nhật trạng thái SHIPPING, gửi thông báo cho khách hàng. |
| | 5. Gửi thông báo cho khách hàng về trạng thái đơn (mỗi lần đổi trạng thái). |
| 6. Khách hàng nhận hàng, xác nhận đã nhận. | 7. Cập nhật trạng thái DELIVERED, gửi thông báo xác nhận. |

**Luồng phụ**
- A1: Đối tác từ chối đơn (hết hàng, sai thông tin) → hệ thống chuyển CANCELLED, **hoàn lại tồn kho** các sản phẩm của partner đó và **hoàn coupon** (nếu tất cả sản phẩm đều từ partner này), gửi thông báo cho khách hàng.

---

## 5. Áp dụng coupon

| Mục | Nội dung |
|---|---|
| **Tên usecase** | Áp dụng coupon/mã giảm giá |
| **Mô tả sơ lược** | Khách hàng nhập mã giảm giá khi thanh toán, hệ thống kiểm tra điều kiện và tính giảm giá. |
| **Actor chính** | Khách hàng |
| **Actor phụ** | Không |
| **Tiền điều kiện** | Khách hàng đang ở bước thanh toán, có mã coupon hợp lệ. |
| **Hậu điều kiện** | Giá trị đơn hàng được giảm theo mã, số lượt dùng coupon giảm 1. |

**Luồng sự kiện chính**

| Actor | System |
|---|---|
| 1. Nhập mã coupon. | 2. Kiểm tra mã có tồn tại không. |
| | 3. Kiểm tra hạn sử dụng, số lượt dùng còn lại. |
| | 4. Kiểm tra giá trị đơn hàng tối thiểu. |
| | 5. Tính số tiền được giảm và cập nhật tổng tiền. |
| 6. Xem tổng tiền đã áp dụng giảm giá. | |

**Luồng phụ**
- A1: Mã không tồn tại/hết hạn/hết lượt → báo lỗi cụ thể.
- A2: Đơn hàng chưa đạt giá trị tối thiểu → thông báo điều kiện áp dụng.

---

## 6. Quản lý sản phẩm (Partner)

| Mục | Nội dung |
|---|---|
| **Tên usecase** | Quản lý sản phẩm |
| **Mô tả sơ lược** | Đối tác thêm, sửa, xóa (soft delete) sản phẩm của gian hàng mình. |
| **Actor chính** | Đối tác |
| **Actor phụ** | Không |
| **Tiền điều kiện** | Đối tác đã đăng nhập và có gian hàng được duyệt. |
| **Hậu điều kiện** | Danh sách sản phẩm của đối tác được cập nhật. |

**Luồng sự kiện chính**

| Actor | System |
|---|---|
| 1. Chọn "Thêm sản phẩm", nhập tên, ảnh, biến thể, giá. | 2. Kiểm tra tính hợp lệ dữ liệu. |
| | 3. Lưu sản phẩm vào CSDL, gắn với gian hàng của đối tác. |
| 4. Xem/sửa/xóa sản phẩm trong danh sách. | 5. Cập nhật hoặc đánh dấu xóa mềm (soft delete) sản phẩm tương ứng. |

**Luồng phụ**
- A1: Thiếu thông tin bắt buộc → báo lỗi, yêu cầu bổ sung.
- A2: Xóa sản phẩm đang có trong đơn hàng đang xử lý → chỉ ẩn khỏi cửa hàng, không xóa vĩnh viễn.

---

## 7. Xử lý đơn hàng (Partner)

| Mục | Nội dung |
|---|---|
| **Tên usecase** | Xử lý đơn hàng (Partner) |
| **Mô tả sơ lược** | Đối tác xem các đơn hàng chứa sản phẩm của mình, xác nhận và cập nhật trạng thái giao hàng. |
| **Actor chính** | Đối tác |
| **Actor phụ** | Khách hàng |
| **Tiền điều kiện** | Có đơn hàng mới chứa sản phẩm của đối tác. |
| **Hậu điều kiện** | Đơn hàng được xử lý và cập nhật trạng thái. |

**Luồng sự kiện chính**

| Actor | System |
|---|---|
| 1. Xem danh sách đơn hàng có sản phẩm của mình. | 2. Lọc và hiển thị đơn theo trạng thái. |
| 3. Xác nhận đơn hàng. | 4. Cập nhật trạng thái "đang giao". |
| 5. Cập nhật khi đã giao hàng xong. | 6. Cập nhật trạng thái "đã giao". |

**Luồng phụ**
- A1: Đối tác từ chối đơn (hết hàng) → hệ thống thông báo cho khách hàng, hoàn tồn kho/coupon.

---

## 8. Đánh giá sản phẩm

| Mục | Nội dung |
|---|---|
| **Tên usecase** | Đánh giá sản phẩm |
| **Mô tả sơ lược** | Khách hàng viết đánh giá (sao + bình luận) cho sản phẩm đã mua và nhận hàng, có thể sửa lại sau đó. |
| **Actor chính** | Khách hàng |
| **Actor phụ** | Không |
| **Tiền điều kiện** | Đơn hàng chứa sản phẩm đã ở trạng thái DELIVERED, chưa có đánh giá nào cho sản phẩm này. |
| **Hậu điều kiện** | Đánh giá được lưu và hiển thị công khai trên trang sản phẩm; rating sản phẩm được cập nhật. |

**Luồng sự kiện chính**

| Actor | System |
|---|---|
| 1. Chọn sản phẩm đã nhận, bấm "Đánh giá". | 2. Kiểm tra điều kiện đơn hàng đã DELIVERED. |
| 3. Chọn số sao, viết bình luận, gửi. | 4. Lưu đánh giá vào CSDL, cập nhật điểm rating trung bình sản phẩm. |
| 5. Xem đánh giá vừa gửi trên trang sản phẩm. | |

**Luồng phụ**
- A1: Đơn hàng chưa DELIVERED → không cho phép đánh giá.
- A2: Sản phẩm đã được đánh giá trước đó → chỉ cho phép chỉnh sửa (sửa số sao và/hoặc bình luận) qua endpoint PUT /api/reviews/:id.

---

## 9. Quản lý giỏ hàng

| Mục | Nội dung |
|---|---|
| **Tên usecase** | Quản lý giỏ hàng |
| **Mô tả sơ lược** | Khách hàng thêm, sửa số lượng, hoặc xóa sản phẩm trong giỏ hàng của mình. |
| **Actor chính** | Khách hàng |
| **Actor phụ** | Không |
| **Tiền điều kiện** | Khách hàng đã đăng nhập. |
| **Hậu điều kiện** | Giỏ hàng được cập nhật với tổng tiền chính xác. |

**Luồng sự kiện chính**

| Actor | System |
|---|---|
| 1. Thêm sản phẩm vào giỏ / sửa số lượng / xóa sản phẩm. | 2. Kiểm tra tồn kho sản phẩm. |
| | 3. Cập nhật giỏ hàng và tính lại tổng tiền real-time. |
| 4. Xem giỏ hàng đã cập nhật. | |

**Luồng phụ**
- A1: Số lượng vượt quá tồn kho → giới hạn số lượng tối đa có thể chọn.

---

## 10. Hủy đơn hàng

| Mục | Nội dung |
|---|---|
| **Tên usecase** | Hủy đơn hàng |
| **Mô tả sơ lược** | Khách hàng hủy đơn khi đơn còn ở trạng thái PENDING. |
| **Actor chính** | Khách hàng |
| **Actor phụ** | Admin (nhận thông báo) |
| **Tiền điều kiện** | Đơn hàng đang ở trạng thái PENDING. |
| **Hậu điều kiện** | Đơn hàng chuyển trạng thái CANCELLED, tồn kho được hoàn lại, coupon được hoàn lại. |

**Luồng sự kiện chính**

| Actor | System |
|---|---|
| 1. Chọn đơn hàng, bấm "Hủy đơn". | 2. Kiểm tra trạng thái đơn có phải PENDING không. |
| 3. Xác nhận hủy. | 4. **Transaction**: Cập nhật trạng thái CANCELLED. |
| | 5. **Hoàn tồn kho** (stock + increment, soldCount - decrement) cho từng sản phẩm. |
| | 6. **Hoàn coupon**: decrement usedCount, xóa couponUsage record. |
| | 7. Gửi thông báo cho admin. |
| 8. Nhận thông báo hủy thành công. | |

**Luồng phụ**
- A1: Đơn đã CONFIRMED/SHIPPING → không cho hủy, gợi ý liên hệ hỗ trợ hoặc yêu cầu hoàn tiền.

---

## 11. Phản hồi đánh giá

| Mục | Nội dung |
|---|---|
| **Tên usecase** | Phản hồi đánh giá |
| **Mô tả sơ lược** | Đối tác trả lời (reply) đánh giá của khách hàng về sản phẩm/gian hàng của mình. |
| **Actor chính** | Đối tác |
| **Actor phụ** | Khách hàng |
| **Tiền điều kiện** | Có đánh giá của khách hàng cho sản phẩm của đối tác. |
| **Hậu điều kiện** | Phản hồi được lưu, khách hàng thấy phản hồi trên trang đánh giá. |

**Luồng sự kiện chính**

| Actor | System |
|---|---|
| 1. Xem danh sách đánh giá sản phẩm của mình. | 2. Hiển thị danh sách đánh giá theo sản phẩm. |
| 3. Nhập nội dung phản hồi, gửi. | 4. Lưu phản hồi, gắn với đánh giá tương ứng. |
| | 5. Hiển thị phản hồi công khai bên dưới đánh giá. |

---

## 12. Flash Sale

| Mục | Nội dung |
|---|---|
| **Tên usecase** | Flash Sale |
| **Mô tả sơ lược** | Admin tạo sự kiện giảm giá trong thời gian giới hạn cho một số sản phẩm nhất định. |
| **Actor chính** | Admin |
| **Actor phụ** | Khách/Khách hàng (xem, mua) |
| **Tiền điều kiện** | Có danh sách sản phẩm đủ điều kiện đưa vào Flash Sale. |
| **Hậu điều kiện** | Sự kiện Flash Sale được kích hoạt, hiển thị đếm ngược cho người dùng. |

**Luồng sự kiện chính**

| Actor | System |
|---|---|
| 1. Tạo sự kiện Flash Sale (tên, thời gian). | 2. Lưu thông tin sự kiện. |
| 3. Thêm sản phẩm, thiết lập số lượng và mức giảm giá. | 4. Kiểm tra tồn kho, lưu cấu hình sản phẩm sale. |
| 5. Kích hoạt sự kiện. | 6. Chuyển trạng thái ACTIVE, bắt đầu đếm ngược. |
| | 7. Hiển thị Flash Sale cho khách trên trang chủ. |

**Luồng phụ**
- A1: Hết thời gian sự kiện → hệ thống tự động chuyển trạng thái ENDED, khôi phục giá gốc.
- A2: Sản phẩm hết số lượng sale → ẩn khỏi Flash Sale trước khi hết giờ.

---

## 13. Hoàn tiền

| Mục | Nội dung |
|---|---|
| **Tên usecase** | Hoàn tiền |
| **Mô tả sơ lược** | Khách hàng yêu cầu hoàn tiền cho đơn hàng đã DELIVERED, Admin xem xét và xử lý. |
| **Actor chính** | Admin |
| **Actor phụ** | Khách hàng |
| **Tiền điều kiện** | Đơn hàng đã ở trạng thái DELIVERED, chưa có yêu cầu hoàn tiền nào cho đơn này. |
| **Hậu điều kiện** | Yêu cầu hoàn tiền được chấp nhận (paymentStatus → REFUNDED) hoặc từ chối (kèm lý do). |

**Luồng sự kiện chính**

| Actor | System |
|---|---|
| 1. Khách hàng gửi yêu cầu hoàn tiền kèm lý do, ảnh minh chứng, số tiền. | 2. Kiểm tra đơn hàng đã DELIVERED, chưa có refund. Ghi nhận yêu cầu, gửi thông báo cho admin. |
| 3. Admin xem xét yêu cầu và bằng chứng. | 4. Hiển thị chi tiết đơn hàng và yêu cầu. |
| 5. Admin chấp nhận (APPROVED/REFUNDED) hoặc từ chối (REJECTED) kèm phản hồi. | 6. Nếu REFUNDED: cập nhật paymentStatus = REFUNDED cho đơn hàng. |
| | 7. Nếu từ chối: thông báo lý do cho khách hàng. |

**Luồng phụ**
- A1: Admin chọn REFUNDED → hệ thống cập nhật paymentStatus của đơn hàng thành REFUNDED.

---

## 14. Xử lý vi phạm

| Mục | Nội dung |
|---|---|
| **Tên usecase** | Xử lý vi phạm |
| **Mô tả sơ lược** | Khách hàng báo cáo vi phạm đối với shop hoặc sản phẩm. Admin xem xét và áp dụng biện pháp xử lý: cảnh báo, gỡ sản phẩm, khóa shop. |
| **Actor chính** | Admin |
| **Actor phụ** | Khách hàng (người báo cáo) |
| **Tiền điều kiện** | Có báo cáo vi phạm được gửi lên hệ thống. |
| **Hậu điều kiện** | Đối tác/sản phẩm vi phạm bị cảnh báo, gỡ sản phẩm, hoặc khóa tài khoản. |

**Luồng sự kiện chính**

| Actor | System |
|---|---|
| 1. Khách hàng gửi báo cáo vi phạm (targetId, targetType = SHOP|PRODUCT, reason, evidence). | 2. Lưu báo cáo, gửi thông báo cho admin. |
| 3. Admin xem danh sách báo cáo, xem xét chi tiết. | 4. Hiển thị chi tiết báo cáo (nội dung, minh chứng). |
| 5. Admin chọn kết quả: RESOLVED hoặc DISMISSED. | 6. Nếu kèm penalty = BAN: hệ thống tự động set isActive = false cho target (shop). |
| | 7. Gửi thông báo cho đối tác về quyết định xử lý. |

---

## 15. Chat AI & Chat người thật

| Mục | Nội dung |
|---|---|
| **Tên usecase** | Chat hỗ trợ (AI + người thật) |
| **Mô tả sơ lược** | Người dùng có thể chat với AI chatbot (RAG + fallback rule-based) hoặc chat trực tiếp với đối tác (qua Conversation/Message) để hỗ trợ đơn hàng. |
| **Actor chính** | Khách hàng |
| **Actor phụ** | Đối tác, Hệ thống AI |
| **Tiền điều kiện** | Cửa sổ chat sẵn sàng. |
| **Hậu điều kiện** | Người dùng nhận được câu trả lời từ AI hoặc tin nhắn từ đối tác. |

**Luồng sự kiện chính (Chat AI)**

| Actor | System |
|---|---|
| 1. Nhập câu hỏi vào khung chat AI. | 2. Gọi ML Service (RAG) để truy vấn dữ liệu sản phẩm, chính sách. |
| | 3. Nếu ML Service không khả dụng: fallback rule-based (dùng keyword matching). |
| 4. Đọc câu trả lời, có thể hỏi tiếp. | |

**Luồng sự kiện chính (Chat người thật)**

| Actor | System |
|---|---|
| 1. Khách hàng mở chat, chọn partner/order. | 2. Tự động tìm hoặc tạo Conversation (giữa user + partner). |
| 3. Gửi tin nhắn (text + ảnh). | 4. Lưu Message vào Conversation, cập nhật updatedAt. |
| 5. Đối tác trả lời. | 6. Đánh dấu isRead, hiển thị real-time. |

**Luồng phụ**
- A1: ML Service timeout (60s) → trả lời fallback "Xin lỗi, yêu cầu đã quá thời gian chờ".

---

## 16. Quản lý mã giảm giá (Coupon)

| Mục | Nội dung |
|---|---|
| **Tên usecase** | Quản lý mã giảm giá |
| **Mô tả sơ lược** | Admin/Partner tạo, chỉnh sửa, và theo dõi mã giảm giá (coupon). Khách hàng xem, lưu và áp dụng khi thanh toán. |
| **Actor chính** | Admin, Đối tác |
| **Actor phụ** | Khách hàng |
| **Tiền điều kiện** | Admin/Partner đã đăng nhập. |
| **Hậu điều kiện** | Mã giảm giá được tạo/cập nhật/áp dụng/xóa. |

**Luồng sự kiện chính**

| Actor | System |
|---|---|
| 1. Admin/Partner tạo mã (code, type = PERCENTAGE|FIXED, value, minOrderValue, maxDiscount, usageLimit, perUserLimit, startsAt, expiresAt). | 2. Kiểm tra code trùng, validate dữ liệu (PERCENTAGE: value 0-100, FIXED: value > 0). |
| | 3. Lưu coupon, tự sinh code nếu không nhập. |
| 4. Khách hàng xem danh sách coupon khả dụng (tại /coupons). | 5. Lọc coupon còn hạn, còn lượt, chưa dùng quá giới hạn. |
| 6. Khách hàng nhập mã tại checkout. | 7. validateCoupon: kiểm tra tồn tại, hạn, lượt dùng, minOrderValue. |
| | 8. applyCouponToOrder: tính discountAmount (PERCENTAGE: % * subtotal, có maxDiscount; FIXED: value). |
| | 9. Tạo đơn xong: increment usedCount, ghi CouponUsage. |
| 10. Xem tổng tiền đã áp dụng giảm giá. | |

**Luồng phụ**
- A1: Mã hết hạn/hết lượt → báo lỗi cụ thể.
- A2: Đơn hàng chưa đạt minOrderValue → thông báo điều kiện.
- A3: Dùng quá perUserLimit → báo lỗi.
- A4: Khách hàng lưu coupon (saveCoupon) → danh sách coupon đã lưu.

---

## 17. Quản lý địa chỉ

| Mục | Nội dung |
|---|---|
| **Tên usecase** | Quản lý địa chỉ |
| **Mô tả sơ lược** | Khách hàng thêm, sửa, xóa địa chỉ giao hàng và chọn địa chỉ mặc định. |
| **Actor chính** | Khách hàng |
| **Actor phụ** | Không |
| **Tiền điều kiện** | Khách hàng đã đăng nhập. |
| **Hậu điều kiện** | Danh sách địa chỉ được cập nhật, có thể sử dụng khi đặt hàng. |

**Luồng sự kiện chính**

| Actor | System |
|---|---|
| 1. Thêm địa chỉ mới (label, fullName, phone, street, ward, district, city, isDefault). | 2. Kiểm tra tính hợp lệ dữ liệu (bắt buộc: street, city; fullName/phone có thể lấy từ profile). |
| | 3. Lưu địa chỉ vào danh sách của khách hàng. |
| 4. Sửa/xóa địa chỉ hoặc chọn làm mặc định. | 5. Cập nhật danh sách địa chỉ tương ứng. |

**Luồng phụ**
- A1: Chọn isDefault = true → hệ thống tự động unset các địa chỉ default khác.
- A2: Xóa địa chỉ đang là mặc định → cho phép nhưng cần chọn địa chỉ mặc định khác.
