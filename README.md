# 🛒 KhoaLuan - Hệ thống Thương mại Điện tử 3 Nhánh

**Đề tài:** Hệ thống thương mại điện tử với 3 nhánh người dùng (Admin, Đối tác kinh doanh, Khách hàng) kết hợp phân cụm khách hàng và gợi ý sản phẩm cá nhân hóa.

---

## 🏗️ Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                      │
│                  http://localhost:3000                            │
├─────────────────────────────────────────────────────────────────┤
│              Backend API (Node.js + Express)                      │
│                  http://localhost:5000                            │
├───────────────────┬─────────────────────────────────────────────┤
│  ML Service        │    Database & Cache                           │
│  (Python/FastAPI)  │    PostgreSQL + Redis                         │
│  http://localhost:8000 │                                          │
└───────────────────┴─────────────────────────────────────────────┘
```

## 👥 3 Nhánh người dùng

| Nhánh | Vai trò | Mô tả |
|-------|---------|-------|
| 🔴 **Admin** | `ADMIN` | Quản trị hệ thống, quản lý tất cả |
| 🟡 **Đối tác kinh doanh** | `PARTNER` | Đăng bán sản phẩm, quản lý đơn hàng của mình |
| 🟢 **Khách hàng** | `CUSTOMER` | Mua sắm, đánh giá, theo dõi đơn hàng |

### 🔴 Admin
- Dashboard thống kê tổng quan (doanh thu, đơn hàng, người dùng)
- Quản lý sản phẩm, danh mục, đơn hàng
- Quản lý người dùng & **đối tác** (phê duyệt / từ chối)
- Phân cụm khách hàng (K-Means, RFM)
- Cài đặt hệ thống
- Thông báo (poll 30s)

### 🟡 Đối tác kinh doanh
- **Đăng ký** tài khoản đối tác với thông tin cửa hàng
- **Chờ Admin phê duyệt** trước khi có thể bán hàng
- Dashboard riêng: thống kê sản phẩm, đơn hàng, doanh thu
- **CRUD sản phẩm** của riêng mình
- **Quản lý đơn hàng** có chứa sản phẩm của mình (xác nhận, giao hàng, hoàn thành)
- **Cập nhật thông tin cửa hàng** (tên, mô tả, MST, địa chỉ)

### 🟢 Khách hàng
- Đăng ký / Đăng nhập JWT
- Tìm kiếm, duyệt sản phẩm theo danh mục
- Giỏ hàng, đặt hàng (COD/Banking/MoMo/VNPAY)
- Theo dõi đơn hàng
- Đánh giá sản phẩm
- Gợi ý cá nhân hóa theo nhóm khách hàng

## 🧰 Công nghệ sử dụng

| Layer | Công nghệ |
|-------|-----------|
| **Frontend Web** | React 18 + Vite + Redux Toolkit + Tailwind CSS + React Router + Recharts + Chart.js + react-hot-toast + react-icons |
| **Backend API** | Node.js + Express.js + Prisma ORM |
| **ML Service** | Python + FastAPI + scikit-learn (K-Means, RFM) |
| **Database** | PostgreSQL |
| **Cache** | Redis (ioredis) |
| **Xác thực** | JWT (access + refresh token) |
| **Container** | Docker + Docker Compose |
| **Mobile** | React Native + Expo + React Navigation + Redux Toolkit + Axios |

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
# Khi thấy "✅ Seed hoàn tất!" là có thể dùng được
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
> docker exec khoaluan-backend sh -c "node prisma/seed.js --force"
> ```

### Tài khoản mặc định

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| 🔴 **Admin** | admin@khoaluan.com | admin123 |
| 🟡 **Đối tác (đã duyệt)** | partner1@shop.com | partner123 |
| 🟡 **Đối tác (đã duyệt)** | partner2@fashion.com | partner123 |
| 🟡 **Đối tác (chờ duyệt)** | partner3@new.com | partner123 |
| 🟢 **Khách hàng 1** | customer1@test.com | customer123 |
| 🟢 **Khách hàng 2** | customer2@test.com | customer123 |
| 🟢 **Khách hàng 3** | customer3@test.com | customer123 |

## 📁 Cấu trúc thư mục

```
KHOALUAN/
├── backend/                          # Backend API (Node.js + Express)
│   ├── src/
│   │   ├── app.js                    # Entry point + Express setup
│   │   ├── config/
│   │   │   ├── database.js           # Prisma client
│   │   │   ├── redis.js              # Redis cache client
│   │   │   └── logger.js             # Winston logger
│   │   ├── controllers/
│   │   │   ├── authController.js     # Đăng ký, đăng nhập, refresh token
│   │   │   ├── productController.js  # CRUD sản phẩm (hỗ trợ PARTNER)
│   │   │   ├── categoryController.js # CRUD danh mục
│   │   │   ├── orderController.js    # Đặt hàng, hỗ trợ PARTNER xem đơn
│   │   │   ├── cartController.js     # Giỏ hàng
│   │   │   ├── partnerController.js  # Đối tác: register, dashboard, approve
│   │   │   ├── userController.js     # Quản lý người dùng (admin)
│   │   │   ├── reviewController.js   # Đánh giá sản phẩm
│   │   │   ├── dashboardController.js# Thống kê dashboard
│   │   │   ├── clusterController.js  # Phân cụm khách hàng
│   │   │   ├── recommendationController.js # Gợi ý sản phẩm
│   │   │   ├── settingsController.js # Cài đặt hệ thống
│   │   │   └── notificationController.js # Thông báo
│   │   ├── routes/
│   │   │   ├── index.js              # Route aggregator
│   │   │   ├── auth.js, products.js, orders.js, cart.js
│   │   │   ├── categories.js, users.js, reviews.js
│   │   │   ├── clusters.js, recommendations.js
│   │   │   ├── dashboard.js, settings.js, notifications.js
│   │   │   └── partner.js            # Partner + admin partner routes
│   │   ├── middleware/
│   │   │   ├── auth.js               # JWT protect + restrictTo(ADMIN, PARTNER...)
│   │   │   ├── errorHandler.js       # Global error handler
│   │   │   └── validate.js           # Input validation
│   │   └── utils/
│   │       ├── AppError.js           # Custom error class
│   │       └── asyncHandler.js       # Async error wrapper
│   ├── prisma/
│   │   ├── schema.prisma             # Database schema (User.role: ADMIN/PARTNER/CUSTOMER)
│   │   └── seed.js                   # Seed dữ liệu mẫu (chỉ chạy 1 lần)
│   └── ml/                           # ML Service (Python)
│       └── clustering/
│           ├── api.py                # FastAPI endpoints
│           └── clustering_service.py # K-Means implementation
│
├── frontend/                         # Frontend Web (React + Vite)
│   ├── src/
│   │   ├── main.jsx                  # Entry point (font Geist + global CSS)
│   │   ├── App.jsx                   # Router 3 nhánh: /, /admin/*, /partner/*
│   │   ├── index.css                 # Tailwind CSS + premium custom styles
│   │   ├── store/
│   │   │   ├── index.js              # Redux store config
│   │   │   ├── authSlice.js          # Authentication state
│   │   │   ├── cartSlice.js          # Giỏ hàng state
│   │   │   ├── productSlice.js       # Sản phẩm + danh mục
│   │   │   ├── settingsSlice.js      # Cài đặt hệ thống
│   │   │   ├── notificationSlice.js  # Thông báo admin
│   │   │   └── uiSlice.js            # UI state (sidebar, theme)
│   │   ├── services/
│   │   │   └── api.js                # Axios + JWT interceptor + refresh token
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   │   ├── Navbar.jsx        # Navigation (3 nhánh: user/partner/admin)
│   │   │   │   ├── Footer.jsx        # Premium footer
│   │   │   │   ├── MainLayout.jsx    # Layout khách hàng
│   │   │   │   ├── AdminLayout.jsx   # Layout admin (sidebar quản lý)
│   │   │   │   └── PartnerLayout.jsx # Layout đối tác (sidebar riêng)
│   │   │   └── common/
│   │   │       ├── ProductCard.jsx   # Card sản phẩm premium
│   │   │       ├── LoadingSpinner.jsx# Skeleton loading
│   │   │       └── Pagination.jsx    # Phân trang
│   │   └── pages/
│   │       ├── HomePage.jsx          # Hero + features + categories
│   │       ├── ProductListPage.jsx   # Danh sách + filter sidebar
│   │       ├── ProductDetailPage.jsx # Chi tiết + reviews
│   │       ├── CartPage.jsx          # Giỏ hàng premium
│   │       ├── CheckoutPage.jsx      # Thanh toán
│   │       ├── OrdersPage.jsx        # Đơn hàng của tôi
│   │       ├── OrderDetailPage.jsx   # Chi tiết đơn
│   │       ├── SearchPage.jsx        # Tìm kiếm
│   │       ├── ProfilePage.jsx       # Thông tin cá nhân
│   │       ├── auth/
│   │       │   ├── LoginPage.jsx     # Đăng nhập
│   │       │   └── RegisterPage.jsx  # Đăng ký (khách hàng / đối tác)
│   │       ├── admin/
│   │       │   ├── DashboardPage.jsx       # Thống kê admin
│   │       │   ├── ProductsManagePage.jsx  # Quản lý sản phẩm
│   │       │   ├── CategoriesManagePage.jsx# Quản lý danh mục
│   │       │   ├── OrdersManagePage.jsx    # Quản lý đơn hàng
│   │       │   ├── UsersManagePage.jsx     # Quản lý người dùng + đối tác
│   │       │   ├── PartnersManagePage.jsx  # Quản lý đối tác riêng (approve/reject)
│   │       │   ├── ClustersPage.jsx        # Phân cụm
│   │       │   ├── RecommendationsPage.jsx # Gợi ý
│   │       │   └── SettingsPage.jsx        # Cài đặt
│   │       └── partner/
│   │           ├── PartnerDashboardPage.jsx# Dashboard đối tác
│   │           ├── PartnerProductsPage.jsx # Quản lý sản phẩm của partner
│   │           ├── PartnerOrdersPage.jsx   # Quản lý đơn hàng của partner
│   │           └── PartnerProfilePage.jsx  # Cập nhật thông tin cửa hàng
│   └── Dockerfile
│
├── frontend/mobile/                  # Mobile App (React Native + Expo)
│   └── src/
│       └── screens/
│           ├── auth/ (Login, Register)
│           └── customer/ (Home, Cart, Products, Profile)
│
└── docker-compose.yml                # 5 services: postgres, redis, backend, ml, frontend
```

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/api/auth/register` | Đăng ký khách hàng | Public |
| POST | `/api/auth/login` | Đăng nhập | Public |
| POST | `/api/auth/refresh` | Refresh token | Public |
| POST | `/api/auth/logout` | Đăng xuất | Protected |
| GET | `/api/auth/me` | Thông tin user (+ partner fields) | Protected |
| PUT | `/api/auth/profile` | Cập nhật profile | Protected |

### Partner
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/api/partner/register` | Đăng ký đối tác | Public |
| GET | `/api/partner/dashboard` | Dashboard đối tác | PARTNER |
| GET | `/api/partner/products` | Sản phẩm của partner | PARTNER |
| GET | `/api/partner/orders` | Đơn hàng có SP của partner | PARTNER |
| PUT | `/api/partner/orders/:id/status` | Cập nhật trạng thái đơn | PARTNER |
| PUT | `/api/partner/profile` | Cập nhật thông tin cửa hàng | PARTNER |
| GET | `/api/partner/admin/all` | Danh sách đối tác | ADMIN |
| PUT | `/api/partner/admin/:id/approve` | Duyệt/từ chối đối tác | ADMIN |

### Products
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/products` | Danh sách (pagination, filter) | Public |
| GET | `/api/products/featured` | Sản phẩm bán chạy | Public |
| GET | `/api/products/slug/:slug` | Chi tiết theo slug | Public |
| POST | `/api/products` | Thêm sản phẩm | ADMIN / PARTNER |
| PUT | `/api/products/:id` | Cập nhật (partner chỉ SP của mình) | ADMIN / PARTNER |
| DELETE | `/api/products/:id` | Xóa (partner chỉ SP của mình) | ADMIN / PARTNER |

### Orders
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/api/orders` | Tạo đơn hàng | Protected |
| GET | `/api/orders` | Đơn hàng của tôi | Protected |
| GET | `/api/orders/admin/all` | Tất cả đơn hàng | ADMIN |
| GET | `/api/orders/:id` | Chi tiết (partner có thể xem) | Protected |
| PUT | `/api/orders/:id/status` | Cập nhật trạng thái | ADMIN / PARTNER |
| PUT | `/api/orders/:id/cancel` | Hủy đơn | Protected |

### Cart
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/cart` | Lấy giỏ hàng | Protected |
| POST | `/api/cart` | Thêm vào giỏ | Protected |
| PUT | `/api/cart/:productId` | Cập nhật số lượng | Protected |
| DELETE | `/api/cart/:productId` | Xóa khỏi giỏ | Protected |
| DELETE | `/api/cart/clear` | Xóa toàn bộ giỏ | Protected |

### Categories
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/categories` | Danh sách danh mục | Public |
| POST | `/api/categories` | Thêm danh mục | ADMIN |
| PUT | `/api/categories/:id` | Cập nhật danh mục | ADMIN |
| DELETE | `/api/categories/:id` | Xóa danh mục | ADMIN |

### Reviews
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/reviews/product/:productId` | Đánh giá sản phẩm | Public |
| POST | `/api/reviews` | Tạo đánh giá | Protected |

### Admin / System
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/dashboard/stats` | Thống kê dashboard | ADMIN |
| GET | `/api/dashboard/sales-chart` | Biểu đồ doanh thu | ADMIN |
| GET | `/api/users` | Danh sách người dùng | ADMIN |
| GET/PUT | `/api/settings` | Cài đặt hệ thống | Public/ADMIN |
| GET/PUT | `/api/notifications` | Thông báo | ADMIN |
| GET/POST | `/api/clusters` | Phân cụm | ADMIN |
| GET | `/api/recommendations/personalized` | Gợi ý cá nhân | Protected |
| GET | `/api/recommendations/trending` | Thịnh hành | Public |

## 🗄️ Database Schema

```
User (role: ADMIN | PARTNER | CUSTOMER)
  ├── partner fields: storeName, storeDescription, taxCode, businessAddress
  ├── isApproved, approvedAt, rejectedReason (dành cho PARTNER)
  ├── products (nếu là PARTNER)
  ├── orders (nếu là CUSTOMER)
  ├── reviews, cartItems
  └── recommendations

Product → Category, partnerId (nullable → sản phẩm của Partner)
Order → OrderItem → Product
Cluster → User, ClusterRule
Recommendation → User, Product
Notification, SiteSetting
```

## 🎨 Thiết kế giao diện

- **Font:** Geist Sans (premium, hiện đại)
- **Màu sắc:** Primary (xanh dương), Emerald (partner), Surface/Ink system
- **Hiệu ứng:** Glass effect, skeleton loading, stagger fade, scale-in, float, shimmer, pulse-soft
- **Responsive:** Tương thích mobile & desktop
- **Premium components:** Stats cards gradient, notification dropdown (poll 30s), sidebar collapsible, staggered list animations
- **Custom Tailwind theme:** `primary` (xanh dương), `surface`/`ink` color system, premium shadows

## 🧪 Test

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
```

## 🔧 Biến môi trường

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://khoaluan:khoaluan123@postgres:5432/khoaluan
REDIS_URL=redis://redis:6379
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret
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
*Đồ án tốt nghiệp - Hệ thống thương mại điện tử 3 nhánh với phân cụm khách hàng và gợi ý sản phẩm cá nhân hóa*
