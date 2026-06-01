import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  FiShoppingCart, FiStar, FiMinus, FiPlus, FiSend, FiCheckCircle,
  FiShoppingBag, FiChevronRight, FiZap, FiClock,
  FiShield, FiTruck, FiRefreshCw,
} from 'react-icons/fi';
import { fetchProductBySlug, clearCurrentProduct } from '../store/productSlice';
import { addToCart } from '../store/cartSlice';
import api from '../services/api';
import LazySection from '../components/common/LazySection';
import LazyImage from '../components/common/LazyImage';
import toast from 'react-hot-toast';

/* ─── ScrollReveal hook ─── */
const useScrollReveal = (threshold = 0.08) => {
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

/* ─── Reveal wrapper ─── */
const Reveal = ({ children, delay = 0, className = '' }) => {
  const [ref, visible] = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

/* ─── Section badge ─── */
const SectionBadge = ({ icon: Icon, label, sublabel, color = 'primary' }) => {
  const colorMap = {
    primary: { bg: 'bg-primary-100', text: 'text-primary-600' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600' },
    violet: { bg: 'bg-violet-100', text: 'text-violet-600' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
  };
  const c = colorMap[color] || colorMap.primary;
  return (
    <div className="flex items-center space-x-3 mb-6">
      <div className={`w-10 h-10 ${c.bg} rounded-2xl flex items-center justify-center`}>
        <Icon className={`text-lg ${c.text}`} />
      </div>
      <div>
        <h3 className="text-lg md:text-xl font-bold text-ink">{label}</h3>
        {sublabel && <p className="text-xs text-ink-tertiary mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   PRODUCT DETAIL PAGE
   ═══════════════════════════════════════════ */

const ProductDetailPage = () => {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const { currentProduct: product, loading } = useSelector((state) => state.products);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [quantity, setQuantity] = useState(1);
  const [currentImage, setCurrentImage] = useState(0);

  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ averageRating: 0, totalReviews: 0 });
  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Related products (similar)
  const [sessionRecs, setSessionRecs] = useState([]);
  const [sessionRecsLoading, setSessionRecsLoading] = useState(false);

  useEffect(() => {
    dispatch(clearCurrentProduct());
    dispatch(fetchProductBySlug(slug));
    return () => dispatch(clearCurrentProduct());
  }, [dispatch, slug]);

  const fetchReviews = useCallback(() => {
    if (!product) return;
    api.get(`/reviews/product/${product.id}`).then(({ data }) => {
      if (data.success) {
        setReviews(data.data.reviews || []);
        setReviewStats(data.data.stats || {});
      }
    }).catch(() => {});
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const pid = product.id;

    // Log view
    api.post(`/products/${pid}/view`).catch(() => {});

    // Load related products — dùng API backend đã cache, nhanh hơn ML trực tiếp
    setSessionRecsLoading(true);
    api.get(`/recommendations/similar/${pid}`)
      .then(({ data }) => setSessionRecs(data.data || []))
      .catch(() => {})
      .finally(() => setSessionRecsLoading(false));
  }, [product]);

  useEffect(() => {
    if (product) {
      setCurrentImage(0);
      setQuantity(1);
      fetchReviews();
    }
  }, [product, fetchReviews]);

  const handleAddToCart = () => {
    if (!product) return;
    dispatch(addToCart({ productId: product.id, quantity }))
      .unwrap()
      .then(() => toast.success('Đã thêm vào giỏ hàng'))
      .catch((err) => toast.error(err));
  };

  const handleSubmitReview = async () => {
    if (newRating === 0) { toast.error('Vui lòng chọn số sao đánh giá'); return; }
    if (!newComment.trim()) { toast.error('Vui lòng nhập nội dung đánh giá'); return; }
    setSubmittingReview(true);
    try {
      await api.post('/reviews', { productId: product.id, rating: newRating, comment: newComment.trim() });
      toast.success('Đánh giá thành công!');
      setNewRating(0);
      setNewComment('');
      fetchReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gửi đánh giá thất bại');
    } finally {
      setSubmittingReview(false);
    }
  };

  const price = product?.discountPrice || product?.price || 0;
  const hasDiscount = product?.discountPrice && product.discountPrice < product.price;

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="section-container py-8 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          <div className="space-y-4">
            <div className="aspect-square skeleton-bg rounded-3xl" />
            <div className="flex space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-16 h-16 skeleton-bg rounded-2xl" />
              ))}
            </div>
          </div>
          <div className="space-y-6 pt-4">
            <div className="h-3 w-24 skeleton-bg rounded" />
            <div className="h-8 w-full skeleton-bg rounded-lg" />
            <div className="h-6 w-48 skeleton-bg rounded" />
            <div className="h-16 w-full skeleton-bg rounded-xl" />
            <div className="h-20 w-full skeleton-bg rounded-xl" />
            <div className="h-12 w-56 skeleton-bg rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="section-container py-20 text-center">
        <div className="max-w-md mx-auto">
          <FiShoppingBag className="mx-auto text-5xl text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-ink mb-2">Không tìm thấy sản phẩm</h2>
          <p className="text-ink-tertiary text-sm mb-6">Sản phẩm này không tồn tại hoặc đã bị xoá.</p>
          <Link to="/products" className="btn-primary inline-flex items-center space-x-2 px-6 py-3">
            <span>Quay lại cửa hàng</span>
            <FiChevronRight />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="section-container py-8 animate-fade-in">
        {/* ═══ Breadcrumb ═══ */}
        <nav className="flex items-center space-x-2 text-xs text-ink-tertiary mb-8">
          <Link to="/" className="hover:text-primary-600 transition-colors">Trang chủ</Link>
          <span className="text-gray-300">/</span>
          <Link to="/products" className="hover:text-primary-600 transition-colors">Sản phẩm</Link>
          <span className="text-gray-300">/</span>
          {product.category?.name && (
            <>
              <Link to={`/products?category=${product.category.id}`} className="hover:text-primary-600 transition-colors">{product.category.name}</Link>
              <span className="text-gray-300">/</span>
            </>
          )}
          <span className="text-ink font-medium truncate max-w-[200px]">{product.name}</span>
        </nav>

        {/* ═══════════════ MAIN GRID ═══════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* ── LEFT: Images (7 col) ── */}
          <div className="lg:col-span-7 space-y-4">
            {/* Main image - double bezel */}
            <div className="card-double-bezel overflow-hidden">
              <div className="card-inner p-0 overflow-hidden rounded-[calc(1.25rem-0.375rem)]">
                {product.images?.[currentImage] ? (
                  <div className="relative overflow-hidden group">
                    <LazyImage
                      key={currentImage}
                      src={product.images[currentImage]}
                      alt={product.name}
                      wrapperClassName="aspect-[4/3] md:aspect-square"
                      className="group-hover:scale-105 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
                    />
                    {/* Subtle overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  </div>
                ) : (
                  <div className="aspect-[4/3] md:aspect-square bg-surface-secondary flex items-center justify-center text-gray-300">
                    <FiShoppingCart className="text-6xl" />
                  </div>
                )}
              </div>
            </div>

            {/* Thumbnails */}
            {product.images?.length > 1 && (
              <div className="flex space-x-2.5">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImage(idx)}
                    className={`card-double-bezel overflow-hidden transition-all duration-300 ${
                      idx === currentImage ? 'ring-2 ring-primary-500/40 ring-offset-[3px]' : 'opacity-60 hover:opacity-90'
                    }`}
                  >
                    <div className="card-inner p-0 overflow-hidden rounded-[calc(1.25rem-0.375rem)]">
                      <LazyImage src={img} alt="" wrapperClassName="w-16 h-16" className="object-cover" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Info (5 col) ── */}
          <div className="lg:col-span-5 space-y-6">
            {/* Category + badges */}
            <div className="flex items-center space-x-3">
              {product.category?.name && (
                <span className="badge-premium">{product.category.name}</span>
              )}
              {hasDiscount && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-bold border border-red-200">
                  Giảm {Math.round((1 - product.discountPrice / product.price) * 100)}%
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-ink leading-[1.1] tracking-tight">
              {product.name}
            </h1>

            {/* Rating + Sold */}
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1">
              <div className="flex items-center space-x-1.5">
                <div className="flex items-center space-x-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FiStar
                      key={star}
                      className={`text-sm ${star <= Math.round(product.rating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'}`}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold text-ink">{product.rating?.toFixed(1) || '0.0'}</span>
                <span className="text-xs text-ink-tertiary">({product.reviewCount || 0} đánh giá)</span>
              </div>
              <span className="text-gray-300 hidden sm:inline">|</span>
              <span className="text-sm text-ink-secondary flex items-center space-x-1.5">
                <FiShoppingBag className="text-xs" />
                <span>{product.soldCount || 0} đã bán</span>
              </span>
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-ink-secondary leading-relaxed text-sm md:text-base">{product.description}</p>
            )}

            {/* Price - double bezel */}
            <div className="card-double-bezel">
              <div className="card-inner">
                <div className="flex items-baseline space-x-3">
                  <span className="text-3xl md:text-4xl font-bold text-primary-600 tracking-tight">
                    {price.toLocaleString('vi-VN')}₫
                  </span>
                  {hasDiscount && (
                    <>
                      <span className="text-lg text-ink-tertiary line-through">
                        {product.price.toLocaleString('vi-VN')}₫
                      </span>
                    </>
                  )}
                </div>
                {hasDiscount && (
                  <p className="text-xs text-emerald-600 mt-2 flex items-center space-x-1">
                    <FiZap className="text-[10px]" />
                    <span>Tiết kiệm {(product.price - product.discountPrice).toLocaleString('vi-VN')}₫</span>
                  </p>
                )}
              </div>
            </div>

            {/* Shop Info - double bezel glass */}
            {product.partner?.storeName && (
              <Link
                to={`/shop/${product.partner.id}`}
                className="block group card-double-bezel hover:ring-1 hover:ring-primary-200/50 transition-all duration-300"
              >
                <div className="card-inner flex items-center justify-between">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-50 rounded-2xl flex items-center justify-center flex-shrink-0 ring-1 ring-primary-200/50">
                      {product.partner.avatar ? (
                        <LazyImage src={product.partner.avatar} alt={product.partner.storeName} wrapperClassName="w-full h-full" className="object-cover rounded-2xl" />
                      ) : (
                        <FiShoppingBag className="text-xl text-primary-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-ink-tertiary uppercase tracking-[0.15em] font-semibold mb-0.5">Cửa hàng</p>
                      <p className="font-semibold text-ink group-hover:text-primary-600 transition-colors duration-300">
                        {product.partner.storeName}
                      </p>
                      {product.partner.storeDescription && (
                        <p className="text-xs text-ink-tertiary mt-0.5 line-clamp-1">{product.partner.storeDescription}</p>
                      )}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 group-hover:translate-x-0.5 transition-all duration-300">
                    <FiChevronRight className="text-primary-600 text-sm" />
                  </div>
                </div>
              </Link>
            )}

            {/* Quantity + Add to Cart - double bezel */}
            <div className="card-double-bezel">
              <div className="card-inner space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-[0.1em]">Số lượng</p>
                  <div className="flex items-center">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-secondary hover:bg-surface-tertiary active:scale-90 transition-all duration-200"
                    >
                      <FiMinus size={14} className="text-ink-secondary" />
                    </button>
                    <span className="w-12 text-center font-semibold text-ink">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-secondary hover:bg-surface-tertiary active:scale-90 transition-all duration-200"
                    >
                      <FiPlus size={14} className="text-ink-secondary" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-ink-tertiary flex items-center space-x-1">
                  <FiShoppingBag className="text-[10px]" />
                  <span>Còn <strong className="text-ink">{product.stock}</strong> sản phẩm trong kho</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={handleAddToCart}
                    disabled={product.stock === 0}
                    className="group relative overflow-hidden inline-flex items-center justify-center px-6 py-3.5 bg-primary-600 text-white rounded-2xl font-semibold hover:bg-primary-700 active:scale-[0.97] transition-all duration-200 shadow-premium-md hover:shadow-premium-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <FiShoppingCart className="mr-2 group-hover:scale-110 transition-transform duration-300" />
                    <span>{product.stock === 0 ? 'Hết hàng' : 'Thêm vào giỏ hàng'}</span>
                  </button>

                  {isAuthenticated && (
                    <Link
                      to="/checkout"
                      onClick={() => dispatch(addToCart({ productId: product.id, quantity }))}
                      className="inline-flex items-center justify-center px-6 py-3.5 border-2 border-primary-600 text-primary-600 rounded-2xl font-semibold hover:bg-primary-50 active:scale-[0.97] transition-all duration-200 group"
                    >
                      <span>Mua ngay</span>
                      <FiChevronRight className="ml-1 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: FiTruck, label: 'Giao hàng', sub: 'Toàn quốc' },
                { icon: FiRefreshCw, label: 'Đổi trả', sub: 'Trong 30 ngày' },
                { icon: FiShield, label: 'Bảo hành', sub: 'Chính hãng' },
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-surface-secondary border border-gray-100">
                  <item.icon className="text-primary-600 text-lg mb-1.5" />
                  <p className="text-xs font-semibold text-ink">{item.label}</p>
                  <p className="text-[9px] text-ink-tertiary">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════ ML SESSION RECOMMENDATIONS ═══════════════ */}
        {(sessionRecs.length > 0 || sessionRecsLoading) && (
          <LazySection placeholder={<div className="mt-16" />}>
          <Reveal className="mt-16 md:mt-20" delay={100}>
            <section>
              <SectionBadge icon={FiZap} label="Sản phẩm liên quan" sublabel="Gợi ý từ AI dựa trên sản phẩm bạn đang xem" color="purple" />
              {sessionRecsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="card-double-bezel">
                      <div className="card-inner p-0 overflow-hidden rounded-[calc(1.25rem-0.375rem)]">
                        <div className="aspect-square skeleton-bg" />
                        <div className="p-3 space-y-2">
                          <div className="h-3 w-full skeleton-bg rounded" />
                          <div className="h-4 w-20 skeleton-bg rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 stagger-fade">
                  {sessionRecs.map((item) => (
                    <Link
                      key={item.id}
                      to={`/products/${item.slug}`}
                      className="group card-double-bezel"
                    >
                      <div className="card-inner p-0 overflow-hidden rounded-[calc(1.25rem-0.375rem)]">
                        <div className="relative aspect-square bg-surface-secondary overflow-hidden">
                          {item.images?.[0] ? (
                            <LazyImage
                              src={item.images[0]}
                              alt={item.name}
                              wrapperClassName="w-full h-full"
                              className="object-cover group-hover:scale-105 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <FiShoppingBag className="text-2xl" />
                            </div>
                          )}
                          {/* ML indicator */}
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-white/80 backdrop-blur-md rounded-md text-[8px] font-semibold text-purple-600 shadow-sm">
                            <FiZap className="inline mr-0.5 text-[7px]" /> AI
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-xs font-medium text-ink truncate group-hover:text-primary-600 transition-colors">{item.name}</p>
                          <p className="text-sm font-bold text-primary-600 mt-1">{(item.discountPrice || item.price).toLocaleString('vi-VN')}₫</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </Reveal>
          </LazySection>
        )}

        {/* ═══════════════ REVIEWS ═══════════════ */}
        <LazySection placeholder={<div className="mt-16" />}>
        <Reveal className="mt-16 md:mt-20" delay={150}>
          <section>
            <SectionBadge icon={FiStar} label="Đánh giá sản phẩm" sublabel={`${reviewStats.totalReviews || reviews.length} đánh giá từ khách hàng`} />

            {/* ── Review Stats Summary - double bezel ── */}
            {reviewStats.totalReviews > 0 && (
              <div className="card-double-bezel mb-8">
                <div className="card-inner">
                  <div className="flex flex-col md:flex-row items-center md:items-start md:space-x-10 space-y-6 md:space-y-0">
                    {/* Score */}
                    <div className="text-center shrink-0">
                      <div className="text-5xl font-bold text-ink tracking-tight">{reviewStats.averageRating?.toFixed(1) || '0.0'}</div>
                      <div className="flex items-center space-x-0.5 mt-1 justify-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <FiStar
                            key={star}
                            className={`text-lg ${star <= Math.round(reviewStats.averageRating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'}`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-ink-tertiary mt-1.5">{reviewStats.totalReviews} đánh giá</p>
                    </div>

                    {/* Distribution */}
                    <div className="flex-1 w-full max-w-md space-y-2">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = reviewStats.ratingDistribution?.[star] || 0;
                        const pct = reviewStats.totalReviews > 0 ? (count / reviewStats.totalReviews) * 100 : 0;
                        return (
                          <div key={star} className="flex items-center space-x-2.5">
                            <span className="w-10 text-right text-xs text-ink-secondary font-medium shrink-0">{star} ★</span>
                            <div className="flex-1 h-2.5 bg-surface-tertiary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-yellow-500 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-8 text-xs text-ink-tertiary font-medium">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Review Form - double bezel ── */}
            {isAuthenticated && (
              <div className="card-double-bezel mb-8">
                <div className="card-inner">
                  <h3 className="font-semibold text-ink mb-5 flex items-center space-x-2">
                    <FiSend className="text-primary-600 text-sm" />
                    <span>Viết đánh giá của bạn</span>
                  </h3>

                  <div className="flex items-center space-x-1 mb-5">
                    <p className="text-sm text-ink-secondary mr-3">Chất lượng:</p>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-0.5 transition-transform hover:scale-110 active:scale-90"
                      >
                        <FiStar
                          className={`text-2xl transition-all duration-150 ${
                            star <= (hoverRating || newRating)
                              ? 'text-yellow-500 fill-yellow-500 drop-shadow-sm'
                              : 'text-gray-300 hover:text-yellow-400'
                          }`}
                        />
                      </button>
                    ))}
                    {newRating > 0 && (
                      <span className="ml-2 text-sm font-medium text-ink">
                        {['', 'Tệ', 'Không hài lòng', 'Bình thường', 'Hài lòng', 'Tuyệt vời'][newRating]}
                      </span>
                    )}
                  </div>

                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
                    rows={3}
                    className="w-full px-4 py-3 bg-surface-secondary border border-gray-200 rounded-2xl text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 resize-none"
                  />

                  <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-ink-tertiary">
                      <FiCheckCircle className="inline mr-1.5 text-emerald-500" />
                      Bạn cần đã mua và nhận được hàng để đánh giá
                    </p>
                    <button
                      onClick={handleSubmitReview}
                      disabled={submittingReview}
                      className="group inline-flex items-center space-x-2 px-5 py-2.5 bg-primary-600 text-white rounded-2xl font-semibold text-sm hover:bg-primary-700 active:scale-[0.97] transition-all duration-200 shadow-premium-sm disabled:opacity-50"
                    >
                      <FiSend size={14} className="group-hover:scale-110 transition-transform" />
                      <span>{submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Review List ── */}
            {reviews.length === 0 ? (
              <div className="text-center py-16 bg-surface-secondary rounded-3xl border border-gray-100">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-premium-sm">
                  <FiStar className="text-2xl text-gray-300" />
                </div>
                <p className="text-ink-secondary font-medium mb-1">Chưa có đánh giá nào</p>
                <p className="text-xs text-ink-tertiary">Hãy là người đầu tiên đánh giá sản phẩm này</p>
                {!isAuthenticated && (
                  <Link to="/login" className="text-primary-600 text-sm font-semibold hover:underline mt-3 inline-block">
                    Đăng nhập để đánh giá →
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-fade">
                {reviews.map((review) => (
                  <div key={review.id} className="card-double-bezel">
                    <div className="card-inner">
                      <div className="flex items-start space-x-3.5">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-50 rounded-2xl flex items-center justify-center flex-shrink-0 ring-1 ring-primary-200/50">
                          <span className="text-primary-600 font-bold text-sm">{review.user?.name?.[0] || '?'}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-ink text-sm">{review.user?.name}</p>
                            <span className="text-[10px] text-ink-tertiary flex items-center space-x-1">
                              <FiClock className="text-[8px]" />
                              <span>{new Date(review.createdAt).toLocaleDateString('vi-VN')}</span>
                            </span>
                          </div>
                          <div className="flex items-center space-x-0.5 mt-1.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <FiStar
                                key={star}
                                className={`text-xs ${star <= review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'}`}
                              />
                            ))}
                          </div>
                          {review.comment && (
                            <p className="text-sm text-ink-secondary mt-3 leading-relaxed">{review.comment}</p>
                          )}
                          {review.reply && (
                            <div className="mt-4 pt-4 border-t border-gray-100 pl-4 relative">
                              <div className="absolute left-0 top-4 w-2 h-px bg-emerald-300" />
                              <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1.5">Phản hồi từ shop</p>
                              <p className="text-sm text-ink-secondary">{review.reply}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </Reveal>
        </LazySection>
      </div>

    </div>
  );
};

export default ProductDetailPage;
