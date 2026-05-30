import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts, fetchCategories } from '../store/productSlice';
import ProductCard from '../components/common/ProductCard';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { FiFilter, FiX, FiSliders } from 'react-icons/fi';

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Mới nhất' },
  { value: 'price', label: 'Giá: Thấp đến Cao' },
  { value: '-price', label: 'Giá: Cao đến Thấp' },
  { value: 'sold', label: 'Bán chạy' },
  { value: 'rating', label: 'Đánh giá cao' },
];

const ProductListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();
  const { products, categories, pagination, loading } = useSelector((state) => state.products);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });

  const currentPage = parseInt(searchParams.get('page')) || 1;
  const currentCategory = searchParams.get('category') || '';
  const currentSort = searchParams.get('sort') || '-createdAt';

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    const params = { page: currentPage, limit: 12, sort: currentSort };
    if (currentCategory) params.category = currentCategory;
    if (priceRange.min) params.minPrice = priceRange.min;
    if (priceRange.max) params.maxPrice = priceRange.max;
    dispatch(fetchProducts(params));
  }, [dispatch, currentPage, currentCategory, currentSort, priceRange]);

  const updateParams = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams({});
    setPriceRange({ min: '', max: '' });
  };

  return (
    <div className="section-container py-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-ink">Sản phẩm</h1>
          <p className="text-ink-secondary mt-1">{pagination.total} sản phẩm</p>
        </div>
        <div className="flex items-center space-x-3 mt-4 md:mt-0">
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary inline-flex items-center space-x-2 md:hidden">
            <FiSliders className="text-sm" />
            <span>Bộ lọc</span>
          </button>
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

      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters - Desktop */}
        <aside className="hidden md:block w-64 flex-shrink-0">
          <div className="card p-6 space-y-6 sticky top-24">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-ink">Bộ lọc</h3>
              <button onClick={clearFilters} className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors">Xóa tất cả</button>
            </div>

            {/* Category filter */}
            <div>
              <h4 className="text-xs font-semibold text-ink uppercase tracking-wider mb-3">Danh mục</h4>
              <div className="space-y-1">
                <button
                  onClick={() => updateParams('category', '')}
                  className={`block text-sm w-full text-left px-3 py-2 rounded-xl transition-all ${
                    !currentCategory ? 'bg-primary-50 text-primary-700 font-medium' : 'text-ink-secondary hover:bg-surface-secondary'
                  }`}
                >
                  Tất cả
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => updateParams('category', cat.id)}
                    className={`block text-sm w-full text-left px-3 py-2 rounded-xl transition-all ${
                      currentCategory === cat.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-ink-secondary hover:bg-surface-secondary'
                    }`}
                  >
                    <span>{cat.name}</span>
                    {cat._count?.products > 0 && <span className="ml-1.5 text-xs text-ink-tertiary">({cat._count.products})</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Price filter */}
            <div>
              <h4 className="text-xs font-semibold text-ink uppercase tracking-wider mb-3">Khoảng giá</h4>
              <div className="flex items-center space-x-2">
                <input type="number" placeholder="Từ" value={priceRange.min}
                  onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                  className="input-field text-sm" />
                <span className="text-ink-tertiary">—</span>
                <input type="number" placeholder="Đến" value={priceRange.max}
                  onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                  className="input-field text-sm" />
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile filters */}
        {showFilters && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 md:hidden animate-fade-in" onClick={() => setShowFilters(false)}>
            <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-ink">Bộ lọc</h3>
                <button onClick={() => setShowFilters(false)} className="p-2 text-ink-secondary hover:bg-surface-secondary rounded-xl transition-colors">
                  <FiX />
                </button>
              </div>
              {/* Same filter content */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold text-ink uppercase tracking-wider mb-3">Danh mục</h4>
                  <div className="space-y-1">
                    <button onClick={() => { updateParams('category', ''); setShowFilters(false); }}
                      className="block text-sm w-full text-left px-3 py-2 rounded-xl text-ink-secondary hover:bg-surface-secondary">
                      Tất cả
                    </button>
                    {categories.map((cat) => (
                      <button key={cat.id} onClick={() => { updateParams('category', cat.id); setShowFilters(false); }}
                        className="block text-sm w-full text-left px-3 py-2 rounded-xl text-ink-secondary hover:bg-surface-secondary">
                        {cat.name} {cat._count?.products > 0 && `(${cat._count.products})`}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-ink uppercase tracking-wider mb-3">Khoảng giá</h4>
                  <div className="flex items-center space-x-2">
                    <input type="number" placeholder="Từ" className="input-field text-sm" />
                    <span className="text-ink-tertiary">—</span>
                    <input type="number" placeholder="Đến" className="input-field text-sm" />
                  </div>
                </div>
                <button onClick={() => setShowFilters(false)} className="btn-primary w-full">Áp dụng</button>
              </div>
            </div>
          </div>
        )}

        {/* Product grid */}
        <div className="flex-1">
          {loading ? (
            <LoadingSpinner size="skeleton" />
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FiFilter className="text-5xl text-gray-300 mb-4" />
              <p className="text-ink-secondary font-medium">Không tìm thấy sản phẩm</p>
              <button onClick={clearFilters} className="btn-primary mt-4">Xóa bộ lọc</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 stagger-fade">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(page) => updateParams('page', page)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductListPage;
