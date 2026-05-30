import React, { useEffect } from 'react';
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
import WishlistPage from './pages/WishlistPage';
import AddressManagementPage from './pages/AddressManagementPage';
import UserChatPage from './pages/UserChatPage';
import FollowedShopsPage from './pages/FollowedShopsPage';

// Admin pages
import DashboardPage from './pages/admin/DashboardPage';
import ProductsManagePage from './pages/admin/ProductsManagePage';
import CategoriesManagePage from './pages/admin/CategoriesManagePage';
import OrdersManagePage from './pages/admin/OrdersManagePage';
import UsersManagePage from './pages/admin/UsersManagePage';
import ClustersPage from './pages/admin/ClustersPage';
import RecommendationsPage from './pages/admin/RecommendationsPage';
import SettingsPage from './pages/admin/SettingsPage';
import PartnersManagePage from './pages/admin/PartnersManagePage';
import CouponsPage from './pages/admin/CouponsPage';
import BannerManagementPage from './pages/admin/BannerManagementPage';
import FlashSaleManagementPage from './pages/admin/FlashSaleManagementPage';
import RefundManagementPage from './pages/admin/RefundManagementPage';
import ViolationManagementPage from './pages/admin/ViolationManagementPage';
import AuditLogPage from './pages/admin/AuditLogPage';

// Partner pages
import PartnerLayout from './components/Layout/PartnerLayout';
import PartnerDashboardPage from './pages/partner/PartnerDashboardPage';
import PartnerProductsPage from './pages/partner/PartnerProductsPage';
import PartnerOrdersPage from './pages/partner/PartnerOrdersPage';
import PartnerReviewsPage from './pages/partner/PartnerReviewsPage';
import PartnerCouponsPage from './pages/partner/PartnerCouponsPage';
import PartnerProfilePage from './pages/partner/PartnerProfilePage';
import PartnerChatPage from './pages/partner/PartnerChatPage';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (adminOnly && user?.role !== 'ADMIN') return <Navigate to="/" />;

  return children;
};

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
        <Route path="wishlist" element={
          <ProtectedRoute><WishlistPage /></ProtectedRoute>
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
      </Route>

      {/* Auth routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Partner routes */}
      <Route path="/partner" element={
        <PartnerRoute><PartnerLayout /></PartnerRoute>
      }>
        <Route index element={<PartnerDashboardPage />} />
        <Route path="products" element={<PartnerProductsPage />} />
        <Route path="orders" element={<PartnerOrdersPage />} />
        <Route path="reviews" element={<PartnerReviewsPage />} />
        <Route path="coupons" element={<PartnerCouponsPage />} />
        <Route path="chat" element={<PartnerChatPage />} />
        <Route path="profile" element={<PartnerProfilePage />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={
        <ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsManagePage />} />
        <Route path="categories" element={<CategoriesManagePage />} />
        <Route path="orders" element={<OrdersManagePage />} />
        <Route path="users" element={<UsersManagePage />} />
        <Route path="partners" element={<PartnersManagePage />} />
        <Route path="coupons" element={<CouponsPage />} />
        <Route path="banners" element={<BannerManagementPage />} />
        <Route path="flash-sales" element={<FlashSaleManagementPage />} />
        <Route path="refunds" element={<RefundManagementPage />} />
        <Route path="violations" element={<ViolationManagementPage />} />
        <Route path="audit" element={<AuditLogPage />} />
        <Route path="clusters" element={<ClustersPage />} />
        <Route path="recommendations" element={<RecommendationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
