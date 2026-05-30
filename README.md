# 🛒 KhoaLuan - Hệ thống Thương mại Điện tử 3 Nhánh

**Đề tài:** Hệ thống thương mại điện tử với 3 nhánh người dùng (Admin, Đối tác kinh doanh, Khách hàng) kết hợp phân cụm khách hàng và gợi ý sản phẩm cá nhân hóa.

---

## 🏗️ Kiến trúc tổng quan

```
┌──────────────────────────────────────────────────────────────────────┐
│                     Frontend Web (React + Vite)                       │
│                  http://localhost:3000                                 │
│                     + Mobile App (React Native + Expo)                 │
├──────────────────────────────────────────────────────────────────────┤
│              Backend API (Node.js + Express + Prisma)                  │
│                  http://localhost:5000                                 │
├────────────────────┬─────────────────────────────────────────────────┤
│   ML Service       │    Database & Cache                               │
│   (Python/FastAPI) │    PostgreSQL (Prisma ORM) + Redis (ioredis)      │
│   http://localhost:8000 │                                              │
└────────────────────┴─────────────────────────────────────────────────┘
```

Hệ thống gồm **5 Docker services**: `postgres`, `redis`, `backend`, `ml-service`, `frontend`

---

## 👥 3 Nhánh người dùng

| Nhánh | Vai trò | Mô tả |
|-------|---------|-------|
| 🔴 **Admin** | `ADMIN` | Quản trị hệ thống (không quản lý đơn hàng — partner tự xử lý) |
| 🟡 **Đối tác kinh doanh** | `PARTNER` | Đăng bán sản phẩm, tự duyệt & xử lý đơn hàng của shop mình |
| 🟢 **Khách hàng** | `CUSTOMER` | Mua sắm, đánh giá, theo dõi đơn hàng |

---

### 🔴 Admin — Quản trị viên

Admin có toàn quyền quản lý hệ thống qua dashboard. **Admin không quản lý đơn hàng** — mỗi partner tự xử lý đơn hàng của shop mình.

| Module | Mô tả |
|--------|-------|
| 📊 **Dashboard** | Thống kê tổng quan (người dùng, sản phẩm, đối tác, danh mục) |
| 📦 **Quản lý sản phẩm** | CRUD sản phẩm, lọc, tìm kiếm, phân trang (10/trang) |
| 🏷️ **Quản lý danh mục** | CRUD danh mục sản phẩm |
| 👥 **Quản lý người dùng** | Xem, sửa, phân quyền người dùng, phân trang (10/trang) |
| 🤝 **Quản lý đối tác** | Phê duyệt / từ chối đối tác mới đăng ký |
| 🎯 **Phân cụm khách hàng** | Tạo nhóm, chạy phân cụm K-Means/RFM qua ML Service |
| 💡 **Gợi ý sản phẩm** | Xem gợi ý theo cụm khách hàng |
| 🏆 **Mã giảm giá** | CRUD mã giảm giá, theo dõi lượt sử dụng (10/trang) |
| 🖼️ **Banner** | Quản lý banner trang chủ (vị trí, link, màu nền) |
| ⚡ **Flash Sale** | Tạo sự kiện flash sale, thêm/xóa sản phẩm |
| 💰 **Hoàn tiền** | Xử lý yêu cầu hoàn tiền từ khách hàng (10/trang) |
| 🚨 **Vi phạm** | Xử lý báo cáo vi phạm shop/sản phẩm (10/trang) |
| 📝 **Audit Log** | Xem lịch sử hành động quan trọng trong hệ thống (10/trang) |
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
| 🔐 **Đăng ký / Đăng nhập** | JWT access + refresh token |
| 🔍 **Tìm kiếm & duyệt** | Sản phẩm theo danh mục, giá, đánh giá, tìm kiếm (10/trang) |
| 🛒 **Giỏ hàng** | Thêm, sửa, xóa sản phẩm trong giỏ |
| 💳 **Đặt hàng** | Thanh toán COD / Banking / MoMo / VNPAY |
| 📋 **Theo dõi đơn hàng** | Trạng thái: PENDING → CONFIRMED → SHIPPING → DELIVERED (10/trang) |
| 🎫 **Mã giảm giá** | Áp dụng mã giảm giá khi đặt hàng |
| ❤️ **Yêu thích** | Danh sách sản phẩm yêu thích |
| 👥 **Theo dõi shop** | Theo dõi / bỏ theo dõi cửa hàng yêu thích |
| ⭐ **Đánh giá sản phẩm** | Đánh giá và xem phản hồi từ người bán |
| 📍 **Địa chỉ giao hàng** | Quản lý nhiều địa chỉ giao hàng |
| 💬 **Chat với shop** | Trao đổi trực tiếp với người bán |
| 💰 **Yêu cầu hoàn tiền** | Gửi yêu cầu hoàn tiền cho đơn đã giao |
| 🚨 **Báo cáo vi phạm** | Báo cáo shop/sản phẩm vi phạm |
| 🚚 **Xác nhận đã nhận hàng** | Xác nhận đã nhận được hàng |
| 🔄 **Mua lại** | Thêm lại sản phẩm từ đơn cũ vào giỏ hàng |
| 🎯 **Gợi ý cá nhân hóa** | Sản phẩm gợi ý dựa trên nhóm khách hàng |

---

## 🧰 Công nghệ sử dụng

| Layer | Công nghệ |
|-------|-----------|
| **Frontend Web** | React 18 + Vite + Redux Toolkit + Tailwind CSS + React Router + Recharts + Chart.js + react-hot-toast + react-icons + Fontsource Geist |
| **Mobile App** | React Native + Expo + React Navigation + Redux Toolkit + Axios |
| **Backend API** | Node.js + Express.js + Prisma ORM + JWT (jsonwebtoken) + bcryptjs + ioredis + Winston + Morgan + Helmet + express-rate-limit + Joi |
| **ML Service** | Python + FastAPI + scikit-learn (K-Means, RFM) + PostgreSQL connector |
| **Database** | PostgreSQL 15 (Alpine) |
| **Cache** | Redis 7 (Alpine) với ioredis |
| **Xác thực** | JWT (access token 7 ngày + refresh token 30 ngày) |
| **Container** | Docker + Docker Compose (5 services) |
| **Security** | Helmet + CORS + Rate Limiter + Input Validation (Joi) |

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
| http://localhost:3000 | Frontend Web |
| http://localhost:5000 | Backend API |
| http://localhost:5000/api/health | Health check |
| http://localhost:8000 | ML Service |
| http://localhost:8000/docs | ML API Docs (Swagger) |

> **Lưu ý:** Seed chỉ chạy 1 lần khi chưa có dữ liệu. Nếu muốn seed lại:
> ```bash
> docker exec khoaluan-backend sh -c "node -e '
>   const{PrismaClient}=require(\"@prisma/client\");
>   const p=new PrismaClient();
>   const tables=[\"CartItem\",\"WishlistItem\",\"Review\",\"OrderItem\",\"Order\",
>     \"Recommendation\",\"ProductVariant\",\"Notification\",\"SiteSetting\",
>     \"FollowedShop\",\"Address\",\"Refund\",\"AuditLog\",\"Message\",\"Conversation\",
>     \"FlashSaleProduct\",\"FlashSale\",\"CouponUsage\",\"Coupon\",\"Violation\",
>     \"ClusterRule\",\"Cluster\",\"Banner\",\"Product\",\"Category\",\"User\"];
>   (async()=>{for(const t of tables)await p.\$executeRawUnsafe(\"TRUNCATE TABLE \\\"\"+t+\"\\\" CASCADE\")})()
>   .then(()=>{console.log(\"Truncated\");return p.\$disconnect()})
> ' && node prisma/seed.js && node prisma/seed-full.js && node prisma/seed-new-models.js"
> ```

### Chạy không Docker (Development)

```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma db push
node prisma/seed.js
node prisma/seed-full.js
node prisma/seed-new-models.js
npm run dev

# Frontend
cd frontend
npm install
npm run dev

# ML Service
cd backend/ml
pip install -r requirements.txt
uvicorn clustering.api:app --host 0.0.0.0 --port 8000

# Mobile (cần Expo CLI)
cd mobile
npm install
npx expo start

# Cần có PostgreSQL và Redis chạy local
```

### Tài khoản mặc định

| Vai trò | Email | Mật khẩu | Ghi chú |
|---------|-------|----------|---------|
| 🔴 **Admin** | admin@khoaluan.com | admin123 | Quản trị hệ thống |
| 🟡 **Fashion House XYZ** | partner1@shop.com | partner123 | Đã duyệt — 9 SP |
| 🟡 **Shop Điện Tử ABC** | partner2@fashion.com | partner123 | Đã duyệt — 12 SP |
| 🟡 **Nội Thất ABC** | partner3@new.com | partner123 | **Chờ duyệt** |
| 🟡 **Sports Zone Việt Nam** | partner4@sport.com | partner123 | Đã duyệt — 11 SP |
| 🟡 **Beauty House** | partner5@beauty.com | partner123 | Đã duyệt — 11 SP |
| 🟡 **Pet Mart Việt Nam** | partner6@pet.com | partner123 | Đã duyệt — 10 SP |
| 🟡 **Nội Thất Xinh** | partner7@furniture.com | partner123 | Đã duyệt — 11 SP |
| 🟡 **Mẹ & Bé Shop** | partner8@mebebe.com | partner123 | Đã duyệt — 10 SP |
| 🟢 **Khách hàng 1** | customer1@test.com | customer123 | Có lịch sử mua hàng |
| 🟢 **Khách hàng 2** | customer2@test.com | customer123 | Có lịch sử mua hàng |
| 🟢 **Khách hàng 3** | customer3@test.com | customer123 | Có lịch sử mua hàng |

Seed dữ liệu mở rộng tạo thêm **12 khách hàng** (customer4@ → customer15@test.com, mật khẩu `customer123`).

---

## 📁 Cấu trúc thư mục

```
KHOALUAN/
├── backend/                              # Backend API (Node.js + Express + Prisma)
│   ├── Dockerfile                        # Docker image cho backend
│   ├── package.json                      # Dependencies
│   ├── start.sh                          # Startup script (push schema → seed.js → seed-full.js → seed-new-models.js)
│   ├── src/
│   │   ├── app.js                        # Express app entry point + middleware setup
│   │   ├── config/
│   │   │   ├── database.js               # Prisma client singleton
│   │   │   ├── redis.js                  # Redis cache client (cacheGet, cacheSet, cacheDel)
│   │   │   └── logger.js                 # Winston logger
│   │   ├── controllers/
│   │   │   ├── authController.js         # Đăng ký, đăng nhập, refresh token, logout, profile
│   │   │   ├── productController.js      # CRUD sản phẩm, featured, slug, Redis cache, lọc theo partner
│   │   │   ├── categoryController.js     # CRUD danh mục
│   │   │   ├── orderController.js        # Tạo đơn, hủy, cập nhật, xác nhận, mua lại, coupon
│   │   │   ├── cartController.js         # Giỏ hàng (thêm, sửa, xóa, clear)
│   │   │   ├── partnerController.js      # Partner: register, dashboard, products, orders, revenue, approve
│   │   │   ├── userController.js         # User CRUD (admin), follow/unfollow shop
│   │   │   ├── reviewController.js       # Đánh giá, phản hồi, thống kê rating
│   │   │   ├── wishlistController.js     # Yêu thích (add, remove, check, list)
│   │   │   ├── addressController.js      # Quản lý địa chỉ giao hàng (CRUD)
│   │   │   ├── couponController.js       # Mã giảm giá (CRUD, validate, apply, usage tracking)
│   │   │   ├── bannerController.js       # Banner trang chủ (CRUD, position)
│   │   │   ├── flashSaleController.js    # Flash sale (CRUD, thêm/xóa sản phẩm)
│   │   │   ├── refundController.js       # Yêu cầu hoàn tiền (tạo, duyệt, từ chối)
│   │   │   ├── violationController.js    # Báo cáo vi phạm (tạo, xử lý, phạt)
│   │   │   ├── chatController.js         # Chat (hội thoại, tin nhắn, đánh dấu đã đọc)
│   │   │   ├── dashboardController.js    # Thống kê admin (users, products, partners, categories, clusters)
│   │   │   ├── clusterController.js      # Phân cụm (CRUD cluster, chạy ML, thống kê)
│   │   │   ├── recommendationController.js # Gợi ý (cá nhân hóa, trending, similar, cluster)
│   │   │   ├── notificationController.js # Thông báo (list, đánh dấu đã đọc)
│   │   │   ├── settingsController.js     # Cài đặt hệ thống (get, update)
│   │   │   └── auditController.js        # Audit log (tự động + thủ công)
│   │   ├── routes/
│   │   │   ├── index.js                  # Route aggregator (tổng hợp tất cả routes)
│   │   │   ├── auth.js, products.js, orders.js, cart.js
│   │   │   ├── categories.js, users.js, reviews.js
│   │   │   ├── clusters.js, recommendations.js
│   │   │   ├── dashboard.js, settings.js, notifications.js
│   │   │   ├── partner.js               # Partner routes + admin partner management
│   │   │   ├── wishlist.js, coupons.js, addresses.js
│   │   │   ├── banners.js, flashSales.js
│   │   │   ├── refunds.js, violations.js
│   │   │   ├── chat.js, audit.js
│   │   ├── middleware/
│   │   │   ├── auth.js                   # JWT protect + restrictTo(ADMIN, PARTNER...)
│   │   │   ├── errorHandler.js           # Global error handler
│   │   │   ├── rateLimiter.js            # General + auth rate limiting
│   │   │   └── validate.js               # Joi input validation
│   │   └── utils/
│   │       ├── AppError.js               # Custom error class
│   │       └── asyncHandler.js           # Async error wrapper
│   ├── prisma/
│   │   ├── schema.prisma                 # Database schema (20+ models)
│   │   ├── seed.js                       # Seed dữ liệu mẫu (base data)
│   │   ├── seed-full.js                  # Seed dữ liệu mở rộng (partners, products, reviews, orders)
│   │   └── seed-new-models.js            # Seed dữ liệu bổ sung (banners, flash sales, refunds, violations...)
│   └── ml/                               # ML Service (Python)
│       ├── Dockerfile.ml                 # Docker image cho ML service
│       ├── requirements.txt              # Python dependencies
│       └── clustering/
│           ├── api.py                    # FastAPI endpoints
│           ├── clustering_service.py     # K-Means + RFM implementation
│           └── __init__.py
│
├── frontend/                             # Frontend Web (React + Vite + Tailwind)
│   ├── Dockerfile
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js                    # Vite config + proxy /api → backend
│   ├── tailwind.config.js                # Custom theme: primary, surface/ink, shadows
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx                      # Entry point (font Geist + global CSS)
│       ├── index.css                     # Tailwind + premium custom styles + animations
│       ├── App.jsx                       # Router config (3 nhánh chính)
│       ├── store/
│       │   ├── index.js                  # Redux store config
│       │   ├── authSlice.js              # Authentication + JWT refresh
│       │   ├── cartSlice.js              # Giỏ hàng state
│       │   ├── productSlice.js           # Sản phẩm + danh mục
│       │   ├── wishlistSlice.js          # Yêu thích state
│       │   ├── settingsSlice.js          # Cài đặt hệ thống
│       │   ├── notificationSlice.js      # Thông báo admin (poll 30s)
│       │   └── uiSlice.js                # UI state (sidebar, theme)
│       ├── services/
│       │   └── api.js                    # Axios instance + JWT interceptor + refresh token
│       ├── components/
│       │   ├── Layout/
│       │   │   ├── Navbar.jsx            # Navigation 3 nhánh (user/partner/admin)
│       │   │   ├── Footer.jsx            # Premium footer
│       │   │   ├── MainLayout.jsx        # Layout khách hàng
│       │   │   ├── AdminLayout.jsx       # Layout admin (sidebar — không có Đơn hàng)
│       │   │   └── PartnerLayout.jsx     # Layout đối tác (sidebar riêng)
│       │   └── common/
│       │       ├── ProductCard.jsx       # Card sản phẩm premium (hiển thị tên shop)
│       │       ├── LoadingSpinner.jsx    # Skeleton loading
│       │       └── Pagination.jsx        # Phân trang
│       └── pages/
│           ├── HomePage.jsx              # Hero slider + features + banner + categories + flash sale + featured
│           ├── ProductListPage.jsx       # Danh sách + filter sidebar (10/trang)
│           ├── ProductDetailPage.jsx     # Chi tiết + reviews + shop info card
│           ├── CartPage.jsx              # Giỏ hàng premium (coupon, summary)
│           ├── CheckoutPage.jsx          # Thanh toán (địa chỉ, phương thức, coupon)
│           ├── OrdersPage.jsx            # Đơn hàng của tôi (filter status, 10/trang)
│           ├── OrderDetailPage.jsx       # Chi tiết đơn hàng
│           ├── SearchPage.jsx            # Tìm kiếm sản phẩm (10/trang)
│           ├── WishlistPage.jsx          # Danh sách yêu thích
│           ├── ProfilePage.jsx           # Thông tin cá nhân
│           ├── AddressManagementPage.jsx # Quản lý địa chỉ giao hàng
│           ├── FollowedShopsPage.jsx     # Cửa hàng đã theo dõi
│           ├── UserChatPage.jsx          # Chat với shop
│           ├── auth/
│           │   ├── LoginPage.jsx         # Đăng nhập
│           │   └── RegisterPage.jsx      # Đăng ký (khách hàng / đối tác)
│           ├── admin/
│           │   ├── DashboardPage.jsx     # Thống kê (users, products, partners, categories, top products, clusters)
│           │   ├── ProductsManagePage.jsx# Quản lý sản phẩm
│           │   ├── CategoriesManagePage.jsx# Quản lý danh mục
│           │   ├── UsersManagePage.jsx   # Quản lý người dùng (10/trang)
│           │   ├── PartnersManagePage.jsx# Quản lý đối tác (10/trang)
│           │   ├── CouponsPage.jsx       # Mã giảm giá (10/trang)
│           │   ├── BannerManagementPage.jsx# Banner trang chủ
│           │   ├── FlashSaleManagementPage.jsx# Flash sale
│           │   ├── RefundManagementPage.jsx# Yêu cầu hoàn tiền (10/trang)
│           │   ├── ViolationManagementPage.jsx# Vi phạm (10/trang)
│           │   ├── AuditLogPage.jsx      # Audit log (10/trang)
│           │   ├── ClustersPage.jsx      # Phân cụm khách hàng
│           │   ├── RecommendationsPage.jsx# Gợi ý sản phẩm
│           │   └── SettingsPage.jsx      # Cài đặt hệ thống
│           └── partner/
│               ├── PartnerDashboardPage.jsx   # Dashboard đối tác (stats + chart)
│               ├── PartnerProductsPage.jsx    # Quản lý sản phẩm (10/trang)
│               ├── PartnerOrdersPage.jsx      # Quản lý đơn hàng (10/trang)
│               ├── PartnerReviewsPage.jsx     # Đánh giá sản phẩm + phản hồi (10/trang)
│               ├── PartnerCouponsPage.jsx     # Mã giảm giá (10/trang)
│               ├── PartnerChatPage.jsx        # Chat với khách hàng
│               └── PartnerProfilePage.jsx     # Cập nhật thông tin cửa hàng
│
├── mobile/                                # Mobile App (React Native + Expo)
│   ├── App.js                             # Entry point (Redux Provider + Navigation)
│   ├── app.json                           # Expo config
│   ├── package.json
│   └── src/
│       ├── navigation/
│       │   └── RootNavigator.js           # Bottom tab + stack navigator
│       ├── store/
│       │   └── index.js                   # Redux store (mobile)
│       └── screens/
│           ├── auth/
│           │   ├── LoginScreen.js
│           │   └── RegisterScreen.js
│           ├── customer/
│           │   ├── HomeScreen.js
│           │   ├── ProductListScreen.js
│           │   ├── ProductDetailScreen.js
│           │   ├── CartScreen.js
│           │   └── ProfileScreen.js
│           └── admin/
│               ├── AdminDashboardScreen.js
│               └── AdminProductsScreen.js
│
├── docker-compose.yml                     # 5 services: postgres, redis, backend, ml, frontend
├── .gitignore
└── README.md
```

---

## 🔌 API Endpoints

> Prefix: `/api`

### Auth
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/auth/register` | Đăng ký khách hàng | Public |
| POST | `/auth/login` | Đăng nhập | Public |
| POST | `/auth/refresh` | Refresh token | Public |
| POST | `/auth/logout` | Đăng xuất (xóa refresh token) | Protected |
| GET | `/auth/me` | Thông tin user (+ partner fields) | Protected |
| PUT | `/auth/profile` | Cập nhật profile | Protected |

### Products
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/products` | Danh sách (pagination, filter theo category/price/rating/search/sort/**partner**) | Public |
| GET | `/products/featured` | Sản phẩm bán chạy (top 8, kèm partner) | Public |
| GET | `/products/slug/:slug` | Chi tiết theo slug (kèm partner, reviews) | Public |
| GET | `/products/:id` | Chi tiết theo ID (có Redis cache, kèm partner) | Public |
| POST | `/products` | Thêm sản phẩm | ADMIN / PARTNER |
| PUT | `/products/:id` | Cập nhật (partner chỉ SP của mình) | ADMIN / PARTNER |
| DELETE | `/products/:id` | Xóa (soft delete, partner chỉ SP của mình) | ADMIN / PARTNER |

### Categories
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/categories` | Danh sách danh mục | Public |
| POST | `/categories` | Thêm danh mục | ADMIN |
| PUT | `/categories/:id` | Cập nhật danh mục | ADMIN |
| DELETE | `/categories/:id` | Xóa danh mục | ADMIN |

### Cart
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/cart` | Lấy giỏ hàng | Protected |
| POST | `/cart` | Thêm vào giỏ | Protected |
| PUT | `/cart/:productId` | Cập nhật số lượng | Protected |
| DELETE | `/cart/:productId` | Xóa khỏi giỏ | Protected |
| DELETE | `/cart/clear` | Xóa toàn bộ giỏ | Protected |

### Orders
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/orders` | Tạo đơn hàng (từ giỏ, có coupon) | Protected |
| GET | `/orders` | Đơn hàng của tôi (filter status, 10/trang) | Protected |
| GET | `/orders/:id` | Chi tiết (chủ đơn/admin/partner có SP) | Protected |
| PUT | `/orders/:id/status` | Cập nhật trạng thái | ADMIN / PARTNER |
| PUT | `/orders/:id/cancel` | Hủy đơn (khi PENDING) | Protected |
| PUT | `/orders/:id/confirm` | Xác nhận đã nhận hàng | Protected |
| POST | `/orders/:id/rebuy` | Mua lại (thêm SP vào giỏ) | Protected |

> **Lưu ý:** Admin **không** có route `/orders/admin/all` để lấy tất cả đơn hàng. Partner tự xử lý đơn hàng của mình qua `/partner/orders`.

### Reviews
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/reviews/product/:productId` | Đánh giá sản phẩm (kèm thống kê rating distribution) | Public |
| POST | `/reviews` | Tạo đánh giá (cần đã mua) | Protected |
| DELETE | `/reviews/:id` | Xóa đánh giá | Protected / ADMIN |
| PUT | `/reviews/:id/reply` | Phản hồi đánh giá | ADMIN / PARTNER |
| GET | `/reviews/partner` | Đánh giá sản phẩm của partner (kèm thống kê) | PARTNER |

### Partner
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/partner/register` | Đăng ký đối tác (chờ duyệt) | Public |
| GET | `/partner/dashboard` | Dashboard đối tác | PARTNER |
| GET | `/partner/revenue` | Doanh thu theo tháng + top sản phẩm | PARTNER |
| GET | `/partner/products` | Sản phẩm của partner | PARTNER |
| POST | `/partner/products` | Thêm sản phẩm mới | PARTNER |
| PUT | `/partner/products/:id` | Sửa sản phẩm | PARTNER |
| DELETE | `/partner/products/:id` | Ẩn sản phẩm | PARTNER |
| GET | `/partner/orders` | Đơn hàng có SP của partner (10/trang) | PARTNER |
| PUT | `/partner/orders/:id/status` | Cập nhật trạng thái đơn | PARTNER |
| PUT | `/partner/profile` | Cập nhật thông tin cửa hàng | PARTNER |
| GET | `/partner/admin/all` | Danh sách đối tác (10/trang) | ADMIN |
| PUT | `/partner/admin/:id/approve` | Duyệt/từ chối đối tác | ADMIN |

### Wishlist
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/wishlist` | Danh sách yêu thích | Protected |
| GET | `/wishlist/ids` | Danh sách ID yêu thích | Protected |
| GET | `/wishlist/check/:productId` | Kiểm tra SP đã yêu thích chưa | Protected |
| POST | `/wishlist/:productId` | Thêm vào yêu thích | Protected |
| DELETE | `/wishlist/:productId` | Xóa khỏi yêu thích | Protected |

### Coupons
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/coupons/validate` | Kiểm tra mã giảm giá (còn hạn, còn lượt) | Protected |
| GET | `/coupons/my` | Mã giảm giá của partner | PARTNER |
| GET | `/coupons` | Tất cả mã giảm giá (admin, 10/trang) | ADMIN |
| POST | `/coupons` | Tạo mã giảm giá | ADMIN / PARTNER |
| PUT | `/coupons/:id` | Cập nhật | ADMIN / PARTNER |
| DELETE | `/coupons/:id` | Xóa | ADMIN / PARTNER |

### Addresses
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/addresses` | Địa chỉ giao hàng của tôi | Protected |
| POST | `/addresses` | Thêm địa chỉ mới | Protected |
| PUT | `/addresses/:id` | Sửa địa chỉ | Protected |
| DELETE | `/addresses/:id` | Xóa địa chỉ | Protected |

### Chat
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/chat/conversations` | Tìm hoặc tạo hội thoại | Protected |
| GET | `/chat/conversations` | Danh sách hội thoại của tôi | Protected |
| GET | `/chat/conversations/:id/messages` | Tin nhắn trong hội thoại | Protected |
| POST | `/chat/conversations/:id/messages` | Gửi tin nhắn | Protected |

### Banners
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/banners` | Banner đang active (public) | Public |
| GET | `/banners/admin/all` | Tất cả banner | ADMIN |
| POST | `/banners` | Thêm banner | ADMIN |
| PUT | `/banners/:id` | Sửa banner | ADMIN |
| DELETE | `/banners/:id` | Xóa banner | ADMIN |

### Flash Sales
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/flash-sales` | Flash sale đang diễn ra | Public |
| GET | `/flash-sales/admin/all` | Tất cả flash sale | ADMIN |
| GET | `/flash-sales/:id` | Chi tiết flash sale (kèm sản phẩm) | Public |
| POST | `/flash-sales` | Tạo flash sale | ADMIN |
| PUT | `/flash-sales/:id` | Sửa flash sale | ADMIN |
| DELETE | `/flash-sales/:id` | Xóa flash sale | ADMIN |
| POST | `/flash-sales/:id/products` | Thêm sản phẩm vào flash sale | ADMIN |
| DELETE | `/flash-sales/:id/products/:productId` | Xóa sản phẩm khỏi flash sale | ADMIN |

### Refunds
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/refunds` | Tạo yêu cầu hoàn tiền | Protected |
| GET | `/refunds/my` | Yêu cầu hoàn tiền của tôi | Protected |
| GET | `/refunds` | Tất cả yêu cầu (admin, 10/trang) | ADMIN |
| PUT | `/refunds/:id` | Cập nhật trạng thái hoàn tiền | ADMIN |

### Violations
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/violations` | Báo cáo vi phạm | Protected |
| GET | `/violations` | Danh sách vi phạm (admin, 10/trang) | ADMIN |
| PUT | `/violations/:id` | Xử lý vi phạm (phạt, cảnh cáo) | ADMIN |

### Audit Log
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/audit` | Lịch sử hành động (admin, 10/trang) | ADMIN |
| POST | `/audit` | Ghi audit log thủ công | ADMIN |

### Users
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/users` | Danh sách người dùng (admin, 10/trang) | ADMIN |
| GET | `/users/:id` | Chi tiết người dùng (kèm đơn hàng gần đây) | ADMIN |
| PUT | `/users/:id` | Sửa người dùng | ADMIN |
| DELETE | `/users/:id` | Vô hiệu hóa người dùng | ADMIN |
| POST | `/users/follow` | Theo dõi shop | Protected |
| GET | `/users/follow` | Cửa hàng đã theo dõi | Protected |
| DELETE | `/users/follow/:partnerId` | Bỏ theo dõi shop | Protected |

### Dashboard
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/dashboard/stats` | Thống kê (users, products, partners, categories, top products, clusters) | ADMIN |
| GET | `/dashboard/sales-chart` | Biểu đồ doanh số (mặc định 30 ngày) | ADMIN |

### Clusters
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/clusters` | Danh sách nhóm (kèm rules) | ADMIN |
| GET | `/clusters/stats` | Thống kê phân bố nhóm | ADMIN |
| GET | `/clusters/:id` | Chi tiết nhóm (kèm users) | ADMIN |
| POST | `/clusters` | Tạo nhóm | ADMIN |
| PUT | `/clusters/:id` | Sửa nhóm | ADMIN |
| DELETE | `/clusters/:id` | Xóa nhóm | ADMIN |
| POST | `/clusters/run` | Chạy phân cụm (gọi ML service) | ADMIN |

### Recommendations
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/recommendations/personalized` | Gợi ý cá nhân (dựa trên cluster) | Protected |
| GET | `/recommendations/trending` | Sản phẩm thịnh hành (Redis cache) | Public |
| GET | `/recommendations/similar/:productId` | Sản phẩm tương tự (cùng category) | Public |
| GET | `/recommendations/cluster/:clusterId` | Gợi ý theo nhóm | ADMIN |

### Settings
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/settings` | Cài đặt hệ thống | Public |
| PUT | `/settings` | Cập nhật cài đặt | ADMIN |

### Notifications
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/notifications` | Danh sách thông báo (kèm unread count) | ADMIN |
| PUT | `/notifications/:id/read` | Đánh dấu đã đọc | ADMIN |
| PUT | `/notifications/read-all` | Đánh dấu tất cả đã đọc | ADMIN |

### Health
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/health` | Health check (success + timestamp) | Public |

---

## 🗄️ Database Schema (20+ Models)

```prisma
enum UserRole { CUSTOMER | ADMIN | PARTNER }
enum OrderStatus { PENDING | CONFIRMED | SHIPPING | DELIVERED | CANCELLED }
enum PaymentMethod { COD | BANKING | MOMO | VNPAY }
enum PaymentStatus { UNPAID | PAID | REFUNDED }

User (role: ADMIN | PARTNER | CUSTOMER)
  ├── partner fields: storeName, storeDescription, taxCode, businessAddress
  ├── isApproved, approvedAt, rejectedReason (PARTNER approval)
  ├── clusterId → Cluster (customer segmentation)
  ├── totalSpent, orderCount, lastPurchaseAt (RFM metrics)
  ├── → products (as PARTNER)
  ├── → orders (as CUSTOMER)
  ├── → reviews, cartItems, wishlistItems
  ├── → addresses (multiple shipping addresses)
  ├── → refunds (refund requests)
  ├── → auditLogs (admin actions)
  ├── → following, followers (shop following)
  ├── → conversationsAsUser, conversationsAsPartner
  ├── → sentMessages
  ├── → couponsCreated (PARTNER/ADMIN)
  └── → recommendations

Product → Category, partnerId? (PARTNER products)
  ├── variants[] (ProductVariant: color, size, storage...)
  └── flashSaleProducts[] (FlashSaleProduct)

Order → User, coupon?
  ├── orderItems[] → Product
  ├── refunds[]
  └── conversations[] (linked order chat)

Coupon → createdBy (ADMIN/PARTNER)
  ├── type: PERCENTAGE | FIXED
  ├── usageLimit, usedCount, perUserLimit
  ├── minOrderValue, maxDiscount
  └── couponUsages[] → User, Order

FlashSale → flashSaleProducts[] → Product (salePrice, maxQuantity, soldCount)

Conversation → User, Partner, Order?
  └── messages[] (sender, content, images, isRead)

Violation → reportedBy, targetId, targetType (SHOP | PRODUCT)
  ├── status: PENDING | INVESTIGATING | RESOLVED | DISMISSED
  └── penalty: WARNING | SUSPEND | BAN

Cluster → clusterRules[] (metricName, minValue, maxValue, priority)
  └── users[]

Recommendation → User?, Cluster?, Product (score, reason)
```

---

## 🎨 Thiết kế giao diện

- **Font:** Geist Sans (premium, hiện đại, thân thiện)
- **Màu sắc:**
  - `primary` (xanh dương #2563eb) — chủ đạo
  - `emerald` (#059669) — partner
  - `surface` (#f8fafc) / `ink` (#0f172a) — color system
- **Hiệu ứng CSS:** Glass effect, skeleton loading, stagger fade-in, scale-in, float, shimmer, pulse-soft
- **Responsive:** Tương thích mobile & desktop
- **Premium components:**
  - Stats cards gradient (admin dashboard)
  - Notification dropdown (poll 30s từ backend)
  - Sidebar collapsible (admin — không có Đơn hàng)
  - Staggered list animations (home page)
  - Product card premium với hover effects + hiển thị tên shop
  - Modal địa chỉ, chat realtime-style
- **Phân trang:** 10 items/trang trên tất cả danh sách (products, orders, users, coupons...)
- **Custom Tailwind theme:**
  - `primary`: 50-900 (blue)
  - `surface`: secondary, tertiary
  - `ink`: primary, secondary, tertiary
  - Premium shadows: `premium-sm`, `premium-md`, `premium-lg`, `premium-xl`

---

## 🧪 ML Service (Python + FastAPI)

ML Service chạy riêng biệt với backend, cung cấp API phân cụm khách hàng:

| Endpoint | Mô tả |
|----------|-------|
| `GET /` | Health check |
| `GET /docs` | Swagger UI |
| `POST /cluster/run` | Chạy phân cụm K-Means + RFM |

**Thuật toán:**
- **RFM Analysis:** Recency (thời gian từ lần mua cuối), Frequency (số lần mua), Monetary (tổng chi tiêu)
- **K-Means Clustering:** Phân nhóm khách hàng dựa trên RFM scores
- **Output:** Tên nhóm, màu sắc, danh sách user_id thuộc từng nhóm

---

## 🔧 Biến môi trường

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://khoaluan:khoaluan123@postgres:5432/khoaluan
REDIS_URL=redis://redis:6379
JWT_SECRET=khoaluan-jwt-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=khoaluan-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=30d
ML_SERVICE_URL=http://ml-service:8000
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=debug
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=/api
VITE_ML_API_URL=http://localhost:8000
```

> **Lưu ý:** Vite proxy configuration forwards `/api` requests to `http://localhost:5000` trong môi trường development.

---

## 🧪 Test nhanh

```bash
# Health check
curl http://localhost:5000/api/health

# Danh sách sản phẩm
curl http://localhost:5000/api/products?limit=5

# Đăng nhập admin → lấy token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@khoaluan.com","password":"admin123"}'

# Đăng ký làm đối tác
curl -X POST http://localhost:5000/api/partner/register \
  -H "Content-Type: application/json" \
  -d '{"email":"newpartner@test.com","password":"test123","name":"Đối tác mới","storeName":"Shop Mới","businessAddress":"Hà Nội"}'

# Xem banner đang active
curl http://localhost:5000/api/banners

# Xem flash sale đang diễn ra
curl http://localhost:5000/api/flash-sales

# Kiểm tra mã giảm giá (cần token)
curl -X POST http://localhost:5000/api/coupons/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"code":"WELCOME10"}'
```

---

## ✨ Tính năng nổi bật

1. **3 nhánh người dùng** — Admin, Partner, Customer với quyền riêng biệt
2. **Partner tự xử lý đơn hàng** — Admin không quản lý đơn hàng, partner tự duyệt & xác nhận
3. **8+ partner shops** — 7 shop đã duyệt với sản phẩm riêng theo từng danh mục
4. **Phân cụm khách hàng** — K-Means + RFM qua ML Service riêng
5. **Gợi ý cá nhân hóa** — Dựa trên nhóm khách hàng và lịch sử mua hàng
6. **Flash Sale** — Sự kiện giảm giá có thời gian, quản lý số lượng
7. **Mã giảm giá** — PERCENTAGE/FIXED, giới hạn sử dụng, theo người dùng
8. **Chat realtime** — Giữa khách hàng và shop (poll-based)
9. **Yêu thích & Follow shop** — Theo dõi sản phẩm và cửa hàng
10. **Quản lý địa chỉ** — Nhiều địa chỉ giao hàng, mặc định
11. **Hoàn tiền & Vi phạm** — Quy trình xử lý khiếu nại
12. **Audit Log** — Ghi lại mọi hành động quan trọng
13. **Thông báo realtime** — Poll 30s cho admin
14. **Redis Caching** — Cache sản phẩm, gợi ý, trending
15. **Rate Limiting** — Giới hạn request, auth
16. **Mobile App** — React Native + Expo (iOS/Android)
17. **Responsive Design** — Tương thích mọi thiết bị
18. **Premium UI** — Geist font, glass effects, animations, skeleton loading
19. **Phân trang đồng bộ** — 10 items/trang trên tất cả danh sách

---

*Đồ án tốt nghiệp - Hệ thống thương mại điện tử 3 nhánh với phân cụm khách hàng và gợi ý sản phẩm cá nhân hóa*
