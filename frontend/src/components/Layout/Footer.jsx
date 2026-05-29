import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FiPackage, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';

const Footer = () => {
  const { siteName, siteDescription, siteContactEmail, siteContactPhone, siteContactAddress } = useSelector((state) => state.settings);

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <FiPackage className="text-primary-400 text-2xl" />
              <span className="text-xl font-bold text-white">{siteName}</span>
            </div>
            <p className="text-sm text-gray-400">
              {siteDescription}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Danh mục</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/products" className="hover:text-white transition-colors">Sản phẩm</Link></li>
              <li><Link to="/products?sort=sold" className="hover:text-white transition-colors">Bán chạy</Link></li>
              <li><Link to="/products?sort=-price" className="hover:text-white transition-colors">Giảm giá</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-4">Hỗ trợ</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="hover:text-white transition-colors">Về chúng tôi</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Liên hệ</Link></li>
              <li><Link to="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Liên hệ</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center space-x-2">
                <FiMail className="text-primary-400" />
                <span>{siteContactEmail}</span>
              </li>
              <li className="flex items-center space-x-2">
                <FiPhone className="text-primary-400" />
                <span>{siteContactPhone}</span>
              </li>
              <li className="flex items-center space-x-2">
                <FiMapPin className="text-primary-400" />
                <span>{siteContactAddress}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} {siteName}. Đồ án tốt nghiệp.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
