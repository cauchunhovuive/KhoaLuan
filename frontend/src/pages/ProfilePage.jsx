import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiUser, FiMail, FiPhone, FiMapPin, FiSave, FiCamera, FiArrowRight, FiLock,
  FiHeart, FiKey, FiCheck, FiX, FiExternalLink,
} from 'react-icons/fi';
import { updateProfile } from '../store/authSlice';
import api from '../services/api';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'profile', label: 'Thông tin cá nhân', icon: FiUser },
  { id: 'password', label: 'Đổi mật khẩu', icon: FiLock },
  { id: 'addresses', label: 'Địa chỉ', icon: FiMapPin },
  { id: 'followed', label: 'Cửa hàng yêu thích', icon: FiHeart },
];

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

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name || '', phone: user.phone || '', address: user.address || '' });
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'addresses') fetchAddresses();
    if (activeTab === 'followed') fetchFollowedShops();
  }, [activeTab]);

  const fetchAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const { data } = await api.get('/addresses');
      setAddresses(data.data || []);
    } catch (err) {
      // ignore
    } finally {
      setLoadingAddresses(false);
    }
  };

  const fetchFollowedShops = async () => {
    setLoadingShops(true);
    try {
      const { data } = await api.get('/users/followed-shops');
      setFollowedShops(data.data || []);
    } catch (err) {
      // ignore
    } finally {
      setLoadingShops(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await dispatch(updateProfile(formData)).unwrap();
      toast.success('Cập nhật thông tin thành công');
    } catch (error) {
      toast.error(error || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Mật khẩu mới không khớp');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Mật khẩu tối thiểu 6 ký tự');
      return;
    }
    setChangingPassword(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('Đổi mật khẩu thành công');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đổi mật khẩu thất bại');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    if (!addressForm.street || !addressForm.city) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }
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
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lưu địa chỉ thất bại');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Xóa địa chỉ này?')) return;
    try {
      await api.delete(`/addresses/${id}`);
      toast.success('Đã xóa địa chỉ');
      fetchAddresses();
    } catch (err) {
      toast.error('Xóa thất bại');
    }
  };

  const handleSetDefaultAddress = async (id) => {
    try {
      await api.put(`/addresses/${id}`, { isDefault: true });
      fetchAddresses();
    } catch (err) {
      toast.error('Cập nhật thất bại');
    }
  };

  const resetAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddress(null);
    setAddressForm({ label: '', fullName: '', phone: '', street: '', ward: '', district: '', city: '', isDefault: false });
  };

  const editAddress = (addr) => {
    setEditingAddress(addr);
    setAddressForm({
      label: addr.label || '',
      fullName: addr.fullName || '',
      phone: addr.phone || '',
      street: addr.street || '',
      ward: addr.ward || '',
      district: addr.district || '',
      city: addr.city || '',
      isDefault: addr.isDefault || false,
    });
    setShowAddressForm(true);
  };

  const handleUnfollowShop = async (partnerId) => {
    try {
      await api.delete(`/users/follow-shop/${partnerId}`);
      toast.success('Đã bỏ theo dõi cửa hàng');
      fetchFollowedShops();
    } catch (err) {
      toast.error('Bỏ theo dõi thất bại');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-ink mb-8">Tài khoản của tôi</h1>

      {/* Tabs */}
      <div className="flex overflow-x-auto space-x-1 mb-8 pb-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                  : 'text-ink-secondary hover:text-ink hover:bg-surface-tertiary'
              }`}
            >
              <Icon className="text-sm" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab: Profile */}
      {activeTab === 'profile' && (
        <div className="p-1.5 bg-primary-50/50 rounded-[2rem] ring-1 ring-primary-100/50">
          <div className="bg-white rounded-[calc(2rem-0.375rem)] shadow-premium-lg p-8">
            {/* Avatar */}
            <div className="flex items-center space-x-5 mb-8 pb-6 border-b border-gray-100">
              <div className="relative">
                <div className="w-20 h-20 bg-primary-50 rounded-2xl flex items-center justify-center ring-2 ring-primary-100">
                  <span className="text-3xl font-bold text-primary-600">{user?.name?.[0] || 'U'}</span>
                </div>
                <button className="absolute bottom-0 -right-1 bg-primary-600 text-white p-2 rounded-xl hover:bg-primary-700 transition-colors shadow-premium-md">
                  <FiCamera size={14} />
                </button>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-ink">{user?.name}</h2>
                <p className="text-sm text-ink-secondary">{user?.email}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1.5">Họ tên</label>
                <div className="relative group">
                  <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                  <input type="text" name="name" value={formData.name} onChange={handleChange}
                    className="input-field pl-10" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1.5">Email</label>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" value={user?.email || ''} className="input-field pl-10 bg-surface-secondary text-ink-tertiary" disabled />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1.5">Số điện thoại</label>
                <div className="relative group">
                  <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                    className="input-field pl-10" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1.5">Địa chỉ</label>
                <div className="relative group">
                  <FiMapPin className="absolute left-3.5 top-3 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                  <textarea name="address" value={formData.address} onChange={handleChange}
                    className="input-field pl-10" rows={2} />
                </div>
              </div>
              <div className="pt-4 flex items-center space-x-3">
                <button type="submit" disabled={saving} className="btn-primary inline-flex items-center space-x-2 group">
                  {saving ? 'Đang lưu...' : (
                    <><FiSave /><span>Lưu thay đổi</span><FiArrowRight className="group-hover:translate-x-0.5 transition-transform" /></>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Change Password */}
      {activeTab === 'password' && (
        <div className="p-1.5 bg-primary-50/50 rounded-[2rem] ring-1 ring-primary-100/50">
          <div className="bg-white rounded-[calc(2rem-0.375rem)] shadow-premium-lg p-8">
            <h2 className="text-lg font-semibold text-ink mb-6 flex items-center space-x-2">
              <FiKey className="text-primary-600" />
              <span>Đổi mật khẩu</span>
            </h2>
            <form onSubmit={handlePasswordChange} className="space-y-5 max-w-md">
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1.5">Mật khẩu hiện tại</label>
                <div className="relative group">
                  <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                  <input type="password" name="currentPassword" value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="input-field pl-10" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1.5">Mật khẩu mới</label>
                <div className="relative group">
                  <FiKey className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                  <input type="password" name="newPassword" value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="input-field pl-10" required minLength={6} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1.5">Xác nhận mật khẩu mới</label>
                <div className="relative group">
                  <FiCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                  <input type="password" name="confirmPassword" value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="input-field pl-10" required minLength={6} />
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" disabled={changingPassword} className="btn-primary inline-flex items-center space-x-2">
                  {changingPassword ? 'Đang xử lý...' : <><FiLock /><span>Đổi mật khẩu</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Addresses */}
      {activeTab === 'addresses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-secondary">Quản lý địa chỉ giao hàng của bạn</p>
            <button onClick={() => { resetAddressForm(); setShowAddressForm(true); }}
              className="btn-primary text-sm inline-flex items-center space-x-1">
              <FiMapPin /><span>Thêm địa chỉ</span>
            </button>
          </div>

          {/* Address form */}
          {showAddressForm && (
            <div className="p-1.5 bg-primary-50/50 rounded-[1.5rem] ring-1 ring-primary-100/50">
              <div className="bg-white rounded-[calc(1.5rem-0.375rem)] p-6">
                <h3 className="font-semibold text-ink mb-5">{editingAddress ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}</h3>
                <form onSubmit={handleAddressSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1">Tên gợi nhớ (Nhà, Cơ quan...)</label>
                    <input type="text" value={addressForm.label} onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                      className="input-field" placeholder="VD: Nhà riêng" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1">Người nhận</label>
                    <input type="text" value={addressForm.fullName} onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                      className="input-field" placeholder="Tên người nhận" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1">Số điện thoại</label>
                    <input type="tel" value={addressForm.phone} onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                      className="input-field" placeholder="Số điện thoại" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-ink-secondary mb-1">Địa chỉ (số nhà, đường) *</label>
                    <input type="text" value={addressForm.street} onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                      className="input-field" placeholder="Số nhà, tên đường" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1">Phường/Xã</label>
                    <input type="text" value={addressForm.ward} onChange={(e) => setAddressForm({ ...addressForm, ward: e.target.value })}
                      className="input-field" placeholder="Phường/Xã" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1">Quận/Huyện</label>
                    <input type="text" value={addressForm.district} onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })}
                      className="input-field" placeholder="Quận/Huyện" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1">Thành phố *</label>
                    <input type="text" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                      className="input-field" placeholder="Thành phố" required />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="isDefault" checked={addressForm.isDefault}
                      onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                      className="rounded text-primary-600 focus:ring-primary-500" />
                    <label htmlFor="isDefault" className="text-sm text-ink-secondary">Đặt làm địa chỉ mặc định</label>
                  </div>
                  <div className="md:col-span-2 flex items-center space-x-3 pt-2">
                    <button type="submit" disabled={savingAddress} className="btn-primary text-sm">
                      {savingAddress ? 'Đang lưu...' : (editingAddress ? 'Cập nhật' : 'Thêm địa chỉ')}
                    </button>
                    <button type="button" onClick={resetAddressForm} className="px-4 py-2 text-sm text-ink-secondary hover:text-ink bg-surface-secondary rounded-xl hover:bg-surface-tertiary transition-all">
                      Hủy
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Address list */}
          <div className="space-y-3">
            {loadingAddresses ? (
              <div className="text-center py-8 text-ink-tertiary">Đang tải...</div>
            ) : addresses.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <FiMapPin className="mx-auto text-3xl text-gray-300 mb-3" />
                <p className="text-ink-secondary">Chưa có địa chỉ nào</p>
                <p className="text-sm text-ink-tertiary mt-1">Thêm địa chỉ giao hàng để thanh toán nhanh hơn</p>
              </div>
            ) : (
              addresses.map((addr) => (
                <div key={addr.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-premium-md transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1.5">
                        <p className="font-medium text-ink">{addr.fullName || 'Người nhận'}</p>
                        <span className="text-ink-tertiary">|</span>
                        <span className="text-sm text-ink-secondary">{addr.phone}</span>
                        {addr.isDefault && (
                          <span className="text-[10px] font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-200">
                            Mặc định
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-ink-secondary">
                        {addr.street}{addr.ward ? `, ${addr.ward}` : ''}{addr.district ? `, ${addr.district}` : ''}
                      </p>
                      <p className="text-sm text-ink-secondary">{addr.city}</p>
                      {addr.label && <p className="text-xs text-ink-tertiary mt-1">{addr.label}</p>}
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                      {!addr.isDefault && (
                        <button onClick={() => handleSetDefaultAddress(addr.id)}
                          className="text-xs text-primary-600 hover:text-primary-700 px-2.5 py-1.5 rounded-lg hover:bg-primary-50 transition-all">
                          Đặt mặc định
                        </button>
                      )}
                      <button onClick={() => editAddress(addr)}
                        className="text-xs text-ink-secondary hover:text-ink px-2.5 py-1.5 rounded-lg hover:bg-surface-secondary transition-all">
                        Sửa
                      </button>
                      <button onClick={() => handleDeleteAddress(addr.id)}
                        className="text-xs text-red-500 hover:text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-all">
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Followed Shops */}
      {activeTab === 'followed' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-secondary">Các cửa hàng bạn đang theo dõi</p>
            <Link to="/products" className="text-sm text-primary-600 hover:text-primary-700 font-medium inline-flex items-center space-x-1">
              <span>Khám phá thêm</span><FiExternalLink className="text-xs" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingShops ? (
              <div className="col-span-2 text-center py-8 text-ink-tertiary">Đang tải...</div>
            ) : followedShops.length === 0 ? (
              <div className="col-span-2 text-center py-12 bg-white rounded-2xl border border-gray-100">
                <FiHeart className="mx-auto text-3xl text-gray-300 mb-3" />
                <p className="text-ink-secondary">Chưa theo dõi cửa hàng nào</p>
                <p className="text-sm text-ink-tertiary mt-1">Theo dõi cửa hàng yêu thích để nhận thông tin khuyến mãi</p>
              </div>
            ) : (
              followedShops.map((shop) => (
                <div key={shop.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-premium-md transition-all">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-600 font-bold">{shop.partner?.name?.[0] || 'S'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ink truncate">{shop.partner?.storeName || shop.partner?.name}</p>
                      <p className="text-xs text-ink-tertiary">Đã theo dõi từ {new Date(shop.createdAt).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <button onClick={() => handleUnfollowShop(shop.partnerId)}
                      className="text-xs text-red-500 hover:text-red-600 px-3 py-1.5 rounded-xl border border-red-200 hover:bg-red-50 transition-all">
                      Bỏ theo dõi
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
