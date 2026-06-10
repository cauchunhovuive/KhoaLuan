# 📖 KhoaLuan — Full Documentation

> **Hệ thống Thương mại Điện tử 3 Nhánh (Admin, Partner, Customer) + AI Recommendation Engine**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Backend API (Node.js + Express)](#4-backend-api)
   - 4.1 [Application Entry & Middleware](#41-application-entry--middleware)
   - 4.2 [Authentication & Authorization](#42-authentication--authorization)
   - 4.3 [Route Map](#43-route-map)
   - 4.4 [Controllers Detail](#44-controllers-detail)
   - 4.5 [Services](#45-services)
   - 4.6 [Config & Utilities](#46-config--utilities)
5. [ML Service (Python + FastAPI)](#5-ml-service)
   - 5.1 [Overview](#51-overview)
   - 5.2 [Clustering Engine](#52-clustering-engine)
   - 5.3 [Collaborative Filtering](#53-collaborative-filtering)
   - 5.4 [Session-Based Recommender](#54-session-based-recommender)
   - 5.5 [Evaluation & A/B Testing](#55-evaluation--ab-testing)
   - 5.6 [RAG Chat AI](#56-rag-chat-ai)
   - 5.7 [ML Endpoints Summary](#57-ml-endpoints-summary)
6. [Database Schema (Prisma ORM)](#6-database-schema)
   - 6.1 [Enum Types](#61-enum-types)
   - 6.2 [Core Models](#62-core-models)
   - 6.3 [E-commerce Models](#63-e-commerce-models)
   - 6.4 [AI/ML Models](#64-aiml-models)
   - 6.5 [Utility Models](#65-utility-models)
7. [Frontend Web (React + Vite + Tailwind)](#7-frontend-web)
   - 7.1 [Entry Point & Routing](#71-entry-point--routing)
   - 7.2 [State Management (Redux Toolkit)](#72-state-management)
   - 7.3 [Common Components](#73-common-components)
   - 7.4 [Page Components](#74-page-components)
   - 7.5 [Admin Pages (17 modules)](#75-admin-pages)
   - 7.6 [Partner Pages (7 modules)](#76-partner-pages)
   - 7.7 [Performance Optimizations](#77-performance-optimizations)
8. [Mobile App (React Native + Expo)](#8-mobile-app)
   - 8.1 [Entry Point](#81-entry-point)
   - 8.2 [Navigation Structure](#82-navigation-structure)
   - 8.3 [Screens](#83-screens)
9. [Payment Integration](#9-payment-integration)
   - 9.1 [VNPay](#91-vnpay)
   - 9.2 [MoMo](#92-momo)
10. [Deployment & Configuration](#10-deployment--configuration)
    - 10.1 [Docker Services](#101-docker-services)
    - 10.2 [Environment Variables](#102-environment-variables)
    - 10.3 [Seed Data](#103-seed-data)
    - 10.4 [Running the System](#104-running-the-system)
11. [Default Accounts](#11-default-accounts)
12. [ML Test Results](#12-ml-test-results)
13. [API Response Format](#13-api-response-format)
14. [Additional Utility Files](#14-additional-utility-files)
15. [Project File Tree](#15-project-file-tree)

---

## 1. Project Overview

KhoaLuan is a full-stack e-commerce platform with **3 user branches** (Admin, Partner, Customer) integrated with an **AI Recommendation Engine**. The system supports:

- **Multi-vendor marketplace**: Partners manage their own shops and products
- **AI-powered recommendations**: Session-based, Collaborative Filtering, Customer Clustering
- **A/B Testing framework**: Compare recommendation strategies
- **RAG Chat AI**: Ollama + ChromaDB-powered chatbot for customer support
- **Multi-payment gateways**: VNPay, MoMo, COD, Banking
- **Multi-platform**: Web (React) + Mobile (React Native)

### User Branches

| Role | Description | Permissions |
|------|-------------|-------------|
| 🔴 **Admin** | System administrator | Full system access, ML management, user/partner management |
| 🟡 **Partner** | Business seller | Products, orders, reviews, coupons, chat for their own shop |
| 🟢 **Customer** | Buyer | Shopping, orders, reviews, chat, follow shops, coupons |

---

## 2. System Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND WEB (React + Vite)                     │
│                         http://localhost:3000                               │
│                          + MOBILE (React Native + Expo)                    │
├────────────────────────────────────────────────────────────────────────────┤
│                          BACKEND API (Node.js + Express)                    │
│                          http://localhost:5000                              │
├───────────────────────┬────────────────────────────────────────────────────┤
│    ML SERVICE          │    DATABASE & CACHE                                 │
│    (Python FastAPI)    │    PostgreSQL 15 (Prisma ORM)                       │
│    http://localhost:8000│    Redis 7 (ioredis)                                │
│                        │    ChromaDB (vectors for RAG)                       │
├───────────────────────┴────────────────────────────────────────────────────┤
│    OLLAMA LOCAL (LLM)                                                       │
│    http://localhost:11434                                                    │
│    Model: llama3.2:3b                                                        │
└────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Request → Nginx/Load Balancer → Express Backend
                                     ├── Auth Middleware (JWT)
                                     ├── Rate Limiter
                                     ├── Validation (Joi)
                                     ├── Controller Logic
                                     ├── Prisma ORM → PostgreSQL
                                     ├── Redis Cache
                                     └── ML Service Proxy → Python FastAPI
                                                          ├── Clustering (K-Means/RFM)
                                                          ├── Collaborative Filtering
                                                          ├── Session-Based
                                                          ├── Evaluation & A/B Test
                                                          └── RAG → ChromaDB → Ollama
```

---

## 3. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend Web** | React + Vite + Tailwind CSS | React 18, Vite 5 |
| **Frontend State** | Redux Toolkit + React Redux | RTK 2.0 |
| **Frontend Router** | React Router DOM v6 | 6.21 |
| **Frontend Charts** | Recharts + Chart.js | Latest |
| **Mobile** | React Native + Expo | Expo 54, RN 0.81 |
| **Mobile Navigation** | React Navigation v7 | 7.x |
| **Backend** | Node.js + Express.js | Express 4.18 |
| **ORM** | Prisma ORM | 5.10 |
| **Database** | PostgreSQL 15 Alpine | 15 |
| **Cache** | Redis 7 Alpine + ioredis | 7 |
| **Auth** | JWT (jsonwebtoken + bcryptjs) | Latest |
| **Validation** | Joi | 17.11 |
| **Logging** | Winston + Morgan | 3.11 |
| **Security** | Helmet + CORS + express-rate-limit | Latest |
| **ML Service** | Python + FastAPI + scikit-learn | Latest |
| **ML Models** | K-Means, RFM, ALS, Cosine Similarity | scikit-learn |
| **Vector Store** | ChromaDB + sentence-transformers | Latest |
| **LLM** | Ollama (llama3.2:3b) | Latest |
| **Payment** | VNPay (sandbox) + MoMo (test) | API v2 |
| **Container** | Docker + Docker Compose | Latest |

---

## 4. Backend API

### 4.1 Application Entry & Middleware

**File:** `backend/src/app.js`

The Express application configures:

| Middleware | Purpose |
|-----------|---------|
| `helmet()` | Security headers (XSS, content security, etc.) |
| `cors()` | Cross-origin with credentials, supports multiple origins |
| `express.json({ limit: '10mb' })` | JSON body parsing with 10MB limit |
| `express.urlencoded({ extended: true })` | URL-encoded body parsing |
| `morgan('dev')` | HTTP request logging (dev only) |
| `errorHandler` | Global error handling with Prisma/JWT error mapping |

**Routes are loaded via:** `app.use('/api', routes)` where `routes/index.js` aggregates all route modules.

### 4.2 Authentication & Authorization

**File:** `backend/src/middleware/auth.js`

Three middleware functions:

| Function | Description |
|----------|-------------|
| `protect` | Requires valid JWT. Verifies token, loads user, checks active status |
| `protectOptional` | Tries to decode token but continues without error if missing/invalid |
| `restrictTo(...roles)` | Restricts endpoint to specific user roles (ADMIN, PARTNER) |

**JWT Config:**
- Access Token: 7 days expiry
- Refresh Token: 30 days expiry
- Auto-refresh via frontend interceptor
- Blacklist on logout

**File:** `backend/src/middleware/validate.js`

Joi schema validation middleware:
```js
validate(schema) => (req, res, next) => { ... }
```
- Validates `req.body` against provided Joi schema
- Returns first validation error message
- Strips unknown fields

### 4.3 Route Map

**File:** `backend/src/routes/index.js`

All routes are registered under `/api`:

| Route Module | Prefix | File |
|-------------|--------|------|
| Auth | `/api/auth` | `routes/auth.js` |
| Products | `/api/products` | `routes/products.js` |
| Categories | `/api/categories` | `routes/categories.js` |
| Orders | `/api/orders` | `routes/orders.js` |
| Cart | `/api/cart` | `routes/cart.js` |
| Users | `/api/users` | `routes/users.js` |
| Clusters | `/api/clusters` | `routes/clusters.js` |
| Recommendations | `/api/recommendations` | `routes/recommendations.js` |
| Dashboard | `/api/dashboard` | `routes/dashboard.js` |
| Reviews | `/api/reviews` | `routes/reviews.js` |
| Settings | `/api/settings` | `routes/settings.js` |
| Notifications | `/api/notifications` | `routes/notifications.js` |
| Coupons | `/api/coupons` | `routes/coupons.js` |
| Partner | `/api/partner` | `routes/partner.js` |
| Addresses | `/api/addresses` | `routes/addresses.js` |
| Chat | `/api/chat` | `routes/chat.js` |
| Banners | `/api/banners` | `routes/banners.js` |
| Flash Sales | `/api/flash-sales` | `routes/flashSales.js` |
| Refunds | `/api/refunds` | `routes/refunds.js` |
| Violations | `/api/violations` | `routes/violations.js` |
| Audit | `/api/audit` | `routes/audit.js` |
| Shops | `/api/shops` | `routes/shops.js` |
| ML | `/api/ml` | `routes/ml.js` |
| Payments | `/api/payments` | `routes/payments.js` |

### 4.4 Controllers Detail

#### Auth Controller (`authController.js`)
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| POST | `/auth/register` | Public | Register as CUSTOMER (name, email, password, phone) |
| POST | `/auth/login` | Public | Login with email/password, returns JWT pair |
| POST | `/auth/refresh` | Public | Refresh access token using refresh token |
| POST | `/auth/logout` | Protected | Clear refresh token |
| GET | `/auth/me` | Protected | Get current user + partner fields (storeName, isApproved) |
| PUT | `/auth/profile` | Protected | Update profile (name, phone, avatar - base64) |

**Auth Flow:**
1. Register/Login → returns `{ token, refreshToken, user }`
2. Frontend stores both in localStorage
3. API requests include `Authorization: Bearer <token>`
4. On 401 → attempt refresh → redirect to /login if refresh fails

#### Product Controller (`productController.js`)
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/products` | Public | List with filters: category, minPrice, maxPrice, rating, search, sort (newest, price_asc, price_desc, bestseller, rating), partner, page, limit (10) |
| GET | `/products/featured` | Public | Top 8 best-selling products with partner info |
| GET | `/products/slug/:slug` | Public | Product detail by slug (includes partner, reviews with user) |
| GET | `/products/:id` | Public | Product detail by ID (Redis cache 3600s) |
| POST | `/products` | ADMIN/PARTNER | Create product with images, variants |
| PUT | `/products/:id` | ADMIN/PARTNER | Update (partner restricted to own products) |
| DELETE | `/products/:id` | ADMIN/PARTNER | Soft delete (isActive = false) |

**Redis Caching:** Product detail cached for 3600 seconds, invalidated on update/delete.

#### Order Controller (`orderController.js`)
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| POST | `/orders` | Protected | Create from cart with coupon validation |
| GET | `/orders` | Protected | List user's orders with status filter, pagination (10/page) |
| GET | `/orders/:id` | Protected | Order detail with items |
| PUT | `/orders/:id/status` | ADMIN/PARTNER | Update status (CONFIRMED, SHIPPING, DELIVERED) |
| PUT | `/orders/:id/cancel` | Owner | Cancel when PENDING |
| PUT | `/orders/:id/confirm` | Owner | Confirm received (DELIVERED → sets payment PAID) |
| POST | `/orders/:id/rebuy` | Owner | Re-add all items to cart |

**Order Flow:**
1. Cart → Create Order (validates stock, coupon, calculates totals)
2. Auto-assigns coupon usage
3. Payment handled via COD/BANKING/MOMO/VNPAY
4. Partner updates status on their dashboard
5. Customer confirms receipt

#### Cart Controller (`cartController.js`)
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/cart` | Protected | Get cart with product details |
| POST | `/cart` | Protected | Add item (upserts on userId+productId) |
| PUT | `/cart/:itemId` | Protected | Update quantity |
| DELETE | `/cart/:itemId` | Protected | Remove item |
| DELETE | `/cart` | Protected | Clear entire cart |

#### Partner Controller (`partnerController.js`)
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| POST | `/partner/register` | Public | Register as partner (storeName, taxCode, businessAddress) |
| GET | `/partner/dashboard` | PARTNER | Stats: products, orders, revenue |
| GET | `/partner/revenue` | PARTNER | Monthly revenue chart + top selling products |
| GET | `/partner/products` | PARTNER | List own products with pagination |
| POST | `/partner/products` | PARTNER | Create product for own shop |
| GET | `/partner/orders` | PARTNER | Orders containing own products (paginated) |
| PUT | `/partner/orders/:id/status` | PARTNER | Update order item status |
| GET | `/partner/admin/all` | ADMIN | List all partners with pagination |
| PUT | `/partner/admin/:id/approve` | ADMIN | Approve/reject partner registration |

#### User Controller (`userController.js`)
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/users` | ADMIN | List users with role filter, pagination (10/page) |
| GET | `/users/:id` | ADMIN | User detail with recent orders |
| PUT | `/users/:id` | ADMIN | Update user (role, isActive, name, phone) |
| DELETE | `/users/:id` | ADMIN | Deactivate user |
| POST | `/users/follow` | Protected | Follow a shop (partner) |
| GET | `/users/follow` | Protected | List followed shops with partner details |
| DELETE | `/users/follow/:partnerId` | Protected | Unfollow shop |

#### Review Controller (`reviewController.js`)
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| POST | `/reviews` | Protected | Create review (rating 1-5, comment) for delivered products only |
| GET | `/reviews/product/:productId` | Public | Product reviews with pagination |
| PUT | `/reviews/:id/reply` | ADMIN/PARTNER | Reply to review |
| GET | `/reviews/stats/:productId` | Public | Rating distribution stats |
| GET | `/reviews/partner` | PARTNER | Reviews for partner's products |

#### Address Controller (`addressController.js`)
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/addresses` | Protected | List user's addresses |
| POST | `/addresses` | Protected | Create address (can set as default) |
| PUT | `/addresses/:id` | Protected | Update address |
| DELETE | `/addresses/:id` | Protected | Delete address |

#### Coupon Controller (`couponController.js`)
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| POST | `/coupons` | ADMIN/PARTNER | Create coupon (code, type, value, limits) |
| GET | `/coupons` | ADMIN/PARTNER | List coupons (partner sees own) |
| GET | `/coupons/available` | Protected | Available coupons for user with usage tracking |
| POST | `/coupons/validate` | Protected | Validate coupon for an order (returns discount) |
| POST | `/coupons/save/:couponId` | Protected | Save a coupon to user's collection |
| DELETE | `/coupons/save/:couponId` | Protected | Remove saved coupon |
| GET | `/coupons/saved` | Protected | List saved coupons |
| PUT | `/coupons/:id` | ADMIN | Update coupon |
| DELETE | `/coupons/:id` | ADMIN | Delete coupon |

#### Banner Controller (`bannerController.js`)
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/banners` | Public | Active banners sorted by position |
| POST | `/banners` | ADMIN | Create banner |
| PUT | `/banners/:id` | ADMIN | Update banner |
| DELETE | `/banners/:id` | ADMIN | Delete banner |

#### Flash Sale Controller (`flashSaleController.js`)
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/flash-sales` | Public | Active flash sales with products |
| GET | `/flash-sales/:id` | Public | Flash sale detail |
| POST | `/flash-sales` | ADMIN | Create flash sale event |
| PUT | `/flash-sales/:id` | ADMIN | Update |
| DELETE | `/flash-sales/:id` | ADMIN | Delete |
| POST | `/flash-sales/:id/products` | ADMIN | Add product to flash sale |
| DELETE | `/flash-sales/:id/products/:productId` | ADMIN | Remove product |

#### Refund Controller (`refundController.js`)
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| POST | `/refunds` | Protected | Request refund (reason, description, images) |
| GET | `/refunds` | Protected | User's refund requests |
| GET | `/refunds/admin` | ADMIN | All refund requests |
| PUT | `/refunds/:id/status` | ADMIN | Approve/reject refund |

#### Violation Controller (`violationController.js`)
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| POST | `/violations` | Protected | Report violation (target shop/product, reason, evidence) |
| GET | `/violations` | ADMIN | List violations |
| PUT | `/violations/:id/status` | ADMIN | Resolve/dismiss, apply penalty |

#### Chat Controller (`chatController.js`)
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| POST | `/chat/conversations` | Protected | Create/get conversation (user+partner) |
| GET | `/chat/conversations` | Protected | User's or partner's conversations |
| GET | `/chat/conversations/:id/messages` | Protected | Messages with pagination |
| POST | `/chat/conversations/:id/messages` | Protected | Send message (content, images) |
| POST | `/chat/ai` | Protected | AI chat (RAG) - proxies to ML service |
| GET | `/chat/conversations/unread-count` | Protected | Unread message count |

#### Dashboard Controller (`dashboardController.js`)
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/dashboard/stats` | ADMIN | Total users, products, partners, categories |
| GET | `/dashboard/revenue` | ADMIN | Monthly revenue + order stats |
| GET | `/dashboard/recent-orders` | ADMIN | Recent orders (limit 10) |

#### Cluster Controller (`clusterController.js`)
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/clusters` | ADMIN | List clusters with rules |
| GET | `/clusters/stats` | ADMIN | Cluster distribution stats |
| GET | `/clusters/:id` | ADMIN | Cluster detail with users |
| POST | `/clusters` | ADMIN | Create cluster |
| PUT | `/clusters/:id` | ADMIN | Update cluster |
| DELETE | `/clusters/:id` | ADMIN | Delete cluster |
| POST | `/clusters/run` | ADMIN | Run clustering (proxies to ML service) |

#### Recommendation Controller (`recommendationController.js`)
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/recommendations/personalized` | Protected | Personalized based on user's cluster |
| GET | `/recommendations/trending` | Public | Trending products (Redis cache) |
| GET | `/recommendations/similar/:productId` | Public | Similar products (same category) |
| GET | `/recommendations/cluster/:clusterId` | ADMIN | Cluster-based recommendations |

#### Notification Controller (`notificationController.js`)
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/notifications` | ADMIN | List notifications (poll-based, latest first) |
| PUT | `/notifications/:id/read` | ADMIN | Mark as read |
| PUT | `/notifications/read-all` | ADMIN | Mark all as read |

#### Settings Controller (`settingsController.js`)
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/settings` | Public | Get all settings (key-value pairs) |
| PUT | `/settings/:key` | ADMIN | Update a setting |

#### ML Controller (`mlController.js`)
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/ml/health` | Public | ML service health check |
| POST | `/ml/session/recommend` | Public | Session-based recommendations (auto-trains on first call) |
| POST | `/ml/session/train` | ADMIN | Train session model from all product views |
| POST | `/ml/cf/train` | ADMIN | Train CF models from order data |
| POST | `/ml/explain` | ADMIN | Explain user's recommendations |
| POST | `/ml/evaluate` | ADMIN | Evaluate models offline |
| POST | `/ml/abtest/log` | Protected | Log A/B test interaction |
| POST | `/ml/abtest/compare` | ADMIN | Compare A/B test groups |
| GET | `/ml/abtest/report` | ADMIN | A/B test report |
| POST | `/ml/abtest/reset` | ADMIN | Reset A/B test data |

#### Audit Controller (`auditController.js`)
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/audit` | ADMIN | List audit logs with filters (action, entity, userId, date range) |
| POST | `/audit` | ADMIN | Create audit log entry |

#### Payment Controller (`paymentController.js`)

**VNPay:**
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| POST | `/payments/vnpay/create` | Protected | Create VNPay payment URL |
| GET | `/payments/vnpay/return` | Public | VNPay return URL callback |
| GET | `/payments/vnpay/ipn` | Public | VNPay IPN notification |

**MoMo:**
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| POST | `/payments/momo/create` | Protected | Create MoMo payment |
| POST | `/payments/momo/return` | Public | MoMo return URL callback |
| POST | `/payments/momo/ipn` | Public | MoMo IPN notification |

### 4.5 Services

#### ML Service Client (`mlService.js`)

Proxies requests from Node.js backend to Python FastAPI ML service:

```js
callML(endpoint, method, body) → fetch to ML_SERVICE_URL + endpoint
```

- **Timeout:** 180 seconds (CF training + evaluation requires >60s)
- **Fallback:** Returns `{ success: false, error }` on failure
- **All ML calls go through this proxy**

| Function | Description |
|----------|-------------|
| `checkHealth()` | Health check |
| `getServiceInfo()` | Get models info |
| `getCFRecommendations(orders, products, userId, topN)` | CF recs for user |
| `getSimilarProductsML(productId, orders, products, topN)` | Similar products |
| `getClusterProfiles()` | Cluster profiles |
| `getClusterStats()` | Cluster stats |
| `runClustering(orders)` | Run K-Means clustering |

#### MoMo Payment Service (`momoService.js`)

Integration with MoMo API v2 (Capture Wallet):

| Function | Description |
|----------|-------------|
| `createPayment({orderId, amount, orderInfo})` | Create payment, returns `{payUrl, qrCodeUrl, deeplink}` |
| `verifyReturn(momoParams)` | Verify HMAC-SHA256 signature from callback |
| `processIPN(momoParams)` | Process Instant Payment Notification |

**Signature Algorithm:** HMAC-SHA256 on concatenated parameters in specific order.

#### VNPay Payment Service (`vnpayService.js`)

Integration with VNPay sandbox API:

| Function | Description |
|----------|-------------|
| `createPaymentUrl({orderId, amount, orderInfo, ipAddr})` | Build signed payment URL |
| `verifyReturn(vnpParams)` | Verify HMAC-SHA512 signature from callback |
| `processIPN(vnpParams)` | Process IPN, returns `{RspCode, Message}` |

**Signature Algorithm:** HMAC-SHA512 on sorted query string (alphabetical keys).

### 4.6 Config & Utilities

#### Database (`config/database.js`)
- PrismaClient singleton with error/warn logging
- `connectDatabase()` / `disconnectDatabase()` for lifecycle

#### Redis (`config/redis.js`)
- ioredis singleton with retry strategy (3 retries)
- `cacheSet(key, value, ttlSeconds=3600)` - Set JSON cache
- `cacheGet(key)` - Get parsed JSON cache
- `cacheDel(key)` - Delete cache key

#### Logger (`config/logger.js`)
- Winston logger with file + console transports
- Log files: `logs/error.log`, `logs/combined.log`
- Max size: 5MB per file, max 5 files
- Console output in non-production

#### Error Handler (`middleware/errorHandler.js`)
Maps error types to Vietnamese messages:
| Error | Status | Message |
|-------|:------:|---------|
| Prisma P2002 (unique) | 409 | Dữ liệu đã tồn tại |
| Prisma P2025 (not found) | 404 | Không tìm thấy dữ liệu |
| Prisma P2003 (FK) | 400 | Dữ liệu tham chiếu không hợp lệ |
| JsonWebTokenError | 401 | Token không hợp lệ |
| TokenExpiredError | 401 | Token đã hết hạn |
| ValidationError | 400 | Error message |
| Generic 500 | 500 | Internal Server Error |

#### Utilities
- `AppError.js`: Custom error class with `statusCode`, `status`, `isOperational`
- `asyncHandler.js`: Wraps async route handlers to catch errors

---

## 5. ML Service

### 5.1 Overview

**File:** `backend/ml/clustering/api.py`

The ML Service is a Python FastAPI application running on port 8000. It provides 5 model groups:

1. **Clustering** - RFM Analysis + K-Means
2. **Collaborative Filtering** - 4 models (Item-Item, User-User, ALS, Hybrid)
3. **Session-Based** - Co-occurrence + Sequence Prediction
4. **Evaluation** - Offline metrics computation
5. **A/B Testing** - Statistical comparison framework
6. **RAG Chat AI** - ChromaDB + Ollama

### 5.2 Clustering Engine

**Files:**
- `backend/ml/clustering/clustering_service.py`

**Algorithm: RFM (Recency, Frequency, Monetary) + K-Means**

1. **RFM Calculation:**
   - Recency: Days since last purchase
   - Frequency: Total order count
   - Monetary: Total spend

2. **K-Means Clustering:**
   - Features: Standardized RFM values
   - Default: 4 clusters (k=4)
   - Output: Cluster assignments + centroids

3. **Cluster Profiles** (default 4):
   - **Cluster 0 (VIP)**: High value, high frequency, recent
   - **Cluster 1 (Loyal)**: Medium-high all metrics
   - **Cluster 2 (At Risk)**: Low recency, medium frequency
   - **Cluster 3 (New/Low)**: Low all metrics

**Endpoints:**
- `POST /cluster/run` - Execute clustering
- `POST /cluster/recommend` - Recommend products for cluster
- `GET /cluster/profiles` - Get cluster profile descriptions
- `GET /cluster/stats` - Get cluster statistics

### 5.3 Collaborative Filtering

**File:** `backend/ml/collaborative/collaborative_filtering.py`

Four models implemented:

| Model | Technique | Description |
|-------|-----------|-------------|
| **Item-Item CF** | Cosine Similarity | Find similar items based on co-purchase patterns |
| **User-User CF** | User Similarity | Find similar users, recommend their items |
| **ALS Matrix Factorization** | Alternating Least Squares | Matrix factorization for implicit feedback |
| **Hybrid** | Weighted Ensemble | Weighted combination: item=0.3, user=0.3, als=0.4 |

**Implementation Details:**
- User-Product matrix built from order data
- Sparse matrix representation (scipy sparse)
- Cosine similarity for Item-Item and User-User
- ALS: Regularized matrix factorization with implicit feedback
- Hybrid: Weighted average of all model scores

**Endpoints:**
- `POST /cf/train` - Train all 4 models
- `POST /cf/recommend` - Recommend for user (choose strategy)
- `POST /cf/similar` - Similar products via Item-Item CF
- `POST /cf/recommend/hybrid` - Hybrid recommendation
- `POST /cf/explain` - Explain recommendations with model weights

### 5.4 Session-Based Recommender

**File:** `backend/ml/session/session_recommender.py`

Two strategies:

| Strategy | Technique |
|----------|-----------|
| **Co-occurrence** | Product co-occurrence matrix (which products are viewed together) |
| **Sequence** | Markov chain - predict next product based on last viewed |

**Session Building:**
- Groups product views by user_id
- Sorts by timestamp
- Each user session = sequence of product IDs

**Endpoints:**
- `POST /session/train` - Train from view logs
- `POST /session/recommend` - Recommend based on session items

**Recommendation Flow:**
1. Get current session items
2. Co-occurrence: Find products most frequently co-occurring with session items
3. Sequence: Find products that follow session items in historical sessions
4. Hybrid: Weighted combination (co-occurrence=0.6, sequence=0.4)
5. Exclude items already in session

### 5.5 Evaluation & A/B Testing

**File:** `backend/ml/evaluation/metrics.py`

#### Offline Evaluation Metrics

| Metric | Description |
|--------|-------------|
| Precision@K | Proportion of recommended items that are relevant |
| Recall@K | Proportion of relevant items that are recommended |
| F1 Score | Harmonic mean of precision and recall |
| Hit Rate | Proportion of users with at least 1 relevant recommendation |
| MAP (Mean Average Precision) | Average precision across all users |
| NDCG (Normalized Discounted Cumulative Gain) | Ranking quality metric |
| Coverage | Proportion of products that can be recommended |
| Popularity Bias | How much recommendations favor popular items |

**Methodology:**
- Train/test split by time (80/20 default)
- Train on historical data, test on future interactions
- For each test user: recommend top-K, compare with actual purchases

#### A/B Testing Framework

| Feature | Description |
|---------|-------------|
| Groups | Control vs Treatment |
| Actions | impression, click, add_to_cart, purchase |
| Metrics | Conversion rate, revenue, click-through rate |
| Statistical Test | Chi-squared test for conversion comparison |

**Endpoints:**
- `POST /evaluate/offline` - Run offline evaluation
- `POST /abtest/log` - Log user interaction
- `POST /abtest/log_batch` - Batch log interactions
- `GET /abtest/report` - Get summary report
- `POST /abtest/compare` - Compare two groups
- `POST /abtest/reset` - Reset all data

### 5.6 RAG Chat AI

**Files:**
- `backend/ml/rag/knowledge_base.py` - ChromaDB vector store
- `backend/ml/rag/rag_service.py` - RAG pipeline + Ollama integration
- `backend/ml/rag/build_kb.py` - Knowledge base builder

#### Knowledge Base Sources

| Source | Type | Content |
|--------|------|---------|
| Products | PostgreSQL | Product names, descriptions (vectorized by sentence-transformers) |
| Categories | PostgreSQL | Category names, descriptions |
| Policies | Static | Shipping, returns, warranty, payment policies |
| FAQ | Static | Order tracking, cancellation, registration, discounts, shop follow, search |
| Guides | Static | Account management, ordering, flash sale guides |

#### RAG Pipeline

```
User Question
    ↓
ChromaDB Similarity Search (sentence-transformers: all-MiniLM-L6-v2)
    ↓
Context Retrieved (top 5 documents)
    ↓
Prompt Construction (context + question)
    ↓
Ollama Generation (llama3.2:3b, temperature 0.3)
    ↓
Fallback (if Ollama unavailable) → Keyword matching + default responses
    ↓
Response (answer + sources)
```

#### Endpoints
- `POST /rag/ask` - Single question
- `POST /rag/chat` - Chat with history
- `POST /rag/build` - Build/rebuild knowledge base
- `GET /rag/status` - KB stats + Ollama connection status

### 5.7 ML Endpoints Summary

| Endpoint | Method | Description | Auth | Avg Time |
|----------|--------|-------------|:----:|:--------:|
| `/` | GET | Health check | Public | 2ms |
| `/health` | GET | Health check | Public | 2ms |
| `/info` | GET | Service info & models | Public | 2ms |
| `/cluster/run` | POST | Run K-Means + RFM | ADMIN | 200ms |
| `/cluster/recommend` | POST | Recommend for cluster | ADMIN | 100ms |
| `/cluster/profiles` | GET | Cluster profiles | Public | 2ms |
| `/cluster/stats` | GET | Cluster stats | Public | 2ms |
| `/cf/train` | POST | Train 4 CF models | ADMIN | 2,000ms |
| `/cf/recommend` | POST | CF recommend for user | Public | 80ms |
| `/cf/similar` | POST | Similar products | Public | 50ms |
| `/cf/recommend/hybrid` | POST | Hybrid recommend | Public | 80ms |
| `/cf/explain` | POST | Explain recommendations | ADMIN | 5,500ms |
| `/session/train` | POST | Train session model | ADMIN | 20ms |
| `/session/recommend` | POST | Session recommend | Public | 80ms |
| `/evaluate/offline` | POST | Evaluate models | ADMIN | 4,000ms |
| `/abtest/log` | POST | Log interaction | Protected | 10ms |
| `/abtest/log_batch` | POST | Batch log | Protected | 15ms |
| `/abtest/report` | GET | A/B test report | ADMIN | 6ms |
| `/abtest/compare` | POST | Compare groups | ADMIN | 10ms |
| `/abtest/reset` | POST | Reset A/B data | ADMIN | 5ms |
| `/rag/ask` | POST | Ask AI question | Public | 3,000ms |
| `/rag/chat` | POST | Chat with AI | Public | 3,000ms |
| `/rag/build` | POST | Build KB | ADMIN | varies |
| `/rag/status` | GET | KB status | Public | 100ms |

---

## 6. Database Schema

### 6.1 Enum Types

```prisma
enum UserRole { CUSTOMER | ADMIN | PARTNER }
enum OrderStatus { PENDING | CONFIRMED | SHIPPING | DELIVERED | CANCELLED }
enum PaymentMethod { COD | BANKING | MOMO | VNPAY }
enum PaymentStatus { UNPAID | PAID | REFUNDED }
```

### 6.2 Core Models

#### User
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| email | String (unique) | Login email |
| password | String | bcrypt hashed |
| name | String | Display name |
| phone | String? | Contact |
| avatar | String? | Base64 or URL |
| address | String? | Default address |
| isActive | Boolean | Account status |
| role | UserRole (enum) | CUSTOMER, ADMIN, PARTNER |
| refreshToken | String? | JWT refresh token |
| clusterId | String? | FK → Cluster |
| totalSpent | Float | RFM: Monetary |
| orderCount | Int | RFM: Frequency |
| lastPurchaseAt | DateTime? | RFM: Recency |
| storeName | String? | Partner: shop name |
| storeDescription | String? | Partner: shop desc |
| taxCode | String? | Partner: tax ID |
| businessAddress | String? | Partner: business address |
| isApproved | Boolean | Partner: admin approval |
| approvedAt | DateTime? | Partner: approval date |
| rejectedReason | String? | Partner: rejection reason |

**Relations:** orders, reviews, cartItems, wishlistItems, cluster, recommendations, products (partner), couponsCreated, couponUsages, savedCoupons, addresses, refunds, auditLogs, following, followers, conversationsAsUser, conversationsAsPartner, sentMessages

#### Category
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| name | String (unique) | Category name |
| slug | String (unique) | URL-friendly |
| description | String? | Description |
| image | String? | Category image |
| isActive | Boolean | Active status |

**Relations:** products

#### Product
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| name | String | Product name |
| slug | String (unique) | URL-friendly |
| description | String? | Markdown description |
| price | Float | Current price |
| discountPrice | Float? | Discounted price |
| images | String[] | Array of image URLs |
| stock | Int | Inventory count |
| soldCount | Int | Units sold |
| rating | Float | Average rating |
| reviewCount | Int | Total reviews |
| isActive | Boolean | Soft delete flag |
| categoryId | String | FK → Category |
| partnerId | String? | FK → User (partner who sells) |

**Relations:** category, partner, orderItems, reviews, cartItems, wishlistItems, recommendations, flashSaleProducts, variants, productViews

### 6.3 E-commerce Models

#### Order
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| userId | String | FK → User |
| totalAmount | Float | Subtotal before discounts |
| shippingFee | Float | Default 0 |
| discountAmount | Float | Coupon discount |
| finalAmount | Float | Total to pay |
| status | OrderStatus | PENDING → CONFIRMED → SHIPPING → DELIVERED |
| paymentMethod | PaymentMethod | COD, BANKING, MOMO, VNPAY |
| paymentStatus | PaymentStatus | UNPAID, PAID, REFUNDED |
| shippingAddress | String | Full address |
| phone | String | Contact phone |
| note | String? | Order note |
| couponId | String? | FK → Coupon |
| transactionId | String? | Payment gateway ref |
| transactionNo | String? | Payment reference |
| paidAt | DateTime? | Payment timestamp |

**Relations:** user, orderItems, coupon, couponUsages, refunds, conversations

#### OrderItem
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| orderId | String | FK → Order |
| productId | String | FK → Product |
| quantity | Int | Count |
| price | Float | Unit price at purchase |

#### CartItem
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| userId | String | FK → User |
| productId | String | FK → Product |
| quantity | Int | Default 1 |
| **Unique** | [userId, productId] | One cart item per product |

#### Review
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| userId | String | FK → User |
| productId | String | FK → Product |
| rating | Int | 1-5 |
| comment | String? | Review text |
| reply | String? | Partner/admin reply |
| repliedAt | DateTime? | Reply timestamp |
| **Unique** | [userId, productId] | One review per user per product |

#### Address
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| userId | String | FK → User |
| label | String? | Home, Office, etc. |
| fullName | String? | Recipient name |
| phone | String? | Recipient phone |
| street | String | Street address |
| ward | String? | Ward |
| district | String? | District |
| city | String | City |
| isDefault | Boolean | Default shipping address |

#### Refund
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| orderId | String | FK → Order |
| userId | String | FK → User |
| reason | String | Reason |
| description | String? | Details |
| images | String[] | Evidence |
| amount | Float | Refund amount |
| status | String | PENDING, APPROVED, REJECTED, REFUNDED |
| adminReply | String? | Admin response |
| resolvedAt | DateTime? | Resolution time |

#### Coupon
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| code | String (unique) | Coupon code |
| type | String | PERCENTAGE, FIXED |
| value | Float | Discount value |
| minOrderValue | Float? | Minimum order |
| maxDiscount | Float? | Max for % type |
| usageLimit | Int? | Total usage cap |
| usedCount | Int | Current usage |
| perUserLimit | Int | Default 1 |
| startsAt | DateTime? | Start date |
| expiresAt | DateTime? | Expiry date |
| isActive | Boolean | Active status |
| createdById | String | FK → User (creator) |

#### CouponUsage
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| couponId | String | FK → Coupon |
| userId | String | FK → User |
| orderId | String? | FK → Order |
| **Unique** | [couponId, userId, orderId] | One usage per combo |

#### SavedCoupon
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| userId | String | FK → User |
| couponId | String | FK → Coupon |
| **Unique** | [userId, couponId] | One save per user |

#### Violation
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| reportedById | String | Reporter user ID |
| targetId | String | Shop or product ID |
| targetType | String | SHOP, PRODUCT |
| reason | String | Violation reason |
| description | String? | Details |
| evidence | String[] | Evidence images |
| status | String | PENDING, INVESTIGATING, RESOLVED, DISMISSED |
| penalty | String? | WARNING, SUSPEND, BAN |

#### FollowedShop
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| userId | String | FK → User (follower) |
| partnerId | String | FK → User (shop) |
| **Unique** | [userId, partnerId] | One follow per pair |

#### Banner
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| title | String? | Banner title |
| subtitle | String? | Subtitle |
| imageUrl | String | Banner image |
| linkUrl | String? | Click link |
| linkText | String? | CTA text |
| position | Int | Display order |
| isActive | Boolean | Active status |
| bgColor | String? | Background color |

#### FlashSale
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| title | String | Event title |
| description | String? | Description |
| bannerUrl | String? | Banner image |
| startTime | DateTime | Sale start |
| endTime | DateTime | Sale end |
| isActive | Boolean | Active status |

#### FlashSaleProduct
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| flashSaleId | String | FK → FlashSale |
| productId | String | FK → Product |
| salePrice | Float | Discounted price |
| maxQuantity | Int | Stock limit |
| soldCount | Int | Units sold |
| **Unique** | [flashSaleId, productId] | One entry per sale |

#### Conversation & Message (Chat)
**Conversation:**
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| userId | String | FK → User (customer) |
| partnerId | String | FK → User (shop) |
| orderId | String? | FK → Order |
| **Unique** | [userId, partnerId] | One conversation per pair |

**Message:**
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| conversationId | String | FK → Conversation |
| senderId | String | FK → User |
| content | String | Message text |
| images | String[] | Attached images |
| isRead | Boolean | Read status |

### 6.4 AI/ML Models

#### ProductView (Session-based)
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| userId | String | Viewer |
| productId | String | FK → Product |
| createdAt | DateTime | View timestamp |
| **Indexed** | [userId], [productId], [createdAt] | ML query performance |

#### Cluster
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| name | String | Cluster name |
| description | String? | Description |
| color | String | Display color (#6366f1 default) |

#### ClusterRule
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| clusterId | String | FK → Cluster |
| metricName | String | recency, frequency, monetary |
| minValue | Float? | Min threshold |
| maxValue | Float? | Max threshold |
| priority | Int | Rule priority |

#### Recommendation
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| userId | String? | FK → User |
| clusterId | String? | FK → Cluster |
| productId | String | FK → Product |
| score | Float | Recommendation score |
| reason | String? | based_on_cluster, based_on_purchase, similar_product |
| isActive | Boolean | Active status |

#### ProductVariant
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| productId | String | FK → Product |
| name | String | Variant name (e.g., "Red", "XL", "32GB") |
| type | String | color, size, storage |
| price | Float? | Override price |
| stock | Int | Inventory |
| image | String? | Variant image |
| sku | String? | SKU code |
| **Unique** | [productId, name, type] | One variant per combo |

### 6.5 Utility Models

#### Notification
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| type | String | ORDER, SYSTEM |
| title | String | Notification title |
| message | String? | Body |
| referenceId | String? | Related entity ID |
| isRead | Boolean | Read status |

#### AuditLog
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| userId | String | FK → User (actor) |
| action | String | CREATE, UPDATE, DELETE, APPROVE, BAN |
| entity | String | USER, PRODUCT, ORDER, COUPON |
| entityId | String? | Target entity ID |
| details | String? | JSON with extra info |
| ipAddress | String? | Actor IP |

#### SiteSetting
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| key | String (unique) | Setting key |
| value | String | JSON string value |

---

## 7. Frontend Web

### 7.1 Entry Point & Routing

**Files:**
- `frontend/src/main.jsx` - App bootstrap (Provider, BrowserRouter, Toaster)
- `frontend/src/App.jsx` - Route definitions

**Main.jsx Setup:**
```
ReactDOM.createRoot → 
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
```

**Fonts (Geist):**
- Geist Sans (300, 400, 500, 600, 700)
- Geist Mono (400, 500, 700)

**Route Structure:**

| Route | Layout | Auth | Lazy |
|-------|--------|:----:|:----:|
| `/` | MainLayout | Public | No |
| `/products` | MainLayout | Public | No |
| `/products/:slug` | MainLayout | Public | No |
| `/search` | MainLayout | Public | No |
| `/cart` | MainLayout | Public | No |
| `/flash-sales` | MainLayout | Public | No |
| `/payment/result` | MainLayout | Public | No |
| `/shop/:partnerId` | MainLayout | Public | No |
| `/checkout` | MainLayout | Protected | No |
| `/orders` | MainLayout | Protected | No |
| `/orders/:id` | MainLayout | Protected | No |
| `/profile` | MainLayout | Protected | No |
| `/addresses` | MainLayout | Protected | No |
| `/chat` | MainLayout | Protected | No |
| `/followed-shops` | MainLayout | Protected | No |
| `/coupons` | MainLayout | Protected | No |
| `/login` | None | Public | No |
| `/register` | None | Public | No |
| `/partner/*` | PartnerLayout | PARTNER/ADMIN | ✅ Yes (7 pages) |
| `/admin/*` | AdminLayout | ADMIN | ✅ Yes (17 pages) |

### 7.2 State Management

**Store:** `frontend/src/store/index.js`

| Slice | Key Features |
|-------|--------------|
| **authSlice** | login, register, logout, fetchCurrentUser, updateProfile, loadStoredAuth |
| **cartSlice** | fetchCart, addToCart, updateCartItem, removeFromCart, clearCart |
| **productSlice** | fetchProducts, fetchProductDetail, fetchFeaturedProducts |
| **uiSlice** | sidebarOpen, theme, toasts |
| **settingsSlice** | fetchSettings, site settings |
| **notificationSlice** | fetchNotifications, readNotification, readAllNotifications (poll 30s) |

**API Service:** `frontend/src/services/api.js`
- Axios instance with `/api` base URL (or VITE_API_URL)
- Request interceptor: attaches JWT from localStorage
- Response interceptor: auto-refresh on 401, retries original request

### 7.3 Common Components

| Component | File | Description |
|-----------|------|-------------|
| **Navbar** | `Layout/Navbar.jsx` | Top navigation with search, cart badge, user menu |
| **Footer** | `Layout/Footer.jsx` | Site footer with links |
| **MainLayout** | `Layout/MainLayout.jsx` | Navbar + Footer wrapper |
| **AdminLayout** | `Layout/AdminLayout.jsx` | Collapsible sidebar + header for admin |
| **PartnerLayout** | `Layout/PartnerLayout.jsx` | Sidebar for partner (max-w-7xl) |
| **ProductCard** | `common/ProductCard.jsx` | Product display card with rating, price, image |
| **LoadingSpinner** | `common/LoadingSpinner.jsx` | Animated spinner |
| **BannerSlider** | `common/BannerSlider.jsx` | Auto-rotating banner carousel |
| **Pagination** | `common/Pagination.jsx` | Page navigation (10 items/page) |
| **ChatFloating** | `common/ChatFloating.jsx` | Floating chat widget (Shop tab + AI tab) |
| **LazyImage** | `common/LazyImage.jsx` | IntersectionObserver + blur-up + skeleton |
| **LazySection** | `common/LazySection.jsx` | Lazy-loaded section wrapper |

### 7.4 Page Components

| Page | Path | Description |
|------|------|-------------|
| **HomePage** | `/` | Featured products, banner slider, categories, flash sales |
| **LoginPage** | `/login` | Email/password login form |
| **RegisterPage** | `/register` | Customer registration form |
| **ProductListPage** | `/products` | Grid with filters (category, price, rating), sort, search |
| **ProductDetailPage** | `/products/:slug` | Full detail with images, variants, reviews, related products |
| **CartPage** | `/cart` | Cart items with quantity controls, promo code, totals |
| **CheckoutPage** | `/checkout` | Address selection, payment method, coupon, order summary |
| **OrdersPage** | `/orders` | User's order history with status filter |
| **OrderDetailPage** | `/orders/:id` | Order detail with items, tracking, actions |
| **ProfilePage** | `/profile` | User info, avatar upload, stats |
| **SearchPage** | `/search` | Search results with filters |
| **AddressManagementPage** | `/addresses` | CRUD shipping addresses |
| **UserChatPage** | `/chat` | Chat with shop partners |
| **FollowedShopsPage** | `/followed-shops` | List of followed shops |
| **ShopPage** | `/shop/:partnerId` | Partner shop profile + products |
| **FlashSalePage** | `/flash-sales` | Active flash sales with countdown |
| **CouponsPage (User)** | `/coupons` | All/Saved coupons with copy, filter, expiry countdown |
| **PaymentResultPage** | `/payment/result` | VNPay/MoMo callback result |

### 7.5 Admin Pages (17 Modules)

All admin pages are lazy-loaded with `React.lazy()` + `<Suspense>`:

| Page | Route | Description |
|------|-------|-------------|
| **DashboardPage** | `/admin` | Stats cards (users, products, partners), revenue chart, recent orders |
| **ProductsManagePage** | `/admin/products` | CRUD products, grid/list view, search, pagination |
| **CategoriesManagePage** | `/admin/categories` | CRUD categories |
| **OrdersManagePage** | `/admin/orders` | View all orders (partner handles own) |
| **UsersManagePage** | `/admin/users` | User list with role filter, edit, deactivate |
| **PartnersManagePage** | `/admin/partners` | Partner list, approve/reject |
| **CouponsPage** | `/admin/coupons` | CRUD coupons, usage tracking |
| **BannerManagementPage** | `/admin/banners` | Homepage banner management |
| **FlashSaleManagementPage** | `/admin/flash-sales` | Flash sale events with products |
| **RefundManagementPage** | `/admin/refunds` | Refund requests management |
| **ViolationManagementPage** | `/admin/violations` | Violation reports, penalties |
| **AuditLogPage** | `/admin/audit` | Audit log viewer with filters |
| **ClustersPage** | `/admin/clusters` | Customer clusters, rules, run clustering |
| **RecommendationsPage** | `/admin/recommendations` | Train CF, session, evaluate, explain |
| **ABTestingPage** | `/admin/abtest` | A/B test control, comparison, report |
| **MLTestPage** | `/admin/ml-test` | Auto-test 13 ML endpoints, results |
| **SettingsPage** | `/admin/settings` | System configuration |

### 7.6 Partner Pages (7 Modules)

All partner pages are lazy-loaded:

| Page | Route | Description |
|------|-------|-------------|
| **PartnerDashboardPage** | `/partner` | Stats, revenue chart, top products |
| **PartnerProductsPage** | `/partner/products` | CRUD own products |
| **PartnerOrdersPage** | `/partner/orders` | Orders with own products, status updates |
| **PartnerReviewsPage** | `/partner/reviews` | Reviews for own products, reply |
| **PartnerCouponsPage** | `/partner/coupons` | Coupons for own shop |
| **PartnerChatPage** | `/partner/chat` | Customer conversations |
| **PartnerProfilePage** | `/partner/profile` | Shop info, branding |

### 7.7 Performance Optimizations

#### Code Splitting (Route-based)
```jsx
// 17 admin pages + 7 partner pages lazy loaded
const DashboardPage = React.lazy(() => import('./pages/admin/DashboardPage'));
// ...
<Suspense fallback={<RouteFallback />}>
  <DashboardPage />
</Suspense>
```

#### Vite Chunk Optimization (`vite.config.js`)
```js
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-charts': ['recharts', 'chart.js'],
        'vendor-icons': ['react-icons'],
      },
    },
  },
  chunkSizeWarningLimit: 600,
}
```

#### LazyImage Component
- IntersectionObserver with rootMargin: 200px
- Skeleton shimmer placeholder
- Blur-up transition (blur-md → blur-0, scale-105 → scale-100)
- Loading spinner indicator
- SVG placeholder fallback

#### Tailwind CSS Custom Theme (`tailwind.config.js`)
- Primary colors 50-900 (blue)
- Surface, ink, premium shadow utilities
- Custom animations (fade-in, scale-in, shimmer, slide-up)

---

## 8. Mobile App

### 8.1 Entry Point

**File:** `mobile/App.js`

```
<Provider store={store}>
  <SafeAreaProvider>
    <NavigationContainer>
      <AppContent />
    </NavigationContainer>
  </SafeAreaProvider>
</Provider>
```

**AppContent:**
- Dispatches `fetchSettings()` and `loadStoredAuth()` on mount
- Renders `RootNavigator` + `ChatFloating` (if authenticated) + `Toast`

### 8.2 Navigation Structure

**File:** `mobile/src/navigation/RootNavigator.js`

Uses React Navigation v7 with:

#### Auth Stack (unauthenticated)
```
LoginScreen, RegisterScreen
```

#### Customer Main Tabs (Bottom Tab Navigator)
| Tab | Screen | Label |
|-----|--------|-------|
| 🏠 Home | HomeScreen | Trang chủ |
| 🛍️ Products | ProductListScreen | Sản phẩm |
| 🛒 Cart | CartScreen | Giỏ hàng |
| 👤 Profile | ProfileScreen | Cá nhân |

#### Customer Stack Screens (pushed on top of tabs)
| Screen | Title |
|--------|-------|
| ProductListScreen | Sản phẩm |
| ProductDetailScreen | Chi tiết |
| SearchScreen | Tìm kiếm |
| OrdersScreen | Đơn hàng |
| OrderDetailScreen | Chi tiết đơn hàng |
| FlashSaleScreen | Flash Sale |
| CheckoutScreen | Thanh toán |
| ShopScreen | Cửa hàng |
| CouponsScreen | Mã giảm giá |
| FollowedShopsScreen | Cửa hàng yêu thích |
| AddressManagementScreen | Địa chỉ |
| UserChatScreen | Tin nhắn |
| PaymentResultScreen | (no header) |

#### Admin Stack
| Screen | Title |
|--------|-------|
| AdminDashboardScreen | Quản trị |
| AdminProductsScreen | Quản lý sản phẩm |
| AdminUsersScreen | Người dùng |
| AdminOrdersScreen | Đơn hàng |
| AdminCategoriesScreen | Danh mục |
| AdminBannersScreen | Banner |
| AdminFlashSalesScreen | Flash Sale |
| AdminCouponsScreen | Mã giảm giá |
| AdminPartnersScreen | Đối tác |
| AdminRefundsScreen | Hoàn tiền |
| AdminViolationsScreen | Vi phạm |
| AdminRecommendationsScreen | Gợi ý |
| AdminClustersScreen | Phân cụm |
| AdminMLTestScreen | Kiểm tra ML |
| AdminABTestingScreen | A/B Test |
| AdminAuditLogScreen | Audit Log |
| AdminSettingsScreen | Cài đặt |

#### Partner Stack
| Screen | Title |
|--------|-------|
| PartnerDashboardScreen | Bảng điều khiển |
| PartnerProductsScreen | Sản phẩm |
| PartnerOrdersScreen | Đơn hàng |
| PartnerReviewsScreen | Đánh giá |
| PartnerCouponsScreen | Mã giảm giá |
| PartnerChatScreen | Tin nhắn |
| PartnerProfileScreen | Hồ sơ |

### 8.3 State Management (Mobile)

**Store:** `mobile/src/store/index.js`

Same slices as frontend: `authSlice`, `cartSlice`, `productSlice`, `uiSlice`, `settingsSlice`, `notificationSlice`

**Navigation Logic:**
- Not authenticated → `AuthStack`
- Authenticated → `MainTabs` + stack screens
- If user role is PARTNER → additional partner stack

---

## 9. Payment Integration

> **Note:** Payment gateway credentials (VNP_TMN_CODE, MOMO_PARTNER_CODE, etc.) are NOT included in the repository. You must register for sandbox/test accounts to use VNPay or MoMo payments.

### 9.1 VNPay

**Service:** `backend/src/services/vnpayService.js`

**Sandbox URL:** `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`

**Flow:**
1. Frontend requests payment → backend creates URL with HMAC-SHA512 signature
2. User redirected to VNPay gateway
3. After payment → VNPay calls return URL (user browser) + IPN (server-to-server)
4. Backend verifies signature, updates order status

**Signature:**
- Algorithm: HMAC-SHA512
- Data: All vnp_ params sorted alphabetically, querystring encoded
- Amount multiplied by 100 (VND → VNPay format)
- 15-minute expiry from creation

**Verification:**
- Re-compute signature from received params (excluding vnp_SecureHash)
- Compare with received signature
- On success → update paymentStatus to PAID, set paidAt

### 9.2 MoMo

**Service:** `backend/src/services/momoService.js`

**API URL (test):** `https://test-payment.momo.vn/v2/gateway/api/create`

**Flow:**
1. Frontend requests payment → backend creates request with HMAC-SHA256 signature
2. MoMo returns `{payUrl, qrCodeUrl, deeplink}`
3. User redirected to MoMo or shown QR code
4. After payment → MoMo calls return URL + IPN
5. Backend verifies signature, updates order status

**Signature:**
- Algorithm: HMAC-SHA256
- Data: 10 parameters concatenated with `&` in specific order
- `resultCode === 0` means success

**Callback Verification:**
- Re-compute signature from 13 parameters
- Compare with received signature
- On success → update order paymentStatus

---

## 10. Deployment & Configuration (Reference)

### 10.1 Docker Services

**File:** `docker-compose.yml`

| Service | Image | Port | Depends On |
|---------|-------|:----:|:----------:|
| **postgres** | postgres:15-alpine | 5432 | - |
| **redis** | redis:7-alpine | 6379 | - |
| **backend** | Custom (Node.js) | 5000 | postgres, redis, ml-service |
| **ml-service** | Custom (Python) | 8000 | postgres |
| **frontend** | Custom (Vite) | 3000 | backend |

**Volumes:** postgres_data (persistent DB storage)

**Network:** khoaluan-network (bridge)

### 10.2 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|:--------:|
| `POSTGRES_DB` | Database name | - | ✅ |
| `POSTGRES_USER` | DB user | - | ✅ |
| `POSTGRES_PASSWORD` | DB password | - | ✅ |
| `DATABASE_URL` | PostgreSQL URL | - | ✅ |
| `REDIS_URL` | Redis URL | redis://localhost:6379 | ✅ |
| `JWT_SECRET` | JWT signing secret | - | ✅ |
| `JWT_REFRESH_SECRET` | Refresh token secret | - | ✅ |
| `JWT_EXPIRES_IN` | Access token TTL | 7d | ❌ |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | 30d | ❌ |
| `ML_SERVICE_URL` | Python ML service URL | http://localhost:8000 | ❌ |
| `FRONTEND_URL` | Frontend URL for CORS | - | ❌ |
| `CORS_ORIGIN` | Comma-separated origins | localhost:3000,etc | ❌ |
| `VNP_TMN_CODE` | VNPay merchant code | - | ❌ |
| `VNP_HASH_SECRET` | VNPay secret key | - | ❌ |
| `VNP_URL` | VNPay API URL | sandbox URL | ❌ |
| `MOMO_PARTNER_CODE` | MoMo partner code | - | ❌ |
| `MOMO_ACCESS_KEY` | MoMo access key | - | ❌ |
| `MOMO_SECRET_KEY` | MoMo secret key | - | ❌ |
| `AI_PROVIDER` | AI provider (groq/ollama) | ollama | ❌ |
| `GROQ_API_KEY` | Groq API key (if using Groq) | - | ❌ |
| `OLLAMA_HOST` | Ollama host URL | http://host.docker.internal:11434 | ❌ |
| `VITE_API_URL` | Frontend API base URL | /api (proxy) | ❌ |
| `VITE_ML_API_URL` | Frontend ML API URL | - | ❌ |

### 10.3 Seed Data

The project includes 5 seed scripts run in sequence:

| Script | Purpose | Data Created |
|--------|---------|-------------|
| `seed.js` | Base data | Admin, 8 partners, 15 customers, 10 categories, 99 products, 51 orders, 200 reviews, 22 coupons, clusters |
| `seed-full.js` | Extended data | More products, orders, reviews |
| `seed-new-models.js` | New features | Banners, flash sales, refunds, violations, audit logs, notifications, settings, addresses, conversations |
| `seed-images.js` | Image data | Image URLs for products |
| `seed-ml-test.js` | ML data | 281 product views, orders for ML testing |
| `test-ml-all.js` | Auto-test | Tests all 13 ML endpoints (not seed, just test) |

**Seed Data Summary:**

| Item | Count |
|------|:-----:|
| Users | 24 (1 Admin + 8 Partner + 15 Customer) |
| Categories | 10 |
| Products | 101 (with variants) |
| Orders | 51 (various statuses) |
| Reviews | 200 (with partner replies) |
| Product Views | 281 |
| Recommendations | 30 |
| Coupons | 22 (PERCENTAGE + FIXED) |
| Clusters | 9 (with RFM rules) |
| Notifications | 8 |
| Banners | 6 |
| Flash Sales | 3 |
| Refunds | 5 |
| Violations | 4 |

### 10.4 Running the System

#### Docker (recommended)
```bash
docker-compose up -d
# Wait for seed to complete
docker-compose logs -f backend
# When "✅ Khởi động hoàn tất!" appears, system is ready
```

#### Access Points
| URL | Service |
|-----|---------|
| http://localhost:3000 | Frontend Web |
| http://localhost:5000 | Backend API |
| http://localhost:5000/api/health | Health check |
| http://localhost:8000 | ML Service |
| http://localhost:8000/docs | ML API Swagger |

#### Reseed Database
```bash
docker exec khoaluan-backend sh -c "
  npx prisma db push --force-reset --accept-data-loss &&
  node prisma/seed.js &&
  node prisma/seed-full.js &&
  node prisma/seed-new-models.js &&
  node prisma/seed-ml-test.js
"
```

#### Quick Test
```bash
# Health check
curl http://localhost:5000/api/health

# ML test
docker exec khoaluan-backend sh -c "node prisma/test-ml-all.js"
```

---

## 11. Default Accounts

**Common Password:** `admin123` (Admin), `partner123` (Partner), `customer123` (Customer)

### Admin
| Email | Name |
|-------|------|
| admin@khoaluan.com | Admin KhoaLuan |

### Partners (8)
| Email | Name | Store |
|-------|------|-------|
| partner1@shop.com | Nguyễn Văn Kinh Doanh | Shop Điện Tử ABC |
| partner2@fashion.com | Trần Thị Thời Trang | Fashion House XYZ |
| partner3@new.com | Lê Thị Mới | Cửa hàng mới |
| partner4@sport.com | Phạm Văn Thể Thao | Sports Zone Việt Nam |
| partner5@beauty.com | Trần Thị Đẹp | Beauty House |
| partner6@pet.com | Lê Văn Pet | Pet Mart Việt Nam |
| partner7@furniture.com | Hoàng Thị Nội Thất | Nội Thất Xinh |
| partner8@mebebe.com | Nguyễn Văn Bé | Mẹ & Bé Shop |

### Customers (15)
| Email | Name |
|-------|------|
| customer1@test.com ~ customer15@test.com | Nguyễn Văn A ~ Trịnh Văn R |

---

## 12. ML Test Results

**Latest:** 13/13 passed (100%) — ~19 seconds total

| # | Test | Status | Time |
|:-:|------|:------:|:----:|
| 1 | ML Health | ✅ | 2ms |
| 2 | ML Engine Info | ✅ | 2ms |
| 3 | Train Session (282 views) | ✅ | 22ms |
| 4 | Train CF (98 orders, 101 products) | ✅ | 2,045ms |
| 5 | Evaluate Models | ✅ | 4,154ms |
| 6 | Run Clustering (4 clusters) | ✅ | 203ms |
| 7 | Trending Products | ✅ | 2ms |
| 8 | Session Recommend | ✅ | 83ms |
| 9 | Explain Recommendations | ✅ | 5,533ms |
| 10 | A/B Test Log | ✅ | 16ms |
| 11 | A/B Test Log 2 | ✅ | 15ms |
| 12 | A/B Test Compare | ✅ | 9ms |
| 13 | A/B Test Report | ✅ | 6ms |

**Metrics (sample):**
| Metric | Value |
|--------|:-----:|
| Precision | 0.014 |
| Recall | 0.036 |
| F1 Score | 0.020 |
| Hit Rate | 0.143 |
| MAP Score | 0.007 |
| NDCG Score | 0.022 |
| Coverage | 0.465 |
| Popularity Bias | 0.157 |

---

## 13. API Response Format

All API endpoints follow a consistent response envelope:

### Success Response
```json
{
  "success": true,
  "data": { ... },       // Response payload (object or array)
  "pagination": {         // Only for paginated endpoints
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "status": "fail",      // "fail" for 4xx, "error" for 5xx
  "message": "Vui lòng đăng nhập để tiếp tục",
  "stack": "..."         // Only in development mode
}
```

### Pagination Convention
All list endpoints use 10 items per page by default with page/limit pagination:
- `?page=1&limit=10` (default)
- Response includes `pagination` object with `page`, `limit`, `total`, `pages`

---

## 14. Additional Utility Files

### Rate Limiter (`middleware/rateLimiter.js`)
- Uses `express-rate-limit` package
- Default: 100 requests per 15 minutes per IP
- Applied globally to all `/api` routes

### Image Preloader (`frontend/src/utils/useImagePreloader.js`)
- React hook for preloading images
- Manages loading states and IntersectionObserver callbacks
- Used by `LazyImage` component for smooth image transitions

### Prisma Utilities
| File | Purpose |
|------|---------|
| `prisma/debug_views.js` | Debug script to inspect product views data for ML |
| `prisma/test_session_recommend.js` | Test script for session-based recommenders |

### ML Test/Demo Utilities
| File | Purpose |
|------|---------|
| `ml/demo_test.py` | Quick demo script for ML models (run standalone) |
| `ml/live_test.py` | Live integration test with database |
| `ml/test_api.py` | End-to-end API test script for ML service |

### Seed Scripts (6 total)
| Script | Purpose |
|--------|---------|
| `prisma/seed.js` | Base data (users, categories, products, orders, reviews, coupons, clusters) |
| `prisma/seed-full.js` | Extended data (more products, orders, reviews) |
| `prisma/seed-new-models.js` | New feature seeds (banners, flash sales, refunds, violations, etc.) |
| `prisma/seed-images.js` | Image URLs for products |
| `prisma/seed-ml-test.js` | ML test data (281 product views) |
| `prisma/test-ml-all.js` | Auto-test all 13 ML endpoints (run with `node prisma/test-ml-all.js`) |

---

## 15. Project File Tree

```
KHOALUAN/
├── backend/                              # Backend API (Node.js + Express + Prisma)
│   ├── Dockerfile
│   ├── package.json
│   ├── start.sh                          # Startup script
│   ├── src/
│   │   ├── app.js                        # Express entry
│   │   ├── config/
│   │   │   ├── database.js               # PrismaClient singleton
│   │   │   ├── logger.js                 # Winston logger
│   │   │   └── redis.js                  # ioredis cache
│   │   ├── controllers/ (22 files)       # Route handlers
│   │   ├── middleware/
│   │   │   ├── auth.js                   # JWT protect, restrictTo, protectOptional
│   │   │   ├── errorHandler.js           # Global error handler
│   │   │   ├── rateLimiter.js            # Rate limiting
│   │   │   └── validate.js              # Joi validation wrapper
│   │   ├── routes/ (25 files)            # Route definitions
│   │   ├── services/
│   │   │   ├── mlService.js              # ML proxy client
│   │   │   ├── momoService.js            # MoMo payment
│   │   │   └── vnpayService.js           # VNPay payment
│   │   └── utils/
│   │       ├── AppError.js               # Custom error class
│   │       └── asyncHandler.js           # Async wrapper
│   ├── prisma/
│   │   ├── schema.prisma                 # 20+ models
│   │   ├── seed.js                       # Base seed data
│   │   ├── seed-full.js                  # Extended seed data
│   │   ├── seed-new-models.js            # New feature seeds
│   │   ├── seed-ml-test.js              # ML test data
│   │   └── test-ml-all.js               # Auto-test 13 ML endpoints
│   └── ml/                               # Python ML Service
│       ├── Dockerfile.ml
│       ├── requirements.txt
│       ├── clustering/
│       │   ├── api.py                    # FastAPI app + all endpoints
│       │   └── clustering_service.py     # RFM + K-Means
│       ├── collaborative/
│       │   └── collaborative_filtering.py # Item-Item, User-User, ALS, Hybrid
│       ├── session/
│       │   └── session_recommender.py    # Co-occurrence + Sequence
│       ├── evaluation/
│       │   └── metrics.py               # Metrics + A/B Test
│       └── rag/
│           ├── knowledge_base.py         # ChromaDB vector store
│           ├── rag_service.py            # RAG pipeline + Ollama
│           └── build_kb.py              # KB builder
│
├── frontend/                             # Frontend Web (React + Vite + Tailwind)
│   ├── Dockerfile
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx                      # Entry point
│       ├── index.css                     # Tailwind + custom styles
│       ├── App.jsx                       # Router (50+ routes)
│       ├── store/ (6 slices)
│       ├── services/
│       │   └── api.js                    # Axios + JWT interceptor
│       ├── components/
│       │   ├── Layout/ (5 layout components)
│       │   └── common/ (7 common components)
│       └── pages/
│           ├── admin/ (17 pages)
│           ├── partner/ (7 pages)
│           ├── auth/ (2 pages)
│           └── 14 customer pages
│
├── mobile/                               # Mobile App (React Native + Expo)
│   ├── App.js
│   ├── app.json
│   ├── package.json
│   └── src/
│       ├── navigation/
│       │   └── RootNavigator.js
│       ├── store/ (6 slices)
│       ├── services/
│       │   └── api.js
│       ├── screens/
│       │   ├── admin/ (17 screens)
│       │   ├── partner/ (7 screens)
│       │   ├── auth/ (2 screens)
│       │   └── customer/ (16 screens)
│       └── components/ (4 shared components)
│
├── docker-compose.yml                    # 5 services
├── .gitignore
├── README.md                             # Vietnamese README
├── DOCUMENTATION.md                      # This file
└── skills-lock.json
```

---

> **Documentation generated for KhoaLuan E-commerce System v2.0.0**
>
> *A 3-branch e-commerce platform with AI Recommendation Engine*
> *Docker-based deployment | PostgreSQL + Redis + ML Service*
