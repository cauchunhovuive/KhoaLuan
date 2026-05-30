import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiImage, FiChevronLeft, FiChevronRight, FiToggleLeft, FiToggleRight, FiMove } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const BannerModal = ({ banner, onClose, onSaved }) => {
  const [form, setForm] = useState({
    title: banner?.title || '',
    subtitle: banner?.subtitle || '',
    imageUrl: banner?.imageUrl || '',
    linkUrl: banner?.linkUrl || '',
    linkText: banner?.linkText || '',
    position: banner?.position ?? 0,
    bgColor: banner?.bgColor || '',
    isActive: banner?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.imageUrl) { toast.error('Vui lòng nhập URL hình ảnh'); return; }
    setSaving(true);
    try {
      const payload = { ...form, position: parseInt(form.position) || 0 };
      if (banner) {
        await api.put(`/banners/${banner.id}`, payload);
        toast.success('Đã cập nhật banner');
      } else {
        await api.post('/banners', payload);
        toast.success('Đã tạo banner mới');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi lưu banner');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-premium-xl border border-gray-100 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">{banner ? 'Sửa banner' : 'Thêm banner mới'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-ink transition-colors text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {form.imageUrl && (
            <div className="relative h-40 bg-gray-100 rounded-xl overflow-hidden">
              <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">URL hình ảnh *</label>
              <input name="imageUrl" value={form.imageUrl} onChange={handleChange} className="input-field" placeholder="https://example.com/banner.jpg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Tiêu đề</label>
              <input name="title" value={form.title} onChange={handleChange} className="input-field" placeholder="Flash Sale Mùa Hè" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Phụ đề</label>
              <input name="subtitle" value={form.subtitle} onChange={handleChange} className="input-field" placeholder="Giảm đến 50%" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Link (tuỳ chọn)</label>
              <input name="linkUrl" value={form.linkUrl} onChange={handleChange} className="input-field" placeholder="/products" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Text nút</label>
              <input name="linkText" value={form.linkText} onChange={handleChange} className="input-field" placeholder="Mua ngay" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Vị trí</label>
              <input name="position" type="number" value={form.position} onChange={handleChange} className="input-field" min="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Màu nền</label>
              <div className="flex items-center space-x-2">
                <input name="bgColor" value={form.bgColor} onChange={handleChange} className="input-field flex-1" placeholder="#f0f9ff" />
                {form.bgColor && <div className="w-8 h-8 rounded-lg border border-gray-200" style={{ backgroundColor: form.bgColor }} />}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="w-4 h-4 text-primary-600 rounded" />
            <label className="text-sm text-ink-secondary">Hiển thị</label>
          </div>
          <div className="flex items-center space-x-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5">
              {saving ? 'Đang lưu...' : banner ? 'Cập nhật' : 'Thêm banner'}
            </button>
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm text-ink-secondary hover:bg-surface-secondary rounded-xl transition-colors">Huỷ</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BannerManagementPage = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchBanners = () => {
    setLoading(true);
    api.get('/banners/admin/all')
      .then(({ data }) => setBanners(data.data))
      .catch(() => toast.error('Không thể tải banner'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBanners(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Xoá banner này?')) return;
    try {
      await api.delete(`/banners/${id}`);
      toast.success('Đã xoá banner');
      fetchBanners();
    } catch (err) { toast.error(err.response?.data?.message || 'Xoá thất bại'); }
  };

  const handleToggle = async (b) => {
    try {
      await api.put(`/banners/${b.id}`, { isActive: !b.isActive });
      toast.success(b.isActive ? 'Đã ẩn' : 'Đã hiện');
      fetchBanners();
    } catch (err) { toast.error('Thất bại'); }
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">Quản lý Banner</h2>
          <p className="text-ink-tertiary text-sm mt-1">Quản lý banner hiển thị trên trang chủ</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary inline-flex items-center space-x-2">
          <FiPlus /><span>Thêm banner</span>
        </button>
      </div>

      {loading ? <LoadingSpinner size="table" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((b) => (
            <div key={b.id} className={`card overflow-hidden ${!b.isActive ? 'opacity-60' : ''}`}>
              <div className="relative h-48 bg-gray-100">
                <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/600x300?text=No+Image'; }} />
                <div className="absolute top-2 right-2 flex items-center space-x-1">
                  <button onClick={() => handleToggle(b)}
                    className={`p-2 rounded-xl bg-white/90 backdrop-blur-sm shadow-sm ${b.isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {b.isActive ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                  </button>
                  <button onClick={() => { setEditing(b); setShowModal(true); }}
                    className="p-2 rounded-xl bg-white/90 backdrop-blur-sm shadow-sm text-blue-600 hover:bg-blue-50">
                    <FiEdit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(b.id)}
                    className="p-2 rounded-xl bg-white/90 backdrop-blur-sm shadow-sm text-red-600 hover:bg-red-50">
                    <FiTrash2 size={14} />
                  </button>
                </div>
                <div className="absolute bottom-2 left-2">
                  <span className="bg-black/50 text-white text-xs px-2 py-1 rounded-lg backdrop-blur-sm">
                    Vị trí: {b.position}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-ink">{b.title || 'Chưa có tiêu đề'}</h3>
                {b.subtitle && <p className="text-sm text-ink-tertiary mt-0.5">{b.subtitle}</p>}
                <div className="flex items-center space-x-3 mt-2 text-xs text-ink-tertiary">
                  {b.linkUrl && <span>🔗 {b.linkUrl}</span>}
                  <span className={b.isActive ? 'text-green-600' : 'text-gray-400'}>
                    {b.isActive ? 'Đang hiển thị' : 'Đã ẩn'}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {banners.length === 0 && (
            <div className="col-span-2 text-center py-16 text-ink-tertiary">
              <FiImage className="text-3xl mx-auto mb-3" />
              <p>Chưa có banner nào</p>
            </div>
          )}
        </div>
      )}

      {showModal && <BannerModal banner={editing} onClose={() => { setShowModal(false); setEditing(null); }} onSaved={() => { setShowModal(false); setEditing(null); fetchBanners(); }} />}
    </div>
  );
};

export default BannerManagementPage;
