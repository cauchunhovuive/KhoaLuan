import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FiMail, FiPhone, FiMapPin } from 'react-icons/fi';

const Footer = () => {
  const { siteName, siteDescription, siteContactEmail, siteContactPhone, siteContactAddress } = useSelector((state) => state.settings);

  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-2.5 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <span className="text-lg font-semibold text-white">{siteName}</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              {siteDescription}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Danh mục</h3>
            <ul className="space-y-3">
              <li><Link to="/products" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">Sản phẩm</Link></li>
              <li><Link to="/products?sort=sold" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">Bán chạy</Link></li>
              <li><Link to="/products?sort=-price" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">Giảm giá</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Hỗ trợ</h3>
            <ul className="space-y-3">
              <li><Link to="/about" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">Về chúng tôi</Link></li>
              <li><Link to="/contact" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">Liên hệ</Link></li>
              <li><Link to="/faq" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">FAQ</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Liên hệ</h3>
            <ul className="space-y-4">
              <li>
                <a href={`mailto:${siteContactEmail}`} className="flex items-start space-x-3 text-sm text-gray-400 hover:text-white transition-colors duration-200 group">
                  <FiMail className="mt-0.5 text-primary-400 group-hover:text-primary-300 transition-colors flex-shrink-0" />
                  <span>{siteContactEmail}</span>
                </a>
              </li>
              <li>
                <a href={`tel:${siteContactPhone}`} className="flex items-start space-x-3 text-sm text-gray-400 hover:text-white transition-colors duration-200 group">
                  <FiPhone className="mt-0.5 text-primary-400 group-hover:text-primary-300 transition-colors flex-shrink-0" />
                  <span>{siteContactPhone}</span>
                </a>
              </li>
              <li className="flex items-start space-x-3 text-sm text-gray-400">
                <FiMapPin className="mt-0.5 text-primary-400 flex-shrink-0" />
                <span>{siteContactAddress}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} {siteName}. Đồ án tốt nghiệp.
          </p>
          <div className="flex items-center space-x-6 text-sm text-gray-500">
            <Link to="/privacy" className="hover:text-gray-300 transition-colors">Chính sách bảo mật</Link>
            <Link to="/terms" className="hover:text-gray-300 transition-colors">Điều khoản sử dụng</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
