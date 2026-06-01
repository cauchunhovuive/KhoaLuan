import React, { useEffect, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCurrentUser } from './store/authSlice';
import { fetchSettings } from './store/settingsSlice';
import MainLayout from './components/Layout/MainLayout';
import AdminLayout from './components/Layout/AdminLayout';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ProductListPage from './pages/ProductListPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';
import AddressManagementPage from './pages/AddressManagementPage';
import UserChatPage from './pages/UserChatPage';
import FollowedShopsPage from './pages/FollowedShopsPage';
import ShopPage from './pages/ShopPage';
import FlashSalePage from './pages/FlashSalePage';
import UserCouponsPage from './pages/CouponsPage';

// Partner Layout (needed at module level)
import PartnerLayout from './components/Layout/PartnerLayout';

// Lazy-loaded admin pages (split into separate chunks)
const DashboardPage = React.lazy(() => import('./pages/admin/DashboardPage'));
const ProductsManagePage = React.lazy(() => import('./pages/admin/ProductsManagePage'));
const CategoriesManagePage = React.lazy(() => import('./pages/admin/CategoriesManagePage'));
const OrdersManagePage = React.lazy(() => import('./pages/admin/OrdersManagePage'));
const UsersManagePage = React.lazy(() => import('./pages/admin/UsersManagePage'));
const ClustersPage = React.lazy(() => import('./pages/admin/ClustersPage'));
const RecommendationsPage = React.lazy(() => import('./pages/admin/RecommendationsPage'));
const SettingsPage = React.lazy(() => import('./pages/admin/SettingsPage'));
const PartnersManagePage = React.lazy(() => import('./pages/admin/PartnersManagePage'));
const CouponsPage = React.lazy(() => import('./pages/admin/CouponsPage'));
const BannerManagementPage = React.lazy(() => import('./pages/admin/BannerManagementPage'));
const FlashSaleManagementPage = React.lazy(() => import('./pages/admin/FlashSaleManagementPage'));
const RefundManagementPage = React.lazy(() => import('./pages/admin/RefundManagementPage'));
const ViolationManagementPage = React.lazy(() => import('./pages/admin/ViolationManagementPage'));
const AuditLogPage = React.lazy(() => import('./pages/admin/AuditLogPage'));
const ABTestingPage = React.lazy(() => import('./pages/admin/ABTestingPage'));
const MLTestPage = React.lazy(() => import('./pages/admin/MLTestPage'));

// Lazy-loaded partner pages
const PartnerDashboardPage = React.lazy(() => import('./pages/partner/PartnerDashboardPage'));
const PartnerProductsPage = React.lazy(() => import('./pages/partner/PartnerProductsPage'));
const PartnerOrdersPage = React.lazy(() => import('./pages/partner/PartnerOrdersPage'));
const PartnerReviewsPage = React.lazy(() => import('./pages/partner/PartnerReviewsPage'));
const PartnerCouponsPage = React.lazy(() => import('./pages/partner/PartnerCouponsPage'));
const PartnerProfilePage = React.lazy(() => import('./pages/partner/PartnerProfilePage'));
const PartnerChatPage = React.lazy(() => import('./pages/partner/PartnerChatPage'));

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (adminOnly && user?.role !== 'ADMIN') return <Navigate to="/" />;

  return children;
};

const RouteFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center space-y-3">
      <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      <span className="text-xs text-ink-tertiary animate-pulse-soft">Đang tải...</span>
    </div>
  </div>
);

const PartnerRoute = ({ children }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user?.role !== 'PARTNER' && user?.role !== 'ADMIN') return <Navigate to="/" />;

  return children;
};

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, token } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchSettings());
    if (isAuthenticated && token) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, isAuthenticated, token]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductListPage />} />
        <Route path="products/:slug" element={<ProductDetailPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="cart" element={<CartPage />} />

        {/* Protected routes */}
        <Route path="checkout" element={
          <ProtectedRoute><CheckoutPage /></ProtectedRoute>
        } />
        <Route path="orders" element={
          <ProtectedRoute><OrdersPage /></ProtectedRoute>
        } />
        <Route path="orders/:id" element={
          <ProtectedRoute><OrderDetailPage /></ProtectedRoute>
        } />
        <Route path="profile" element={
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        } />
        <Route path="addresses" element={
          <ProtectedRoute><AddressManagementPage /></ProtectedRoute>
        } />
        <Route path="chat" element={
          <ProtectedRoute><UserChatPage /></ProtectedRoute>
        } />
        <Route path="followed-shops" element={
          <ProtectedRoute><FollowedShopsPage /></ProtectedRoute>
        } />
        <Route path="flash-sales" element={<FlashSalePage />} />
        <Route path="coupons" element={
          <ProtectedRoute><UserCouponsPage /></ProtectedRoute>
        } />
        <Route path="shop/:partnerId" element={<ShopPage />} />
      </Route>

      {/* Auth routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Partner routes (lazy loaded) */}
      <Route path="/partner" element={
        <PartnerRoute><PartnerLayout /></PartnerRoute>
      }>
        <Route index element={<Suspense fallback={<RouteFallback />}><PartnerDashboardPage /></Suspense>} />
        <Route path="products" element={<Suspense fallback={<RouteFallback />}><PartnerProductsPage /></Suspense>} />
        <Route path="orders" element={<Suspense fallback={<RouteFallback />}><PartnerOrdersPage /></Suspense>} />
        <Route path="reviews" element={<Suspense fallback={<RouteFallback />}><PartnerReviewsPage /></Suspense>} />
        <Route path="coupons" element={<Suspense fallback={<RouteFallback />}><PartnerCouponsPage /></Suspense>} />
        <Route path="chat" element={<Suspense fallback={<RouteFallback />}><PartnerChatPage /></Suspense>} />
        <Route path="profile" element={<Suspense fallback={<RouteFallback />}><PartnerProfilePage /></Suspense>} />
      </Route>

      {/* Admin routes (lazy loaded) */}
      <Route path="/admin" element={
        <ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>
      }>
        <Route index element={<Suspense fallback={<RouteFallback />}><DashboardPage /></Suspense>} />
        <Route path="products" element={<Suspense fallback={<RouteFallback />}><ProductsManagePage /></Suspense>} />
        <Route path="categories" element={<Suspense fallback={<RouteFallback />}><CategoriesManagePage /></Suspense>} />
        <Route path="orders" element={<Suspense fallback={<RouteFallback />}><OrdersManagePage /></Suspense>} />
        <Route path="users" element={<Suspense fallback={<RouteFallback />}><UsersManagePage /></Suspense>} />
        <Route path="partners" element={<Suspense fallback={<RouteFallback />}><PartnersManagePage /></Suspense>} />
        <Route path="coupons" element={<Suspense fallback={<RouteFallback />}><CouponsPage /></Suspense>} />
        <Route path="banners" element={<Suspense fallback={<RouteFallback />}><BannerManagementPage /></Suspense>} />
        <Route path="flash-sales" element={<Suspense fallback={<RouteFallback />}><FlashSaleManagementPage /></Suspense>} />
        <Route path="refunds" element={<Suspense fallback={<RouteFallback />}><RefundManagementPage /></Suspense>} />
        <Route path="violations" element={<Suspense fallback={<RouteFallback />}><ViolationManagementPage /></Suspense>} />
        <Route path="audit" element={<Suspense fallback={<RouteFallback />}><AuditLogPage /></Suspense>} />
        <Route path="clusters" element={<Suspense fallback={<RouteFallback />}><ClustersPage /></Suspense>} />
        <Route path="recommendations" element={<Suspense fallback={<RouteFallback />}><RecommendationsPage /></Suspense>} />
        <Route path="abtest" element={<Suspense fallback={<RouteFallback />}><ABTestingPage /></Suspense>} />
        <Route path="ml-test" element={<Suspense fallback={<RouteFallback />}><MLTestPage /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<RouteFallback />}><SettingsPage /></Suspense>} />
      </Route>
    </Routes>
  );
}

export default App;
