# 🛒 KhoaLuan — Hệ thống Thương mại Điện tử 3 Nhánh + ML Gợi ý

**Đề tài:** Hệ thống thương mại điện tử với 3 nhánh người dùng (Admin, Đối tác kinh doanh, Khách hàng) kết hợp **ML Recommendation Engine** gồm 2 mô hình:

- **Phân cụm khách hàng** — RFM + K-Means
- **Gợi ý theo phiên (Session-based)** — Co-occurrence + Sequence Prediction + HSP/RIC

---

## 📋 Mục lục

- [👥 Tài khoản mặc định](#-tài-khoản-mặc-định)
- [🏗️ Kiến trúc tổng quan](#️-kiến-trúc-tổng-quan)
- [🚀 Hướng dẫn chạy](#-hướng-dẫn-chạy)
- [👥 3 Nhánh người dùng](#-3-nhánh-người-dùng)
- [🧪 ML Engine](#-ml-engine)
- [🧰 Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [📁 Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [🔌 API Endpoints](#-api-endpoints)
- [💨 Hiệu suất & Tối ưu](#-hiệu-suất--tối-ưu)
- [🗄️ Database Schema](#️-database-schema)
- [🎨 Thiết kế giao diện](#-thiết-kế-giao-diện)
- [✨ Tính năng nổi bật](#-tính-năng-nổi-bật)

---

## 👥 Tài khoản mặc định

### Mật khẩu chung

| Nhóm | Mật khẩu |
|------|---------|
| 🔴 **Admin** | `admin123` |
| 🟡 **Partner** | `partner123` |
| 🟢 **Customer** | `customer123` |

### 🔴 Admin (1)

| Email | Tên | Ghi chú |
|-------|-----|---------|
| admin@khoaluan.com | Admin KhoaLuan | Quyền quản trị toàn hệ thống |

### 🟡 Partner (8)

| # | Email | Tên | Cửa hàng | Đã duyệt | Số SP |
|---|-------|-----|---------|:--------:|:-----:|
| 1 | partner1@shop.com | Nguyễn Văn Kinh Doanh | **Shop Điện Tử ABC** — Điện thoại, laptop | ✅ | 12 |
| 2 | partner2@fashion.com | Trần Thị Thời Trang | **Fashion House XYZ** — Thời trang nam nữ | ✅ | 9 |
| 3 | partner3@new.com | Lê Thị Mới | **Cửa hàng mới** | ✅ | 0 |
| 4 | partner4@sport.com | Phạm Văn Thể Thao | **Sports Zone Việt Nam** — Thể thao, gym | ✅ | 11 |
| 5 | partner5@beauty.com | Trần Thị Đẹp | **Beauty House** — Mỹ phẩm, skincare | ✅ | 11 |
| 6 | partner6@pet.com | Lê Văn Pet | **Pet Mart Việt Nam** — Thú cưng | ✅ | 10 |
| 7 | partner7@furniture.com | Hoàng Thị Nội Thất | **Nội Thất Xinh** — Nội thất | ✅ | 11 |
| 8 | partner8@mebebe.com | Nguyễn Văn Bé | **Mẹ & Bé Shop** — Mẹ & bé | ✅ | 10 |

### 🟢 Customer (15)

| # | Email | Tên | Ghi chú |
|---|-------|-----|---------|
| 1 | customer1@test.com | Nguyễn Văn A | Có lịch sử mua hàng — VIP |
| 2 | customer2@test.com | Trần Thị B | Có lịch sử mua hàng |
| 3 | customer3@test.com | Lê Văn C | Có lịch sử mua hàng |
| 4 | customer4@test.com | Phạm Thị D | Cần Thơ |
| 5 | customer5@test.com | Hoàng Văn E | Nha Trang |
| 6 | customer6@test.com | Đỗ Thị F | Huế |
| 7 | customer7@test.com | Vũ Văn G | Buôn Ma Thuột |
| 8 | customer8@test.com | Đặng Thị H | Vinh |
| 9 | customer9@test.com | Bùi Văn K | Quy Nhơn |
| 10 | customer10@test.com | Lý Thị L | Thái Nguyên |
| 11 | customer11@test.com | Mai Văn M | Hạ Long |
| 12 | customer12@test.com | Tạ Thị N | Phan Thiết |
| 13 | customer13@test.com | Đinh Văn P | Rạch Giá |
| 14 | customer14@test.com | Lương Thị Q | Tuy Hòa |
| 15 | customer15@test.com | Trịnh Văn R | Sóc Trăng |

> **Tổng:** 1 Admin + 8 Partner (8 đã duyệt) + 15 Customer = **24 người dùng**

---

## 🏗️ Kiến trúc tổng quan

```
┌────────────────────────────────────────────────────────────────────────┐
│                     Frontend Web (React + Vite + Tailwind)             │
│                  http://localhost:3000                                 │
│                   + Mobile App (React Native + Expo)                   │
├────────────────────────────────────────────────────────────────────────┤
│              Backend API (Node.js + Express + Prisma ORM)              │
│                  http://localhost:5000                                 │
├────────────────────┬───────────────────────────────────────────────────┤
│   ML Service       │    Database & Cache                               │
│   (Python/FastAPI) │    PostgreSQL 15 + Redis 7                        │
│   http://localhost:8000                                               │
└────────────────────┴───────────────────────────────────────────────────┘
```

Hệ thống gồm **5 Docker services**: `postgres`, `redis`, `backend`, `ml-service`, `frontend`.

### Dữ liệu mẫu (seed)

| Mục | Số lượng | Ghi chú |
|-----|:--------:|---------|
| 👤 Users | 24 | 1 Admin + 8 Partner + 15 Customer |
| 📁 Danh mục | 10 | Điện thoại, Laptop, Thời trang, Gia dụng, Sách, Mỹ phẩm, Thể thao, Thú cưng, Nội thất, Mẹ&Bé |
| 📦 Sản phẩm | 101 | Có biến thể (size, màu, dung lượng) |
| 📋 Đơn hàng | 51 | Trạng thái: PENDING → DELIVERED |
| ⭐ Đánh giá | 200 | Kèm phản hồi từ partner |
| 👁️ Product Views | 281 | Cho Session-based Recommendations |
| 📌 Gợi ý SP | 30 | Recommendations cá nhân hóa |
| 🏷️ Mã giảm giá | 22 | PERCENTAGE + FIXED |
| 🎯 Phân cụm | 9 | Cluster + Rules cho RFM |
| 🔔 Thông báo | 8 | Hệ thống + đơn hàng |

---

## 🚀 Hướng dẫn chạy

### Yêu cầu
- Docker & Docker Compose

### Chạy với Docker (khuyến nghị)

```bash
# Clone dự án
git clone <url>
cd KhoaLuan

# Khởi động tất cả services
docker-compose up -d

# Kiểm tra logs backend đã seed xong chưa
docker-compose logs -f backend
# Khi thấy "✅ Khởi động hoàn tất!" là có thể dùng được
```

Sau khi chạy:

| URL | Mô tả |
|-----|-------|
| http://localhost:3000 | 🖥️ Frontend Web |
| http://localhost:5000 | ⚙️ Backend API |
| http://localhost:5000/api/health | Health check |
| http://localhost:8000 | 🤖 ML Service |
| http://localhost:8000/docs | 📚 ML API Docs (Swagger) |

> **Lưu ý:** Seed chỉ chạy 1 lần khi chưa có dữ liệu. Nếu muốn seed lại, dùng script bên dưới.

### Seed lại toàn bộ dữ liệu

```bash
# Đặt DB về trạng thái rỗng & seed toàn bộ (4 scripts)
docker exec khoaluan-backend sh -c "
  npx prisma db push --force-reset --accept-data-loss &&
  node prisma/seed.js &&
  node prisma/seed-full.js &&
  node prisma/seed-new-models.js &&
  node prisma/seed-ml-test.js
"
```

### Kiểm tra nhanh

```bash
# Health check
curl http://localhost:5000/api/health

# Đăng nhập admin
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@khoaluan.com","password":"admin123"}' \
  | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.token))")

# ML Health
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/ml/health

# Chạy bộ test ML (health, info, train session, clustering, trending, recommend)
docker exec khoaluan-backend sh -c "node prisma/test-ml-all.js"
```

### Chạy ML Service riêng (không dùng Docker)

```bash
cd backend/ml
pip install -r requirements.txt
uvicorn clustering.api:app --host 0.0.0.0 --port 8000 --reload
```

---

## 👥 3 Nhánh người dùng

| Nhánh | Vai trò | Mô tả |
|-------|---------|-------|
| 🔴 **Admin** | `ADMIN` | Quản trị hệ thống (không quản lý đơn hàng — partner tự xử lý) |
| 🟡 **Đối tác kinh doanh** | `PARTNER` | Đăng bán sản phẩm, tự duyệt & xử lý đơn hàng của shop mình |
| 🟢 **Khách hàng** | `CUSTOMER` | Mua sắm, đánh giá, theo dõi đơn hàng |

### 🔴 Admin — Quản trị viên

Admin có toàn quyền quản lý hệ thống qua dashboard. **Admin không quản lý đơn hàng** — mỗi partner tự xử lý đơn hàng của shop mình.

| Module | Mô tả |
|--------|-------|
| 📊 **Dashboard** | Thống kê tổng quan (người dùng, sản phẩm, đối tác, danh mục) |
| 📦 **Quản lý sản phẩm** | CRUD sản phẩm, lọc, tìm kiếm, phân trang (10/trang) |
| 🏷️ **Quản lý danh mục** | CRUD danh mục sản phẩm |
| 👥 **Quản lý người dùng** | Xem, sửa, phân quyền người dùng (10/trang) |
| 🤝 **Quản lý đối tác** | Phê duyệt / từ chối đối tác mới đăng ký |
| 🎯 **Phân cụm khách hàng** | Tạo nhóm, chạy phân cụm K-Means/RFM qua ML Service |
| 🧪 **Kiểm tra ML** | Chạy tự động các bước: health, train session, clustering, trending, recommend |
| 🏆 **Mã giảm giá** | CRUD mã giảm giá, theo dõi lượt sử dụng (10/trang) |
| 🖼️ **Banner** | Quản lý banner trang chủ (vị trí, link, màu nền) |
| ⚡ **Flash Sale** | Tạo sự kiện flash sale, thêm/xóa sản phẩm |
| 💰 **Hoàn tiền** | Xử lý yêu cầu hoàn tiền từ khách hàng (10/trang) |
| 🚨 **Vi phạm** | Xử lý báo cáo vi phạm shop/sản phẩm (10/trang) |
| 📝 **Audit Log** | Xem lịch sử hành động quan trọng (10/trang) |
| 🔔 **Thông báo** | Xem thông báo hệ thống (poll 30s) |
| ⚙️ **Cài đặt** | Cấu hình hệ thống (tên site, phí ship, clustering...) |

### 🟡 Đối tác kinh doanh (Partner)

Partner có không gian riêng với các tính năng — **tự xử lý đơn hàng của shop mình**:

| Tính năng | Mô tả |
|-----------|-------|
| 📝 **Đăng ký đối tác** | Đăng ký với thông tin cửa hàng (tên, mô tả, MST, địa chỉ KD) |
| ✅ **Chờ phê duyệt** | Admin phê duyệt trước khi có thể bán hàng |
| 📊 **Dashboard đối tác** | Thống kê sản phẩm, đơn hàng, doanh thu |
| 📈 **Doanh thu theo tháng** | Biểu đồ doanh thu, top sản phẩm bán chạy |
| 📦 **Quản lý sản phẩm** | CRUD sản phẩm của riêng mình (10/trang) |
| 📋 **Quản lý đơn hàng** | Xem & xử lý đơn hàng có chứa sản phẩm của mình (10/trang) |
| 🚚 **Cập nhật trạng thái** | Xác nhận → Đang giao → Đã giao |
| ⭐ **Quản lý đánh giá** | Xem và phản hồi đánh giá sản phẩm (10/trang) |
| 🏆 **Mã giảm giá** | Tạo mã giảm giá riêng cho shop (10/trang) |
| 💬 **Chat với khách hàng** | Trao đổi trực tiếp với khách hàng |
| ✏️ **Cập nhật hồ sơ** | Sửa thông tin cửa hàng |

### 🟢 Khách hàng (Customer)

| Tính năng | Mô tả |
|-----------|-------|
| 🔐 **Đăng nhập bằng Google** | OAuth 2.0 qua Passport.js, tự động tạo tài khoản |
| 🔐 **Đăng ký / Đăng nhập thông minh** | Nhập email → check tồn tại → đăng nhập hoặc đăng ký inline trên 1 form |
| 🔐 **JWT 15 phút** | Access token ngắn hạn + auto-refresh, bảo mật tối ưu |
| 🔍 **Tìm kiếm & duyệt** | Sản phẩm theo danh mục, giá, đánh giá, tìm kiếm (10/trang) |
| 🏷️ **Bộ lọc thông minh** | Mùa hè, Mới nhất, Bán chạy, Đánh giá cao, AI Đề xuất (có active state) |
| 🛒 **Giỏ hàng** | Thêm, sửa, xóa sản phẩm trong giỏ |
| 💳 **Đặt hàng** | Thanh toán COD / Banking / MoMo / VNPAY |
| 📋 **Theo dõi đơn hàng** | PENDING → CONFIRMED → SHIPPING → DELIVERED (10/trang) |
| 🎫 **Kho voucher** | Xem & lưu mã giảm giá, sao chép mã, lọc theo loại |
| 🎫 **Áp dụng mã giảm giá** | Nhập mã giảm giá khi đặt hàng |
| 👥 **Theo dõi shop** | Theo dõi / bỏ theo dõi cửa hàng yêu thích |
| ⭐ **Đánh giá sản phẩm** | Đánh giá và xem phản hồi từ người bán |
| 📍 **Địa chỉ giao hàng** | Quản lý nhiều địa chỉ giao hàng |
| 💬 **Chat với shop (Floating)** | Widget chat nổi — trò chuyện trực tiếp với shop mọi lúc |
| 💰 **Yêu cầu hoàn tiền** | Gửi yêu cầu hoàn tiền cho đơn đã giao |
| 🚨 **Báo cáo vi phạm** | Báo cáo shop/sản phẩm vi phạm |
| 🚚 **Xác nhận đã nhận hàng** | Xác nhận đã nhận được hàng |
| 🔄 **Mua lại** | Thêm lại sản phẩm từ đơn cũ vào giỏ hàng |
| 🎯 **Gợi ý cá nhân hóa** | Sản phẩm gợi ý dựa trên nhóm khách hàng |

---

## 🧪 ML Engine

ML Service chạy riêng biệt với backend (Python + FastAPI) và chỉ gồm **2 mô hình**: phân cụm khách hàng (K-Means) và gợi ý theo phiên (Session-based).

```
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Node.js)                             │
│  mlService.js → callML() → proxy request → fetch(60s timeout)    │
├─────────────────────────────────────────────────────────────────┤
│                    ML Service (Python FastAPI)                   │
│  ┌───────────────────────────┐  ┌───────────────────────────┐    │
│  │      Session-based        │  │        Clustering         │    │
│  │  Co-occurrence            │  │          RFM              │    │
│  │  Sequence Prediction      │  │       + K-Means           │    │
│  │  HSP · RIC                │  │                           │    │
│  │  (từ 281 product views)   │  │      4 clusters           │    │
│  └───────────────────────────┘  └───────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### ML Endpoints (FastAPI)

| Endpoint | Mô tả | Auth | Thời gian |
|----------|-------|:----:|:---------:|
| `GET /` | Health check | Public | ~2ms |
| `GET /health` | Health check chi tiết | Public | ~2ms |
| `GET /info` | Thông tin service & models | Public | ~2ms |
| `POST /cluster/run` | Chạy phân cụm K-Means + RFM | ADMIN | ~200ms |
| `POST /cluster/recommend` | Gợi ý sản phẩm theo cụm | — | ~50ms |
| `GET /cluster/profiles` | Xem profile các cụm đã train | — | ~2ms |
| `GET /cluster/stats` | Thống kê phân bố cụm | — | ~2ms |
| `POST /session/train` | Huấn luyện Session-based model | ADMIN | ~20ms |
| `POST /session/recommend` | Gợi ý theo phiên (auto-train) | Public | ~80ms |

### Thuật toán

| Model | Kỹ thuật |
|-------|----------|
| **Clustering** | RFM Analysis (Recency, Frequency, Monetary) + K-Means (silhouette score để chọn số cụm) |
| **Session-based** | Co-occurrence Matrix, Sequence Prediction (Markov chain), HSP, RIC (forgetting factor α), RIC-CIL, Popularity fallback |

### Chiến lược gợi ý theo phiên

Trường `strategy` trong `POST /session/recommend`:

| Strategy | Mô tả |
|----------|-------|
| `hybrid` *(mặc định)* | Kết hợp co-occurrence + sequence |
| `cooccurrence` | Chỉ dựa trên ma trận đồng xuất hiện trong phiên |
| `sequence` | Dựa trên dự đoán chuỗi hành vi (Markov) |
| `hsp` | Hybrid Session Pattern |
| `ric` | Item-based RIC với forgetting factor `alpha` (0.1–0.9, mặc định 0.3) |
| `ric_cil` | RIC + thông tin phiên hiện tại |
| `popularity` | Fallback theo độ phổ biến |

Tham số tuỳ chọn khác: `top_n`, `exclude_session_items` (không gợi ý lại sản phẩm khách đang xem trong phiên).

### Cơ chế auto-train

UI gọi `/session/recommend` liên tục; backend ML tự kiểm tra dữ liệu mới và chỉ fit lại model khi cần (throttle tối đa 5 phút/lần). Admin có thể bấm **Huấn luyện Session** để force train lại ngay từ `POST /session/train` (hoặc `POST /api/ml/session/train` qua Node).

---

## 🧰 Công nghệ sử dụng

| Layer | Công nghệ |
|-------|-----------|
| **Frontend Web** | React 18 + Vite + Redux Toolkit + Tailwind CSS + React Router + Recharts + Chart.js + react-hot-toast + react-icons + Fontsource Geist |
| **Frontend Components** | LazyImage (IntersectionObserver + blur-up), ChatFloating (chat với shop), CouponsPage (voucher + save), code splitting (React.lazy), chunk optimization (Vite manualChunks) |
| **Mobile App** | React Native + Expo + React Navigation + Redux Toolkit + Axios |
| **Backend API** | Node.js + Express.js + Prisma ORM + JWT + bcryptjs + ioredis + Winston + Morgan + Helmet + express-rate-limit + Joi |
| **ML Service** | Python + FastAPI + scikit-learn (K-Means, RFM, StandardScaler) + NumPy + Pandas + Uvicorn |
| **Database** | PostgreSQL 15 (Alpine) |
| **Cache** | Redis 7 (Alpine) với ioredis |
| **Xác thực** | JWT (access token 15 phút + refresh token 30 ngày) + Google OAuth 2.0 (Passport.js) |
| **Container** | Docker + Docker Compose (5 services) |
| **Security** | Helmet + CORS + Rate Limiter + Input Validation (Joi) |

---

## 📁 Cấu trúc thư mục

```
KHOALUAN/
├── backend/                              # Backend API (Node.js + Express + Prisma)
│   ├── Dockerfile
│   ├── package.json
│   ├── start.sh                          # Startup: push schema → seed ×4
│   ├── src/
│   │   ├── app.js                        # Express entry + middleware
│   │   ├── config/
│   │   │   ├── database.js               # Prisma client singleton
│   │   │   ├── redis.js                  # Redis cache (cacheGet, cacheSet, cacheDel)
│   │   │   └── logger.js                 # Winston logger
│   │   ├── controllers/
│   │   │   ├── authController.js         # Đăng ký, đăng nhập, refresh token, logout
│   │   │   ├── productController.js      # CRUD, featured, slug, Redis cache
│   │   │   ├── categoryController.js     # CRUD danh mục
│   │   │   ├── orderController.js        # Tạo đơn, hủy, cập nhật, mua lại, coupon
│   │   │   ├── cartController.js         # Giỏ hàng (thêm, sửa, xóa, clear)
│   │   │   ├── partnerController.js      # Register, dashboard, products, orders
│   │   │   ├── userController.js         # User CRUD, follow/unfollow shop
│   │   │   ├── reviewController.js       # Đánh giá, phản hồi, thống kê
│   │   │   ├── addressController.js      # Địa chỉ giao hàng
│   │   │   ├── couponController.js       # Mã giảm giá (CRUD, validate, apply)
│   │   │   ├── bannerController.js       # Banner trang chủ
│   │   │   ├── flashSaleController.js    # Flash sale
│   │   │   ├── refundController.js       # Hoàn tiền
│   │   │   ├── violationController.js    # Vi phạm
│   │   │   ├── chatController.js         # Chat khách hàng ↔ shop
│   │   │   ├── dashboardController.js    # Thống kê admin
│   │   │   ├── clusterController.js      # Phân cụm khách hàng
│   │   │   ├── recommendationController.js # Gợi ý (personalized, trending, similar)
│   │   │   ├── notificationController.js # Thông báo
│   │   │   ├── settingsController.js     # Cài đặt hệ thống
│   │   │   ├── mlController.js           # ML: Session, Health
│   │   │   └── auditController.js        # Audit log
│   │   ├── routes/
│   │   │   ├── index.js                  # Route aggregator
│   │   │   ├── ml.js                     # ML endpoints (session, health)
│   │   │   └── ... (auth, products, orders, cart, categories...)
│   │   ├── middleware/
│   │   │   ├── auth.js                   # JWT protect + restrictTo
│   │   │   ├── errorHandler.js           # Global error handler
│   │   │   ├── rateLimiter.js            # Rate limiting
│   │   │   └── validate.js               # Joi validation
│   │   ├── services/
│   │   │   └── mlService.js              # ML client (proxy → Python, 60s timeout)
│   │   └── utils/
│   │       ├── AppError.js
│   │       └── asyncHandler.js
│   ├── prisma/
│   │   ├── schema.prisma                 # 20+ models
│   │   ├── seed.js                       # Dữ liệu gốc (admin, partners, customers)
│   │   ├── seed-full.js                  # Dữ liệu mở rộng (8 partners, 101 products)
│   │   ├── seed-new-models.js            # Banners, flash sales, refunds, violations...
│   │   ├── seed-ml-test.js               # 281 product views, orders cho ML
│   │   └── test-ml-all.js                # Auto-test các endpoint ML
│   └── ml/                               # ML Service (Python)
│       ├── Dockerfile.ml
│       ├── requirements.txt
│       ├── clustering/
│       │   ├── api.py                    # FastAPI endpoints: clustering + session
│       │   ├── clustering_service.py     # RFM + K-Means
│       │   └── __init__.py
│       └── session/
│           ├── session_recommender.py     # Co-occurrence + Sequence + HSP/RIC
│           └── __init__.py
│
├── frontend/                             # Frontend Web (React + Vite + Tailwind)
│   ├── Dockerfile
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js                    # Vite proxy /api → backend
│   ├── tailwind.config.js                # Custom theme
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx                      # Entry (Geist font + global CSS)
│       ├── index.css                     # Tailwind + animations
│       ├── App.jsx                       # Router (3 nhánh + ML routes)
│       ├── store/
│       │   ├── index.js                  # Redux store
│       │   ├── authSlice.js              # JWT refresh
│       │   ├── cartSlice.js              # Giỏ hàng
│       │   ├── productSlice.js           # Sản phẩm
│       │   ├── settingsSlice.js          # Cài đặt
│       │   ├── notificationSlice.js      # Thông báo (poll 30s)
│       │   └── uiSlice.js                # UI state
│       ├── services/
│       │   ├── api.js                    # Axios + JWT interceptor
│       │   └── sessionRecommender.js     # Client gọi /ml/session/recommend
│       ├── components/
│       │   ├── Layout/ (Navbar, Footer, MainLayout, AdminLayout, PartnerLayout)
│       │   └── common/ (ProductCard, LoadingSpinner, BannerSlider, Pagination, ChatFloating, LazyImage)
│       └── pages/
│           ├── admin/ (15 trang: Dashboard, ML Test, Clusters...)
│           ├── partner/ (7 trang: Dashboard, Products, Orders...)
│           ├── auth/ (LoginPage, RegisterPage, GoogleCallbackPage)
│           └── ... (Home, Products, Cart, Checkout, Orders...)
│
├── mobile/                               # Mobile App (React Native + Expo)
│   ├── App.js
│   ├── app.json
│   ├── package.json
│   └── src/
│       ├── navigation/RootNavigator.js
│       ├── store/index.js
│       └── screens/ (auth, customer, admin)
│
├── docker-compose.yml                    # 5 services
├── .gitignore
└── README.md
```

---

## 🔌 API Endpoints

> Prefix: `/api`

### Auth
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|:----:|
| POST | `/auth/register` | Đăng ký khách hàng | Public |
| POST | `/auth/login` | Đăng nhập | Public |
| POST | `/auth/check-email` | Kiểm tra email đã tồn tại (dùng cho inline register) | Public |
| GET | `/auth/google` | Đăng nhập bằng Google (redirect) | Public |
| GET | `/auth/google/callback` | Google OAuth callback | Public |
| POST | `/auth/refresh` | Refresh token | Public |
| POST | `/auth/logout` | Đăng xuất (xóa refresh token) | Protected |
| GET | `/auth/me` | Thông tin user (+ partner fields) | Protected |
| PUT | `/auth/profile` | Cập nhật profile | Protected |

### Products
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|:----:|
| GET | `/products` | Danh sách (pagination, filter theo category/price/rating/search/sort/partner) | Public |
| GET | `/products/featured` | Sản phẩm bán chạy (top 8, kèm partner) | Public |
| GET | `/products/slug/:slug` | Chi tiết theo slug (kèm partner, reviews) | Public |
| GET | `/products/:id` | Chi tiết theo ID (Redis cache) | Public |
| POST | `/products` | Thêm sản phẩm | ADMIN/PARTNER |
| PUT | `/products/:id` | Cập nhật (partner chỉ SP của mình) | ADMIN/PARTNER |
| DELETE | `/products/:id` | Xóa (soft delete) | ADMIN/PARTNER |

### Orders
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|:----:|
| POST | `/orders` | Tạo đơn hàng (từ giỏ, có coupon) | Protected |
| GET | `/orders` | Đơn hàng của tôi (filter status, 10/trang) | Protected |
| GET | `/orders/:id` | Chi tiết | Protected |
| PUT | `/orders/:id/status` | Cập nhật trạng thái | ADMIN/PARTNER |
| PUT | `/orders/:id/cancel` | Hủy đơn (khi PENDING) | Protected |
| PUT | `/orders/:id/confirm` | Xác nhận đã nhận hàng | Protected |
| POST | `/orders/:id/rebuy` | Mua lại | Protected |

### ML — Session-Based
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|:----:|
| POST | `/ml/session/recommend` | Gợi ý theo phiên (auto-train; hỗ trợ `strategy`, `topN`) | Public |
| POST | `/ml/session/train` | Huấn luyện Session model | ADMIN |
| GET | `/ml/health` | ML Service health | Public |

### ML — Clustering (gọi qua Node → Python)
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|:----:|
| GET | `/clusters` | Danh sách nhóm (kèm rules) | ADMIN |
| GET | `/clusters/stats` | Thống kê phân bố nhóm | ADMIN |
| GET | `/clusters/:id` | Chi tiết nhóm (kèm users) | ADMIN |
| POST | `/clusters` | Tạo nhóm | ADMIN |
| PUT | `/clusters/:id` | Sửa nhóm | ADMIN |
| DELETE | `/clusters/:id` | Xóa nhóm | ADMIN |
| POST | `/clusters/run` | Chạy phân cụm (gọi ML service) | ADMIN |

### Recommendations
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|:----:|
| GET | `/recommendations/personalized` | Gợi ý cá nhân (dựa trên cluster) | Protected |
| GET | `/recommendations/trending` | Sản phẩm thịnh hành (Redis cache) | Public |
| GET | `/recommendations/similar/:productId` | Sản phẩm tương tự (cùng category) | Public |
| GET | `/recommendations/cluster/:clusterId` | Gợi ý theo nhóm | ADMIN |

### Partner
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|:----:|
| POST | `/partner/register` | Đăng ký đối tác (chờ duyệt) | Public |
| GET | `/partner/dashboard` | Dashboard đối tác | PARTNER |
| GET | `/partner/revenue` | Doanh thu theo tháng + top sản phẩm | PARTNER |
| GET | `/partner/products` | Sản phẩm của partner | PARTNER |
| POST | `/partner/products` | Thêm sản phẩm mới | PARTNER |
| GET | `/partner/orders` | Đơn hàng có SP của partner (10/trang) | PARTNER |
| PUT | `/partner/orders/:id/status` | Cập nhật trạng thái đơn | PARTNER |
| GET | `/partner/admin/all` | Danh sách đối tác (admin) | ADMIN |
| PUT | `/partner/admin/:id/approve` | Duyệt/từ chối đối tác | ADMIN |

### Users
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|:----:|
| GET | `/users` | Danh sách người dùng (10/trang) | ADMIN |
| GET | `/users/:id` | Chi tiết (kèm đơn hàng gần đây) | ADMIN |
| PUT | `/users/:id` | Sửa người dùng | ADMIN |
| DELETE | `/users/:id` | Vô hiệu hóa người dùng | ADMIN |
| POST | `/users/follow` | Theo dõi shop | Protected |
| GET | `/users/follow` | Cửa hàng đã theo dõi | Protected |
| DELETE | `/users/follow/:partnerId` | Bỏ theo dõi shop | Protected |

### Cart, Reviews, Coupons, Chat, Addresses...
*(Xem thêm trong code)*

---

## 💨 Hiệu suất & Tối ưu

### Code Splitting (Route-based)

```jsx
// Lazy load admin/partner pages — chỉ tải khi cần
const DashboardPage = React.lazy(() => import('./pages/admin/DashboardPage'));
const ProductsManagePage = React.lazy(() => import('./pages/admin/ProductsManagePage'));
// ... 25+ pages được lazy load
<Suspense fallback={<RouteFallback />}>
  {/* Admin/Partner routes */}
</Suspense>
```

### Chunk Optimization (Vite)

```js
// vendor-charts: recharts (chỉ load khi vào Dashboard)
// vendor-icons: react-icons (tree-shaken, cacheable)
chunkSizeWarningLimit: 600
```

### Lazy Image Loading

`LazyImage` component với:
- **IntersectionObserver** (rootMargin: 200px) — chỉ tải khi gần viewport
- **Skeleton shimmer** (`skeleton-bg`) — placeholder trong lúc load
- **Blur-up transition** — `blur-md → blur-0` + `scale-105 → scale-100` (700ms)
- **Loading spinner** — indicator khi đang tải
- **SVG placeholder** — khi thiếu ảnh

---

## 🗄️ Database Schema (20+ Models)

```prisma
enum UserRole { CUSTOMER | ADMIN | PARTNER }
enum OrderStatus { PENDING | CONFIRMED | SHIPPING | DELIVERED | CANCELLED }
enum PaymentMethod { COD | BANKING | MOMO | VNPAY }
enum PaymentStatus { UNPAID | PAID | REFUNDED }

User (role: ADMIN | PARTNER | CUSTOMER)
  ├── partner fields: storeName, storeDescription, taxCode, businessAddress
  ├── isApproved, approvedAt (PARTNER approval)
  ├── clusterId → Cluster (customer segmentation)
  ├── totalSpent, orderCount, lastPurchaseAt (RFM metrics)
  ├── → products (as PARTNER), → orders (as CUSTOMER)
  ├── → reviews, cartItems, wishlistItems, addresses
  ├── → refunds, auditLogs, conversations, messages
  ├── → following (shops followed), followers
  └── → couponsCreated, recommendations

Product → Category, partnerId?
  ├── variants[] (ProductVariant: color, size, storage...)
  └── flashSaleProducts[] (FlashSaleProduct)

Order → User, coupon?
  ├── orderItems[] → Product
  ├── refunds[]
  └── conversations[] (linked order chat)

ProductView → User, Product (cho Session-based Recommendations)
Cluster → clusterRules[] (metricName, minValue, maxValue)
  └── users[]
Recommendation → User?, Cluster?, Product (score, reason)
```

---

## 🎨 Thiết kế giao diện

- **Font:** Geist Sans (premium, hiện đại)
- **Màu sắc:** `primary` (xanh dương #2563eb) — chủ đạo, `emerald` (#059669) — partner
- **Hiệu ứng:** Glass effect, skeleton loading, stagger fade-in, scale-in, shimmer
- **Responsive:** Mobile & desktop
- **Premium components:** Stats cards gradient, notification dropdown (poll 30s), collapsible sidebar, staggered list animations, product card premium
- **Phân trang:** 10 items/trang trên tất cả danh sách
- **Custom Tailwind theme:** primary 50-900, surface, ink, premium shadows

### Giao diện ML (Vietsub toàn bộ)

| Trang admin | Ngôn ngữ |
|-------------|:--------:|
| Phân cụm khách hàng | 🇻🇳 Tiếng Việt |
| Kiểm tra ML tự động | 🇻🇳 Tiếng Việt |

---

## ✨ Tính năng nổi bật

1. **3 nhánh người dùng** — Admin, Partner, Customer với quyền riêng biệt
2. **Partner tự xử lý đơn hàng** — Admin không quản lý đơn hàng
3. **8 partner shops** — 8 shop với sản phẩm riêng theo từng danh mục
4. **Google OAuth Login** — Đăng nhập bằng Google, tự động tạo user nếu chưa tồn tại
5. **Inline Email Registration** — Nhập email → check tồn tại → đăng nhập hoặc hiện form đăng ký ngay trên trang login
6. **JWT 15 phút** — Access token hết hạn sau 15 phút, tự động refresh, bảo mật cao hơn
7. **Session-based Recommendation** — Co-occurrence + Sequence Prediction + HSP/RIC trên 281 product views
8. **Auto-Train ML** — Tự động train session model trước khi recommend (throttle 5 phút)
9. **ML Test Suite** — Tự động kiểm tra các bước ML, báo cáo chi tiết từng bước
10. **Phân cụm khách hàng** — K-Means + RFM qua ML Service riêng, chọn số cụm bằng silhouette score
11. **Gợi ý cá nhân hóa** — Dựa trên nhóm khách hàng + lịch sử mua hàng
12. **Flash Sale** — Sự kiện giảm giá có thời gian, quản lý số lượng
13. **Mã giảm giá** — 22 mã PERCENTAGE/FIXED, có hạn, theo người dùng
14. **Chat** — Giữa khách hàng và shop (poll-based, widget nổi)
15. **Follow shop** — Theo dõi cửa hàng yêu thích
16. **Hoàn tiền & Vi phạm** — Quy trình xử lý khiếu nại
17. **Audit Log** — Ghi lại mọi hành động quan trọng
18. **Thông báo realtime** — Poll 30s cho admin
19. **Redis Caching** — Cache sản phẩm, gợi ý, trending
20. **Rate Limiting** — Giới hạn request
21. **Mobile App** — React Native + Expo (iOS/Android)
22. **Premium UI toàn diện** — Geist font, glass effects (glass-island), double-bezel cards, skeleton shimmer, stagger animations, custom cubic-bezier transitions
23. **Phân trang đồng bộ** — 10 items/trang
24. **Floating Chat Widget** — Glass-morphism panel, luôn sẵn sàng trên mọi trang
25. **Lazy Image Loading** — IntersectionObserver + blur-up transition, skeleton placeholder
26. **Code Splitting** — React.lazy() cho 25+ admin/partner routes, Suspense fallback
27. **Chunk Optimization** — Tách recharts/react-icons thành chunk riêng, tăng cache hit
28. **Vietsub toàn bộ Admin ML** — ML Test, Clusters tiếng Việt
29. **Kho voucher cho user** — Trang /coupons với tab Tất cả/Đã lưu, lọc theo loại, copy mã, đếm ngược hết hạn, skeleton loading
30. **Avatar upload** — Chọn ảnh → FileReader base64 → dispatch updateProfile, validate file type & size, spinner loading
31. **Order stats realtime** — Tổng đơn, hoàn thành, đã huỷ từ API, dùng pagination.total chính xác
32. **HomePage filter pills** — Mùa hè, Mới nhất, Bán chạy, Đánh giá cao, AI Đề xuất — kết nối API sorting thật
33. **PartnerLayout frame** — max-w-7xl container giới hạn hiển thị trên màn hình rộng
34. **Loading skeleton cho CouponsPage** — FullPageSkeleton với hero + tabs + filters + card shimmer

---

*Đồ án tốt nghiệp — Hệ thống thương mại điện tử 3 nhánh với ML Recommendation Engine (K-Means + Session-based)*
