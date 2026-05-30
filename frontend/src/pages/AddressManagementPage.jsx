import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiMapPin, FiHome, FiBriefcase, FiStar } from 'react-icons/fi';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-premium-xl border border-gray-100 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">{address ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-ink text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center space-x-2">
            {['Nhà', 'Cơ quan', 'Khác'].map(label => (
              <button key={label} type="button" onClick={() => setForm({ ...form, label })}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${form.label === label ? 'bg-primary-600 text-white shadow-premium-sm' : 'bg-surface-secondary text-ink-secondary hover:bg-surface-tertiary'}`}>
                {label === 'Nhà' ? <FiHome className="inline mr-1.5" size={14} /> : label === 'Cơ quan' ? <FiBriefcase className="inline mr-1.5" size={14} /> : <FiStar className="inline mr-1.5" size={14} />}
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Tên người nhận *</label>
              <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="input-field" placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Số điện thoại *</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="0912345678" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">Địa chỉ *</label>
            <input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className="input-field" placeholder="Số nhà, tên đường" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Phường/Xã</label>
              <input value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} className="input-field" placeholder="Phường 1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Quận/Huyện</label>
              <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className="input-field" placeholder="Quận 1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Thành phố *</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input-field" placeholder="TP. HCM" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
            <label className="text-sm text-ink-secondary">Đặt làm địa chỉ mặc định</label>
          </div>
          <div className="flex items-center space-x-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5">{saving ? 'Đang lưu...' : address ? 'Cập nhật' : 'Thêm địa chỉ'}</button>
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm text-ink-secondary hover:bg-surface-secondary rounded-xl transition-colors">Huỷ</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddressManagementPage = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchAddresses = () => {
    setLoading(true);
    api.get('/addresses')
      .then(({ data }) => setAddresses(data.data))
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
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Địa chỉ giao hàng</h1>
          <p className="text-sm text-ink-tertiary mt-1">Quản lý nhiều địa chỉ giao hàng</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary inline-flex items-center space-x-2">
          <FiPlus /><span>Thêm địa chỉ</span>
        </button>
      </div>

      {loading ? <LoadingSpinner size="skeleton" /> : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr.id} className="card p-5 hover:border-gray-200 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 min-w-0 flex-1">
                  <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <FiMapPin className="text-primary-600 text-lg" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-semibold text-ink">{addr.label}</span>
                      {addr.isDefault && <span className="badge text-xs bg-primary-100 text-primary-700">Mặc định</span>}
                    </div>
                    <p className="text-sm text-ink mt-0.5">{addr.fullName} | {addr.phone}</p>
                    <p className="text-sm text-ink-secondary">{addr.street}, {addr.ward ? `${addr.ward}, ` : ''}{addr.district ? `${addr.district}, ` : ''}{addr.city}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1 ml-4">
                  <button onClick={() => { setEditing(addr); setShowModal(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><FiEdit2 size={14} /></button>
                  {!addr.isDefault && <button onClick={() => handleDelete(addr.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"><FiTrash2 size={14} /></button>}
                </div>
              </div>
            </div>
          ))}
          {addresses.length === 0 && (
            <div className="text-center py-16 text-ink-tertiary">
              <FiMapPin className="text-3xl mx-auto mb-3" />
              <p className="font-medium">Chưa có địa chỉ nào</p>
              <p className="text-sm mt-1">Thêm địa chỉ giao hàng để tiện lợi hơn khi mua sắm</p>
            </div>
          )}
        </div>
      )}

      {showModal && <AddressModal address={editing} onClose={() => { setShowModal(false); setEditing(null); }} onSaved={() => { setShowModal(false); setEditing(null); fetchAddresses(); }} />}
    </div>
  );
};

export default AddressManagementPage;
