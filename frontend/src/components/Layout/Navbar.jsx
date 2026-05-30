import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FiSearch, FiShoppingCart, FiUser, FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import { logout } from '../../store/authSlice';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { count } = useSelector((state) => state.cart);
  const settings = useSelector((state) => state.settings);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <nav className="glass sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center group-hover:bg-primary-700 transition-colors">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <span className="text-lg font-semibold text-ink">{settings.siteName}</span>
          </Link>

          {/* Search - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-gray-200 rounded-xl text-sm text-ink
                  placeholder:text-gray-400
                  focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                  transition-all duration-200"
              />
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            </div>
          </form>

          {/* Nav Items - Desktop */}
          <div className="hidden md:flex items-center space-x-1">
            <Link to="/products" className="px-3.5 py-2 text-sm text-ink-secondary hover:text-ink hover:bg-surface-tertiary rounded-xl transition-all duration-200">
              Sản phẩm
            </Link>

            <Link to="/cart" className="relative p-2.5 text-ink-secondary hover:text-ink hover:bg-surface-tertiary rounded-xl transition-all duration-200">
              <FiShoppingCart className="text-lg" />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary-600 text-white text-[10px] font-semibold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <div className="relative group">
                <button className="flex items-center space-x-2 px-3.5 py-2 text-sm text-ink-secondary hover:text-ink hover:bg-surface-tertiary rounded-xl transition-all duration-200">
                  <FiUser className="text-lg" />
                  <span className="max-w-[100px] truncate">{user?.name || 'Tài khoản'}</span>
                </button>
                <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-premium-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-1.5 z-50">
                  <Link to="/profile" className="block px-4 py-2 text-sm text-ink-secondary hover:text-ink hover:bg-surface-secondary transition-colors">
                    Thông tin cá nhân
                  </Link>
                  {(user?.role === 'CUSTOMER' || !user?.role) && (
                    <Link to="/orders" className="block px-4 py-2 text-sm text-ink-secondary hover:text-ink hover:bg-surface-secondary transition-colors">
                      Đơn hàng của tôi
                    </Link>
                  )}
                  {user?.role === 'PARTNER' && (
                    <Link to="/partner" className="block px-4 py-2 text-sm text-emerald-600 hover:bg-surface-secondary transition-colors font-medium">
                      Kênh đối tác
                    </Link>
                  )}
                  {user?.role === 'ADMIN' && (
                    <Link to="/admin" className="block px-4 py-2 text-sm text-primary-600 hover:bg-surface-secondary transition-colors font-medium">
                      Quản trị
                    </Link>
                  )}
                  <hr className="my-1.5 border-gray-100" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
                  >
                    <FiLogOut className="text-sm" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/login" className="btn-primary text-sm">
                Đăng nhập
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 text-ink-secondary hover:text-ink hover:bg-surface-tertiary rounded-xl transition-all"
          >
            {mobileMenuOpen ? <FiX className="text-lg" /> : <FiMenu className="text-lg" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3 animate-in">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full pl-10 pr-4 py-2.5 bg-surface-secondary border border-gray-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                  transition-all"
              />
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </form>

          <Link to="/products" className="block px-3 py-2.5 text-ink-secondary hover:text-ink hover:bg-surface-secondary rounded-xl transition-colors" onClick={() => setMobileMenuOpen(false)}>
            Sản phẩm
          </Link>
          <Link to="/cart" className="block px-3 py-2.5 text-ink-secondary hover:text-ink hover:bg-surface-secondary rounded-xl transition-colors" onClick={() => setMobileMenuOpen(false)}>
            Giỏ hàng {count > 0 && <span className="ml-1 text-primary-600 font-medium">({count})</span>}
          </Link>

          {isAuthenticated ? (
            <>
              <hr className="border-gray-100" />
              <Link to="/profile" className="block px-3 py-2.5 text-ink-secondary hover:text-ink hover:bg-surface-secondary rounded-xl transition-colors" onClick={() => setMobileMenuOpen(false)}>
                Thông tin cá nhân
              </Link>
              {(user?.role === 'CUSTOMER' || !user?.role) && (
                <Link to="/orders" className="block px-3 py-2.5 text-ink-secondary hover:text-ink hover:bg-surface-secondary rounded-xl transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  Đơn hàng
                </Link>
              )}
              {user?.role === 'PARTNER' && (
                <Link to="/partner" className="block px-3 py-2.5 text-emerald-600 font-medium hover:bg-surface-secondary rounded-xl transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  Kênh đối tác
                </Link>
              )}
              {user?.role === 'ADMIN' && (
                <Link to="/admin" className="block px-3 py-2.5 text-primary-600 font-medium hover:bg-surface-secondary rounded-xl transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  Quản trị
                </Link>
              )}
              <button onClick={handleLogout} className="w-full text-left px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                Đăng xuất
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-primary w-full text-center" onClick={() => setMobileMenuOpen(false)}>
              Đăng nhập
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
