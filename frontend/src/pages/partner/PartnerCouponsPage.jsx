import React, { useState, useEffect } from 'react';
import { FiPlus, FiPercent, FiDollarSign, FiCalendar, FiCopy, FiTrash2, FiToggleLeft, FiToggleRight, FiTag, FiRefreshCw } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const CouponForm = ({ coupon, onClose, onSaved }) => {
  const [form, setForm] = useState({
    code: coupon?.code || '',
    type: coupon?.type || 'PERCENTAGE',
    value: coupon?.value || '',
    minOrderValue: coupon?.minOrderValue || '',
    maxDiscount: coupon?.maxDiscount || '',
    usageLimit: coupon?.usageLimit || '',
    perUserLimit: coupon?.perUserLimit || 1,
    startsAt: coupon?.startsAt ? new Date(coupon.startsAt).toISOString().slice(0, 16) : '',
    expiresAt: coupon?.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 16) : '',
    description: coupon?.description || '',
    isActive: coupon?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.value || form.value <= 0) return toast.error('Vui lòng nhập giá trị giảm giá');
    if (form.type === 'PERCENTAGE' && (form.value < 0 || form.value > 100)) return toast.error('Phần trăm từ 0-100');
    setSaving(true);
    try {
      const payload = {
        ...form,
        value: parseFloat(form.value),
        minOrderValue: form.minOrderValue ? parseFloat(form.minOrderValue) : null,
        maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit) : null,
        perUserLimit: parseInt(form.perUserLimit),
        startsAt: form.startsAt || null,
        expiresAt: form.expiresAt || null,
      };
      if (coupon) {
        await api.put(`/coupons/${coupon.id}`, payload);
        toast.success('Đã cập nhật mã giảm giá');
      } else {
        await api.post('/coupons', payload);
        toast.success('Đã tạo mã giảm giá');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi lưu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-premium-xl border border-gray-100 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">{coupon ? 'Sửa mã giảm giá' : 'Tạo mã giảm giá'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-ink text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className={coupon ? 'opacity-60' : ''}>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">Mã giảm giá <span className="text-xs text-ink-tertiary">(để trống tự tạo)</span></label>
            <input name="code" value={form.code} onChange={handleChange} disabled={!!coupon}
              className="input-field uppercase tracking-wider font-mono" placeholder="SHOP10" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Loại</label>
              <select name="type" value={form.type} onChange={handleChange} className="input-field">
                <option value="PERCENTAGE">Phần trăm (%)</option>
                <option value="FIXED">Tiền mặt (₫)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">{form.type === 'PERCENTAGE' ? 'Phần trăm' : 'Số tiền'}</label>
              <div className="relative">
                <input name="value" type="number" value={form.value} onChange={handleChange}
                  className="input-field pr-8" min="0" step="0.1" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-tertiary">{form.type === 'PERCENTAGE' ? '%' : '₫'}</span>
              </div>
            </div>
          </div>
          {form.type === 'PERCENTAGE' && (
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Giảm tối đa (₫) <span className="text-xs text-ink-tertiary">(không bắt buộc)</span></label>
              <input name="maxDiscount" type="number" value={form.maxDiscount} onChange={handleChange} className="input-field" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">Đơn tối thiểu (₫) <span className="text-xs text-ink-tertiary">(không bắt buộc)</span></label>
            <input name="minOrderValue" type="number" value={form.minOrderValue} onChange={handleChange} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Giới hạn lượt</label>
              <input name="usageLimit" type="number" value={form.usageLimit} onChange={handleChange} className="input-field" placeholder="Không giới hạn" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Lượt/người</label>
              <input name="perUserLimit" type="number" value={form.perUserLimit} onChange={handleChange} className="input-field" min="1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Bắt đầu</label>
              <input name="startsAt" type="datetime-local" value={form.startsAt} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Kết thúc</label>
              <input name="expiresAt" type="datetime-local" value={form.expiresAt} onChange={handleChange} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">Mô tả</label>
            <textarea name="description" value={form.description} onChange={handleChange} className="input-field" rows={2} placeholder="Giảm giá cho khách hàng thân thiết..." />
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="w-4 h-4 text-emerald-600 rounded" />
            <label className="text-sm text-ink-secondary">Kích hoạt ngay</label>
          </div>
          <div className="flex items-center space-x-3 pt-2">
            <button type="submit" disabled={saving} className="w-full py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all">
              {saving ? 'Đang lưu...' : coupon ? 'Cập nhật' : 'Tạo mã giảm giá'}
            </button>
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm text-ink-secondary hover:bg-surface-secondary rounded-xl transition-colors">Huỷ</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PartnerCouponsPage = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchCoupons = () => {
    setLoading(true);
    api.get(`/coupons/my?page=${page}&limit=10`)
      .then(({ data }) => {
        setCoupons(data.data.coupons);
        setTotalPages(data.data.pagination.totalPages);
      })
      .catch(() => toast.error('Không thể tải mã giảm giá'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCoupons(); }, [page]);

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa mã giảm giá này?')) return;
    try {
      await api.delete(`/coupons/${id}`);
      toast.success('Đã xóa');
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xóa thất bại');
    }
  };

  const handleToggle = async (c) => {
    try {
      await api.put(`/coupons/${c.id}`, { isActive: !c.isActive });
      toast.success(c.isActive ? 'Đã tạm dừng' : 'Đã kích hoạt');
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Thất bại');
    }
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Đã sao chép mã');
  };

  const now = new Date();

  if (loading) return <LoadingSpinner size="skeleton" />;

  return (
    <div className="space-y-6 stagger-fade">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Mã giảm giá của tôi</h2>
          <p className="text-sm text-ink-secondary mt-0.5">Tạo mã giảm giá cho khách hàng của bạn</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="inline-flex items-center space-x-1.5 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all">
          <FiPlus className="text-sm" />
          <span>Tạo mã</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-premium-sm">
          <p className="text-2xl font-bold text-ink">{coupons.length}</p>
          <p className="text-xs text-ink-tertiary mt-1">Tổng số mã</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-premium-sm">
          <p className="text-2xl font-bold text-emerald-600">{coupons.filter(c => c.isActive).length}</p>
          <p className="text-xs text-ink-tertiary mt-1">Đang hoạt động</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-premium-sm">
          <p className="text-2xl font-bold text-ink">{coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0)}</p>
          <p className="text-xs text-ink-tertiary mt-1">Lượt đã dùng</p>
        </div>
      </div>

      {/* Coupons List */}
      <div className="space-y-3">
        {coupons.length > 0 ? coupons.map((c) => {
          const isExpired = c.expiresAt && new Date(c.expiresAt) < now;
          const isPending = c.startsAt && new Date(c.startsAt) > now;
          const statusBadge = !c.isActive ? 'bg-gray-100 text-gray-600' : isExpired ? 'bg-red-100 text-red-700' : isPending ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';
          const statusText = !c.isActive ? 'Tạm dừng' : isExpired ? 'Hết hạn' : isPending ? 'Sắp diễn ra' : 'Đang hoạt động';

          return (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-premium-sm hover:shadow-premium-md transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center flex-shrink-0">
                      {c.type === 'PERCENTAGE' ? <FiPercent className="text-emerald-600" /> : <FiDollarSign className="text-emerald-600" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => handleCopy(c.code)} className="font-mono font-bold text-emerald-700 hover:text-emerald-800 transition-colors flex items-center space-x-1">
                          <span>{c.code}</span>
                          <FiCopy className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <span className={`badge text-[11px] ${statusBadge}`}>{statusText}</span>
                      </div>
                      {c.description && <p className="text-xs text-ink-tertiary mt-0.5">{c.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center flex-wrap gap-x-6 gap-y-1 mt-3">
                    <span className="text-sm font-semibold text-ink">
                      {c.type === 'PERCENTAGE' ? `${c.value}%` : `${c.value.toLocaleString('vi-VN')}₫`}
                    </span>
                    {c.minOrderValue && <span className="text-xs text-ink-tertiary">Đơn từ {c.minOrderValue.toLocaleString('vi-VN')}₫</span>}
                    <span className="text-xs text-ink-tertiary">
                      Đã dùng: {c.usedCount || 0}{c.usageLimit ? `/${c.usageLimit}` : ''}
                    </span>
                    {c.expiresAt && (
                      <span className="text-xs text-ink-tertiary flex items-center space-x-1">
                        <FiCalendar className="text-[10px]" />
                        <span>HSD: {new Date(c.expiresAt).toLocaleDateString('vi-VN')}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1 flex-shrink-0 ml-4">
                  <button onClick={() => handleToggle(c)} className={`p-2 rounded-xl transition-colors ${c.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`} title={c.isActive ? 'Tạm dừng' : 'Kích hoạt'}>
                    {c.isActive ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                  </button>
                  <button onClick={() => { setEditing(c); setShowForm(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Sửa">
                    <FiTag size={14} />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Xóa">
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-premium-sm">
            <FiTag className="mx-auto text-3xl text-gray-300 mb-3" />
            <p className="text-sm font-medium text-ink-secondary">Chưa có mã giảm giá nào</p>
            <p className="text-xs text-ink-tertiary mt-1">Tạo mã giảm giá để thu hút khách hàng</p>
            <button onClick={() => { setEditing(null); setShowForm(true); }}
              className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all">
              <FiPlus /><span>Tạo mã đầu tiên</span>
            </button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${p === page ? 'bg-emerald-600 text-white' : 'text-ink-secondary hover:bg-surface-secondary'}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {showForm && <CouponForm coupon={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { setShowForm(false); setEditing(null); fetchCoupons(); }} />}
    </div>
  );
};

export default PartnerCouponsPage;
