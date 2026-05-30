import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiClock, FiCalendar, FiChevronLeft, FiChevronRight, FiZap, FiPackage } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const FlashSaleModal = ({ sale, onClose, onSaved }) => {
  const [form, setForm] = useState({
    title: sale?.title || '',
    description: sale?.description || '',
    bannerUrl: sale?.bannerUrl || '',
    startTime: sale?.startTime ? new Date(sale.startTime).toISOString().slice(0, 16) : '',
    endTime: sale?.endTime ? new Date(sale.endTime).toISOString().slice(0, 16) : '',
    isActive: sale?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.startTime || !form.endTime) {
      toast.error('Vui lòng nhập đầy đủ thông tin'); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
      };
      if (sale) {
        await api.put(`/flash-sales/${sale.id}`, payload);
        toast.success('Đã cập nhật flash sale');
      } else {
        await api.post('/flash-sales', payload);
        toast.success('Đã tạo flash sale');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-premium-xl border border-gray-100" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">{sale ? 'Sửa Flash Sale' : 'Tạo Flash Sale'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-ink transition-colors text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">Tiêu đề *</label>
            <input name="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="Flash Sale Cuối Tuần" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">Mô tả</label>
            <textarea name="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">URL Banner</label>
            <input name="bannerUrl" value={form.bannerUrl} onChange={(e) => setForm({ ...form, bannerUrl: e.target.value })} className="input-field" placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Bắt đầu *</label>
              <input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Kết thúc *</label>
              <input type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 text-primary-600 rounded" />
            <label className="text-sm text-ink-secondary">Kích hoạt</label>
          </div>
          <div className="flex items-center space-x-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5">{saving ? 'Đang lưu...' : sale ? 'Cập nhật' : 'Tạo Flash Sale'}</button>
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm text-ink-secondary hover:bg-surface-secondary rounded-xl transition-colors">Huỷ</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FlashSaleManagementPage = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [addProductModal, setAddProductModal] = useState(false);

  const fetchSales = () => {
    setLoading(true);
    api.get('/flash-sales/admin/all')
      .then(({ data }) => setSales(data.data.flashSales))
      .catch(() => toast.error('Không thể tải flash sale'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSales(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Xoá flash sale này?')) return;
    try { await api.delete(`/flash-sales/${id}`); toast.success('Đã xoá'); fetchSales(); }
    catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">Quản lý Flash Sale</h2>
          <p className="text-ink-tertiary text-sm mt-1">Tạo và quản lý các chương trình flash sale</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary inline-flex items-center space-x-2">
          <FiPlus /><span>Tạo Flash Sale</span>
        </button>
      </div>

      {loading ? <LoadingSpinner size="skeleton" /> : (
        <div className="space-y-4">
          {sales.map((s) => {
            const isActive = s.isActive && new Date(s.startTime) <= new Date() && new Date(s.endTime) >= new Date();
            const isUpcoming = s.isActive && new Date(s.startTime) > new Date();
            const isExpired = new Date(s.endTime) < new Date();
            const statusColor = !s.isActive ? 'bg-gray-100 text-gray-600' : isExpired ? 'bg-red-100 text-red-700' : isUpcoming ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';
            const statusText = !s.isActive ? 'Tạm dừng' : isExpired ? 'Đã kết thúc' : isUpcoming ? 'Sắp diễn ra' : 'Đang diễn ra';
            const now = new Date();

            return (
              <div key={s.id} className="card overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <FiZap className="text-amber-600 text-xl" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-ink">{s.title}</h3>
                        {s.description && <p className="text-sm text-ink-tertiary mt-0.5">{s.description}</p>}
                        <div className="flex items-center flex-wrap gap-2 mt-2">
                          <span className={`badge text-xs ${statusColor}`}>{statusText}</span>
                          <span className="text-xs text-ink-tertiary flex items-center">
                            <FiCalendar className="mr-1" size={12} />
                            {new Date(s.startTime).toLocaleDateString('vi-VN')} - {new Date(s.endTime).toLocaleDateString('vi-VN')}
                          </span>
                          <span className="text-xs text-ink-tertiary">{s._count?.products || 0} sản phẩm</span>
                        </div>
                        {isActive && (
                          <div className="mt-2 flex items-center space-x-1 text-xs text-amber-600">
                            <FiClock size={12} />
                            <span>Còn {Math.floor((new Date(s.endTime) - now) / 3600000)} giờ</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button onClick={() => handleDelete(s.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"><FiTrash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {sales.length === 0 && (
            <div className="text-center py-16 text-ink-tertiary">
              <FiZap className="text-3xl mx-auto mb-3" />
              <p>Chưa có flash sale nào</p>
            </div>
          )}
        </div>
      )}

      {showModal && <FlashSaleModal sale={editing} onClose={() => { setShowModal(false); setEditing(null); }} onSaved={() => { setShowModal(false); setEditing(null); fetchSales(); }} />}
    </div>
  );
};

export default FlashSaleManagementPage;
