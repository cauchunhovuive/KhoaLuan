import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiPackage, FiDollarSign, FiEye, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const PartnerProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: '', description: '', price: '', discountPrice: '', stock: '', categoryId: '', images: [''],
  });
  const [search, setSearch] = useState('');

  const fetchProducts = async () => {
    try {
      const { data } = await api.get(`/partner/products?page=${page}&limit=10`);
      setProducts(data.data.products);
      setTotalPages(data.data.pagination.totalPages);
    } catch (err) {
      toast.error('Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data.data);
    } catch (err) {
      console.error('Failed to fetch categories');
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [page]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        discountPrice: formData.discountPrice ? parseFloat(formData.discountPrice) : null,
        stock: parseInt(formData.stock),
        images: formData.images[0] ? formData.images : ['https://picsum.photos/seed/default/400/400'],
      };

      if (editingProduct) {
        await api.put(`/partner/products/${editingProduct.id}`, payload);
        toast.success('Cập nhật sản phẩm thành công');
      } else {
        await api.post('/partner/products', payload);
        toast.success('Thêm sản phẩm thành công');
      }

      setShowForm(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi lưu sản phẩm');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      discountPrice: product.discountPrice?.toString() || '',
      stock: product.stock.toString(),
      categoryId: product.categoryId,
      images: product.images || [''],
    });
    setShowForm(true);
  };

  const handleToggleActive = async (product) => {
    try {
      await api.put(`/partner/products/${product.id}`, { isActive: !product.isActive });
      toast.success(product.isActive ? 'Đã ẩn sản phẩm' : 'Đã đăng bán sản phẩm');
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi cập nhật');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xoá sản phẩm này?')) return;
    try {
      await api.delete(`/partner/products/${id}`);
      toast.success('Đã ẩn sản phẩm');
      fetchProducts();
    } catch (err) {
      toast.error('Lỗi khi xoá sản phẩm');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', price: '', discountPrice: '', stock: '', categoryId: '', images: [''] });
    setEditingProduct(null);
  };

  if (loading) return <LoadingSpinner size="skeleton" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Sản phẩm của tôi</h2>
          <p className="text-sm text-ink-secondary mt-0.5">Quản lý sản phẩm đã đăng bán</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all duration-200 shadow-premium-sm text-sm font-medium"
        >
          <FiPlus />
          <span>Thêm sản phẩm</span>
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-premium-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink">
                {editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-ink p-1 rounded-lg hover:bg-surface-secondary transition-colors">
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Tên sản phẩm *</label>
                <input
                  type="text" required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="VD: Áo sơ mi nam cao cấp"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  rows={3}
                  placeholder="Mô tả chi tiết sản phẩm..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Giá *</label>
                  <input
                    type="number" required min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="input-field"
                    placeholder="199000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Giá giảm</label>
                  <input
                    type="number" min="0"
                    value={formData.discountPrice}
                    onChange={(e) => setFormData({ ...formData, discountPrice: e.target.value })}
                    className="input-field"
                    placeholder="149000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Số lượng *</label>
                  <input
                    type="number" required min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="input-field"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Danh mục *</label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Link ảnh</label>
                <input
                  type="url"
                  value={formData.images[0]}
                  onChange={(e) => setFormData({ ...formData, images: [e.target.value] })}
                  className="input-field"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="flex items-center space-x-3 pt-2">
                <button type="submit" className="btn-primary flex-1">
                  {editingProduct ? 'Cập nhật' : 'Đăng sản phẩm'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Huỷ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-premium-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="relative max-w-xs">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm sản phẩm..."
              className="w-full pl-9 pr-3 py-2 bg-surface-secondary border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase())).length > 0 ? (
            products
              .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
              .map((product) => (
                <div key={product.id} className="px-6 py-4 flex items-center justify-between hover:bg-surface-secondary/50 transition-colors">
                  <div className="flex items-center space-x-4 min-w-0 flex-1">
                    <div className="w-14 h-14 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden">
                      {product.images?.[0] && (
                        <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">{product.name}</p>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="text-sm font-semibold text-emerald-600">
                          {product.price.toLocaleString('vi-VN')}₫
                        </span>
                        <span className="text-xs text-ink-tertiary">
                          Kho: {product.stock}
                        </span>
                        <span className={`badge text-xs ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {product.isActive ? 'Đang bán' : 'Ẩn'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button onClick={() => handleToggleActive(product)}
                      className={`p-2 rounded-lg transition-colors ${product.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}
                      title={product.isActive ? 'Tạm ẩn' : 'Đăng bán'}>
                      {product.isActive ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                    </button>
                    <button onClick={() => handleEdit(product)} className="p-2 text-ink-secondary hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Sửa">
                      <FiEdit2 size={15} />
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="p-2 text-ink-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xoá">
                      <FiTrash2 size={15} />
                    </button>
                    <Link to={`/products/${product.slug}`} className="p-2 text-ink-secondary hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Xem">
                      <FiEye size={15} />
                    </Link>
                  </div>
                </div>
              ))
          ) : (
            <div className="px-6 py-16 text-center text-gray-400">
              <FiPackage className="mx-auto text-3xl mb-3" />
              <p className="text-sm font-medium">Chưa có sản phẩm nào</p>
              <p className="text-xs mt-1">Bắt đầu đăng sản phẩm đầu tiên của bạn</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-center space-x-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                  p === page ? 'bg-emerald-600 text-white' : 'text-ink-secondary hover:bg-surface-secondary'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerProductsPage;
