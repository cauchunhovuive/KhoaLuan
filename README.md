# 🛒 KhoaLuan - Hệ thống Phân cụm Khách hàng & Gợi ý Sản phẩm

**Đề tài:** Phân cụm khách hàng và gợi ý sản phẩm cá nhân hóa cho từng nhóm cho web/app thương mại điện tử

---

## 🏗️ Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                  │
│                  http://localhost:3000                        │
├─────────────────────────────────────────────────────────────┤
│              Backend API (Node.js + Express)                  │
│                  http://localhost:5000                        │
├───────────────────┬─────────────────────────────────────────┤
│  ML Service        │    Database & Cache                       │
│  (Python/FastAPI)  │    PostgreSQL + Redis                     │
│  http://localhost:8000 │                                      │
└───────────────────┴─────────────────────────────────────────┘
```

## 🧰 Công nghệ sử dụng

| Layer | Công nghệ |
|-------|-----------|
| **Frontend Web** | React 18 + Vite + Redux Toolkit + Tailwind CSS + React Router |
| **Backend API** | Node.js + Express.js |
| **ML Service** | Python + FastAPI + scikit-learn (K-Means, RFM) |
| **Database** | PostgreSQL + Prisma ORM |
| **Cache** | Redis (ioredis) |
| **Xác thực** | JWT (access + refresh token) |
| **Container** | Docker + Docker Compose |
| **Mobile** | React Native + Expo |

## ✨ Tính năng chi tiết

### 👤 Khách hàng (Người dùng)

| Tính năng | Mô tả |
|-----------|-------|
| 🔐 Đăng ký / Đăng nhập | JWT authentication với refresh token |
| 🔍 Tìm kiếm sản phẩm | Tìm kiếm theo tên, danh mục, khoảng giá |
| 📂 Duyệt danh mục | Lọc sản phẩm theo danh mục, sắp xếp theo giá/bán chạy/mới |
| 🛒 Giỏ hàng | Thêm/sửa/xóa sản phẩm, tự động lưu |
| 📦 Đặt hàng | Tạo đơn hàng từ giỏ, chọn phương thức thanh toán (COD/Banking/MoMo/VNPAY) |
| 📋 Theo dõi đơn hàng | Xem trạng thái đơn hàng (PENDING → CONFIRMED → SHIPPING → DELIVERED) |
| ⭐ Đánh giá sản phẩm | Đánh giá sao và bình luận |
| 👤 Quản lý hồ sơ | Cập nhật thông tin cá nhân, số điện thoại, địa chỉ |
| 🤖 Gợi ý cá nhân hóa | Sản phẩm gợi ý dựa trên phân cụm khách hàng |
| 📱 Responsive | Giao diện tương thích mobile & desktop |

### 🛠️ Admin

| Tính năng | Mô tả |
|-----------|-------|
| 📊 Dashboard | Thống kê tổng quan: doanh thu, đơn hàng, người dùng, sản phẩm bán chạy |
| 📦 Quản lý sản phẩm | CRUD sản phẩm, phân trang (10/trang), tìm kiếm |
| 📂 Quản lý danh mục | Thêm/sửa/xóa danh mục |
| 📋 Quản lý đơn hàng | Lọc theo trạng thái, cập nhật trạng thái đơn hàng |
| 👥 Quản lý người dùng | Xem danh sách, tìm kiếm người dùng |
| 🧩 Phân cụm khách hàng | Xem các nhóm khách hàng, kích hoạt phân cụm ML |
| 🎯 Gợi ý sản phẩm | Quản lý gợi ý theo nhóm khách hàng |
| ⚙️ Cài đặt hệ thống | Tên web, mô tả, thông tin liên hệ, vận chuyển, ML settings |
| 🔔 Thông báo đơn hàng | Nhận thông báo realtime khi có đơn hàng mới (poll 30s) |
| 📈 Biểu đồ doanh thu | Xem doanh thu theo ngày/tháng/năm |

### 🤖 Machine Learning

| Tính năng | Mô tả |
|-----------|-------|
| 📊 RFM Analysis | Phân tích Recency - Frequency - Monetary để phân cụm |
| 🔢 K-Means Clustering | Phân nhóm khách hàng tự động |
| 🎯 Gợi ý theo nhóm | Sản phẩm phổ biến trong từng nhóm khách hàng |
| 🔗 Sản phẩm tương tự | Gợi ý dựa trên cùng danh mục |
| 📈 Trending | Sản phẩm bán chạy toàn hệ thống |

## 🚀 Hướng dẫn chạy

### Yêu cầu
- Docker & Docker Compose (khuyến nghị)
- Node.js >= 18
- Python >= 3.9

### Chạy với Docker (khuyến nghị)

> **Dữ liệu mẫu được tự động seed khi container khởi động lần đầu**
> Bao gồm: 1 admin, 3 khách hàng, 5 danh mục, 20 sản phẩm, 4 đơn hàng, 6 đánh giá

```bash
# Clone dự án
git clone <url>
cd KhoaLuan

# Khởi động tất cả services (tự động tạo DB + seed dữ liệu)
docker-compose up -d

# Chờ backend seed xong (khoảng 10-15s)
docker-compose logs -f backend
# Khi thấy "✅ Seed hoàn tát!" là có thể dùng được
```

Sau khi chạy:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **API Health:** http://localhost:5000/api/health
- **ML Service:** http://localhost:8000

### Tài khoản mặc định

Khi chạy seed, các tài khoản sau được tạo sẵn để test:

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| 🔴 **Admin** | admin@khoaluan.com | admin123 |
| 🟢 **Khách hàng 1** | customer1@test.com | customer123 |
| 🟢 **Khách hàng 2** | customer2@test.com | customer123 |
| 🟢 **Khách hàng 3** | customer3@test.com | customer123 |

### Chạy thủ công (không Docker)

**1. Database & Cache**
```bash
# Cần PostgreSQL và Redis chạy local
# Hoặc dùng Docker chỉ cho database:
docker run -d --name postgres -e POSTGRES_DB=khoaluan -e POSTGRES_USER=khoaluan -e POSTGRES_PASSWORD=khoaluan123 -p 5432:5432 postgres:15-alpine
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

**2. Backend**
```bash
cd backend
cp .env.example .env    # Cấu hình database URL
npm install
npx prisma db push      # Tạo bảng
npm run prisma:seed     # Seed dữ liệu mẫu (admin, sản phẩm, đơn hàng...)
npm run dev             # http://localhost:5000
```

> **Chi tiết dữ liệu seed:** File `backend/prisma/seed.js` tạo sẵn:
> - 4 tài khoản (1 admin + 3 customer)
> - 5 danh mục (Điện thoại, Laptop, Thời trang, Đồ gia dụng, Sách)
> - 20 sản phẩm với giá, tồn kho, đánh giá
> - 4 đơn hàng ở các trạng thái khác nhau (DELIVERED, SHIPPING, PENDING)
> - 6 đánh giá sản phẩm

**3. Frontend**
```bash
cd frontend
npm install
npm run dev             # http://localhost:3000
```

**4. ML Service**
```bash
cd backend/ml
pip install -r requirements.txt
python -m uvicorn clustering.api:app --reload --port 8000
```

## 📁 Cấu trúc thư mục

```
KHOALUAN/
├── backend/                          # Backend API (Node.js + Express)
│   ├── src/
│   │   ├── app.js                    # Entry point + Express setup
│   │   ├── server.js                 # Server startup
│   │   ├── config/
│   │   │   ├── database.js           # Prisma client
│   │   │   ├── redis.js              # Redis cache client
│   │   │   └── logger.js             # Winston logger
│   │   ├── controllers/
│   │   │   ├── authController.js     # Đăng ký, đăng nhập, refresh token
│   │   │   ├── productController.js  # CRUD sản phẩm
│   │   │   ├── categoryController.js # CRUD danh mục
│   │   │   ├── orderController.js    # Đặt hàng, quản lý đơn hàng
│   │   │   ├── cartController.js     # Giỏ hàng
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
│   │   ├── middleware/
│   │   │   ├── auth.js               # JWT protect + restrictTo
│   │   │   ├── errorHandler.js       # Global error handler
│   │   │   └── validate.js           # Input validation
│   │   └── utils/
│   │       ├── AppError.js           # Custom error class
│   │       └── asyncHandler.js       # Async error wrapper
│   ├── prisma/
│   │   └── schema.prisma             # Database schema
│   └── ml/                           # ML Service (Python)
│       ├── Dockerfile.ml
│       └── clustering/
│           ├── api.py                # FastAPI endpoints
│           ├── cluster.py            # K-Means implementation
│           └── requirements.txt
│
├── frontend/                         # Frontend Web (React + Vite)
│   ├── src/
│   │   ├── main.jsx                  # Entry point
│   │   ├── App.jsx                   # Router + Redux setup
│   │   ├── index.css                 # Tailwind CSS + custom styles
│   │   ├── store/
│   │   │   ├── index.js              # Redux store config
│   │   │   ├── authSlice.js          # Authentication state
│   │   │   ├── cartSlice.js          # Giỏ hàng state
│   │   │   ├── productSlice.js       # Sản phẩm + danh mục
│   │   │   ├── settingsSlice.js      # Cài đặt hệ thống
│   │   │   ├── notificationSlice.js  # Thông báo admin
│   │   │   └── uiSlice.js            # UI state (sidebar, theme)
│   │   ├── services/
│   │   │   └── api.js                # Axios instance + interceptors
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   │   ├── Navbar.jsx        # Navigation bar
│   │   │   │   ├── Footer.jsx        # Footer
│   │   │   │   ├── MainLayout.jsx    # Layout cho người dùng
│   │   │   │   └── AdminLayout.jsx   # Layout cho admin (sidebar)
│   │   │   └── common/
│   │   │       ├── ProductCard.jsx   # Card sản phẩm
│   │   │       ├── LoadingSpinner.jsx# Spinner loading
│   │   │       └── Pagination.jsx    # Phân trang
│   │   └── pages/
│   │       ├── HomePage.jsx          # Trang chủ
│   │       ├── ProductListPage.jsx   # Danh sách sản phẩm
│   │       ├── ProductDetailPage.jsx # Chi tiết sản phẩm
│   │       ├── CartPage.jsx          # Giỏ hàng
│   │       ├── CheckoutPage.jsx      # Thanh toán
│   │       ├── OrdersPage.jsx        # Đơn hàng của tôi
│   │       ├── OrderDetailPage.jsx   # Chi tiết đơn hàng
│   │       ├── SearchPage.jsx        # Kết quả tìm kiếm
│   │       ├── ProfilePage.jsx       # Thông tin cá nhân
│   │       ├── auth/
│   │       │   ├── LoginPage.jsx     # Đăng nhập
│   │       │   └── RegisterPage.jsx  # Đăng ký
│   │       └── admin/
│   │           ├── DashboardPage.jsx    # Thống kê
│   │           ├── ProductsManagePage.jsx# Quản lý sản phẩm
│   │           ├── CategoriesManagePage.jsx# Quản lý danh mục
│   │           ├── OrdersManagePage.jsx  # Quản lý đơn hàng
│   │           ├── UsersManagePage.jsx   # Quản lý người dùng
│   │           ├── ClustersPage.jsx      # Phân cụm
│   │           ├── RecommendationsPage.jsx# Gợi ý
│   │           └── SettingsPage.jsx      # Cài đặt
│   └── Dockerfile
│
└── docker-compose.yml                # Docker Compose config
```

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/api/auth/register` | Đăng ký | Public |
| POST | `/api/auth/login` | Đăng nhập | Public |
| POST | `/api/auth/refresh` | Refresh token | Public |
| POST | `/api/auth/logout` | Đăng xuất | Protected |
| GET | `/api/auth/me` | Thông tin user | Protected |
| PUT | `/api/auth/profile` | Cập nhật profile | Protected |

### Products
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/products` | Danh sách sản phẩm (pagination) | Public |
| GET | `/api/products/featured` | Sản phẩm bán chạy | Public |
| GET | `/api/products/slug/:slug` | Chi tiết theo slug | Public |
| GET | `/api/products/:id` | Chi tiết theo ID | Public |
| POST | `/api/products` | Thêm sản phẩm | Admin |
| PUT | `/api/products/:id` | Cập nhật sản phẩm | Admin |
| DELETE | `/api/products/:id` | Xóa sản phẩm | Admin |

### Orders
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/api/orders` | Tạo đơn hàng | Protected |
| GET | `/api/orders` | Đơn hàng của tôi | Protected |
| GET | `/api/orders/admin/all` | Tất cả đơn hàng | Admin |
| GET | `/api/orders/:id` | Chi tiết đơn hàng | Protected |
| PUT | `/api/orders/:id/status` | Cập nhật trạng thái | Admin |
| PUT | `/api/orders/:id/cancel` | Hủy đơn hàng | Protected |

### Cart
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/cart` | Giỏ hàng | Protected |
| POST | `/api/cart` | Thêm vào giỏ | Protected |
| PUT | `/api/cart/:productId` | Cập nhật số lượng | Protected |
| DELETE | `/api/cart/:productId` | Xóa khỏi giỏ | Protected |
| DELETE | `/api/cart/clear` | Xóa giỏ hàng | Protected |

### Admin
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/dashboard/stats` | Thống kê dashboard | Admin |
| GET | `/api/dashboard/sales-chart` | Biểu đồ doanh thu | Admin |
| GET | `/api/users` | Danh sách người dùng | Admin |
| GET | `/api/settings` | Cài đặt hệ thống | Public |
| PUT | `/api/settings` | Cập nhật cài đặt | Admin |
| GET | `/api/notifications` | Danh sách thông báo | Admin |
| PUT | `/api/notifications/:id/read` | Đọc thông báo | Admin |
| PUT | `/api/notifications/read-all` | Đọc tất cả | Admin |

### Clustering & Recommendations
| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/clusters` | Danh sách cluster | Admin |
| GET | `/api/clusters/stats` | Thống kê cluster | Admin |
| POST | `/api/clusters/run` | Chạy phân cụm ML | Admin |
| GET | `/api/recommendations/personalized` | Gợi ý cá nhân | Protected |
| GET | `/api/recommendations/trending` | Sản phẩm thịnh hành | Public |
| GET | `/api/recommendations/similar/:productId` | Sản phẩm tương tự | Public |

## 🗄️ Database Schema

```prisma
Model: User → Order, Review, CartItem, Recommendation
Model: Product → OrderItem, Review, CartItem, Recommendation
Model: Category → Product
Model: Order → OrderItem (→ Product)
Model: Cluster → User, ClusterRule
Model: Recommendation → User, Product
Model: Notification (standalone)
Model: SiteSetting (key-value store)
```

## 🔧 Biến môi trường

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://khoaluan:khoaluan123@localhost:5432/khoaluan
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d
ML_SERVICE_URL=http://localhost:8000
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=debug
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api
VITE_ML_API_URL=http://localhost:8000
```

## 🧪 Test

### Kiểm tra Backend API
```bash
# Health check
curl http://localhost:5000/api/health

# Lấy danh sách sản phẩm
curl http://localhost:5000/api/products?limit=5

# Đăng nhập admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@khoaluan.com","password":"admin123"}'
```

### Kiểm tra phân trang sản phẩm admin
```bash
# Sản phẩm admin: 10 sản phẩm/trang
curl "http://localhost:5000/api/products?page=1&limit=10"
```

### Kiểm tra thông báo
```bash
# Admin login → lấy token → check notifications
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@khoaluan.com","password":"admin123"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.token))")

curl http://localhost:5000/api/notifications -H "Authorization: Bearer $TOKEN"
```

## 📋 Ghi chú

- Frontend dùng **React với JSX** (không phải TypeScript)
- Backend sử dụng **Prisma ORM** với PostgreSQL
- Redis dùng để cache gợi ý sản phẩm (10 phút)
- Thông báo admin được poll mỗi 30 giây từ frontend
- Cài đặt hệ thống: GET public, PUT admin-only
- Các route `/about`, `/contact`, `/faq` trong Footer là placeholder

---
*Đồ án tốt nghiệp - Phân cụm khách hàng và gợi ý sản phẩm cá nhân hóa*
