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
      dispatch(fetchProducts({ search: query, page, limit: 12 }));
    }
  }, [dispatch, query, page]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link to="/products" className="text-gray-600 hover:text-primary-600 flex items-center space-x-1 mb-4">
          <FiArrowLeft /><span>Tất cả sản phẩm</span>
        </Link>
        <div className="flex items-center space-x-3">
          <FiSearch className="text-gray-400 text-xl" />
          <h1 className="text-2xl font-bold text-gray-900">
            Kết quả tìm kiếm: "{query}"
          </h1>
        </div>
        <p className="text-gray-600 mt-2">{pagination.total} kết quả</p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <FiSearch className="text-6xl text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy sản phẩm</h2>
          <p className="text-gray-500 mb-6">Thử tìm kiếm với từ khóa khác</p>
          <Link to="/products" className="btn-primary">Xem tất cả sản phẩm</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
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
