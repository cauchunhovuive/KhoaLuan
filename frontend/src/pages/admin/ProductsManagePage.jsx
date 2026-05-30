import React, { useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiChevronLeft, FiChevronRight, FiStar, FiBox } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const ITEMS_PER_PAGE = 10;

const ProductsManagePage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProducts = () => {
    setLoading(true);
    const params = { limit: ITEMS_PER_PAGE, page };
    if (search) params.search = search;
    api.get('/products', { params })
      .then(({ data }) => {
        setProducts(data.data.products);
        setTotalPages(data.data.pagination.totalPages);
      })
      .catch(() => toast.error('Không thể tải sản phẩm'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, [page]);

  const handleSearch = () => {
    if (page === 1) {
      fetchProducts();
    } else {
      setPage(1);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa sản phẩm này?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Đã xóa sản phẩm');
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Xóa thất bại');
    }
  };

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink">Quản lý sản phẩm</h2>
          <p className="text-ink-tertiary text-sm mt-1">Quản lý danh sách sản phẩm</p>
        </div>
        <button className="btn-primary inline-flex items-center space-x-2">
          <FiPlus className="text-sm" />
          <span>Thêm sản phẩm</span>
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Tìm kiếm sản phẩm..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-11 pr-4 py-2.5 bg-surface-secondary border border-gray-200 rounded-xl text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200" />
        </div>
      </div>

      {loading ? <LoadingSpinner size="table" /> : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-secondary text-left">
                    <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Sản phẩm</th>
                    <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Cửa hàng</th>
                    <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Danh mục</th>
                    <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Giá</th>
                    <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Đánh giá</th>
                    <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Tồn kho</th>
                    <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Đã bán</th>
                    <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-t border-gray-100 hover:bg-surface-secondary/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-surface-tertiary rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-gray-100">
                            {product.images?.[0] && <img src={product.images[0]} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <span className="font-medium text-ink">{product.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-ink-secondary">
                        {product.partner ? (
                          <div className="flex items-center space-x-1.5">
                            <FiBox className="text-emerald-500 text-xs" />
                            <span className="text-emerald-700 font-medium">{product.partner.storeName || product.partner.name}</span>
                          </div>
                        ) : (
                          <span className="text-ink-tertiary text-xs">—</span>
                        )}
                      </td>
                      <td className="p-4 text-ink-secondary">{product.category?.name || <span className="text-ink-tertiary">—</span>}</td>
                      <td className="p-4 font-semibold text-ink">{product.price.toLocaleString('vi-VN')}₫</td>
                      <td className="p-4">
                        <div className="flex items-center space-x-1.5">
                          <FiStar className={`text-xs ${product.rating > 0 ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                          <span className="font-medium text-ink">{product.rating?.toFixed(1) || '0.0'}</span>
                          <span className="text-ink-tertiary text-xs">({product.reviewCount || 0})</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`font-medium ${product.stock <= 5 ? 'text-red-600' : 'text-ink'}`}>{product.stock}</span>
                      </td>
                      <td className="p-4 font-medium">{product.soldCount}</td>
                      <td className="p-4">
                        <div className="flex items-center space-x-1.5">
                          <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><FiEdit2 size={14} /></button>
                          <button onClick={() => handleDelete(product.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"><FiTrash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl border border-gray-200 text-ink-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <FiChevronLeft />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${
                    p === page
                      ? 'bg-primary-600 text-white shadow-premium-sm'
                      : 'border border-gray-200 text-ink-secondary hover:bg-surface-secondary'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-xl border border-gray-200 text-ink-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <FiChevronRight />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProductsManagePage;
