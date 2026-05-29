import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts, fetchCategories } from '../store/productSlice';
import ProductCard from '../components/common/ProductCard';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { FiFilter, FiX, FiChevronDown } from 'react-icons/fi';

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
    const params = {
      page: currentPage,
      limit: 12,
      sort: currentSort,
    };
    if (currentCategory) params.category = currentCategory;
    if (priceRange.min) params.minPrice = priceRange.min;
    if (priceRange.max) params.maxPrice = priceRange.max;
    dispatch(fetchProducts(params));
  }, [dispatch, currentPage, currentCategory, currentSort, priceRange]);

  const updateParams = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key !== 'page') params.set('page', '1');
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams({});
    setPriceRange({ min: '', max: '' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sản phẩm</h1>
          <p className="text-gray-600 mt-1">{pagination.total} sản phẩm</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 md:mt-0">
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary flex items-center space-x-2 md:hidden">
            <FiFilter /><span>Bộ lọc</span>
          </button>
          <select
            value={currentSort}
            onChange={(e) => updateParams('sort', e.target.value)}
            className="input-field w-auto"
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
          <div className="card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Bộ lọc</h3>
              <button onClick={clearFilters} className="text-sm text-primary-600 hover:text-primary-700">Xóa tất cả</button>
            </div>

            {/* Category filter */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Danh mục</h4>
              <div className="space-y-2">
                <button
                  onClick={() => updateParams('category', '')}
                  className={`block text-sm w-full text-left px-3 py-1.5 rounded-lg transition-colors ${!currentCategory ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  Tất cả
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => updateParams('category', cat.id)}
                    className={`block text-sm w-full text-left px-3 py-1.5 rounded-lg transition-colors ${currentCategory === cat.id ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    {cat.name} ({cat._count?.products || 0})
                  </button>
                ))}
              </div>
            </div>

            {/* Price filter */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Khoảng giá</h4>
              <div className="flex items-center space-x-2">
                <input type="number" placeholder="Từ" value={priceRange.min}
                  onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                  className="input-field text-sm" />
                <span className="text-gray-400">-</span>
                <input type="number" placeholder="Đến" value={priceRange.max}
                  onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                  className="input-field text-sm" />
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile filters */}
        {showFilters && (
          <div className="fixed inset-0 bg-black/50 z-50 md:hidden" onClick={() => setShowFilters(false)}>
            <div className="absolute right-0 top-0 h-full w-80 bg-white p-6" onClick={(e) => e.stopPropagation()}>
              {/* Mobile filter content (same as desktop) */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold">Bộ lọc</h3>
                <button onClick={() => setShowFilters(false)}><FiX /></button>
              </div>
            </div>
          </div>
        )}

        {/* Product grid */}
        <div className="flex-1">
          {loading ? (
            <LoadingSpinner />
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500">Không tìm thấy sản phẩm</p>
              <button onClick={clearFilters} className="btn-primary mt-4">Xóa bộ lọc</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
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
