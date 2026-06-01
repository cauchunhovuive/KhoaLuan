import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  FiSearch, FiArrowLeft, FiSliders, FiX,
  FiTrendingUp, FiZap, FiPackage, FiChevronRight,
  FiRotateCcw,
} from 'react-icons/fi';
import { fetchProducts, fetchCategories } from '../store/productSlice';
import ProductCard from '../components/common/ProductCard';
import Pagination from '../components/common/Pagination';
import api from '../services/api';

const SORT_OPTIONS = [
  { value: '', label: 'Mặc định' },
  { value: 'price_asc', label: 'Giá: Thấp → Cao' },
  { value: 'price_desc', label: 'Giá: Cao → Thấp' },
  { value: 'newest', label: 'Mới nhất' },
  { value: 'sold', label: 'Bán chạy' },
  { value: 'rating', label: 'Đánh giá cao' },
];

const PRICE_RANGES = [
  { value: '', label: 'Tất cả mức giá' },
  { value: '0-100000', label: 'Dưới 100.000₫' },
  { value: '100000-300000', label: '100.000₫ - 300.000₫' },
  { value: '300000-500000', label: '300.000₫ - 500.000₫' },
  { value: '500000-1000000', label: '500.000₫ - 1.000.000₫' },
  { value: '1000000-99999999', label: 'Trên 1.000.000₫' },
];

/* ─── SearchPage ─── */
const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();
  const { products, pagination, loading } = useSelector((state) => state.products);
  const { categories } = useSelector((state) => state.products);

  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page')) || 1;
  const sort = searchParams.get('sort') || '';
  const categoryFilter = searchParams.get('category') || '';
  const priceRange = searchParams.get('price') || '';

  // Local search input
  const [searchInput, setSearchInput] = useState(query);
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const searchRef = useRef(null);
  const suggestDebounce = useRef(null);

  // Fetch categories on mount
  useEffect(() => {
    if (categories.length === 0) {
      dispatch(fetchCategories());
    }
  }, [dispatch, categories.length]);

  // Fetch products
  useEffect(() => {
    if (query) {
      dispatch(fetchProducts({ search: query, page, limit: 12, sort, category: categoryFilter, price: priceRange }));
    }
  }, [dispatch, query, page, sort, categoryFilter, priceRange]);

  // Sync searchInput with query param
  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  // ML suggestions with debounce
  const fetchSuggestions = useCallback(async (q) => {
    if (!q || q.length < 2) { setSuggestions([]); return; }
    setSuggestionsLoading(true);
    try {
      const { data } = await api.get('/products', { params: { search: q, limit: 5 } });
      const results = data.data?.products || [];
      setSuggestions(results.slice(0, 5));
      setShowSuggestions(results.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  // Clear debounce on unmount to prevent state updates after unmount
  useEffect(() => {
    return () => {
      if (suggestDebounce.current) clearTimeout(suggestDebounce.current);
    };
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    if (suggestDebounce.current) clearTimeout(suggestDebounce.current);
    if (val.length >= 2) {
      suggestDebounce.current = setTimeout(() => fetchSuggestions(val), 250);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSearch = (e) => {
    e?.preventDefault();
    if (!searchInput.trim()) return;
    const params = new URLSearchParams();
    params.set('q', searchInput.trim());
    if (sort) params.set('sort', sort);
    if (categoryFilter) params.set('category', categoryFilter);
    if (priceRange) params.set('price', priceRange);
    setSearchParams(params);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchInput(suggestion.name);
    const params = new URLSearchParams();
    params.set('q', suggestion.name);
    setSearchParams(params);
    setShowSuggestions(false);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'q') params.delete('page'); // Reset page on filter change
    setSearchParams(params);
  };

  const clearFilters = () => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    setSearchParams(params);
  };

  const hasActiveFilters = sort || categoryFilter || priceRange;

  return (
    <div className="overflow-hidden">
      <div className="section-container py-6 md:py-8 animate-fade-in">
        {/* ═══ Breadcrumb ═══ */}
        <nav className="flex items-center space-x-2 text-xs text-ink-tertiary mb-6">
          <Link to="/" className="hover:text-primary-600 transition-colors">Trang chủ</Link>
          <span className="text-gray-300">/</span>
          <Link to="/products" className="hover:text-primary-600 transition-colors">Sản phẩm</Link>
          {query && (
            <>
              <span className="text-gray-300">/</span>
              <span className="text-ink font-medium truncate max-w-[150px]">Tìm kiếm: {query}</span>
            </>
          )}
        </nav>

        {/* ═══════════════ SEARCH HEADER ═══════════════ */}
        <div className="mb-8">
          <Link to="/products" className="inline-flex items-center space-x-1.5 text-ink-tertiary hover:text-primary-600 mb-5 transition-colors text-sm group">
            <FiArrowLeft className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Tất cả sản phẩm</span>
          </Link>

          {/* Premium Search Bar */}
          <div ref={searchRef} className="relative">
            <form onSubmit={handleSearch}>
              <div className="relative card-double-bezel">
                <div className="card-inner p-1">
                  <div className="flex items-center">
                    <div className="flex items-center justify-center w-12 h-12 shrink-0">
                      <FiSearch className="text-lg text-ink-tertiary" />
                    </div>
                    <input
                      type="text"
                      value={searchInput}
                      onChange={handleInputChange}
                      onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                      placeholder="Tìm kiếm sản phẩm..."
                      className="flex-1 bg-transparent border-none outline-none text-ink placeholder:text-gray-400 text-base md:text-lg font-medium"
                      autoComplete="off"
                    />
                    {searchInput && (
                      <button
                        type="button"
                        onClick={() => { setSearchInput(''); setSuggestions([]); setShowSuggestions(false); }}
                        className="w-8 h-8 rounded-full hover:bg-surface-secondary flex items-center justify-center transition-colors mr-1"
                      >
                        <FiX className="text-sm text-ink-tertiary" />
                      </button>
                    )}
                    <button
                      type="submit"
                      className="group relative overflow-hidden inline-flex items-center px-5 py-2.5 bg-primary-600 text-white rounded-xl font-semibold text-sm hover:bg-primary-700 active:scale-[0.97] transition-all duration-200 mr-1"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      <FiSearch className="mr-1.5 group-hover:scale-110 transition-transform" />
                      <span className="hidden sm:inline">Tìm kiếm</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* ML Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-2 card-double-bezel animate-scale-in origin-top">
                <div className="card-inner p-2">
                  <p className="px-3 py-2 text-[9px] font-semibold text-ink-tertiary uppercase tracking-[0.15em] flex items-center space-x-1.5">
                    <FiZap className="text-primary-500" />
                    <span>Gợi ý tìm kiếm</span>
                  </p>
                  <div className="space-y-0.5">
                    {suggestions.map((s, idx) => (
                      <button
                        key={s.id || idx}
                        onClick={() => handleSuggestionClick(s)}
                        className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-primary-50/70 transition-colors text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-surface-secondary overflow-hidden flex-shrink-0">
                          {s.images?.[0] ? (
                            <img src={s.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FiPackage className="text-xs text-ink-tertiary" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-ink truncate group-hover:text-primary-600 transition-colors">
                            {s.name}
                          </p>
                          <p className="text-xs text-ink-tertiary">
                            {(s.discountPrice || s.price)?.toLocaleString('vi-VN')}₫
                          </p>
                        </div>
                        <FiChevronRight className="text-xs text-gray-300 group-hover:text-primary-400 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Search Stats + Filter Toggle */}
          <div className="flex items-center justify-between mt-5">
            <div className="flex items-center space-x-2 text-sm text-ink-tertiary">
              {query && (
                <span>
                  Kết quả cho "<span className="font-medium text-ink">{query}</span>"
                </span>
              )}
              {pagination.total > 0 && (
                <span className="text-xs">· {pagination.total} sản phẩm</span>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 active:scale-[0.97] ${
                showFilters || hasActiveFilters
                  ? 'bg-primary-50 text-primary-700 border border-primary-200'
                  : 'bg-surface-secondary text-ink-secondary border border-gray-200 hover:bg-surface-tertiary'
              }`}
            >
              <FiSliders className={`text-sm transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
              <span>Bộ lọc</span>
              {hasActiveFilters && (
                <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {(!!sort + !!categoryFilter + !!priceRange)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ═══════════════ FILTERS PANEL ═══════════════ */}
        <div
          className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            showFilters ? 'max-h-[600px] opacity-100 mb-6' : 'max-h-0 opacity-0 mb-0'
          }`}
        >
          <div className="card-double-bezel">
            <div className="card-inner">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Category Filter */}
                <div>
                  <p className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-[0.12em] mb-2.5">Danh mục</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => updateParam('category', '')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 active:scale-[0.97] ${
                        !categoryFilter
                          ? 'bg-primary-600 text-white shadow-premium-sm'
                          : 'bg-surface-secondary text-ink-secondary hover:bg-surface-tertiary border border-gray-200'
                      }`}
                    >
                      Tất cả
                    </button>
                    {categories.slice(0, 8).map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => updateParam('category', categoryFilter === cat.id ? '' : cat.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 active:scale-[0.97] ${
                          categoryFilter === cat.id
                            ? 'bg-primary-600 text-white shadow-premium-sm'
                            : 'bg-surface-secondary text-ink-secondary hover:bg-surface-tertiary border border-gray-200'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <p className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-[0.12em] mb-2.5">Khoảng giá</p>
                  <div className="space-y-1.5">
                    {PRICE_RANGES.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => updateParam('price', priceRange === r.value ? '' : r.value)}
                        className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 active:scale-[0.97] ${
                          priceRange === r.value
                            ? 'bg-primary-50 text-primary-700 border border-primary-200'
                            : 'bg-surface-secondary text-ink-secondary hover:bg-surface-tertiary border border-gray-200'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <p className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-[0.12em] mb-2.5">Sắp xếp</p>
                  <div className="space-y-1.5">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updateParam('sort', sort === opt.value ? '' : opt.value)}
                        className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 active:scale-[0.97] ${
                          sort === opt.value
                            ? 'bg-primary-50 text-primary-700 border border-primary-200'
                            : 'bg-surface-secondary text-ink-secondary hover:bg-surface-tertiary border border-gray-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center space-x-1.5 text-xs font-medium text-ink-tertiary hover:text-red-500 transition-colors"
                  >
                    <FiRotateCcw className="text-xs" />
                    <span>Xoá bộ lọc</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════ RESULTS ═══════════════ */}
        {loading ? (
          /* Premium skeleton grid */
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-2">
              <div className="h-4 w-32 skeleton-bg rounded" />
              <div className="h-4 w-20 skeleton-bg rounded" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="card-double-bezel">
                  <div className="card-inner p-0 overflow-hidden rounded-[calc(1.25rem-0.375rem)]">
                    <div className="aspect-square skeleton-bg" />
                    <div className="p-4 space-y-3">
                      <div className="h-3 w-16 skeleton-bg rounded" />
                      <div className="h-4 w-full skeleton-bg rounded" />
                      <div className="h-5 w-24 skeleton-bg rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : products.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-surface-secondary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-premium-sm">
              <FiSearch className="text-3xl text-gray-300" />
            </div>
            <h2 className="text-xl font-bold text-ink mb-2">Không tìm thấy sản phẩm</h2>
            <p className="text-ink-tertiary mb-2 max-w-md">
              Không có kết quả cho "<span className="font-medium text-ink">{query}</span>"
            </p>
            <p className="text-xs text-ink-tertiary mb-8">Thử tìm kiếm với từ khóa khác hoặc điều chỉnh bộ lọc</p>

            {/* Suggestions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/products" className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-semibold text-sm hover:bg-primary-700 active:scale-[0.97] transition-all duration-200">
                <FiPackage className="text-sm" />
                <span>Xem tất cả sản phẩm</span>
              </Link>
              <button
                onClick={clearFilters}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-surface-secondary text-ink rounded-2xl font-medium text-sm hover:bg-surface-tertiary active:scale-[0.97] transition-all duration-200 border border-gray-200"
              >
                <FiRotateCcw className="text-sm" />
                <span>Xoá bộ lọc</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Result meta */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3 text-xs text-ink-tertiary">
                <FiPackage className="text-primary-500" />
                <span>
                  <strong className="text-ink font-semibold">{pagination.total}</strong> kết quả
                  {sort && <span> · đã sắp xếp</span>}
                </span>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center space-x-1 text-xs text-ink-tertiary hover:text-red-500 transition-colors"
                >
                  <FiX className="text-[10px]" />
                  <span>Xoá bộ lọc</span>
                </button>
              )}
            </div>

            {/* Products grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 stagger-fade">
              {products.map((product, idx) => (
                <ProductCard key={product.id} product={product} index={idx} />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-10">
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={(newPage) => {
                    const params = new URLSearchParams(searchParams);
                    params.set('page', newPage);
                    setSearchParams(params);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* ═══════════════ TRENDING SUGGESTIONS ═══════════════ */}
        {!query && products.length === 0 && !loading && (
          <div className="mt-8">
            <div className="flex items-center space-x-2.5 mb-5">
              <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
                <FiTrendingUp className="text-amber-600 text-sm" />
              </div>
              <h3 className="text-sm font-semibold text-ink">Tìm kiếm phổ biến</h3>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {['Điện thoại', 'Laptop', 'Tai nghe', 'Bàn phím', 'Chuột', 'Màn hình', 'Ốp lưng', 'Cáp sạc'].map((tag) => (
                <Link
                  key={tag}
                  to={`/products?q=${encodeURIComponent(tag)}`}
                  className="group inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-surface-secondary border border-gray-100 text-sm text-ink-secondary hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 active:scale-[0.97] transition-all duration-200"
                >
                  <FiSearch className="text-[10px]" />
                  <span>{tag}</span>
                  <FiChevronRight className="text-[9px] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
