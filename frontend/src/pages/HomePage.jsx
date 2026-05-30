import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiArrowRight, FiTrendingUp, FiUsers, FiShoppingBag, FiAward } from 'react-icons/fi';
import { fetchFeaturedProducts, fetchCategories } from '../store/productSlice';
import ProductCard from '../components/common/ProductCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import BannerSlider from '../components/common/BannerSlider';

const HomePage = () => {
  const dispatch = useDispatch();
  const { featuredProducts, categories, loading } = useSelector((state) => state.products);

  useEffect(() => {
    dispatch(fetchFeaturedProducts());
    dispatch(fetchCategories());
  }, [dispatch]);

  return (
    <div>
      {/* Banner Slider */}
      <BannerSlider />

      {/* Features */}
      <section className="section-padding bg-white">
        <div className="section-container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {[
              { icon: FiTrendingUp, title: 'Gợi ý thông minh', desc: 'AI phân tích hành vi mua sắm của bạn' },
              { icon: FiUsers, title: 'Phân cụm khách hàng', desc: 'Trải nghiệm được cá nhân hóa theo nhóm' },
              { icon: FiShoppingBag, title: 'Đa dạng sản phẩm', desc: 'Hàng ngàn sản phẩm chất lượng' },
              { icon: FiAward, title: 'Ưu đãi độc quyền', desc: 'Khuyến mãi dành riêng cho bạn' },
            ].map((feature, idx) => (
              <div key={idx} className="group p-6 rounded-2xl bg-surface-secondary border border-gray-100 hover:bg-white hover:shadow-premium-md hover:border-gray-200 transition-all duration-200">
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-100 transition-colors">
                  <feature.icon className="text-xl text-primary-600" />
                </div>
                <h3 className="font-semibold text-ink mb-1.5">{feature.title}</h3>
                <p className="text-sm text-ink-tertiary leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="section-padding bg-surface-secondary">
        <div className="section-container">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-semibold text-primary-600 uppercase tracking-widest">Nổi bật</span>
              <h2 className="text-2xl md:text-3xl font-bold text-ink mt-1">Sản phẩm bán chạy</h2>
              <p className="text-ink-tertiary mt-1.5">Sản phẩm được yêu thích nhất</p>
            </div>
            <Link to="/products" className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors group">
              <span>Xem tất cả</span>
              <FiArrowRight className="ml-1 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl overflow-hidden">
                  <div className="aspect-square shimmer-bg" />
                  <div className="p-4 space-y-3">
                    <div className="h-3 w-16 shimmer-bg rounded" />
                    <div className="h-4 w-full shimmer-bg rounded" />
                    <div className="h-5 w-24 shimmer-bg rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 stagger-fade">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="section-padding bg-white">
        <div className="section-container">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold text-primary-600 uppercase tracking-widest">Danh mục</span>
            <h2 className="text-2xl md:text-3xl font-bold text-ink mt-1">Danh mục sản phẩm</h2>
            <p className="text-ink-tertiary mt-1.5">Khám phá sản phẩm theo danh mục</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.id}`}
                className="group p-6 rounded-2xl bg-surface-secondary border border-gray-100 text-center hover:bg-white hover:shadow-premium-md hover:border-primary-200 hover:-translate-y-0.5 transition-all duration-200"
              >
                <h3 className="font-semibold text-ink group-hover:text-primary-600 transition-colors">
                  {cat.name}
                </h3>
                {cat._count?.products > 0 && (
                  <p className="text-sm text-ink-tertiary mt-1.5">{cat._count.products} sản phẩm</p>
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
