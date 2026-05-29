import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FiSearch, FiShoppingCart, FiUser, FiLogOut, FiMenu, FiX, FiPackage } from 'react-icons/fi';
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
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <FiPackage className="text-primary-600 text-2xl" />
            <span className="text-xl font-bold text-gray-900">{settings.siteName}</span>
          </Link>

          {/* Search - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm sản phẩm..."
                className="input-field pl-10"
              />
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </form>

          {/* Nav Items - Desktop */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/products" className="text-gray-600 hover:text-primary-600 transition-colors">
              Sản phẩm
            </Link>

            <Link to="/cart" className="relative text-gray-600 hover:text-primary-600 transition-colors">
              <FiShoppingCart className="text-xl" />
              {count > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <div className="relative group">
                <button className="flex items-center space-x-1 text-gray-600 hover:text-primary-600 transition-colors">
                  <FiUser className="text-xl" />
                  <span className="text-sm">{user?.name || 'Tài khoản'}</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Thông tin cá nhân
                  </Link>
                  {user?.role !== 'ADMIN' && (
                    <Link to="/orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Đơn hàng của tôi
                    </Link>
                  )}
                  {user?.role === 'ADMIN' && (
                    <Link to="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-t">
                      Quản trị
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 border-t"
                  >
                    <FiLogOut />
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
            className="md:hidden text-gray-600"
          >
            {mobileMenuOpen ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-4">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm sản phẩm..."
                className="input-field pl-10"
              />
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </form>

          <Link to="/products" className="block text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>
            Sản phẩm
          </Link>
          <Link to="/cart" className="block text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>
            Giỏ hàng {count > 0 && `(${count})`}
          </Link>

          {isAuthenticated ? (
            <>
              <Link to="/profile" className="block text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>
                Thông tin cá nhân
              </Link>
              {user?.role !== 'ADMIN' && (
                <Link to="/orders" className="block text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>
                  Đơn hàng
                </Link>
              )}
              {user?.role === 'ADMIN' && (
                <Link to="/admin" className="block text-primary-600 py-2" onClick={() => setMobileMenuOpen(false)}>
                  Quản trị
                </Link>
              )}
              <button onClick={handleLogout} className="block text-red-600 py-2 w-full text-left">
                Đăng xuất
              </button>
            </>
          ) : (
            <Link to="/login" className="block text-primary-600 py-2" onClick={() => setMobileMenuOpen(false)}>
              Đăng nhập
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
