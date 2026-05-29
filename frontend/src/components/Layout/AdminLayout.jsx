import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  FiHome, FiPackage, FiGrid, FiShoppingBag, FiUsers,
  FiPieChart, FiTrendingUp, FiSettings, FiLogOut,
  FiMenu, FiX, FiChevronLeft, FiBell, FiCheck, FiClock,
} from 'react-icons/fi';
import { logout } from '../../store/authSlice';
import { fetchNotifications, markAsRead, markAllAsRead } from '../../store/notificationSlice';

const sidebarItems = [
  { icon: FiHome, label: 'Dashboard', path: '/admin' },
  { icon: FiPackage, label: 'Sản phẩm', path: '/admin/products' },
  { icon: FiGrid, label: 'Danh mục', path: '/admin/categories' },
  { icon: FiShoppingBag, label: 'Đơn hàng', path: '/admin/orders' },
  { icon: FiUsers, label: 'Người dùng', path: '/admin/users' },
  { icon: FiPieChart, label: 'Phân cụm', path: '/admin/clusters' },
  { icon: FiTrendingUp, label: 'Gợi ý', path: '/admin/recommendations' },
  { icon: FiSettings, label: 'Cài đặt', path: '/admin/settings' },
];

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { siteName } = useSelector((state) => state.settings);
  const { notifications, unreadCount } = useSelector((state) => state.notifications);

  // Fetch notifications on mount + poll every 30s
  useEffect(() => {
    dispatch(fetchNotifications());
    const interval = setInterval(() => {
      dispatch(fetchNotifications());
    }, 30000);
    return () => clearInterval(interval);
  }, [dispatch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      dispatch(markAsRead(notif.id));
    }
    if (notif.type === 'ORDER' && notif.referenceId) {
      navigate('/admin/orders');
    }
    setNotifOpen(false);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const formatTime = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white shadow-sm border-r border-gray-200 transition-all duration-300 flex flex-col`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
          {sidebarOpen && (
            <Link to="/" className="text-lg font-bold text-gray-900">{siteName}</Link>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700">
            {sidebarOpen ? <FiChevronLeft /> : <FiMenu />}
          </button>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center ${sidebarOpen ? 'space-x-3 px-3' : 'justify-center'} py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon className="text-xl flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-4">
          {sidebarOpen ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
              <button onClick={handleLogout} className="flex items-center space-x-2 text-sm text-red-600 hover:text-red-700">
                <FiLogOut />
                <span>Đăng xuất</span>
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} className="w-full flex justify-center text-red-600" title="Đăng xuất">
              <FiLogOut className="text-xl" />
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white shadow-sm border-b border-gray-200 px-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">
            {sidebarItems.find((item) => item.path === location.pathname)?.label || 'Quản trị'}
          </h1>
          <div className="flex items-center space-x-4">
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiBell className="text-xl" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Thông báo {unreadCount > 0 && `(${unreadCount})`}
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => dispatch(markAllAsRead())}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Đã đọc tất cả
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-10 text-center text-gray-400">
                        <FiCheck className="mx-auto text-2xl mb-2" />
                        <p className="text-sm">Không có thông báo</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <button
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                            !notif.isRead ? 'bg-primary-50/50' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                              !notif.isRead ? 'bg-primary-500' : 'bg-transparent'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${!notif.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                {notif.title}
                              </p>
                              {notif.message && (
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                              )}
                              <p className="text-[11px] text-gray-400 mt-1 flex items-center space-x-1">
                                <FiClock className="inline" />
                                <span>{formatTime(notif.createdAt)}</span>
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link to="/" className="text-sm text-primary-600 hover:text-primary-700">
              Về trang chủ
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
