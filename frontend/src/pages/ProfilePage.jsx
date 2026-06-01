import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiUser, FiMail, FiPhone, FiMapPin, FiSave, FiCamera, FiArrowRight, FiLock,
  FiHeart, FiKey, FiCheck, FiZap, FiShield, FiClock, FiExternalLink,
  FiShoppingBag, FiHome, FiBriefcase, FiEdit2, FiTrash2,
} from 'react-icons/fi';
import { updateProfile } from '../store/authSlice';
import api from '../services/api';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'profile', label: 'Thông tin', icon: FiUser },
  { id: 'password', label: 'Mật khẩu', icon: FiLock },
  { id: 'addresses', label: 'Địa chỉ', icon: FiMapPin },
  { id: 'followed', label: 'Yêu thích', icon: FiHeart },
];

const OrderStatCard = ({ icon: Icon, label, value, color }) => (
  <div className={`flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-br ${color} border border-white/20`}>
    <Icon className="text-white text-xl mb-1.5" />
    <p className="text-lg font-bold text-white">{value}</p>
    <p className="text-[10px] text-white/70">{label}</p>
  </div>
);

const ProfilePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('profile');

  // Profile form
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  // Password form
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  // Addresses
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({ label: '', fullName: '', phone: '', street: '', ward: '', district: '', city: '', isDefault: false });
  const [savingAddress, setSavingAddress] = useState(false);

  // Followed shops
  const [followedShops, setFollowedShops] = useState([]);
  const [loadingShops, setLoadingShops] = useState(false);

  // Order stats
  const [orderStats, setOrderStats] = useState({ total: 0, completed: 0, cancelled: 0 });

  // Avatar upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name || '', phone: user.phone || '', address: user.address || '' });
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'addresses') fetchAddresses();
    if (activeTab === 'followed') fetchFollowedShops();
  }, [activeTab]);

  // Fetch order stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/orders?limit=200');
        const orders = data.data?.orders || [];
        const pagination = data.data?.pagination || {};
        setOrderStats({
          total: pagination.total || orders.length,
          completed: orders.filter(o => o.status === 'DELIVERED').length,
          cancelled: orders.filter(o => o.status === 'CANCELLED').length,
        });
      } catch {}
    };
    fetchStats();
  }, []);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ chấp nhận file ảnh');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ảnh không được quá 2MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result);
        reader.onerror = () => reject(new Error('Đọc file thất bại'));
        reader.readAsDataURL(file);
      });
      if (typeof base64 === 'string') {
        await dispatch(updateProfile({ avatar: base64 })).unwrap();
        toast.success('Cập nhật ảnh đại diện thành công');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Cập nhật ảnh thất bại');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fetchAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const { data } = await api.get('/addresses');
      setAddresses(data.data || []);
    } catch {} finally { setLoadingAddresses(false); }
  };

  const fetchFollowedShops = async () => {
    setLoadingShops(true);
    try {
      const { data } = await api.get('/users/follow');
      setFollowedShops(data.data || []);
    } catch {} finally { setLoadingShops(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await dispatch(updateProfile(formData)).unwrap();
      toast.success('Cập nhật thông tin thành công');
    } catch (error) { toast.error(error || 'Cập nhật thất bại'); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) { toast.error('Mật khẩu mới không khớp'); return; }
    if (passwordData.newPassword.length < 6) { toast.error('Mật khẩu tối thiểu 6 ký tự'); return; }
    setChangingPassword(true);
    try {
      await api.put('/auth/change-password', { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword });
      toast.success('Đổi mật khẩu thành công');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Đổi mật khẩu thất bại'); }
    finally { setChangingPassword(false); }
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    if (!addressForm.street || !addressForm.city) { toast.error('Vui lòng nhập đầy đủ thông tin'); return; }
    setSavingAddress(true);
    try {
      if (editingAddress) {
        await api.put(`/addresses/${editingAddress.id}`, addressForm);
        toast.success('Cập nhật địa chỉ thành công');
      } else {
        await api.post('/addresses', addressForm);
        toast.success('Thêm địa chỉ thành công');
      }
      resetAddressForm();
      fetchAddresses();
    } catch (err) { toast.error(err.response?.data?.message || 'Lưu địa chỉ thất bại'); }
    finally { setSavingAddress(false); }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Xóa địa chỉ này?')) return;
    try { await api.delete(`/addresses/${id}`); toast.success('Đã xóa địa chỉ'); fetchAddresses(); }
    catch { toast.error('Xóa thất bại'); }
  };

  const handleSetDefaultAddress = async (id) => {
    try { await api.put(`/addresses/${id}`, { isDefault: true }); fetchAddresses(); }
    catch { toast.error('Cập nhật thất bại'); }
  };

  const resetAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddress(null);
    setAddressForm({ label: '', fullName: '', phone: '', street: '', ward: '', district: '', city: '', isDefault: false });
  };

  const editAddress = (addr) => {
    setEditingAddress(addr);
    setAddressForm({
      label: addr.label || '', fullName: addr.fullName || '', phone: addr.phone || '',
      street: addr.street || '', ward: addr.ward || '', district: addr.district || '',
      city: addr.city || '', isDefault: addr.isDefault || false,
    });
    setShowAddressForm(true);
  };

  const handleUnfollowShop = async (partnerId) => {
    try { await api.delete(`/users/follow/${partnerId}`); toast.success('Đã bỏ theo dõi'); fetchFollowedShops(); }
    catch { toast.error('Bỏ theo dõi thất bại'); }
  };

  const renderTabButton = (tab) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;
    return (
      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
        className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 active:scale-[0.97] ${
          isActive
            ? 'bg-primary-600 text-white shadow-premium-md'
            : 'text-ink-secondary hover:text-ink hover:bg-surface-tertiary'
        }`}>
        <Icon className={`text-sm ${isActive ? 'text-white' : ''}`} />
        <span>{tab.label}</span>
      </button>
    );
  };

  const renderInput = ({ icon: Icon, name, value, onChange, label, type = 'text', disabled = false, placeholder = '' }) => (
    <div>
      <label className="block text-xs font-semibold text-ink-tertiary uppercase tracking-[0.08em] mb-2">{label}</label>
      <div className="card-double-bezel">
        <div className="card-inner p-0 flex items-center">
          {Icon && (
            <div className="flex items-center justify-center w-12 h-12 shrink-0">
              <Icon className="text-base text-ink-tertiary" />
            </div>
          )}
          <input type={type} name={name} value={value} onChange={onChange}
            disabled={disabled}
            placeholder={placeholder}
            className="flex-1 bg-transparent border-none outline-none text-ink placeholder:text-gray-400 text-sm pr-4 py-3 min-w-0"
            required={!disabled}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 animate-fade-in">
        {/* ═══ Header ═══ */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-ink tracking-tight">Tài khoản của tôi</h1>
          <p className="text-ink-tertiary text-sm mt-1">Quản lý thông tin cá nhân và địa chỉ giao hàng</p>
        </div>

        {/* ═══ User Profile Card (Avatar + Stats) ═══ */}
        <div className="card-double-bezel mb-8">
          <div className="card-inner">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {/* Avatar */}
              <div className="flex items-center space-x-4 md:space-x-5">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-50 rounded-3xl flex items-center justify-center ring-2 ring-primary-200/50 shadow-premium-sm">
                    <span className="text-3xl font-bold text-primary-600">{user?.name?.[0] || 'U'}</span>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                    className="absolute bottom-0 -right-1 bg-primary-600 text-white p-2 rounded-xl hover:bg-primary-700 active:scale-90 transition-all duration-200 shadow-premium-md disabled:opacity-50">
                    {uploadingAvatar ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <FiCamera size={14} />
                    )}
                  </button>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-ink">{user?.name}</h2>
                  <p className="text-sm text-ink-tertiary flex items-center space-x-1.5 mt-0.5">
                    <FiMail className="text-xs" />
                    <span>{user?.email}</span>
                  </p>
                  {user?.phone && (
                    <p className="text-sm text-ink-tertiary flex items-center space-x-1.5 mt-0.5">
                      <FiPhone className="text-xs" />
                      <span>{user.phone}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Order Stats */}
              <div className="flex-1 grid grid-cols-3 gap-3">
                <OrderStatCard icon={FiShoppingBag} label="Tổng đơn" value={orderStats.total} color="from-primary-500 to-primary-600" />
                <OrderStatCard icon={FiCheck} label="Hoàn thành" value={orderStats.completed} color="from-emerald-500 to-emerald-600" />
                <OrderStatCard icon={FiClock} label="Đã huỷ" value={orderStats.cancelled} color="from-red-400 to-red-500" />
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Tabs ═══ */}
        <div className="flex overflow-x-auto space-x-2 mb-6 pb-1 scrollbar-none">
          {TABS.map(renderTabButton)}
        </div>

        {/* ═══════════════ TAB: PROFILE ═══════════════ */}
        {activeTab === 'profile' && (
          <div className="card-double-bezel animate-in">
            <div className="card-inner p-6 md:p-8">
              <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-gray-100">
                <div className="w-10 h-10 bg-primary-100 rounded-2xl flex items-center justify-center">
                  <FiUser className="text-lg text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-ink">Thông tin cá nhân</h3>
                  <p className="text-xs text-ink-tertiary">Cập nhật thông tin cơ bản của bạn</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
                {renderInput({ icon: FiUser, name: 'name', value: formData.name, onChange: (e) => setFormData({ ...formData, name: e.target.value }), label: 'Họ tên' })}
                {renderInput({ icon: FiMail, name: 'email', value: user?.email || '', label: 'Email', disabled: true })}
                {renderInput({ icon: FiPhone, name: 'phone', value: formData.phone, onChange: (e) => setFormData({ ...formData, phone: e.target.value }), label: 'Số điện thoại' })}
                {renderInput({ icon: FiMapPin, name: 'address', value: formData.address, onChange: (e) => setFormData({ ...formData, address: e.target.value }), label: 'Địa chỉ' })}

                <div className="pt-4">
                  <button type="submit" disabled={saving}
                    className="group relative overflow-hidden inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-semibold hover:bg-primary-700 active:scale-[0.97] transition-all duration-200 shadow-premium-md disabled:opacity-50">
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    {saving ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Đang lưu...</span></>
                    ) : (
                      <><FiSave className="group-hover:scale-110 transition-transform" /><span>Lưu thay đổi</span></>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════════ TAB: PASSWORD ═══════════════ */}
        {activeTab === 'password' && (
          <div className="card-double-bezel animate-in">
            <div className="card-inner p-6 md:p-8">
              <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-gray-100">
                <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center">
                  <FiShield className="text-lg text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-ink">Đổi mật khẩu</h3>
                  <p className="text-xs text-ink-tertiary">Sử dụng mật khẩu mạnh để bảo vệ tài khoản</p>
                </div>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-5 max-w-md">
                {renderInput({ icon: FiLock, type: 'password', name: 'currentPassword', value: passwordData.currentPassword, onChange: (e) => setPasswordData({ ...passwordData, currentPassword: e.target.value }), label: 'Mật khẩu hiện tại' })}
                {renderInput({ icon: FiKey, type: 'password', name: 'newPassword', value: passwordData.newPassword, onChange: (e) => setPasswordData({ ...passwordData, newPassword: e.target.value }), label: 'Mật khẩu mới', placeholder: 'Tối thiểu 6 ký tự' })}
                {renderInput({ icon: FiCheck, type: 'password', name: 'confirmPassword', value: passwordData.confirmPassword, onChange: (e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value }), label: 'Xác nhận mật khẩu mới' })}

                <div className="pt-4">
                  <button type="submit" disabled={changingPassword}
                    className="group relative overflow-hidden inline-flex items-center space-x-2 px-6 py-3 bg-amber-600 text-white rounded-2xl font-semibold hover:bg-amber-700 active:scale-[0.97] transition-all duration-200 shadow-premium-md disabled:opacity-50">
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    {changingPassword ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Đang xử lý...</span></>
                    ) : (
                      <><FiLock className="group-hover:scale-110 transition-transform" /><span>Đổi mật khẩu</span></>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════════ TAB: ADDRESSES ═══════════════ */}
        {activeTab === 'addresses' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-tertiary">Quản lý địa chỉ giao hàng</p>
              <button onClick={() => { resetAddressForm(); setShowAddressForm(true); }}
                className="group inline-flex items-center space-x-2 px-4 py-2.5 bg-primary-600 text-white rounded-2xl font-semibold text-sm hover:bg-primary-700 active:scale-[0.97] transition-all duration-200 shadow-premium-sm">
                <FiMapPin className="text-sm group-hover:scale-110 transition-transform" />
                <span>Thêm địa chỉ</span>
              </button>
            </div>

            {/* Address Form */}
            {showAddressForm && (
              <div className="card-double-bezel animate-in">
                <div className="card-inner p-6">
                  <h3 className="font-semibold text-ink mb-6 flex items-center space-x-2">
                    <FiMapPin className="text-primary-600" />
                    <span>{editingAddress ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}</span>
                  </h3>
                  <form onSubmit={handleAddressSubmit} className="space-y-4">
                    {/* Label selector */}
                    <div className="flex items-center space-x-2">
                      {[
                        { label: 'Nhà', icon: FiHome },
                        { label: 'Cơ quan', icon: FiBriefcase },
                        { label: 'Khác', icon: FiStar },
                      ].map(({ label: lbl, icon: Icon }) => (
                        <button key={lbl} type="button" onClick={() => setAddressForm({ ...addressForm, label: lbl })}
                          className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 active:scale-[0.97] ${
                            addressForm.label === lbl ? 'bg-primary-600 text-white shadow-premium-sm' : 'bg-surface-secondary text-ink-secondary hover:bg-surface-tertiary border border-gray-200'
                          }`}>
                          <Icon className="text-sm" />
                          <span>{lbl}</span>
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-ink-secondary mb-1.5">Người nhận *</label>
                        <input type="text" value={addressForm.fullName} onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                          className="w-full px-4 py-2.5 bg-surface-secondary border border-gray-200 rounded-xl text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" placeholder="Nguyễn Văn A" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-ink-secondary mb-1.5">Số điện thoại *</label>
                        <input type="tel" value={addressForm.phone} onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                          className="w-full px-4 py-2.5 bg-surface-secondary border border-gray-200 rounded-xl text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" placeholder="0912345678" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ink-secondary mb-1.5">Địa chỉ *</label>
                      <input type="text" value={addressForm.street} onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                        className="w-full px-4 py-2.5 bg-surface-secondary border border-gray-200 rounded-xl text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" placeholder="Số nhà, tên đường" required />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-ink-secondary mb-1.5">Phường/Xã</label>
                        <input type="text" value={addressForm.ward} onChange={(e) => setAddressForm({ ...addressForm, ward: e.target.value })}
                          className="w-full px-4 py-2.5 bg-surface-secondary border border-gray-200 rounded-xl text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" placeholder="Phường 1" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-ink-secondary mb-1.5">Quận/Huyện</label>
                        <input type="text" value={addressForm.district} onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })}
                          className="w-full px-4 py-2.5 bg-surface-secondary border border-gray-200 rounded-xl text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" placeholder="Quận 1" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-ink-secondary mb-1.5">Thành phố *</label>
                        <input type="text" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                          className="w-full px-4 py-2.5 bg-surface-secondary border border-gray-200 rounded-xl text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" placeholder="TP. HCM" required />
                      </div>
                    </div>

                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input type="checkbox" checked={addressForm.isDefault} onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 border-gray-300" />
                      <span className="text-sm text-ink-secondary">Đặt làm địa chỉ mặc định</span>
                    </label>

                    <div className="flex items-center space-x-3 pt-2">
                      <button type="submit" disabled={savingAddress}
                        className="inline-flex items-center space-x-2 px-6 py-2.5 bg-primary-600 text-white rounded-2xl font-semibold text-sm hover:bg-primary-700 active:scale-[0.97] transition-all duration-200 shadow-premium-sm disabled:opacity-50">
                        {savingAddress ? 'Đang lưu...' : (editingAddress ? 'Cập nhật' : 'Thêm địa chỉ')}
                      </button>
                      <button type="button" onClick={resetAddressForm}
                        className="px-5 py-2.5 text-sm font-medium text-ink-secondary hover:text-ink bg-surface-secondary rounded-2xl hover:bg-surface-tertiary transition-all duration-200 border border-gray-200">
                        Hủy
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Address List */}
            <div className="space-y-3">
              {loadingAddresses ? (
                <div className="grid grid-cols-1 gap-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="card-double-bezel">
                      <div className="card-inner">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 skeleton-bg rounded-2xl" />
                          <div className="space-y-2 flex-1">
                            <div className="h-4 w-40 skeleton-bg rounded" />
                            <div className="h-3 w-56 skeleton-bg rounded" />
                            <div className="h-3 w-48 skeleton-bg rounded" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : addresses.length === 0 ? (
                <div className="card-double-bezel">
                  <div className="card-inner py-16 text-center">
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FiMapPin className="text-2xl text-gray-300" />
                    </div>
                    <p className="text-ink-secondary font-medium mb-1">Chưa có địa chỉ nào</p>
                    <p className="text-xs text-ink-tertiary">Thêm địa chỉ giao hàng để thanh toán nhanh hơn</p>
                  </div>
                </div>
              ) : (
                addresses.map((addr) => (
                  <div key={addr.id} className="card-double-bezel group">
                    <div className="card-inner">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 min-w-0 flex-1">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl flex items-center justify-center flex-shrink-0 ring-1 ring-primary-200/50">
                            <FiMapPin className="text-primary-600 text-lg" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center flex-wrap gap-2 mb-1">
                              <span className="font-semibold text-ink">{addr.label || 'Địa chỉ'}</span>
                              {addr.isDefault && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary-50 border border-primary-200 text-[10px] font-semibold text-primary-700">
                                  <FiCheck className="mr-0.5 text-[8px]" />
                                  Mặc định
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-ink">{addr.fullName}{addr.phone ? ` | ${addr.phone}` : ''}</p>
                            <p className="text-sm text-ink-secondary mt-0.5">
                              {addr.street}{addr.ward ? `, ${addr.ward}` : ''}{addr.district ? `, ${addr.district}` : ''}
                            </p>
                            <p className="text-sm text-ink-secondary">{addr.city}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 flex-shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {!addr.isDefault && (
                            <button onClick={() => handleSetDefaultAddress(addr.id)}
                              className="text-[10px] font-medium text-primary-600 hover:text-primary-700 px-2.5 py-1.5 rounded-lg hover:bg-primary-50 transition-all">Mặc định</button>
                          )}
                          <button onClick={() => editAddress(addr)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><FiEdit2 size={13} /></button>
                          {!addr.isDefault && (
                            <button onClick={() => handleDeleteAddress(addr.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><FiTrash2 size={13} /></button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ═══════════════ TAB: FOLLOWED SHOPS ═══════════════ */}
        {activeTab === 'followed' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-tertiary">Các cửa hàng bạn đang theo dõi</p>
              <Link to="/products"
                className="group inline-flex items-center space-x-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors">
                <span>Khám phá thêm</span>
                <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loadingShops ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="card-double-bezel">
                    <div className="card-inner">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 skeleton-bg rounded-xl" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 w-32 skeleton-bg rounded" />
                          <div className="h-3 w-24 skeleton-bg rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : followedShops.length === 0 ? (
                <div className="md:col-span-2 card-double-bezel">
                  <div className="card-inner py-16 text-center">
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FiHeart className="text-2xl text-gray-300" />
                    </div>
                    <p className="text-ink-secondary font-medium mb-1">Chưa theo dõi cửa hàng nào</p>
                    <p className="text-xs text-ink-tertiary mb-4">Theo dõi cửa hàng yêu thích để nhận thông tin khuyến mãi</p>
                    <Link to="/products" className="btn-primary inline-flex items-center space-x-2 text-sm">
                      <span>Khám phá ngay</span>
                      <FiArrowRight />
                    </Link>
                  </div>
                </div>
              ) : (
                followedShops.map((shop) => (
                  <div key={shop.id} className="card-double-bezel group">
                    <div className="card-inner">
                      <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0 ring-1 ring-emerald-200/50">
                          <span className="text-emerald-600 font-bold text-lg">{shop.partner?.name?.[0] || 'S'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link to={`/shop/${shop.partnerId}`}
                            className="font-semibold text-ink truncate hover:text-primary-600 transition-colors duration-200 block">
                            {shop.partner?.storeName || shop.partner?.name}
                          </Link>
                          <p className="text-xs text-ink-tertiary flex items-center space-x-1 mt-0.5">
                            <FiClock className="text-[9px]" />
                            <span>Đã theo dõi từ {new Date(shop.createdAt).toLocaleDateString('vi-VN')}</span>
                          </p>
                        </div>
                        <button onClick={() => handleUnfollowShop(shop.partnerId)}
                          className="shrink-0 text-[10px] font-medium text-red-500 hover:text-red-600 px-3 py-1.5 rounded-xl border border-red-200 hover:bg-red-50 active:scale-[0.97] transition-all duration-200">
                          Bỏ theo dõi
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;