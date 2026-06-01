import React, { useState, useEffect } from 'react';
import {
  FiPlus, FiEdit2, FiTrash2, FiMapPin, FiHome, FiBriefcase, FiStar, FiCheck,
  FiX, FiSave, FiUser, FiPhone, FiNavigation,
} from 'react-icons/fi';
import api from '../services/api';
import toast from 'react-hot-toast';

const AddressModal = ({ address, onClose, onSaved }) => {
  const [form, setForm] = useState({
    label: address?.label || 'Nhà',
    fullName: address?.fullName || '',
    phone: address?.phone || '',
    street: address?.street || '',
    ward: address?.ward || '',
    district: address?.district || '',
    city: address?.city || '',
    isDefault: address?.isDefault || false,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.street || !form.city) { toast.error('Vui lòng nhập địa chỉ'); return; }
    setSaving(true);
    try {
      if (address) {
        await api.put(`/addresses/${address.id}`, form);
        toast.success('Đã cập nhật địa chỉ');
      } else {
        await api.post('/addresses', form);
        toast.success('Đã thêm địa chỉ');
      }
      onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* ═══ Double-Bezel Modal Container ═══ */}
        <div className="card-double-bezel">
          <div className="card-inner p-0">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl flex items-center justify-center ring-1 ring-primary-200/50">
                  <FiMapPin className="text-primary-600 text-sm" />
                </div>
                <div>
                  <h3 className="font-semibold text-ink">
                    {address ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}
                  </h3>
                  <p className="text-[10px] text-ink-tertiary">
                    {address ? 'Cập nhật thông tin địa chỉ' : 'Nhập thông tin giao hàng'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-ink-tertiary hover:text-ink hover:bg-surface-secondary transition-all duration-200 active:scale-[0.92]"
              >
                <FiX size={16} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Label Selector */}
              <div>
                <label className="block text-xs font-semibold text-ink-tertiary uppercase tracking-[0.08em] mb-2.5">
                  Loại địa chỉ
                </label>
                <div className="flex items-center space-x-2">
                  {[
                    { label: 'Nhà', icon: FiHome },
                    { label: 'Cơ quan', icon: FiBriefcase },
                    { label: 'Khác', icon: FiStar },
                  ].map(({ label: lbl, icon: Icon }) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setForm({ ...form, label: lbl })}
                      className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl text-xs font-medium transition-all duration-200 active:scale-[0.97] ${
                        form.label === lbl
                          ? 'bg-primary-600 text-white shadow-premium-sm ring-1 ring-primary-400/30'
                          : 'bg-surface-secondary text-ink-secondary hover:bg-surface-tertiary border border-gray-200'
                      }`}
                    >
                      <Icon className={`text-sm ${form.label === lbl ? 'text-white' : ''}`} />
                      <span>{lbl}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Name + Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-tertiary uppercase tracking-[0.08em] mb-2">
                    Người nhận <span className="text-red-400">*</span>
                  </label>
                  <div className="card-double-bezel">
                    <div className="card-inner p-0 flex items-center">
                      <div className="flex items-center justify-center w-11 h-11 shrink-0">
                        <FiUser className="text-sm text-ink-tertiary" />
                      </div>
                      <input
                        value={form.fullName}
                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        className="flex-1 bg-transparent border-none outline-none text-ink placeholder:text-gray-400 text-sm pr-4 py-2.5 min-w-0"
                        placeholder="Nguyễn Văn A"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-tertiary uppercase tracking-[0.08em] mb-2">
                    Số điện thoại <span className="text-red-400">*</span>
                  </label>
                  <div className="card-double-bezel">
                    <div className="card-inner p-0 flex items-center">
                      <div className="flex items-center justify-center w-11 h-11 shrink-0">
                        <FiPhone className="text-sm text-ink-tertiary" />
                      </div>
                      <input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="flex-1 bg-transparent border-none outline-none text-ink placeholder:text-gray-400 text-sm pr-4 py-2.5 min-w-0"
                        placeholder="0912345678"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Street */}
              <div>
                <label className="block text-xs font-semibold text-ink-tertiary uppercase tracking-[0.08em] mb-2">
                  Địa chỉ <span className="text-red-400">*</span>
                </label>
                <div className="card-double-bezel">
                  <div className="card-inner p-0 flex items-center">
                    <div className="flex items-center justify-center w-11 h-11 shrink-0">
                      <FiNavigation className="text-sm text-ink-tertiary" />
                    </div>
                    <input
                      value={form.street}
                      onChange={(e) => setForm({ ...form, street: e.target.value })}
                      className="flex-1 bg-transparent border-none outline-none text-ink placeholder:text-gray-400 text-sm pr-4 py-2.5 min-w-0"
                      placeholder="Số nhà, tên đường"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Ward + District + City */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-tertiary uppercase tracking-[0.08em] mb-2">Phường/Xã</label>
                  <div className="card-double-bezel">
                    <div className="card-inner p-0">
                      <input
                        value={form.ward}
                        onChange={(e) => setForm({ ...form, ward: e.target.value })}
                        className="w-full bg-transparent border-none outline-none text-ink placeholder:text-gray-400 text-sm px-4 py-2.5 min-w-0"
                        placeholder="Phường 1"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-tertiary uppercase tracking-[0.08em] mb-2">Quận/Huyện</label>
                  <div className="card-double-bezel">
                    <div className="card-inner p-0">
                      <input
                        value={form.district}
                        onChange={(e) => setForm({ ...form, district: e.target.value })}
                        className="w-full bg-transparent border-none outline-none text-ink placeholder:text-gray-400 text-sm px-4 py-2.5 min-w-0"
                        placeholder="Quận 1"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-tertiary uppercase tracking-[0.08em] mb-2">
                    Thành phố <span className="text-red-400">*</span>
                  </label>
                  <div className="card-double-bezel">
                    <div className="card-inner p-0">
                      <input
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        className="w-full bg-transparent border-none outline-none text-ink placeholder:text-gray-400 text-sm px-4 py-2.5 min-w-0"
                        placeholder="TP. HCM"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Default checkbox */}
              <label className="flex items-center space-x-2.5 cursor-pointer group">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200 ${
                  form.isDefault ? 'bg-primary-600 shadow-premium-sm' : 'bg-surface-secondary border border-gray-300 group-hover:border-gray-400'
                }`}>
                  {form.isDefault && <FiCheck className="text-white text-xs" />}
                </div>
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="sr-only"
                />
                <span className="text-sm text-ink-secondary">Đặt làm địa chỉ mặc định</span>
              </label>

              {/* Actions */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="group relative overflow-hidden inline-flex items-center space-x-2 px-6 py-2.5 bg-primary-600 text-white rounded-2xl font-semibold text-sm hover:bg-primary-700 active:scale-[0.97] transition-all duration-200 shadow-premium-md disabled:opacity-50 flex-1 justify-center"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Đang lưu...</span></>
                  ) : (
                    <><FiSave className="group-hover:scale-110 transition-transform" /><span>{address ? 'Cập nhật' : 'Thêm địa chỉ'}</span></>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-medium text-ink-secondary hover:text-ink bg-surface-secondary rounded-2xl hover:bg-surface-tertiary transition-all duration-200 border border-gray-200 active:scale-[0.97]"
                >
                  Huỷ
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddressSkeleton = () => (
  <div className="card-double-bezel">
    <div className="card-inner">
      <div className="flex items-start space-x-4">
        <div className="w-12 h-12 skeleton-bg rounded-2xl shrink-0" />
        <div className="space-y-2.5 flex-1 min-w-0">
          <div className="h-4 w-36 skeleton-bg rounded" />
          <div className="h-3 w-56 skeleton-bg rounded" />
          <div className="h-3 w-48 skeleton-bg rounded" />
        </div>
        <div className="flex items-center space-x-1 shrink-0">
          <div className="w-8 h-8 skeleton-bg rounded-xl" />
          <div className="w-8 h-8 skeleton-bg rounded-xl" />
        </div>
      </div>
    </div>
  </div>
);

const AddressManagementPage = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchAddresses = () => {
    setLoading(true);
    api.get('/addresses')
      .then(({ data }) => setAddresses(data.data || []))
      .catch(() => toast.error('Không thể tải địa chỉ'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAddresses(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Xoá địa chỉ này?')) return;
    try {
      await api.delete(`/addresses/${id}`);
      toast.success('Đã xoá địa chỉ');
      fetchAddresses();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  return (
    <div className="overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 animate-fade-in">
        {/* ═══ Header ═══ */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-ink tracking-tight">Địa chỉ giao hàng</h1>
              <p className="text-ink-tertiary text-sm mt-1">Quản lý nhiều địa chỉ giao hàng để thanh toán nhanh hơn</p>
            </div>
            <button
              onClick={() => { setEditing(null); setShowModal(true); }}
              className="group relative overflow-hidden inline-flex items-center space-x-2 px-5 py-2.5 bg-primary-600 text-white rounded-2xl font-semibold text-sm hover:bg-primary-700 active:scale-[0.97] transition-all duration-200 shadow-premium-md"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <FiPlus className="group-hover:scale-110 transition-transform" />
              <span>Thêm địa chỉ</span>
            </button>
          </div>
        </div>

        {/* ═══ Skeleton Loading ═══ */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <AddressSkeleton key={i} />)}
          </div>
        ) : addresses.length === 0 ? (
          /* ═══ Empty State ═══ */
          <div className="card-double-bezel animate-in">
            <div className="card-inner py-20 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-50 to-primary-100 rounded-3xl flex items-center justify-center mx-auto mb-5 ring-1 ring-primary-200/50 shadow-premium-sm">
                <FiMapPin className="text-primary-600 text-2xl" />
              </div>
              <h3 className="text-lg font-semibold text-ink mb-1">Chưa có địa chỉ nào</h3>
              <p className="text-sm text-ink-tertiary max-w-xs mx-auto mb-6">
                Thêm địa chỉ giao hàng để tiện lợi hơn khi mua sắm
              </p>
              <button
                onClick={() => { setEditing(null); setShowModal(true); }}
                className="group relative overflow-hidden inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-semibold text-sm hover:bg-primary-700 active:scale-[0.97] transition-all duration-200 shadow-premium-md"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <FiPlus className="group-hover:scale-110 transition-transform" />
                <span>Thêm địa chỉ mới</span>
              </button>
            </div>
          </div>
        ) : (
          /* ═══ Address List ═══ */
          <>
            {/* Stats bar */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-ink-tertiary">
                <span className="font-semibold text-ink">{addresses.length}</span> địa chỉ đã lưu
              </p>
            </div>

            <div className="space-y-3">
              {addresses.map((addr, index) => (
                <div
                  key={addr.id}
                  className="card-double-bezel group animate-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="card-inner">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 min-w-0 flex-1">
                        {/* Icon */}
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl flex items-center justify-center shrink-0 ring-1 ring-primary-200/50 shadow-premium-sm">
                          {addr.label === 'Cơ quan' ? (
                            <FiBriefcase className="text-primary-600 text-lg" />
                          ) : addr.label === 'Khác' ? (
                            <FiStar className="text-primary-600 text-lg" />
                          ) : (
                            <FiHome className="text-primary-600 text-lg" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center flex-wrap gap-2 mb-1">
                            <span className="font-semibold text-ink">{addr.label}</span>
                            {addr.isDefault && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary-50 border border-primary-200 text-[10px] font-semibold text-primary-700">
                                <FiCheck className="mr-0.5 text-[8px]" />
                                Mặc định
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-ink">
                            {addr.fullName}
                            {addr.phone ? <span className="text-ink-tertiary"> | {addr.phone}</span> : ''}
                          </p>
                          <p className="text-sm text-ink-secondary mt-0.5">
                            {addr.street}
                            {addr.ward ? `, ${addr.ward}` : ''}
                            {addr.district ? `, ${addr.district}` : ''}
                          </p>
                          <p className="text-sm text-ink-secondary">{addr.city}</p>
                        </div>
                      </div>

                      {/* Actions — visible on hover (desktop) or always (mobile) */}
                      <div className="flex items-center space-x-1 shrink-0 ml-4 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200">
                        {!addr.isDefault && (
                          <button
                            onClick={async () => {
                              try {
                                await api.put(`/addresses/${addr.id}`, { isDefault: true });
                                toast.success('Đã đặt làm mặc định');
                                fetchAddresses();
                              } catch { toast.error('Cập nhật thất bại'); }
                            }}
                            className="text-[10px] font-medium text-primary-600 hover:text-primary-700 px-2.5 py-1.5 rounded-xl hover:bg-primary-50 transition-all active:scale-[0.95] hidden md:inline-block"
                          >
                            Mặc định
                          </button>
                        )}
                        <button
                          onClick={() => { setEditing(addr); setShowModal(true); }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 active:scale-[0.92]"
                          title="Sửa"
                        >
                          <FiEdit2 size={13} />
                        </button>
                        {!addr.isDefault && (
                          <button
                            onClick={() => handleDelete(addr.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 active:scale-[0.92]"
                            title="Xoá"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showModal && (
        <AddressModal
          address={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={() => { setShowModal(false); setEditing(null); fetchAddresses(); }}
        />
      )}
    </div>
  );
};

export default AddressManagementPage;
