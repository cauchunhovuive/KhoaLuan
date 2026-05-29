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

// Admin pages
import DashboardPage from './pages/admin/DashboardPage';
import ProductsManagePage from './pages/admin/ProductsManagePage';
import CategoriesManagePage from './pages/admin/CategoriesManagePage';
import OrdersManagePage from './pages/admin/OrdersManagePage';
import UsersManagePage from './pages/admin/UsersManagePage';
import ClustersPage from './pages/admin/ClustersPage';
import RecommendationsPage from './pages/admin/RecommendationsPage';
import SettingsPage from './pages/admin/SettingsPage';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (adminOnly && user?.role !== 'ADMIN') return <Navigate to="/" />;

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
      </Route>

      {/* Auth routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Admin routes */}
      <Route path="/admin" element={
        <ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsManagePage />} />
        <Route path="categories" element={<CategoriesManagePage />} />
        <Route path="orders" element={<OrdersManagePage />} />
        <Route path="users" element={<UsersManagePage />} />
        <Route path="clusters" element={<ClustersPage />} />
        <Route path="recommendations" element={<RecommendationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
