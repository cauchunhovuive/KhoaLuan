import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiExternalLink } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const CategoriesManagePage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [editingId, setEditingId] = useState(null);

  const fetchCategories = () => {
    setLoading(true);
    api.get('/categories')
      .then(({ data }) => setCategories(data.data))
      .catch(() => toast.error('Không thể tải danh mục'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, formData);
        toast.success('Cập nhật danh mục thành công');
      } else {
        await api.post('/categories', formData);
        toast.success('Thêm danh mục thành công');
      }
      setShowForm(false);
      setFormData({ name: '', description: '' });
      setEditingId(null);
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi');
    }
  };

  const handleEdit = (cat) => {
    setFormData({ name: cat.name, description: cat.description || '' });
    setEditingId(cat.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa danh mục này?')) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Đã xóa danh mục');
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Xóa thất bại');
    }
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink">Quản lý danh mục</h2>
          <p className="text-ink-tertiary text-sm mt-1">Quản lý danh mục sản phẩm</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: '', description: '' }); }}
          className="btn-primary inline-flex items-center space-x-2">
          <FiPlus className="text-sm" />
          <span>Thêm danh mục</span>
        </button>
      </div>

      {showForm && (
        <div className="p-1.5 bg-primary-50/50 rounded-[1.5rem] ring-1 ring-primary-100/50 animate-slide-up">
          <div className="bg-white rounded-[calc(1.5rem-0.375rem)] p-6">
            <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1.5">Tên danh mục</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1.5">Mô tả</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field" rows={2} />
              </div>
              <div className="flex space-x-3 pt-2">
                <button type="submit" className="btn-primary">{editingId ? 'Cập nhật' : 'Thêm mới'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-fade">
          {categories.map((cat) => (
            <div key={cat.id} className="card p-5 hover:border-gray-200 transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-ink">{cat.name}</h3>
                  {cat.description && <p className="text-sm text-ink-secondary mt-0.5 line-clamp-2">{cat.description}</p>}
                </div>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <button onClick={() => handleEdit(cat)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><FiEdit2 size={14} /></button>
                  <button onClick={() => handleDelete(cat.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"><FiTrash2 size={14} /></button>
                </div>
              </div>                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs text-ink-tertiary">{cat._count?.products || 0} sản phẩm</span>
                    {cat._count?.products > 0 && (
                      <button
                        onClick={() => navigate('/admin/products', { state: { filterCategory: cat.id, filterCategoryName: cat.name } })}
                        className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center space-x-1 transition-colors"
                        title="Xem sản phẩm trong danh mục này"
                      >
                        <FiExternalLink size={12} />
                        <span>Xem SP</span>
                      </button>
                    )}
                  </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoriesManagePage;
