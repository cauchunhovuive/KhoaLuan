import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  FiArrowRight, FiTrendingUp, FiUsers, FiShoppingBag, FiAward,
  FiZap, FiStar, FiChevronRight, FiShield, FiClock, FiHeart,
  FiLayers,
} from 'react-icons/fi';
import { fetchFeaturedProducts, fetchCategories } from '../store/productSlice';
import ProductCard from '../components/common/ProductCard';
import BannerSlider from '../components/common/BannerSlider';
import LazySection from '../components/common/LazySection';
import api from '../services/api';

/* ─── ScrollReveal hook ─── */
const useScrollReveal = (threshold = 0.12) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return [ref, visible];
};

/* ─── Section wrapper with scroll-reveal ─── */
const RevealSection = ({ children, className = '', delay = 0 }) => {
  const [ref, visible] = useScrollReveal();
  return (
    <section
      ref={ref}
      className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </section>
  );
};

/* ─── Section header ─── */
const SectionHeader = ({ badge, title, subtitle, action, align = 'left' }) => (
  <div className={`flex flex-col ${align === 'center' ? 'sm:items-center text-center' : 'sm:flex-row sm:items-end'} justify-between mb-10 md:mb-14 gap-4`}>
    <div className={align === 'center' ? 'max-w-xl mx-auto' : ''}>
      {badge && (
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-[10px] font-semibold uppercase tracking-[0.15em] mb-3.5">
          <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mr-2 animate-pulse-soft" />
          {badge}
        </div>
      )}
      <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-ink leading-[1.15] tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-ink-tertiary mt-2.5 md:text-lg leading-relaxed max-w-2xl">{subtitle}</p>
      )}
    </div>
    {action && (
      <Link
        to={action.to}
        className="group inline-flex items-center text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors shrink-0"
      >
        <span>{action.label}</span>
        <FiArrowRight className="ml-1.5 group-hover:translate-x-1 transition-transform duration-300" />
      </Link>
    )}
  </div>
);

/* ─── Feature card ─── */
const FeatureCard = ({ icon: Icon, title, desc, color = 'primary' }) => {
  const colorMap = {
    primary: { bg: 'from-primary-500 to-primary-600', light: 'bg-primary-50', text: 'text-primary-600' },
    emerald: { bg: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-600' },
    amber: { bg: 'from-amber-500 to-amber-600', light: 'bg-amber-50', text: 'text-amber-600' },
    violet: { bg: 'from-violet-500 to-violet-600', light: 'bg-violet-50', text: 'text-violet-600' },
  };
  const c = colorMap[color] || colorMap.primary;

  return (
    <div className="group card-double-bezel">
      <div className="card-inner p-6 md:p-7">
        <div className={`w-12 h-12 ${c.light} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-[0deg] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]`}>
          <Icon className={`text-xl ${c.text}`} />
        </div>
        <h3 className="text-base font-semibold text-ink mb-2">{title}</h3>
        <p className="text-sm text-ink-tertiary leading-relaxed">{desc}</p>
        <div className={`mt-5 h-0.5 w-0 ${c.light} rounded-full group-hover:w-full transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]`} />
      </div>
    </div>
  );
};

/* ─── ML Badge ─── */
const MLBadge = () => (
  <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-200/50 text-violet-700 text-[9px] font-semibold uppercase tracking-[0.12em]">
    <FiZap className="text-[10px] mr-1 text-violet-500" />
    AI Engine
  </div>
);

/* ─── HomePage ─── */
const HomePage = () => {
  const dispatch = useDispatch();
  const { featuredProducts, categories, loading } = useSelector((state) => state.products);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [personalizedRecs, setPersonalizedRecs] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [mlHealthy, setMlHealthy] = useState(false);

  useEffect(() => {
    dispatch(fetchFeaturedProducts());
    dispatch(fetchCategories());
  }, [dispatch]);

  // Fetch personalized ML recommendations
  useEffect(() => {
    if (isAuthenticated) {
      setRecsLoading(true);
      api.get('/recommendations/personalized')
        .then(({ data }) => setPersonalizedRecs(data.data?.recommendations || []))
        .catch(() => {})
        .finally(() => setRecsLoading(false));
    }
  }, [isAuthenticated]);

  // Fetch trending products from ML
  useEffect(() => {
    setTrendingLoading(true);
    api.get('/ml/trending')
      .then(({ data }) => setTrendingProducts(data.data?.products || data.data?.slice?.(0, 8) || []))
      .catch(() => {})
      .finally(() => setTrendingLoading(false));
  }, []);

  // Check ML health
  useEffect(() => {
    api.get('/ml/health')
      .then(({ data }) => setMlHealthy(data.data?.healthy || data.success || false))
      .catch(() => setMlHealthy(false));
  }, []);

  const features = [
    { icon: FiTrendingUp, title: 'Gợi ý thông minh', desc: 'AI phân tích hành vi mua sắm, gợi ý sản phẩm phù hợp nhất với bạn.', color: 'primary' },
    { icon: FiLayers, title: 'Phân cụm khách hàng', desc: 'Nhóm khách hàng theo hành vi, cá nhân hóa trải nghiệm từng nhóm.', color: 'violet' },
    { icon: FiShoppingBag, title: 'Đa dạng sản phẩm', desc: 'Hàng ngàn sản phẩm chất lượng từ các thương hiệu uy tín.', color: 'emerald' },
    { icon: FiAward, title: 'Ưu đãi độc quyền', desc: 'Khuyến mãi và flash sale dành riêng cho bạn dựa trên sở thích.', color: 'amber' },
  ];

  return (
    <div className="overflow-hidden">
      {/* ═══════════════ HERO ═══════════════ */}
      <div className="relative">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-800 via-primary-900 to-[#0f0a2e] overflow-hidden">
          <div className="absolute -top-40 -right-32 w-96 h-96 rounded-full bg-primary-500/20 blur-[100px] animate-breathe" />
          <div className="absolute -bottom-48 -left-32 w-[500px] h-[500px] rounded-full bg-violet-500/15 blur-[120px] animate-breathe" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/3 left-1/2 w-64 h-64 rounded-full bg-amber-500/8 blur-[80px] animate-breathe" style={{ animationDelay: '4s' }} />
        </div>

        {/* BannerSlider on dark background */}
        <div className="relative z-10">
          <BannerSlider />
        </div>

        {/* ML status pill floating */}
        {mlHealthy && (
          <div className="relative z-20 -mt-10 flex justify-center">
            <div className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-xl rounded-full shadow-premium-lg border border-white/80 text-xs font-medium text-ink-secondary animate-fadeSlideUp">
              <FiZap className="text-primary-500 mr-2" />
              <span>AI Gợi ý đang hoạt động</span>
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full ml-2 animate-pulse-soft" />
            </div>
          </div>
        )}

        {/* Floating stat pills */}
        <div className="relative z-20 max-w-7xl mx-auto px-6 md:px-12 -mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { icon: FiZap, label: 'AI Gợi ý', sub: 'Thông minh', color: 'from-violet-500 to-fuchsia-600' },
            { icon: FiShoppingBag, label: 'Sản phẩm', sub: 'Đa dạng', color: 'from-emerald-500 to-emerald-600' },
            { icon: FiShield, label: 'Bảo mật', sub: 'Tuyệt đối', color: 'from-blue-500 to-indigo-600' },
            { icon: FiClock, label: 'Giao hàng', sub: 'Siêu tốc', color: 'from-amber-500 to-orange-600' },
          ].map((pill, i) => (
            <div
              key={i}
              className="group flex items-center space-x-3 bg-white/80 backdrop-blur-xl rounded-2xl px-4 py-3.5 shadow-premium-lg border border-white/60 hover:shadow-premium-xl hover:-translate-y-0.5 transition-all duration-300"
              style={{ animation: `fadeSlideUp 0.6s ${0.1 + i * 0.08}s both` }}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${pill.color} flex items-center justify-center shadow-lg shrink-0`}>
                <pill.icon className="text-white text-sm" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">{pill.label}</p>
                <p className="text-[10px] text-ink-tertiary">{pill.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════ ML RECOMMENDATIONS ═══════════════ */}
      {isAuthenticated && (personalizedRecs.length > 0 || recsLoading) && (
        <LazySection placeholder={<div className="section-padding" />}>
        <RevealSection className="section-padding bg-gradient-to-b from-primary-50/40 via-white to-white" delay={100}>
          <div className="section-container">
            <SectionHeader
              badge={
                <span className="flex items-center">
                  <FiZap className="mr-1.5" /> Gợi ý cá nhân
                </span>
              }
              title={
                <span>
                  Dành riêng cho <span className="text-primary-600">bạn</span>
                </span>
              }
              subtitle="AI phân tích sở thích và hành vi mua sắm để gợi ý sản phẩm phù hợp nhất."
              action={{ to: '/products?rec=personalized', label: 'Xem tất cả gợi ý' }}
            />

            {recsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="skeleton-card" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 stagger-fade">
                {personalizedRecs.slice(0, 8).map((product, idx) => (
                  <ProductCard key={product.id} product={product} index={idx} />
                ))}
              </div>
            )}

            {/* ML engine attribution */}
            <div className="flex items-center justify-center mt-8 space-x-4 text-xs text-ink-tertiary">
              <div className="flex items-center space-x-1.5">
                <span className="w-1 h-1 rounded-full bg-primary-400" />
                <span>Collaborative Filtering</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-1 h-1 rounded-full bg-violet-400" />
                <span>Session-Based</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-1 h-1 rounded-full bg-amber-400" />
                <span>Trending</span>
              </div>
            </div>
          </div>
        </RevealSection>
        </LazySection>
      )}

      {/* ═══════════════ FEATURES ═══════════════ */}
      <LazySection>
      <RevealSection className="section-padding bg-white" delay={150}>
        <div className="section-container">
          <SectionHeader
            badge="Tính năng"
            title="Trải nghiệm mua sắm thông minh"
            subtitle="Hệ thống AI toàn diện giúp bạn tìm kiếm và mua sắm dễ dàng hơn."
            align="center"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            {features.map((f, i) => (
              <FeatureCard key={i} {...f} />
            ))}
          </div>
        </div>
      </RevealSection>
      </LazySection>

      {/* ═══════════════ TRENDING / ML HOT ═══════════════ */}
      <LazySection>
      <RevealSection
        className="section-padding relative overflow-hidden"
        delay={100}
      >
        {/* Subtle ambient bg */}
        <div className="absolute inset-0 bg-gradient-to-b from-surface-secondary via-white to-surface-secondary" />
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] rounded-full bg-primary-500/5 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-violet-500/5 blur-[100px]" />

        <div className="relative section-container">
          <SectionHeader
            badge={
              <span className="flex items-center">
                <FiTrendingUp className="mr-1.5" /> Xu hướng
              </span>
            }
            title={
              <span>
                Sản phẩm <span className="text-primary-600">thịnh hành</span>
              </span>
            }
            subtitle="Dựa trên phân tích AI về lượt xem, mua hàng và tương tác gần đây."
            action={{ to: '/products?sort=sold', label: 'Xem tất cả' }}
          />

          {trendingLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton-card" />
              ))}
            </div>
          ) : trendingProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 stagger-fade">
              {trendingProducts.slice(0, 8).map((product, idx) => (
                <ProductCard key={product.id} product={product} index={idx} />
              ))}
            </div>
          ) : (
            /* Fallback to featuredProducts if trending API is empty */
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 stagger-fade">
              {featuredProducts.slice(0, 8).map((product, idx) => (
                <ProductCard key={product.id} product={product} index={idx} />
              ))}
            </div>
          )}

          {/* ML badge */}
          <div className="flex items-center justify-center mt-8">
            <MLBadge />
          </div>
        </div>
      </RevealSection>
      </LazySection>

      {/* ═══════════════ FEATURED PRODUCTS ═══════════════ */}
      <LazySection>
      <RevealSection className="section-padding bg-white" delay={150}>
        <div className="section-container">
          <SectionHeader
            badge="Nổi bật"
            title="Sản phẩm bán chạy"
            subtitle="Được khách hàng yêu thích và tin dùng nhất."
            action={{ to: '/products', label: 'Khám phá thêm' }}
          />

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton-card" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 stagger-fade">
              {featuredProducts.map((product, idx) => (
                <ProductCard key={product.id} product={product} index={idx} />
              ))}
            </div>
          )}
        </div>
      </RevealSection>
      </LazySection>

      {/* ═══════════════ CATEGORIES ═══════════════ */}
      {categories.length > 0 && (
        <LazySection>
        <RevealSection
          className="section-padding relative overflow-hidden bg-gradient-to-b from-surface-secondary to-white"
          delay={100}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary-500/5 blur-[100px]" />

          <div className="relative section-container">
            <SectionHeader
              badge="Danh mục"
              title="Khám phá theo danh mục"
              subtitle="Duyệt qua các danh mục sản phẩm đa dạng."
              align="center"
            />

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5 stagger-fade">
              {categories.map((cat, idx) => (
                <Link
                  key={cat.id}
                  to={`/products?category=${cat.id}`}
                  className="group card-double-bezel"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div className="card-inner p-6 md:p-7 text-center">
                    {/* Decorative gradient icon */}
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center group-hover:from-primary-100 group-hover:to-primary-200 group-hover:scale-110 group-hover:rotate-2 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                      <FiShoppingBag className="text-xl text-primary-600 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <h3 className="text-sm font-semibold text-ink group-hover:text-primary-600 transition-colors duration-300">
                      {cat.name}
                    </h3>
                    {cat._count?.products > 0 && (
                      <p className="text-xs text-ink-tertiary mt-1.5">{cat._count.products} sản phẩm</p>
                    )}
                    <div className="mt-4 flex items-center justify-center text-primary-500 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Khám phá</span>
                      <FiChevronRight className="ml-1 text-xs" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </RevealSection>
        </LazySection>
      )}

      {/* ═══════════════ CTA BANNER ═══════════════ */}
      <LazySection>
      <RevealSection className="section-padding" delay={150}>
        <div className="section-container">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-800 via-primary-900 to-[#0f0a2e] p-8 md:p-14 lg:p-20">
            {/* Ambient glow */}
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary-500/20 blur-[80px]" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-violet-500/15 blur-[80px]" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="max-w-xl">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white/70 text-[10px] font-semibold uppercase tracking-[0.15em] mb-5">
                  <FiZap className="mr-1.5 text-primary-300" />
                  AI Platform
                </div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-[1.15] tracking-tight">
                  Sẵn sàng trải nghiệm{' '}
                  <span className="text-primary-300">mua sắm thông minh?</span>
                </h2>
                <p className="text-primary-100/70 mt-4 md:text-lg leading-relaxed max-w-lg">
                  Đăng ký ngay để nhận gợi ý cá nhân hóa từ AI và ưu đãi độc quyền.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <Link
                  to="/register"
                  className="group inline-flex items-center justify-center px-8 py-3.5 bg-white text-primary-700 rounded-2xl font-semibold hover:bg-primary-50 active:scale-[0.97] transition-all duration-300 shadow-premium-xl hover:shadow-premium-2xl"
                >
                  <span>Đăng ký ngay</span>
                  <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
                <Link
                  to="/products"
                  className="group inline-flex items-center justify-center px-8 py-3.5 border-2 border-white/20 text-white rounded-2xl font-medium hover:bg-white/10 active:scale-[0.97] transition-all duration-300"
                >
                  Khám phá sản phẩm
                </Link>
              </div>
            </div>
          </div>
        </div>
      </RevealSection>
      </LazySection>

      {/* ═══════════════ TRUST BADGES ═══════════════ */}
      <LazySection>
      <RevealSection className="pb-20 md:pb-28" delay={200}>
        <div className="section-container">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-xs text-ink-tertiary">
            {[
              { icon: FiShield, label: 'Thanh toán bảo mật' },
              { icon: FiHeart, label: 'Đổi trả trong 30 ngày' },
              { icon: FiClock, label: 'Giao hàng toàn quốc' },
              { icon: FiZap, label: 'Hỗ trợ AI 24/7' },
            ].map((badge, i) => (
              <div key={i} className="flex items-center space-x-2">
                <badge.icon className="text-primary-500" />
                <span>{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </RevealSection>
      </LazySection>
    </div>
  );
};

export default HomePage;
