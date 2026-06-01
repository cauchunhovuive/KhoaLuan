import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiSearch, FiChevronLeft, FiChevronRight, FiStar, FiBox, FiFilter, FiX, FiShoppingBag, FiSave, FiEye, FiEyeOff } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const ITEMS_PER_PAGE = 10;

const ProductsManagePage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', price: '', stock: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const location = useLocation();
  const searchTimerRef = useRef(null);
  const initialFilterRef = useRef(false);

  // Auto-apply category filter from navigation state (e.g. from CategoriesManagePage)
  useEffect(() => {
    if (location.state?.filterCategory && !initialFilterRef.current) {
      setCategoryFilter(location.state.filterCategory);
      initialFilterRef.current = true;
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchProducts = () => {
    setLoading(true);
    const params = { limit: ITEMS_PER_PAGE, page };
    if (searchQuery) params.search = searchQuery;
    if (categoryFilter) params.category = categoryFilter;
    api.get('/products', { params })
      .then(({ data }) => {
        setProducts(data.data.products);
        setTotalPages(data.data.pagination.totalPages);
      })
      .catch(() => toast.error('Không thể tải sản phẩm'))
      .finally(() => setLoading(false));
  };

  const fetchCategories = () => {
    api.get('/categories')
      .then(({ data }) => setCategories(data.data))
      .catch(() => {});
  };

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { fetchProducts(); }, [page, searchQuery, categoryFilter]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(value);
      setPage(1);
    }, 300);
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      price: product.price.toString(),
      stock: product.stock.toString(),
      isActive: product.isActive,
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSaving(true);
    try {
      await api.put(`/products/${editingProduct.id}`, {
        name: editForm.name,
        price: parseFloat(editForm.price),
        stock: parseInt(editForm.stock),
        isActive: editForm.isActive,
      });
      toast.success('Cập nhật sản phẩm thành công');
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (product) => {
    try {
      await api.put(`/products/${product.id}`, { isActive: !product.isActive });
      toast.success(product.isActive ? 'Đã ẩn sản phẩm' : 'Đã hiện sản phẩm');
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Thao tác thất bại');
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

  const handleCategoryFilter = (catId) => {
    setCategoryFilter(catId === categoryFilter ? '' : catId);
    setPage(1);
  };

  const clearFilters = () => {
    setCategoryFilter('');
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

  const hasFilters = categoryFilter || searchQuery;

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink">Quản lý sản phẩm</h2>
          <p className="text-ink-tertiary text-sm mt-1">Giám sát toàn bộ sản phẩm trên hệ thống</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-ink-tertiary">
          <FiShoppingBag className="text-primary-500" />
          <span>Chỉ đối tác mới có thể thêm sản phẩm</span>
        </div>
      </div>

      {/* Search + Category Filter */}
      <div className="card p-4 space-y-4">
        {/* Search bar */}
        <div className="relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Tìm kiếm sản phẩm..." value={searchInput}
            onChange={handleSearchChange}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
            className="w-full pl-11 pr-4 py-2.5 bg-surface-secondary border border-gray-200 rounded-xl text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200" />
        </div>

        {/* Category filter chips */}
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-xs font-medium text-ink-tertiary flex items-center space-x-1">
            <FiFilter size={12} />
            <span>Danh mục:</span>
          </span>
          <button
            onClick={() => setCategoryFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !categoryFilter
                ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                : 'bg-surface-secondary text-ink-secondary hover:bg-surface-tertiary'
            }`}
          >
            Tất cả
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                categoryFilter === cat.id
                  ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                  : 'bg-surface-secondary text-ink-secondary hover:bg-surface-tertiary'
              }`}
            >
              {cat.name}
              {cat._count?.products > 0 && (
                <span className="ml-1 text-[10px] opacity-70">({cat._count.products})</span>
              )}
            </button>
          ))}
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-xs text-ink-tertiary">
              {categoryFilter && 'Đang lọc theo danh mục'}
              {categoryFilter && searchQuery && ' · '}
              {searchQuery && `Tìm: "${searchQuery}"`}
            </span>
            <button onClick={clearFilters} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-1">
              <FiX size={12} />
              <span>Xoá bộ lọc</span>
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setEditingProduct(null)}>
          <div className="bg-white rounded-2xl shadow-premium-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink">Sửa sản phẩm</h3>
              <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-ink p-1 rounded-lg hover:bg-surface-secondary transition-colors">
                <FiX size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1.5">Tên sản phẩm</label>
                <input type="text" value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="input-field" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1.5">Giá</label>
                  <input type="number" value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    className="input-field" required min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1.5">Tồn kho</label>
                  <input type="number" value={editForm.stock}
                    onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                    className="input-field" required min="0" />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                  <span className="ml-3 text-sm text-ink-secondary">Đang bán</span>
                </label>
              </div>
              <div className="flex items-center space-x-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 inline-flex items-center justify-center space-x-2">
                  <FiSave size={14} />
                  <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                </button>
                <button type="button" onClick={() => setEditingProduct(null)} className="btn-secondary">Huỷ</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                        <Link to={`/products/${product.slug}`} className="flex items-center space-x-3 group">
                          <div className="w-10 h-10 bg-surface-tertiary rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-gray-100">
                            {product.images?.[0] && <img src={product.images[0]} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <span className="font-medium text-ink group-hover:text-primary-600 transition-colors">{product.name}</span>
                        </Link>
                      </td>
                      <td className="p-4">
                        {product.partner ? (
                          <Link
                            to={`/shop/${product.partner.id}`}
                            className="flex items-center space-x-1.5 hover:text-emerald-600 transition-colors group"
                          >
                            <FiBox className="text-emerald-500 text-xs flex-shrink-0" />
                            <span className="font-medium text-emerald-700 group-hover:text-emerald-600">
                              {product.partner.storeName || product.partner.name}
                            </span>
                          </Link>
                        ) : (
                          <span className="text-ink-tertiary text-xs">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        {product.category?.name ? (
                          <button
                            onClick={() => handleCategoryFilter(product.category.id)}
                            className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-all ${
                              categoryFilter === product.category.id
                                ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                                : 'bg-surface-secondary text-ink-secondary hover:bg-primary-50 hover:text-primary-700'
                            }`}
                          >
                            {product.category.name}
                          </button>
                        ) : (
                          <span className="text-ink-tertiary text-xs">—</span>
                        )}
                      </td>
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
                          <button onClick={() => handleToggleActive(product)}
                            className={`p-2 rounded-xl transition-colors ${product.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}
                            title={product.isActive ? 'Tạm ẩn' : 'Kích hoạt'}>
                            {product.isActive ? <FiEye size={14} /> : <FiEyeOff size={14} />}
                          </button>
                          <button onClick={() => handleEdit(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Sửa">
                            <FiEdit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(product.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Ẩn">
                            <FiTrash2 size={14} />
                          </button>
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
