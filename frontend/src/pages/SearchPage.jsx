import React, { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '../store/productSlice';
import ProductCard from '../components/common/ProductCard';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { FiSearch, FiArrowLeft } from 'react-icons/fi';

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();
  const { products, pagination, loading } = useSelector((state) => state.products);

  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page')) || 1;

  useEffect(() => {
    if (query) {
      dispatch(fetchProducts({ search: query, page, limit: 10 }));
    }
  }, [dispatch, query, page]);

  return (
    <div className="section-container py-8 animate-fade-in">
      {/* Back + Search info */}
      <div className="mb-8">
        <Link to="/products" className="inline-flex items-center space-x-1.5 text-ink-tertiary hover:text-primary-600 mb-5 transition-colors">
          <FiArrowLeft />
          <span>Tất cả sản phẩm</span>
        </Link>
        <div className="flex items-center space-x-3 mb-1">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
            <FiSearch className="text-primary-600 text-lg" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink">
              Kết quả tìm kiếm
            </h1>
            <p className="text-sm text-ink-tertiary">Từ khóa: "<span className="font-medium text-ink">{query}</span>"</p>
          <p className="text-xs text-ink-tertiary mt-0.5">{pagination.total} kết quả</p>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner size="skeleton" />
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FiSearch className="text-6xl text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-ink mb-2">Không tìm thấy sản phẩm</h2>
          <p className="text-ink-secondary mb-6">Thử tìm kiếm với từ khóa khác</p>
          <Link to="/products" className="btn-primary">Xem tất cả sản phẩm</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 stagger-fade">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(newPage) => {
              const params = new URLSearchParams(searchParams);
              params.set('page', newPage);
              setSearchParams(params);
            }}
          />
        </>
      )}
    </div>
  );
};

export default SearchPage;
