import React, { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiTag, FiPercent, FiDollarSign, FiCalendar, FiToggleLeft, FiToggleRight, FiCopy, FiTrash2 } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import toast from 'react-hot-toast';

const ITEMS_PER_PAGE = 10;

const CouponModal = ({ coupon, onClose, onSaved }) => {
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
    const { name, value, type: inputType, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: inputType === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.value || form.value <= 0) {
      toast.error('Vui lòng nhập giá trị giảm giá');
      return;
    }
    if (form.type === 'PERCENTAGE' && (form.value < 0 || form.value > 100)) {
      toast.error('Phần trăm giảm giá phải từ 0-100');
      return;
    }
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
      toast.error(err.response?.data?.message || 'Lỗi khi lưu mã giảm giá');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-premium-xl border border-gray-100 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">{coupon ? 'Sửa mã giảm giá' : 'Tạo mã giảm giá'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-ink transition-colors text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className={coupon ? 'opacity-60' : ''}>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">Mã giảm giá {!coupon && <span className="text-xs text-ink-tertiary">(để trống để tự động tạo)</span>}</label>
            <input name="code" value={form.code} onChange={handleChange} disabled={!!coupon}
              className="input-field uppercase tracking-wider font-mono" placeholder="SUMMER2024" />
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
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">
                {form.type === 'PERCENTAGE' ? 'Phần trăm giảm' : 'Số tiền giảm'}
              </label>
              <div className="relative">
                <input name="value" type="number" value={form.value} onChange={handleChange}
                  className="input-field pr-8" min="0" step="0.1" placeholder={form.type === 'PERCENTAGE' ? '10' : '50000'} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-tertiary">
                  {form.type === 'PERCENTAGE' ? '%' : '₫'}
                </span>
              </div>
            </div>
          </div>
          {form.type === 'PERCENTAGE' && (
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Giảm tối đa (₫) <span className="text-xs text-ink-tertiary">(không bắt buộc)</span></label>
              <input name="maxDiscount" type="number" value={form.maxDiscount} onChange={handleChange}
                className="input-field" placeholder="100000" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">Đơn hàng tối thiểu (₫) <span className="text-xs text-ink-tertiary">(không bắt buộc)</span></label>
            <input name="minOrderValue" type="number" value={form.minOrderValue} onChange={handleChange}
              className="input-field" placeholder="200000" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Giới hạn lượt dùng</label>
              <input name="usageLimit" type="number" value={form.usageLimit} onChange={handleChange}
                className="input-field" placeholder="Không giới hạn" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Lượt/người dùng</label>
              <input name="perUserLimit" type="number" value={form.perUserLimit} onChange={handleChange}
                className="input-field" min="1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Bắt đầu</label>
              <input name="startsAt" type="datetime-local" value={form.startsAt} onChange={handleChange}
                className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Kết thúc</label>
              <input name="expiresAt" type="datetime-local" value={form.expiresAt} onChange={handleChange}
                className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">Mô tả</label>
            <textarea name="description" value={form.description} onChange={handleChange}
              className="input-field" rows={2} placeholder="Giảm 10% cho đơn hàng đầu tiên..." />
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
            <label className="text-sm text-ink-secondary">Kích hoạt ngay</label>
          </div>
          <div className="flex items-center space-x-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5">
              {saving ? 'Đang lưu...' : coupon ? 'Cập nhật' : 'Tạo mã giảm giá'}
            </button>
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm text-ink-secondary hover:bg-surface-secondary rounded-xl transition-colors">
              Huỷ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminCouponsPage = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);

  const fetchCoupons = () => {
    setLoading(true);
    const params = { limit: ITEMS_PER_PAGE, page };
    if (search) params.search = search;
    if (filter === 'active') params.isActive = true;
    else if (filter === 'inactive') params.isActive = false;
    api.get('/coupons', { params })
      .then(({ data }) => {
        setCoupons(data.data.coupons);
        setTotalPages(data.data.pagination.totalPages);
      })
      .catch(() => toast.error('Không thể tải danh sách mã giảm giá'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCoupons(); }, [page, filter]);

  const handleSearch = () => {
    if (page === 1) fetchCoupons();
    else setPage(1);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa mã giảm giá này?')) return;
    try {
      await api.delete(`/coupons/${id}`);
      toast.success('Đã xóa mã giảm giá');
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xóa thất bại');
    }
  };

  const handleToggleActive = async (coupon) => {
    try {
      await api.put(`/coupons/${coupon.id}`, { isActive: !coupon.isActive });
      toast.success(coupon.isActive ? 'Đã vô hiệu hóa' : 'Đã kích hoạt');
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Thất bại');
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Đã sao chép mã');
  };

  const openEdit = (coupon) => {
    setEditingCoupon(coupon);
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingCoupon(null);
    setShowModal(true);
  };

  const now = new Date();

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink">Quản lý mã giảm giá</h2>
          <p className="text-ink-tertiary text-sm mt-1">Tạo và quản lý mã giảm giá cho toàn hệ thống</p>
        </div>
        <button onClick={openCreate} className="btn-primary inline-flex items-center space-x-2">
          <FiPlus className="text-sm" />
          <span>Tạo mã giảm giá</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 w-full">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Tìm kiếm mã giảm giá..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-11 pr-4 py-2.5 bg-surface-secondary border border-gray-200 rounded-xl text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" />
        </div>
        <div className="flex items-center space-x-2">
          {['all', 'active', 'inactive'].map((f) => (
            <button key={f} onClick={() => { setFilter(f); setPage(1); }}
              className={`px-4 py-2 text-sm rounded-xl font-medium transition-all ${filter === f ? 'bg-primary-600 text-white shadow-premium-sm' : 'text-ink-secondary hover:bg-surface-secondary'}`}>
              {f === 'all' ? 'Tất cả' : f === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}
            </button>
          ))}
        </div>
      </div>

      {/* Coupons List */}
      {loading ? <LoadingSpinner size="table" /> : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-secondary text-left">
                    <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Mã</th>
                    <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Giảm giá</th>
                    <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Điều kiện</th>
                    <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Đã dùng</th>
                    <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Hiệu lực</th>
                    <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Người tạo</th>
                    <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => {
                    const isExpired = c.expiresAt && new Date(c.expiresAt) < now;
                    const isPending = c.startsAt && new Date(c.startsAt) > now;
                    const statusColor = !c.isActive ? 'bg-gray-100 text-gray-600' : isExpired ? 'bg-red-100 text-red-700' : isPending ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';
                    const statusText = !c.isActive ? 'Tạm dừng' : isExpired ? 'Hết hạn' : isPending ? 'Sắp diễn ra' : 'Đang hoạt động';

                    return (
                      <tr key={c.id} className="border-t border-gray-100 hover:bg-surface-secondary/50 transition-colors">
                        <td className="p-4">
                          <button onClick={() => handleCopyCode(c.code)} className="flex items-center space-x-2 text-primary-600 font-mono font-bold hover:text-primary-700 transition-colors group">
                            <span>{c.code}</span>
                            <FiCopy className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          {c.description && <p className="text-xs text-ink-tertiary mt-0.5 truncate max-w-[180px]">{c.description}</p>}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-1.5">
                            {c.type === 'PERCENTAGE' ? <FiPercent className="text-violet-500" /> : <FiDollarSign className="text-emerald-500" />}
                            <span className="font-semibold text-ink">
                              {c.type === 'PERCENTAGE' ? `${c.value}%` : `${c.value.toLocaleString('vi-VN')}₫`}
                            </span>
                            {c.type === 'PERCENTAGE' && c.maxDiscount && (
                              <span className="text-xs text-ink-tertiary">(tối đa {c.maxDiscount.toLocaleString('vi-VN')}₫)</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-ink-secondary">
                          {c.minOrderValue ? `Từ ${c.minOrderValue.toLocaleString('vi-VN')}₫` : 'Không'}
                        </td>
                        <td className="p-4">
                          <span className="font-medium text-ink">{c.usedCount || 0}</span>
                          {c.usageLimit && <span className="text-ink-tertiary">/{c.usageLimit}</span>}
                        </td>
                        <td className="p-4">
                          <span className={`badge text-xs ${statusColor}`}>{statusText}</span>
                          {c.expiresAt && (
                            <p className="text-[11px] text-ink-tertiary mt-1">
                              <FiCalendar className="inline mr-0.5" />
                              {new Date(c.expiresAt).toLocaleDateString('vi-VN')}
                            </p>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-ink-secondary">
                            <span>{c.createdBy?.storeName || c.createdBy?.name}</span>
                            <span className="text-xs text-ink-tertiary block">{c.createdBy?.role === 'PARTNER' ? 'Đối tác' : 'Admin'}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-1">
                            <button onClick={() => handleToggleActive(c)}
                              className={`p-2 rounded-xl transition-colors ${c.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}
                              title={c.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}>
                              {c.isActive ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                            </button>
                            <button onClick={() => openEdit(c)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Sửa">
                              <FiTag size={14} />
                            </button>
                            <button onClick={() => handleDelete(c.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Xóa">
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Modal */}
      {showModal && <CouponModal coupon={editingCoupon} onClose={() => { setShowModal(false); setEditingCoupon(null); }} onSaved={() => { setShowModal(false); setEditingCoupon(null); fetchCoupons(); }} />}
    </div>
  );
};

export default AdminCouponsPage;
