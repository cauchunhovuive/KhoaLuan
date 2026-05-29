import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiArrowRight, FiTrendingUp, FiUsers, FiShoppingBag, FiAward } from 'react-icons/fi';
import { fetchFeaturedProducts, fetchCategories } from '../store/productSlice';
import ProductCard from '../components/common/ProductCard';
import LoadingSpinner from '../components/common/LoadingSpinner';

const HomePage = () => {
  const dispatch = useDispatch();
  const { featuredProducts, categories, loading } = useSelector((state) => state.products);

  useEffect(() => {
    dispatch(fetchFeaturedProducts());
    dispatch(fetchCategories());
  }, [dispatch]);

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Mua Sắm Thông Minh
              <span className="block text-primary-200">Với Gợi Ý Cá Nhân Hóa</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-100 mb-8">
              Hệ thống thông minh phân tích sở thích của bạn và gợi ý những sản phẩm phù hợp nhất.
            </p>
            <div className="flex space-x-4">
              <Link to="/products" className="bg-white text-primary-700 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors inline-flex items-center space-x-2">
                <span>Mua ngay</span>
                <FiArrowRight />
              </Link>
              <Link to="/products?sort=sold" className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors">
                Bán chạy
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { icon: FiTrendingUp, title: 'Gợi ý thông minh', desc: 'AI phân tích hành vi mua sắm của bạn' },
              { icon: FiUsers, title: 'Phân cụm khách hàng', desc: 'Trải nghiệm được cá nhân hóa theo nhóm' },
              { icon: FiShoppingBag, title: 'Đa dạng sản phẩm', desc: 'Hàng ngàn sản phẩm chất lượng' },
              { icon: FiAward, title: 'Ưu đãi độc quyền', desc: 'Khuyến mãi dành riêng cho bạn' },
            ].map((feature, idx) => (
              <div key={idx} className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="text-2xl text-primary-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Sản phẩm bán chạy</h2>
              <p className="text-gray-600 mt-1">Sản phẩm được yêu thích nhất</p>
            </div>
            <Link to="/products" className="text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-1">
              <span>Xem tất cả</span>
              <FiArrowRight />
            </Link>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Danh mục sản phẩm</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.id}`}
                className="card p-6 text-center hover:border-primary-300 group"
              >
                <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                  {cat.name}
                </h3>
                {cat._count?.products > 0 && (
                  <p className="text-sm text-gray-500 mt-1">{cat._count.products} sản phẩm</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
