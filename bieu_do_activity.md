# Biểu đồ Activity — Phong cách Visual Paradigm

> ⚠️ **Hướng dẫn xem:** Copy từng block ````mermaid ... ```` vào [Mermaid Live Editor](https://mermaid.live/) hoặc dùng VS Code + extension Mermaid.

---

## 1. Đăng ký

### 1a. Đăng ký thường

```mermaid
flowchart TD
    subgraph Khách
        direction TB
        C1[Chọn "Đăng ký"]
        C2[Nhập email + mật khẩu + họ tên + SĐT]
        C3[Nhận thông báo thành công]
    end

    subgraph Hệ thống
        direction TB
        S1{Kiểm tra email tồn tại?}
        S2{Kiểm tra định dạng dữ liệu?}
        S3[Mã hóa password bcrypt]
        S4[Tạo user trong CSDL]
        S5[Tạo JWT access + refresh token]
    end

    subgraph CSDL
        direction TB
        D1[(Users table)]
    end

    %% Flow
    ([*]) --> C1
    C1 --> C2
    C2 --> S1
    
    S1 -->|Email chưa tồn tại| S2
    S1 -->|Email đã tồn tại| E1(["❌ Báo lỗi"])

    S2 -->|Hợp lệ| S3
    S2 -->|Không hợp lệ| E2(["❌ Báo lỗi validation"])
    
    S3 --> S4
    S4 --> D1
    D1 --> S5
    S5 --> C3
    C3 --> E3(["✅ Kết thúc"])
```

### 1b. Đăng ký inline (từ form đăng nhập)

```mermaid
flowchart TD
    subgraph Khách
        direction TB
        L1[Nhập email + password tại login]
        L2[Nhập thêm họ tên]
        L3[Tự động đăng nhập]
    end

    subgraph Hệ thống
        direction TB
        L4{Kiểm tra email?}
        L5[Chuyển sang form đăng ký inline]
        L6[Tạo user + JWT]
    end

    ([*]) --> L1
    L1 --> L4
    L4 -->|Email chưa tồn tại| L5
    L5 --> L2
    L2 --> L6
    L6 --> L3
    L3 --> ([✅])
```

---

## 2. Đăng nhập

```mermaid
flowchart TD
    subgraph Người dùng
        direction TB
        A1[Nhập email + password]
        A2[Chọn Google OAuth]
        A3[Nhận token + vào giao diện]
        A4[Chuyển sang đăng ký inline]
    end

    subgraph Hệ thống
        direction TB
        B1{Tìm user theo email}
        B2{isActive = true?}
        B3{So khớp password}
        B4[Kiểm tra authProvider]
        B5[Xác định role → tạo JWT]
        B6[Gọi Passport Google Strategy]
        B7[Tìm/Lập user từ Google profile]
    end

    subgraph CSDL
        direction TB
        DB1[(Users)]
    end

    subgraph Google
        direction TB
        G1[Google OAuth Consent]
    end

    ([*]) --> A1
    ([*]) --> A2

    %% Local login flow
    A1 --> B1
    B1 --> DB1
    DB1 --> B2
    B2 -->|isActive = false| E1(["❌ Tài khoản bị vô hiệu hóa"])
    B2 -->|isActive = true| B3
    B3 -->|Đúng| B5
    B3 -->|Sai| E2(["❌ Email hoặc mật khẩu không đúng"])
    B5 --> A3
    A3 --> ([✅])
    
    %% Email not found → inline reg
    B1 -->|Email không tồn tại| A4
    A4 --> ([📝])

    %% Google OAuth flow
    A2 --> B6
    B6 --> G1
    G1 -->|Callback| B7
    B7 --> B5
```

---

## 3. Mua hàng (Checkout)

```mermaid
flowchart TD
    subgraph Khách hàng
        direction TB
        C1[Duyệt sản phẩm]
        C2[Thêm vào giỏ hàng]
        C3[Nhấn "Đặt hàng"]
        C4[Chọn địa chỉ giao hàng]
        C5[Chọn phương thức thanh toán]
        C6[Xác nhận đặt hàng]
        C7[Nhận xác nhận đơn]
    end

    subgraph Hệ thống
        direction TB
        S1[Kiểm tra tồn kho]
        S2{Còn đủ hàng?}
        S3{Kiểm tra flash sale / coupon}
        S4[Tính subtotal + shipping + discount]
        S5[Tạo đơn hàng PENDING]
        S6[Trừ stock + soldCount]
        S7[Ghi coupon usage]
        S8[Xóa giỏ hàng]
        S9[Gửi thông báo Admin]
    end

    subgraph Cổng thanh toán
        direction TB
        P1[VNPay / MoMo]
    end

    ([*]) --> C1 --> C2 --> C3 --> C4 --> C5

    C5 -->|COD| S1
    C5 -->|Online| P1
    P1 -->|Thành công| S1
    P1 -->|Thất bại| E1(["❌ Hủy, báo lỗi"])

    S1 --> S2
    S2 -->|Đủ| S3
    S2 -->|Không đủ| E2(["❌ Báo lỗi tồn kho"])
    S3 --> S4 --> S5

    ---[Fork]---
    S5 --> S6
    S5 --> S7
    S5 --> S8
    ---[Join]---

    S6 --> S9
    S8 --> S9
    S9 --> C7
    C7 --> ([✅])
```

---

## 4. Quy trình đơn hàng

### Activity Diagram — Trạng thái

```mermaid
flowchart TD
    subgraph Khách hàng
        direction TB
        O1[Theo dõi đơn hàng]
        O2[Xác nhận đã nhận hàng]
    end

    subgraph Đối tác
        direction TB
        P1[Nhận đơn mới PENDING]
        P2[Xác nhận đơn]
        P3[Cập nhật đang giao]
        P4[Từ chối đơn]
    end

    subgraph Hệ thống
        direction TB
        S1[Gửi thông báo]
        S2[Transaction: CANCELLED + hoàn stock + hoàn coupon]
        S3[Cập nhật DELIVERED]
    end

    ([*]) --> P1
    P1 --> P2
    P1 --> P4
    
    P2 -->|CONFIRMED| O1
    O1 --> P3
    P3 -->|SHIPPING| S1
    S1 --> O2

    O2 --> S3
    S3 -->|DELIVERED| ([✅])

    P4 -->|CANCELLED| S2
    S2 --> ([❌ Hủy])
```

### Activity Diagram — Luồng chi tiết

```mermaid
flowchart TD
    subgraph Đối tác
        direction TB
        P1[Xem đơn hàng mới PENDING]
        P2[Xác nhận đơn]
        P3[Cập nhật đang giao hàng]
    end

    subgraph Hệ thống
        direction TB
        S1[status → CONFIRMED]
        S2[Gửi 🔔 cho khách: Đã xác nhận]
        S3[status → SHIPPING]
        S4[Gửi 🔔 cho khách: Đang giao]
        S5[status → DELIVERED]
        S6[Gửi 🔔 cho khách: Giao thành công]
    end

    subgraph Khách hàng
        direction TB
        O1[Theo dõi đơn hàng]
        O2[Xác nhận đã nhận hàng]
        O3[Nhận thông báo]
    end

    ([*]) --> P1
    P1 --> P2
    P2 --> S1
    S1 --> S2
    S2 --> O1
    O1 --> O3
    O3 --> P3
    P3 --> S3
    S3 --> S4
    S4 --> O2
    O2 --> S5
    S5 --> S6
    S6 --> ([✅ DELIVERED])
```

---

## 5. Áp dụng Coupon

```mermaid
flowchart TD
    subgraph Khách hàng
        direction TB
        C[Nhập mã coupon tại checkout]
    end

    subgraph Hệ thống
        direction TB
        V1{Mã tồn tại?}
        V2{Còn hạn sử dụng?}
        V3{Còn lượt dùng?}
        V4{Đủ minOrderValue?}
        V5{Chưa dùng quá perUserLimit?}
        V6{Type?}
        V7[Tính PERCENTAGE: subtotal × value%]
        V8[Có maxDiscount?]
        V9[discount = min(tính, maxDiscount)]
        V10[discount = tính]
        V11[Tính FIXED: discount = value]
        V12[Cập nhật tổng tiền]
    end

    ([*]) --> C --> V1

    V1 -->|Không| E1(["❌ Mã không tồn tại"])
    V1 -->|Có| V2
    V2 -->|Hết hạn| E2(["❌ Mã đã hết hạn"])
    V2 -->|Còn hạn| V3
    V3 -->|Hết lượt| E3(["❌ Mã đã hết lượt"])
    V3 -->|Còn| V4
    V4 -->|Chưa đủ| E4(["❌ Đơn tối thiểu X₫"])
    V4 -->|Đủ| V5
    V5 -->|Đã dùng quá| E5(["❌ Quá số lần cho phép"])
    V5 -->|OK| V6

    V6 -->|PERCENTAGE| V7
    V7 --> V8
    V8 -->|Có| V9
    V8 -->|Không| V10
    V9 --> V12
    V10 --> V12

    V6 -->|FIXED| V11
    V11 --> V12

    V12 --> ([✅ Áp dụng thành công])
```

---

## 6. Quản lý sản phẩm (Partner CRUD)

```mermaid
flowchart TD
    subgraph Đối tác
        direction TB
        A[Đăng nhập]
        B[Cửa hàng được duyệt?]
        C[Chọn: Thêm / Sửa / Xóa]
        D[Nhập thông tin sản phẩm]
        E[Sửa thông tin]
        F[Chọn xóa]
    end

    subgraph Hệ thống
        direction TB
        S1{Kiểm tra quyền sở hữu}
        S2[Validate dữ liệu]
        S3[Lưu CSDL + xóa cache]
        S4[Soft delete: isActive = false]
    end

    ([*]) --> A
    A --> B
    B -->|Chưa duyệt| W(["⏳ Chờ admin duyệt"])
    B -->|Đã duyệt| C

    C -->|Thêm| D --> S2
    S2 -->|Hợp lệ| S3 --> ([✅ Đã tạo])
    S2 -->|Thiếu| E6(["❌ Báo lỗi"])

    C -->|Sửa| S1
    S1 -->|Thuộc về mình| E --> S2
    S1 -->|Không phải của mình| E7(["❌ Từ chối"])
    
    C -->|Xóa| F --> S4 --> ([✅ Đã xóa])
```

---

## 7. Xử lý đơn hàng (Partner)

```mermaid
flowchart TD
    subgraph Đối tác
        direction TB
        P1[Xem đơn hàng mới]
        P2[Xác nhận đơn]
        P3[Chuẩn bị hàng, giao]
        P4[Từ chối đơn]
    end

    subgraph Hệ thống
        direction TB
        S1[status → CONFIRMED]
        S2[status → SHIPPING]
        S3[status → CANCELLED]
        S4[🔔 Thông báo khách hàng]
        S5[Hoàn stock tất cả SP]
        S6[Hoàn coupon]
    end

    ([*]) --> P1
    
    P1 --> P2
    P1 --> P4

    P2 --> S1
    S1 --> S4 --> ([✅ CONFIRMED])

    P3 --> S2
    S2 --> S4 --> ([✅ SHIPPING])

    P4 --> S3
    S3 -->|Fork| S5
    S3 -->|Fork| S6
    S5 -->|Join| S4 --> ([❌ CANCELLED])
```

---

## 8. Đánh giá sản phẩm

```mermaid
flowchart TD
    subgraph Khách hàng
        direction TB
        R1[Chọn sản phẩm đã nhận]
        R2[Bấm "Đánh giá"]
        R3[Chọn sao + viết bình luận]
        R4[Gửi đánh giá]
        R5[Sửa số sao / bình luận]
    end

    subgraph Hệ thống
        direction TB
        S1{Đơn hàng DELIVERED?}
        S2{Đã đánh giá trước đó?}
        S3[Lưu review mới]
        S4[Cập nhật rating sản phẩm]
        S5[Cho phép sửa review]
        S6[Cập nhật review cũ]
    end

    ([*]) --> R1
    R1 --> R2
    R2 --> S1

    S1 -->|Chưa giao| E1(["❌ Chưa thể đánh giá"])
    S1 -->|Đã giao| S2

    S2 -->|Chưa| R3
    S2 -->|Rồi| S5

    R3 --> R4
    R4 --> S3
    
    S5 --> R5
    R5 --> S6

    S3 --> S4 --> ([✅])
    S6 --> S4
```

---

## 9. Quản lý giỏ hàng

```mermaid
flowchart TD
    subgraph Khách hàng
        direction TB
        A[Thêm sản phẩm]
        B[Sửa số lượng]
        C[Xóa sản phẩm]
        D[Xem giỏ hàng]
    end

    subgraph Hệ thống
        direction TB
        S1{Kiểm tra tồn kho}
        S2{SL > 0 & đủ stock?}
        S3[Cập nhật giỏ hàng]
        S4[Tính tổng tiền + flash sale]
        S5[Hiển thị giỏ hàng]
        S6[Xóa khỏi giỏ]
    end

    ([*]) --> A
    A --> S1
    S1 -->|Đủ| S3 --> S4
    S1 -->|Hết| E1(["❌ Báo lỗi"])

    ([*]) --> B
    B --> S2
    S2 -->|OK| S3
    S2 -->|Không| E2(["❌ Báo lỗi"])

    ([*]) --> C
    C --> S6 --> S4

    ([*]) --> D

    S4 --> S5
    S6 --> S5
    S5 --> ([✅])
```

---

## 10. Hủy đơn hàng

```mermaid
flowchart TD
    subgraph Khách hàng
        direction TB
        H1[Chọn đơn hàng]
        H2[Bấm "Hủy đơn"]
        H3[Xác nhận hủy]
        H4[Nhận thông báo]
    end

    subgraph Hệ thống
        direction TB
        S1{Trạng thái = PENDING?}
        S2[BẮT ĐẦU TRANSACTION]
        S3[Cập nhật status → CANCELLED]
        S4[Hoàn stock + soldCount]
        S5[Hoàn coupon: usedCount--]
        S6[Xóa CouponUsage]
        S7[KẾT THÚC TRANSACTION]
        S8[🔔 Thông báo Admin]
    end

    ([*]) --> H1
    H1 --> H2
    H2 --> S1

    S1 -->|PENDING| H3
    S1 -->|≠ PENDING| E1(["❌ Chỉ hủy đơn PENDING"])

    H3 --> S2
    S2 --> S3
    S3 --> S4
    S3 --> S5
    S5 --> S6
    S4 --> S7
    S6 --> S7
    S7 --> S8
    S8 --> H4
    H4 --> ([✅])
```

---

## 11. Phản hồi đánh giá (Partner Reply)

```mermaid
flowchart TD
    subgraph Đối tác
        direction TB
        P1[Xem danh sách đánh giá SP của mình]
        P2[Nhập nội dung phản hồi]
        P3[Gửi phản hồi]
    end

    subgraph Hệ thống
        direction TB
        S1{Kiểm tra: SP thuộc partner?}
        S2[Lưu reply + repliedAt]
        S3[Hiển thị công khai]
    end

    subgraph Khách hàng
        direction TB
        C1[Xem đánh giá]
        C2[Thấy phản hồi]
    end

    ([*]) --> P1
    P1 --> P2
    P2 --> P3
    P3 --> S1

    S1 -->|Phải SP của mình| S2
    S1 -->|Không phải| E1(["❌ Từ chối"])

    S2 --> S3
    S3 --> C2
    C1 --> C2
    C2 --> ([✅])
```

---

## 12. Flash Sale

```mermaid
flowchart TD
    subgraph Admin
        direction TB
        A1[Tạo sự kiện Flash Sale]
        A2[Thêm sản phẩm + giá sale]
        A3[Kích hoạt]
    end

    subgraph Hệ thống
        direction TB
        S1[Lưu sự kiện]
        S2[ACTIVE: bắt đầu đếm ngược]
        S3[Hiển thị trên trang chủ]
        S4{Tồn tại flash sale?}
        S5[Giá = salePrice]
        S6[Giá = giá gốc]
        S7{Hết thời gian?}
        S8[Tự động ENDED]
    end

    subgraph Khách hàng
        direction TB
        C1[Xem flash sale]
        C2[Mua với giá ưu đãi]
    end

    ([*]) --> A1
    A1 --> S1
    A1 --> A2
    A2 --> A3
    A3 --> S2
    S2 --> S3

    C1 --> S4
    S4 -->|Còn suất| S5
    S4 -->|Hết suất| S6
    S5 --> C2
    C2 --> S7
    S6 --> S7
    S7 -->|Còn giờ| S3
    S7 -->|Hết giờ| S8
    S8 --> ([⏹ Kết thúc])
```

---

## 13. Hoàn tiền (Refund)

```mermaid
flowchart TD
    subgraph Khách hàng
        direction TB
        R1[Gửi yêu cầu hoàn tiền]
        R2[Nhập: lý do, ảnh, số tiền]
        R3[Nhận thông báo kết quả]
    end

    subgraph Hệ thống
        direction TB
        S1{Đơn DELIVERED?}
        S2{Đã có refund?}
        S3[Lưu Refund → PENDING]
        S4[🔔 Thông báo Admin]
        S5[Chấp nhận → APPROVED]
        S6[Từ chối → REJECTED]
        S7[Cập nhật paymentStatus = REFUNDED]
    end

    subgraph Admin
        direction TB
        A1[Xem yêu cầu]
        A2[Xem xét bằng chứng]
        A3[Chấp nhận / Từ chối]
    end

    ([*]) --> R1
    R1 --> R2
    R2 --> S1

    S1 -->|Chưa DELIVERED| E1(["❌ Không hợp lệ"])
    S1 -->|DELIVERED| S2
    S2 -->|Đã có refund| E2(["❌ Đã gửi yêu cầu trước đó"])
    S2 -->|Chưa| S3
    S3 --> S4

    S4 --> A1
    A1 --> A2
    A2 --> A3

    A3 -->|Chấp nhận| S5
    A3 -->|Từ chối| S6

    S5 --> S7
    S7 --> R3 --> ([✅ Hoàn tiền])
    S6 --> R3 --> ([❌ Từ chối])
```

---

## 14. Xử lý vi phạm

```mermaid
flowchart TD
    subgraph Khách hàng
        direction TB
        B1[Phát hiện vi phạm]
        B2[Gửi báo cáo]
        B3[Nhập: targetId, type, reason, evidence]
    end

    subgraph Hệ thống
        direction TB
        S1[Lưu Violation → PENDING]
        S2[🔔 Thông báo Admin]
        S3[RESOLVED + WARNING]
        S4[RESOLVED + BAN → isActive = false]
        S5[DISMISSED]
    end

    subgraph Admin
        direction TB
        A1[Xem danh sách báo cáo]
        A2[Xem xét chi tiết]
        A3{Cảnh báo / Khóa / Bỏ qua?}
    end

    ([*]) --> B1
    B1 --> B2
    B2 --> B3
    B3 --> S1
    S1 --> S2
    S2 --> A1
    A1 --> A2
    A2 --> A3

    A3 -->|WARNING| S3 --> ([✅])
    A3 -->|BAN| S4 --> ([✅])
    A3 -->|DISMISS| S5 --> ([✅])
```

---

## 15. Chat AI (RAG + Fallback)

```mermaid
flowchart TD
    subgraph Người dùng
        direction TB
        Q1[Nhập câu hỏi vào chat AI]
        Q2[Đọc câu trả lời]
        Q3[Hỏi tiếp / Kết thúc]
    end

    subgraph Hệ thống
        direction TB
        H1[Gọi ML Service /rag/ask]
        H2{ML Service khả dụng?}
        H3[Rule-based fallback]
        H4[Trả lời: xin lỗi quá thời gian]
    end

    subgraph ML Service
        direction TB
        M1[Truy vấn ChromaDB]
        M2[Sinh câu trả lời từ context]
    end

    subgraph ChromaDB
        direction TB
        D1[(Knowledge Base: sản phẩm, chính sách, FAQ)]
    end

    ([*]) --> Q1
    Q1 --> H1

    H1 --> H2
    H2 -->|Có, trong 60s| M1
    H2 -->|Timeout| H4
    H2 -->|Không khả dụng| H3

    M1 --> D1
    D1 --> M2
    M2 --> Q2

    H3 --> Q2
    H4 --> Q2

    Q2 --> Q3
    Q3 -->|Hỏi tiếp| Q1
    Q3 -->|Kết thúc| ([✅])
```

---

## 16. Quản lý mã giảm giá (Coupon)

### Admin tạo coupon

```mermaid
flowchart TD
    subgraph Admin / Partner
        direction TB
        A1[Chọn "Tạo mã giảm giá"]
        A2[Nhập code, type, value, usageLimit, expiresAt]
    end

    subgraph Hệ thống
        direction TB
        S1{Auto-generate code?}
        S2{Code trùng?}
        S3{PERCENTAGE: value 0-100?}
        S4{Đủ thông tin?}
        S5[Lưu Coupon]
    end

    ([*]) --> A1
    A1 --> A2
    A2 --> S1
    S1 -->|Có code| S2
    S1 -->|Không| G[Tự sinh code]
    G --> S2

    S2 -->|Trùng| E1(["❌ Mã đã tồn tại"])
    S2 -->|Không| S3
    S3 -->|OK| S4
    S3 -->|Không| E2(["❌ Báo lỗi"])
    S4 -->|Đủ| S5 --> ([✅])
    S4 -->|Thiếu| E3(["❌ Báo lỗi"])
```

### Khách hàng áp dụng

```mermaid
flowchart TD
    subgraph Khách hàng
        direction TB
        C1[Vào "Kho Voucher"]
        C2[Lưu coupon yêu thích]
        C3[Nhập mã tại checkout]
    end

    subgraph Hệ thống
        direction TB
        S1[Lọc coupon khả dụng]
        S2[Lưu SavedCoupon]
        S3[validateCoupon]
        S4[applyCouponToOrder]
        S5[increment usedCount + ghi CouponUsage]
    end

    ([*]) --> C1
    C1 --> S1
    S1 --> C2
    C2 --> S2 --> ([✅ Đã lưu])

    C1 --> C3
    C3 --> S3
    S3 -->|Hợp lệ| S4
    S3 -->|Không hợp lệ| E(["❌ Báo lỗi"])
    S4 --> S5
    S5 --> ([✅ Giảm giá áp dụng])
```

---

## 17. Quản lý địa chỉ

```mermaid
flowchart TD
    subgraph Khách hàng
        direction TB
        A1[Vào "Quản lý địa chỉ"]
        A2[Nhập thông tin địa chỉ mới]
        A3[Sửa thông tin]
        A4[Xóa địa chỉ]
        A5[Chọn làm mặc định]
    end

    subgraph Hệ thống
        direction TB
        S1{Validate: street, city required}
        S2{isDefault = true?}
        S3[Unset các default cũ]
        S4[Lưu / Cập nhật / Xóa]
        S5[Cập nhật danh sách]
    end

    ([*]) --> A1

    A1 --> A2
    A2 --> S1
    S1 -->|OK| S2
    S1 -->|Thiếu| E1(["❌ Báo lỗi"])
    S2 -->|Có| S3
    S2 -->|Không| S4
    S3 --> S4
    S4 --> S5 --> ([✅])

    A1 --> A3
    A3 --> S4

    A1 --> A4
    A4 --> S4

    A1 --> A5
    A5 --> S2
```

---

## Tổng quan hệ thống — Activity Diagram

```mermaid
flowchart LR
    subgraph Actors
        K["Khách hàng"]
        P["Đối tác"]
        A["Admin"]
    end

    subgraph Core Processes
        Auth["🔐 Xác thực<br/>Đăng ký / Đăng nhập"]
        Shopping["🛒 Mua sắm<br/>Cart → Order → Payment"]
        Fulfill["📦 Xử lý đơn<br/>PENDING → DELIVERED"]
        Review["⭐ Đánh giá<br/>Review → Reply"]
    end

    subgraph Support Processes
        Coupon["🏷️ Coupon<br/>Tạo → Áp dụng"]
        Flash["⚡ Flash Sale<br/>Tạo → Kích hoạt"]
        Refund["💰 Hoàn tiền<br/>Yêu cầu → Xử lý"]
        Violation["🚨 Vi phạm<br/>Báo cáo → Xử lý"]
        Chat["💬 Chat<br/>AI + Người thật"]
        Address["📍 Địa chỉ<br/>CRUD"]
        Products["📋 Sản phẩm<br/>CRUD"]
    end

    K --> Auth
    K --> Shopping
    K --> Review
    K --> Coupon
    K --> Refund
    K --> Violation
    K --> Chat
    K --> Address

    P --> Auth
    P --> Products
    P --> Fulfill
    P --> Review
    P --> Coupon
    P --> Chat

    A --> Auth
    A --> Flash
    A --> Refund
    A --> Violation
    A --> Coupon

    Shopping --> Fulfill
    Fulfill --> Review
    Fulfill --> Refund

    style K fill:#d0e8f7,stroke:#1a6fb5
    style P fill:#d4edda,stroke:#28a745
    style A fill:#fce4d6,stroke:#ed7d31

    style Auth fill:#f3e5f5,stroke:#9c27b0
    style Shopping fill:#fff3cd,stroke:#ff9800
    style Fulfill fill:#cce5ff,stroke:#0066cc
    style Review fill:#e2d9f3,stroke:#6610f2
```

---

> 📌 **Chú thích ký hiệu Activity Diagram:**
> - `([*])` — Node bắt đầu / kết thúc
> - `[Hành động]` — Action / Activity
> - `{Điều kiện?}` — Decision node
> - `---[Fork]---` / `---[Join]---` — Fork/Join bar (parallel)
> - `(["❌ Lỗi"])` — Exception / Error end
> - **Subgraph** — Partition / Swimlane (actor thực hiện)
