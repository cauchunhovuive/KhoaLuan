import React, { useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const CategoriesManagePage = () => {
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Quản lý danh mục</h2>
        <button onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: '', description: '' }); }}
          className="btn-primary flex items-center space-x-2">
          <FiPlus /><span>Thêm danh mục</span>
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên danh mục</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field" rows={2} />
            </div>
            <div className="flex space-x-3">
              <button type="submit" className="btn-primary">{editingId ? 'Cập nhật' : 'Thêm mới'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Hủy</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                <div className="flex items-center space-x-1">
                  <button onClick={() => handleEdit(cat)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><FiEdit2 size={14} /></button>
                  <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><FiTrash2 size={14} /></button>
                </div>
              </div>
              {cat.description && <p className="text-sm text-gray-500">{cat.description}</p>}
              <p className="text-xs text-gray-400 mt-2">{cat._count?.products || 0} sản phẩm</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoriesManagePage;
