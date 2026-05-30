import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  FiHome, FiPackage, FiGrid, FiUsers,
  FiPieChart, FiTrendingUp, FiSettings, FiLogOut,
  FiMenu, FiChevronLeft, FiBell, FiCheck, FiClock,
  FiUserCheck, FiTag, FiImage, FiZap, FiRefreshCw, FiAlertTriangle, FiFileText,
} from 'react-icons/fi';
import { logout } from '../../store/authSlice';
import { fetchNotifications, markAsRead, markAllAsRead } from '../../store/notificationSlice';

const sidebarItems = [
  { icon: FiHome, label: 'Dashboard', path: '/admin' },
  { icon: FiPackage, label: 'Sản phẩm', path: '/admin/products' },
  { icon: FiGrid, label: 'Danh mục', path: '/admin/categories' },
  { icon: FiUsers, label: 'Người dùng', path: '/admin/users' },
  { icon: FiUserCheck, label: 'Đối tác', path: '/admin/partners' },
  { icon: FiTag, label: 'Mã giảm giá', path: '/admin/coupons' },
  { icon: FiImage, label: 'Banner', path: '/admin/banners' },
  { icon: FiZap, label: 'Flash Sale', path: '/admin/flash-sales' },
  { icon: FiRefreshCw, label: 'Hoàn trả', path: '/admin/refunds' },
  { icon: FiAlertTriangle, label: 'Vi phạm', path: '/admin/violations' },
  { icon: FiFileText, label: 'Audit Log', path: '/admin/audit' },
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

  useEffect(() => {
    dispatch(fetchNotifications());
    const interval = setInterval(() => dispatch(fetchNotifications()), 30000);
    return () => clearInterval(interval);
  }, [dispatch]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) dispatch(markAsRead(notif.id));
    if (notif.type === 'ORDER' && notif.referenceId) navigate('/admin');
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
    <div className="min-h-[100dvh] bg-surface-secondary flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-100 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col flex-shrink-0`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
          <Link to="/" className={`flex items-center space-x-2.5 ${!sidebarOpen && 'mx-auto'}`}>
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            {sidebarOpen && <span className="text-base font-bold text-ink">{siteName}</span>}
          </Link>
          {sidebarOpen && (
            <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-ink-secondary transition-colors">
              <FiChevronLeft />
            </button>
          )}
        </div>

        {!sidebarOpen && (
          <button onClick={() => setSidebarOpen(true)} className="mx-auto mt-4 text-gray-400 hover:text-ink-secondary transition-colors">
            <FiMenu />
          </button>
        )}

        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center ${sidebarOpen ? 'space-x-3 px-3' : 'justify-center px-0'} py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-ink-secondary hover:bg-surface-tertiary hover:text-ink'
                }`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon className={`text-lg flex-shrink-0 ${isActive ? 'text-primary-600' : ''}`} />
                {sidebarOpen && <span className="text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-100 p-4">
          {sidebarOpen ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary-600">{user?.name?.[0] || 'A'}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{user?.name}</p>
                  <p className="text-xs text-ink-tertiary truncate">{user?.email}</p>
                </div>
              </div>
              <button onClick={handleLogout} className="flex items-center space-x-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl px-3 py-2 w-full transition-colors">
                <FiLogOut className="text-sm" />
                <span>Đăng xuất</span>
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} className="w-full flex justify-center text-red-600 hover:bg-red-50 rounded-xl py-2 transition-colors" title="Đăng xuất">
              <FiLogOut className="text-lg" />
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 flex items-center justify-between sticky top-0 z-20">
          <h1 className="text-base font-semibold text-ink">
            {sidebarItems.find((item) => item.path === location.pathname)?.label || 'Quản trị'}
          </h1>
          <div className="flex items-center space-x-3">
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2.5 text-ink-secondary hover:text-primary-600 hover:bg-surface-tertiary rounded-xl transition-all duration-200"
              >
                <FiBell className="text-lg" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-premium-sm">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-premium-xl border border-gray-100 z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-ink">
                      Thông báo {unreadCount > 0 && `(${unreadCount})`}
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => dispatch(markAllAsRead())}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
                      >
                        Đã đọc tất cả
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-5 py-12 text-center text-gray-400">
                        <FiCheck className="mx-auto text-2xl mb-2" />
                        <p className="text-sm">Không có thông báo</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <button
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`w-full text-left px-5 py-3.5 border-b border-gray-50 hover:bg-surface-secondary transition-colors ${
                            !notif.isRead ? 'bg-primary-50/40' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                              !notif.isRead ? 'bg-primary-500' : 'bg-transparent'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${!notif.isRead ? 'font-semibold text-ink' : 'text-ink-secondary'}`}>
                                {notif.title}
                              </p>
                              {notif.message && (
                                <p className="text-xs text-ink-tertiary mt-0.5 line-clamp-2">{notif.message}</p>
                              )}
                              <p className="text-[11px] text-gray-400 mt-1.5 flex items-center space-x-1">
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

            <Link to="/" className="text-sm text-ink-tertiary hover:text-primary-600 transition-colors px-3 py-2 rounded-xl hover:bg-surface-tertiary">
              Trang chủ
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-surface-secondary">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
