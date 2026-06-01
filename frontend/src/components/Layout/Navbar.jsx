import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FiSearch, FiShoppingCart, FiUser, FiLogOut, FiMenu, FiX, FiMapPin, FiMessageSquare, FiHeart as FiHeartOutline, FiChevronRight, FiZap, FiTag } from 'react-icons/fi';
import { logout } from '../../store/authSlice';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { count } = useSelector((state) => state.cart);
  const settings = useSelector((state) => state.settings);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  }, [searchQuery, navigate]);

  const handleLogout = useCallback(() => {
    dispatch(logout());
    navigate('/');
  }, [dispatch, navigate]);

  // Staggered animation delay map
  const menuItemStyle = (idx) => ({
    animation: `fadeSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${0.05 + idx * 0.04}s forwards`,
    opacity: 0,
  });

  return (
    <>
      {/* Desktop: Fluid Island Nav */}
      <nav className="hidden md:block fixed top-0 left-0 right-0 z-50 pt-4 px-4">
        <div className="glass-island relative max-w-5xl mx-auto rounded-full h-14 px-5 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2.5 group shrink-0">
            <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center group-hover:bg-primary-700 transition-colors">
              <span className="text-white font-bold text-[11px]">K</span>
            </div>
            <span className="text-sm font-semibold text-ink">{settings.siteName}</span>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xs mx-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm..."
                className="w-full pl-9 pr-3 py-1.5 bg-black/[0.04] border-0 rounded-full text-sm text-ink
                  placeholder:text-gray-400
                  focus:outline-none focus:ring-2 focus:ring-primary-500/20
                  transition-all duration-200"
              />
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            </div>
          </form>

          {/* Nav Items */}
          <div className="flex items-center space-x-0.5">
            <Link to="/products" className="px-3 py-1.5 text-xs font-medium text-ink-secondary hover:text-ink hover:bg-black/[0.04] rounded-full transition-all duration-200">
              Sản phẩm
            </Link>

            <Link to="/flash-sales" className="relative px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-all duration-200 flex items-center space-x-1">
              <FiZap className="text-[11px]" />
              <span>Flash Sale</span>
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse-soft" />
            </Link>

            <Link to="/cart" className="relative p-2 text-ink-secondary hover:text-ink hover:bg-black/[0.04] rounded-full transition-all duration-200">
              <FiShoppingCart className="text-sm" />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary-600 text-white text-[9px] font-semibold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <div className="relative group">
                <button className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-ink-secondary hover:text-ink hover:bg-black/[0.04] rounded-full transition-all duration-200">
                  <FiUser className="text-sm" />
                  <span className="max-w-[80px] truncate">{user?.name || 'TK'}</span>
                </button>
                {/* Dropdown */}
                <div className="absolute right-0 mt-2 w-56 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-premium-xl border border-gray-100/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2 z-50">
                  <Link to="/profile" className="block px-4 py-2 text-sm text-ink-secondary hover:text-ink hover:bg-black/[0.03] transition-colors">
                    Thông tin cá nhân
                  </Link>
                  {(user?.role === 'CUSTOMER' || !user?.role) && (
                    <>
                      <Link to="/orders" className="block px-4 py-2 text-sm text-ink-secondary hover:text-ink hover:bg-black/[0.03] transition-colors">Đơn hàng của tôi</Link>
                      <Link to="/coupons" className="block px-4 py-2 text-sm text-ink-secondary hover:text-ink hover:bg-black/[0.03] transition-colors">
                        <FiTag className="inline mr-1.5 text-xs" /> Kho voucher
                      </Link>
                      <Link to="/addresses" className="block px-4 py-2 text-sm text-ink-secondary hover:text-ink hover:bg-black/[0.03] transition-colors">
                        <FiMapPin className="inline mr-1.5 text-xs" /> Địa chỉ giao hàng
                      </Link>
                      <Link to="/followed-shops" className="block px-4 py-2 text-sm text-ink-secondary hover:text-ink hover:bg-black/[0.03] transition-colors">
                        <FiHeartOutline className="inline mr-1.5 text-xs" /> Cửa hàng yêu thích
                      </Link>
                      <Link to="/chat" className="block px-4 py-2 text-sm text-ink-secondary hover:text-ink hover:bg-black/[0.03] transition-colors">
                        <FiMessageSquare className="inline mr-1.5 text-xs" /> Tin nhắn
                      </Link>
                    </>
                  )}
                  {user?.role === 'PARTNER' && (
                    <Link to="/partner" className="block px-4 py-2 text-sm text-emerald-600 hover:bg-black/[0.03] transition-colors font-medium">Kênh đối tác</Link>
                  )}
                  {user?.role === 'ADMIN' && (
                    <Link to="/admin" className="block px-4 py-2 text-sm text-primary-600 hover:bg-black/[0.03] transition-colors font-medium">Quản trị</Link>
                  )}
                  <hr className="my-1.5 border-gray-100/50" />
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50/50 transition-colors flex items-center space-x-2">
                    <FiLogOut className="text-sm" /> <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/login" className="btn-primary text-xs px-4 py-1.5 rounded-full">
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile: Sticky Nav */}
      <nav className="md:hidden glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-14 items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-[11px]">K</span>
              </div>
              <span className="text-sm font-semibold text-ink">{settings.siteName}</span>
            </Link>

            <div className="flex items-center space-x-1">
              <Link to="/cart" className="relative p-2 text-ink-secondary">
                <FiShoppingCart className="text-sm" />
                {count > 0 && <span className="absolute -top-0.5 -right-0.5 bg-primary-600 text-white text-[9px] font-semibold w-4 h-4 rounded-full flex items-center justify-center">{count > 99 ? '99+' : count}</span>}
              </Link>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-ink-secondary hover:text-ink transition-colors">
                {mobileMenuOpen ? <FiX className="text-lg" /> : <FiMenu className="text-lg" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 top-14 bg-white z-40 overflow-y-auto">
            <div className="px-4 py-6 space-y-1">
              <form onSubmit={handleSearch} className="mb-6">
                <div className="relative">
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm sản phẩm..."
                    className="w-full pl-10 pr-4 py-3 bg-surface-secondary border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                  <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </form>

              {[
                { to: '/products', label: 'Sản phẩm', icon: null },
                { to: '/flash-sales', label: 'Flash Sale' },
                { to: '/coupons', label: 'Kho voucher' },
                { to: '/cart', label: `Giỏ hàng${count > 0 ? ` (${count})` : ''}`, icon: FiShoppingCart },
              ].map((item, idx) => (
                <Link key={item.to} to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3.5 text-ink-secondary hover:text-ink hover:bg-surface-secondary rounded-2xl transition-all duration-200"
                  style={menuItemStyle(idx)}
                >
                  <span className="font-medium">{item.label}</span>
                  <FiChevronRight className="text-gray-300 text-sm" />
                </Link>
              ))}

              <hr className="my-4 border-gray-100" style={menuItemStyle(4)} />

              {isAuthenticated ? (
                <div className="space-y-1" style={menuItemStyle(5)}>
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between px-4 py-3.5 text-ink-secondary hover:text-ink hover:bg-surface-secondary rounded-2xl transition-colors">
                    <span>Thông tin cá nhân</span> <FiChevronRight className="text-gray-300 text-sm" />
                  </Link>
                  {(user?.role === 'CUSTOMER' || !user?.role) && (
                    <>
                      <Link to="/orders" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between px-4 py-3.5 text-ink-secondary hover:text-ink hover:bg-surface-secondary rounded-2xl transition-colors">
                        <span>Đơn hàng</span> <FiChevronRight className="text-gray-300 text-sm" />
                      </Link>
                      <Link to="/coupons" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between px-4 py-3.5 text-ink-secondary hover:text-ink hover:bg-surface-secondary rounded-2xl transition-colors">
                        <span>Kho voucher</span> <FiChevronRight className="text-gray-300 text-sm" />
                      </Link>
                      <Link to="/chat" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between px-4 py-3.5 text-ink-secondary hover:text-ink hover:bg-surface-secondary rounded-2xl transition-colors">
                        <span>Tin nhắn</span> <FiChevronRight className="text-gray-300 text-sm" />
                      </Link>
                    </>
                  )}
                  {user?.role === 'PARTNER' && (
                    <Link to="/partner" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3.5 text-emerald-600 font-medium hover:bg-surface-secondary rounded-2xl transition-colors">
                      Kênh đối tác
                    </Link>
                  )}
                  {user?.role === 'ADMIN' && (
                    <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3.5 text-primary-600 font-medium hover:bg-surface-secondary rounded-2xl transition-colors">
                      Quản trị
                    </Link>
                  )}
                  <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="w-full text-left px-4 py-3.5 text-red-600 hover:bg-red-50 rounded-2xl transition-colors mt-2">
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} style={menuItemStyle(5)}
                  className="btn-primary w-full text-center py-3">
                  Đăng nhập
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Spacer for fixed nav */}
      <div className="hidden md:block h-20" />
    </>
  );
};

export default Navbar;
