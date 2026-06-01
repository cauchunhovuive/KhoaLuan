import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FiMail, FiPhone, FiMapPin, FiArrowUpRight, FiHeart } from 'react-icons/fi';

const Footer = () => {
  const { siteName, siteDescription, siteContactEmail, siteContactPhone, siteContactAddress } = useSelector((state) => state.settings);

  return (
    <footer className="bg-[#0a0a0b] border-t border-white/[0.06] relative overflow-hidden">
      {/* Ambient gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary-500/[0.03] rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-primary-400/[0.02] rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Divider with accent */}
        <div className="relative h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

        <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center space-x-2.5 mb-4 group">
              <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center group-hover:bg-primary-700 transition-colors shadow-premium-glow">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <span className="text-lg font-semibold text-white">{siteName}</span>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              {siteDescription}
            </p>
            <div className="flex items-center space-x-1.5 mt-4 text-xs text-gray-600">
              <FiHeart className="text-primary-400/60" />
              <span>Powered by AI Recommendation Engine</span>
            </div>
          </div>

          {/* Danh mục */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em] mb-5">Danh mục</h3>
            <ul className="space-y-3">
              {[
                { to: '/products', label: 'Sản phẩm' },
                { to: '/products?sort=sold', label: 'Bán chạy' },
                { to: '/products?sort=-price', label: 'Giảm giá' },
              ].map((item) => (
                <li key={item.to}>
                  <Link to={item.to}
                    className="group inline-flex items-center text-sm text-gray-500 hover:text-white transition-all duration-200">
                    <span>{item.label}</span>
                    <FiArrowUpRight className="ml-0.5 text-[10px] opacity-0 -translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Hỗ trợ */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em] mb-5">Hỗ trợ</h3>
            <ul className="space-y-3">
              {[
                { to: '/about', label: 'Về chúng tôi' },
                { to: '/contact', label: 'Liên hệ' },
                { to: '/faq', label: 'FAQ' },
              ].map((item) => (
                <li key={item.to}>
                  <Link to={item.to}
                    className="group inline-flex items-center text-sm text-gray-500 hover:text-white transition-all duration-200">
                    <span>{item.label}</span>
                    <FiArrowUpRight className="ml-0.5 text-[10px] opacity-0 -translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Liên hệ */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.15em] mb-5">Liên hệ</h3>
            <ul className="space-y-4">
              <li>
                <a href={`mailto:${siteContactEmail}`}
                  className="group flex items-start space-x-3 text-sm text-gray-500 hover:text-white transition-all duration-200">
                  <FiMail className="mt-0.5 text-primary-400/60 group-hover:text-primary-400 transition-colors flex-shrink-0" />
                  <span>{siteContactEmail}</span>
                </a>
              </li>
              <li>
                <a href={`tel:${siteContactPhone}`}
                  className="group flex items-start space-x-3 text-sm text-gray-500 hover:text-white transition-all duration-200">
                  <FiPhone className="mt-0.5 text-primary-400/60 group-hover:text-primary-400 transition-colors flex-shrink-0" />
                  <span>{siteContactPhone}</span>
                </a>
              </li>
              <li className="flex items-start space-x-3 text-sm text-gray-500">
                <FiMapPin className="mt-0.5 text-primary-400/60 flex-shrink-0" />
                <span>{siteContactAddress}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.06] py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-600">
            &copy; {new Date().getFullYear()} {siteName}. Đồ án tốt nghiệp.
          </p>
          <div className="flex items-center space-x-6">
            <Link to="/privacy" className="text-sm text-gray-600 hover:text-gray-300 transition-colors">Chính sách bảo mật</Link>
            <span className="text-gray-700/50">·</span>
            <Link to="/terms" className="text-sm text-gray-600 hover:text-gray-300 transition-colors">Điều khoản sử dụng</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
