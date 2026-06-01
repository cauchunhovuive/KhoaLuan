import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FiShoppingBag, FiHeart, FiCalendar, FiBox, FiStar,
  FiPackage, FiUsers, FiArrowRight,
  FiGrid, FiX, FiSliders, FiFilter, FiMessageSquare,
} from 'react-icons/fi';
import api from '../services/api';
import ProductCard from '../components/common/ProductCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Pagination from '../components/common/Pagination';
import toast from 'react-hot-toast';

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Mới nhất' },
  { value: 'price', label: 'Giá: Thấp đến Cao' },
  { value: '-price', label: 'Giá: Cao đến Thấp' },
  { value: 'sold', label: 'Bán chạy' },
  { value: 'rating', label: 'Đánh giá cao' },
];

const REVIEW_SORT_OPTIONS = [
  { value: '-createdAt', label: 'Mới nhất' },
  { value: '-rating', label: 'Đánh giá cao nhất' },
  { value: 'rating', label: 'Đánh giá thấp nhất' },
];

const TABS = [
  { id: 'products', label: 'Sản phẩm', icon: FiGrid },
  { id: 'reviews', label: 'Đánh giá', icon: FiMessageSquare },
];

const ShopPage = () => {
  const { partnerId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Shop data
  const [shopData, setShopData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [activeCategory, setActiveCategory] = useState('');

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewPagination, setReviewPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [reviewStats, setReviewStats] = useState({ averageRating: 0, totalReviews: 0, ratingDistribution: {} });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewRatingFilter, setReviewRatingFilter] = useState('');
  const [reviewSort, setReviewSort] = useState('-createdAt');
  const [reviewsPage, setReviewsPage] = useState(1);

  // Active tab
  const [activeTab, setActiveTab] = useState('products');

  const currentPage = parseInt(searchParams.get('page')) || 1;
  const currentSort = searchParams.get('sort') || '-createdAt';

  // Fetch shop info and products
  const fetchShop = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, limit: 12, sort: currentSort };
      if (activeCategory) params.category = activeCategory;
      const { data } = await api.get(`/shops/${partnerId}`, { params });
      setShopData(data.data.partner);
      setProducts(data.data.products);
      setPagination(data.data.pagination);
      setFollowing(data.data.partner.isFollowing);
      setCategories(data.data.categories || []);
    } catch (err) {
      toast.error('Không thể tải thông tin cửa hàng');
    } finally {
      setLoading(false);
    }
  }, [partnerId, currentPage, currentSort, activeCategory]);

  // Fetch shop reviews
  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const params = { page: reviewsPage, limit: 10, sort: reviewSort };
      if (reviewRatingFilter) params.rating = reviewRatingFilter;
      const { data } = await api.get(`/shops/${partnerId}/reviews`, { params });
      setReviews(data.data.reviews);
      setReviewPagination(data.data.pagination);
      setReviewStats(data.data.stats);
    } catch (err) {
      // silent
    } finally {
      setReviewsLoading(false);
    }
  }, [partnerId, reviewsPage, reviewSort, reviewRatingFilter]);

  useEffect(() => {
    if (activeTab === 'products') {
      fetchShop();
    }
  }, [fetchShop, activeTab]);

  useEffect(() => {
    if (activeTab === 'reviews') {
      fetchReviews();
    }
  }, [fetchReviews, activeTab]);

  const updateParams = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    setSearchParams(params);
  };

  // Handle review filter change with page reset
  const handleReviewRatingFilterChange = (rating) => {
    const newRating = reviewRatingFilter === String(rating) ? '' : String(rating);
    setReviewRatingFilter(newRating);
    setReviewsPage(1);
  };

  const handleReviewSortChange = (sort) => {
    setReviewSort(sort);
    setReviewsPage(1);
  };

  // Filtered products (price range is client-side only)
  const filteredProducts = products.filter((p) => {
    if (priceRange.min && (p.discountPrice || p.price) < parseFloat(priceRange.min)) return false;
    if (priceRange.max && (p.discountPrice || p.price) > parseFloat(priceRange.max)) return false;
    return true;
  });

  // Handle category change with server-side filter
  const handleCategoryChange = (categoryId) => {
    setActiveCategory(categoryId);
    updateParams('page', '1');
  };

  const handleFollow = async () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để theo dõi cửa hàng');
      return;
    }
    setFollowLoading(true);
    try {
      if (following) {
        await api.delete(`/users/follow/${partnerId}`);
        setFollowing(false);
        setShopData((prev) => ({ ...prev, followerCount: prev.followerCount - 1 }));
        toast.success('Đã bỏ theo dõi cửa hàng');
      } else {
        await api.post('/users/follow', { partnerId });
        setFollowing(true);
        setShopData((prev) => ({ ...prev, followerCount: prev.followerCount + 1 }));
        toast.success('Đã theo dõi cửa hàng');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Thao tác thất bại');
    } finally {
      setFollowLoading(false);
    }
  };

  const clearFilters = () => {
    setActiveCategory('');
    setPriceRange({ min: '', max: '' });
    updateParams('page', '1');
  };

  const hasActiveFilters = activeCategory || priceRange.min || priceRange.max;

  // Loading skeleton
  if (loading && activeTab === 'products') {
    return (
      <div className="section-container py-8">
        {/* Shop header skeleton */}
        <div className="rounded-3xl bg-gradient-to-r from-primary-100 via-primary-50 to-surface overflow-hidden mb-8">
          <div className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="w-20 h-20 rounded-2xl skeleton" />
              <div className="flex-1 space-y-3">
                <div className="h-7 w-64 skeleton rounded" />
                <div className="h-4 w-96 skeleton rounded" />
                <div className="flex gap-4">
                  <div className="h-4 w-24 skeleton rounded" />
                  <div className="h-4 w-24 skeleton rounded" />
                  <div className="h-4 w-24 skeleton rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="rounded-2xl overflow-hidden">
              <div className="aspect-square skeleton" />
              <div className="p-4 space-y-2">
                <div className="h-3 w-16 skeleton rounded" />
                <div className="h-4 w-full skeleton rounded" />
                <div className="h-5 w-24 skeleton rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!shopData) {
    return (
      <div className="section-container py-20 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <FiShoppingBag className="text-3xl text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-ink mb-2">Cửa hàng không tồn tại</h2>
        <p className="text-ink-tertiary mb-6">Cửa hàng này không tồn tại hoặc chưa được phê duyệt</p>
        <Link to="/products" className="btn-primary">Khám phá sản phẩm</Link>
      </div>
    );
  }

  return (
    <div className="section-container py-8 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-ink-tertiary mb-6">
        <Link to="/" className="hover:text-primary-600 transition-colors">Trang chủ</Link>
        <span>/</span>
        <span className="text-ink font-medium truncate">{shopData.storeName}</span>
      </nav>

      {/* Shop Header - Hero Section */}
      <div className="relative rounded-3xl overflow-hidden mb-6 group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-500 to-primary-800" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative px-8 md:px-12 py-10 md:py-14">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white/20 backdrop-blur-sm ring-2 ring-white/30 flex items-center justify-center overflow-hidden shadow-premium-lg">
                {shopData.avatar ? (
                  <img src={shopData.avatar} alt={shopData.storeName} className="w-full h-full object-cover" />
                ) : (
                  <FiShoppingBag className="text-3xl md:text-4xl text-white" />
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-1.5 drop-shadow-sm">
                    {shopData.storeName}
                  </h1>
                  {shopData.storeDescription && (
                    <p className="text-white/80 text-sm md:text-base max-w-2xl leading-relaxed">
                      {shopData.storeDescription}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`flex-shrink-0 inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 active:scale-[0.98] ${
                    following
                      ? 'bg-white/20 text-white hover:bg-white/30 border border-white/20'
                      : 'bg-white text-primary-600 hover:bg-white/90 shadow-premium-md'
                  }`}
                >
                  <FiHeart className={`text-sm ${following ? 'fill-white' : ''}`} />
                  <span>{following ? 'Đang theo dõi' : 'Theo dõi'}</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4">
                <div className="flex items-center space-x-1.5 text-white/80 text-sm">
                  <FiPackage className="text-sm" />
                  <span><strong className="text-white font-semibold">{shopData.productCount}</strong> sản phẩm</span>
                </div>
                <div className="flex items-center space-x-1.5 text-white/80 text-sm">
                  <FiUsers className="text-sm" />
                  <span><strong className="text-white font-semibold">{shopData.followerCount}</strong> người theo dõi</span>
                </div>
                <div className="flex items-center space-x-1.5 text-white/80 text-sm">
                  <FiStar className="text-sm" />
                  <span>
                    <strong className="text-white font-semibold">{shopData.averageRating ? shopData.averageRating.toFixed(1) : '0.0'}</strong>
                    {' '}({shopData.totalReviews} đánh giá)
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 text-white/80 text-sm">
                  <FiShoppingBag className="text-sm" />
                  <span><strong className="text-white font-semibold">{shopData.totalSold}</strong> đã bán</span>
                </div>
                <div className="flex items-center space-x-1.5 text-white/80 text-sm">
                  <FiCalendar className="text-sm" />
                  <span>Tham gia {new Date(shopData.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-1 mb-6 bg-surface-secondary rounded-xl p-1 border border-gray-100">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white text-primary-600 shadow-premium-sm ring-1 ring-gray-200'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              <Icon className="text-sm" />
              <span>{tab.label}</span>
              {tab.id === 'reviews' && shopData.totalReviews > 0 && (
                <span className="text-xs bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded-full font-semibold">
                  {shopData.totalReviews}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============= PRODUCTS TAB ============= */}
      {activeTab === 'products' && (
        <div className="mt-2">
          {/* Filter & Sort Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn-secondary inline-flex items-center space-x-2 text-sm ${
                  hasActiveFilters ? 'ring-2 ring-primary-500/30 border-primary-300' : ''
                }`}
              >
                <FiSliders className="text-sm" />
                <span>Bộ lọc</span>
                {hasActiveFilters && (
                  <span className="w-2 h-2 bg-primary-600 rounded-full" />
                )}
              </button>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-1">
                  <FiX className="text-[10px]" />
                  <span>Xoá lọc</span>
                </button>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={currentSort}
                onChange={(e) => updateParams('sort', e.target.value)}
                className="input-field w-auto text-sm"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mb-6 p-5 bg-white rounded-2xl border border-gray-100 shadow-premium-sm animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-ink flex items-center space-x-2">
                  <FiFilter className="text-primary-600" />
                  <span>Bộ lọc sản phẩm</span>
                </h3>
                <button onClick={() => setShowFilters(false)} className="text-ink-tertiary hover:text-ink p-1 rounded-lg hover:bg-surface-secondary transition-colors">
                  <FiX size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category Filter */}
                <div>
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-2.5">Danh mục</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleCategoryChange('')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        !activeCategory
                          ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                          : 'bg-surface-secondary text-ink-secondary hover:bg-surface-tertiary'
                      }`}
                    >
                      Tất cả
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleCategoryChange(cat.id)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          activeCategory === cat.id
                            ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                            : 'bg-surface-secondary text-ink-secondary hover:bg-surface-tertiary'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range Filter */}
                <div>
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-2.5">Khoảng giá</label>
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        placeholder="Từ"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange((p) => ({ ...p, min: e.target.value }))}
                        className="input-field text-sm pl-7"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-tertiary">₫</span>
                    </div>
                    <span className="text-ink-tertiary text-sm">—</span>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        placeholder="Đến"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange((p) => ({ ...p, max: e.target.value }))}
                        className="input-field text-sm pl-7"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-tertiary">₫</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Product Count Info */}
          <p className="text-sm text-ink-tertiary mb-4">
            {hasActiveFilters
              ? `Hiển thị ${filteredProducts.length} / ${pagination.total} sản phẩm`
              : `${pagination.total} sản phẩm`
            }
          </p>

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 bg-surface-secondary rounded-2xl border border-gray-100">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-premium-sm">
                <FiBox className="text-2xl text-gray-300" />
              </div>
              <p className="text-ink-secondary font-medium mb-1">
                {hasActiveFilters ? 'Không có sản phẩm phù hợp' : 'Cửa hàng chưa có sản phẩm nào'}
              </p>
              <p className="text-sm text-ink-tertiary mb-4">
                {hasActiveFilters ? 'Thử thay đổi bộ lọc hoặc khoảng giá' : 'Hãy quay lại sau nhé!'}
              </p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="btn-primary text-sm">
                  Xoá bộ lọc
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 stagger-fade">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={{ ...product, partner: shopData }} hideStoreInfo />
                ))}
              </div>

              {!hasActiveFilters && pagination.totalPages > 1 && (
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={(page) => updateParams('page', page)}
                />
              )}
            </>
          )}

          {/* Explore more link */}
          {!hasActiveFilters && (
            <div className="mt-8 text-center">
              <Link
                to={`/products?partner=${partnerId}`}
                className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors group"
              >
                <span>Xem tất cả sản phẩm từ {shopData.storeName}</span>
                <FiArrowRight className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ============= REVIEWS TAB ============= */}
      {activeTab === 'reviews' && (
        <div className="mt-2">
          {/* Review Stats Summary */}
          {reviewStats.totalReviews > 0 && (
            <div className="card p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                {/* Average Rating */}
                <div className="text-center flex-shrink-0">
                  <div className="text-4xl font-bold text-ink">
                    {reviewStats.averageRating?.toFixed(1) || '0.0'}
                  </div>
                  <div className="flex items-center space-x-0.5 mt-1 justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FiStar
                        key={star}
                        className={`text-sm ${
                          star <= Math.round(reviewStats.averageRating || 0)
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-ink-tertiary mt-1">{reviewStats.totalReviews} đánh giá</p>
                </div>

                {/* Rating Distribution Bar */}
                <div className="flex-1 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = reviewStats.ratingDistribution?.[star] || 0;
                    const pct = reviewStats.totalReviews > 0 ? (count / reviewStats.totalReviews) * 100 : 0;
                    return (
                      <button
                        key={star}
                        onClick={() => handleReviewRatingFilterChange(star)}
                        className={`flex items-center space-x-2 text-xs w-full group ${
                          reviewRatingFilter === String(star) ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <span className="w-8 text-right text-ink-secondary font-medium">{star} ★</span>
                        <div className="flex-1 h-2.5 bg-surface-tertiary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              reviewRatingFilter === String(star)
                                ? 'bg-yellow-500'
                                : 'bg-yellow-400 group-hover:bg-yellow-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-ink-tertiary text-right">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rating filter tag */}
              {reviewRatingFilter && (
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center space-x-2">
                  <span className="text-xs text-ink-tertiary">Đang lọc:</span>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-medium border border-yellow-200">
                    <FiStar className="text-[10px]" />
                    <span>{reviewRatingFilter} sao</span>
                    <button onClick={() => setReviewRatingFilter('')} className="ml-0.5 hover:text-yellow-800">
                      <FiX size={12} />
                    </button>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Reviews Sort */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-ink-tertiary">
              {reviewPagination.total > 0
                ? `${reviewPagination.total} đánh giá`
                : 'Chưa có đánh giá nào'
              }
            </p>
            <select
              value={reviewSort}
              onChange={(e) => handleReviewSortChange(e.target.value)}
              className="input-field w-auto text-sm"
            >
              {REVIEW_SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Reviews List */}
          {reviewsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card p-5">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 rounded-xl skeleton" />
                    <div className="space-y-2">
                      <div className="h-4 w-24 skeleton rounded" />
                      <div className="h-3 w-16 skeleton rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-full skeleton rounded" />
                  <div className="h-4 w-3/4 skeleton rounded mt-2" />
                </div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-16 bg-surface-secondary rounded-2xl border border-gray-100">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-premium-sm">
                <FiMessageSquare className="text-2xl text-gray-300" />
              </div>
              <p className="text-ink-secondary font-medium mb-1">
                {reviewRatingFilter ? 'Không có đánh giá phù hợp' : 'Chưa có đánh giá nào'}
              </p>
              <p className="text-sm text-ink-tertiary">
                {reviewRatingFilter
                  ? 'Thử chọn mức đánh giá khác'
                  : 'Sản phẩm của cửa hàng chưa có đánh giá'
                }
              </p>
              {reviewRatingFilter && (
                <button onClick={() => setReviewRatingFilter('')} className="btn-primary text-sm mt-4">
                  Xoá bộ lọc sao
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviews.map((review) => (
                  <div key={review.id} className="card p-5 hover:border-gray-200 transition-all">
                    {/* User info */}
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center ring-1 ring-primary-100 flex-shrink-0">
                        <span className="text-primary-600 font-bold text-sm">
                          {review.user?.name?.[0] || '?'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink text-sm">{review.user?.name}</p>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <div className="flex items-center space-x-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <FiStar
                                key={star}
                                className={`text-xs ${
                                  star <= review.rating
                                    ? 'text-yellow-500 fill-yellow-500'
                                    : 'text-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-ink-tertiary">
                            {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Review comment */}
                    {review.comment && (
                      <p className="text-ink-secondary text-sm leading-relaxed">{review.comment}</p>
                    )}

                    {/* Product info */}
                    <Link
                      to={`/products/${review.product?.slug}`}
                      className="mt-3 pt-3 border-t border-gray-100 flex items-center space-x-2 group"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                        {review.product?.images?.[0] && (
                          <img src={review.product.images[0]} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <span className="text-xs text-ink-tertiary group-hover:text-primary-600 transition-colors truncate">
                        {review.product?.name}
                      </span>
                      <FiArrowRight className="text-[10px] text-ink-tertiary group-hover:text-primary-600 flex-shrink-0" />
                    </Link>

                    {/* Shop reply */}
                    {review.reply && (
                      <div className="mt-3 pt-3 border-t border-gray-100 pl-4 bg-surface-secondary/50 rounded-xl p-3">
                        <p className="text-xs font-semibold text-emerald-600 mb-1 flex items-center space-x-1">
                          <FiShoppingBag className="text-[10px]" />
                          <span>Phản hồi từ {shopData.storeName}:</span>
                        </p>
                        <p className="text-sm text-ink-secondary">{review.reply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {reviewPagination.totalPages > 1 && (
                <Pagination
                  page={reviewsPage}
                  totalPages={reviewPagination.totalPages}
                  onPageChange={(page) => setReviewsPage(page)}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ShopPage;
