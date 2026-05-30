import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  FiHome, FiPackage, FiShoppingBag, FiLogOut, FiChevronLeft, FiMenu, FiAlertCircle, FiSettings,
} from 'react-icons/fi';
import { logout } from '../../store/authSlice';

const sidebarItems = [
  { icon: FiHome, label: 'Dashboard', path: '/partner' },
  { icon: FiPackage, label: 'Sản phẩm', path: '/partner/products' },
  { icon: FiShoppingBag, label: 'Đơn hàng', path: '/partner/orders' },
  { icon: FiSettings, label: 'Cài đặt cửa hàng', path: '/partner/profile' },
];

const PartnerLayout = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { siteName } = useSelector((state) => state.settings);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <div className="min-h-[100dvh] bg-surface-secondary flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-100 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col flex-shrink-0`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
          <Link to="/" className={`flex items-center space-x-2.5 ${!sidebarOpen && 'mx-auto'}`}>
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
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

        {/* Partner store info */}
        {sidebarOpen && (
          <div className="px-4 py-3 border-b border-gray-50">
            <div className="bg-emerald-50 rounded-xl px-3.5 py-3">
              <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Cửa hàng</p>
              <p className="text-sm font-semibold text-ink mt-0.5 truncate">{user?.storeName || user?.name}</p>
              {user?.isApproved ? (
                <span className="inline-flex items-center mt-1.5 text-[11px] text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full font-medium">
                  Đã duyệt
                </span>
              ) : (
                <span className="inline-flex items-center mt-1.5 text-[11px] text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full font-medium">
                  <FiAlertCircle className="mr-1" size={11} />
                  Chờ duyệt
                </span>
              )}
            </div>
          </div>
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
                    ? 'bg-emerald-50 text-emerald-700 font-medium'
                    : 'text-ink-secondary hover:bg-surface-tertiary hover:text-ink'
                }`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon className={`text-lg flex-shrink-0 ${isActive ? 'text-emerald-600' : ''}`} />
                {sidebarOpen && <span className="text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-100 p-4">
          {sidebarOpen ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-emerald-600">{user?.name?.[0] || 'P'}</span>
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
            Đối tác - {sidebarItems.find((item) => item.path === location.pathname)?.label || 'Dashboard'}
          </h1>
          <Link to="/" className="text-sm text-ink-tertiary hover:text-emerald-600 transition-colors px-3 py-2 rounded-xl hover:bg-surface-tertiary">
            Về trang chủ
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-surface-secondary">
          {!user?.isApproved && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start space-x-3">
              <FiAlertCircle className="text-amber-500 text-lg flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Tài khoản đang chờ phê duyệt</p>
                <p className="text-xs text-amber-700 mt-0.5">Bạn chưa thể đăng sản phẩm mới cho đến khi Admin phê duyệt tài khoản.</p>
              </div>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PartnerLayout;
