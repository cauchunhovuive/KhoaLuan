import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FiSave, FiShoppingBag, FiFileText, FiMapPin, FiTag, FiPhone, FiArrowRight, FiCheckCircle, FiClock } from 'react-icons/fi';
import { fetchCurrentUser } from '../../store/authSlice';
import api from '../../services/api';
import toast from 'react-hot-toast';

const PartnerProfilePage = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    storeName: '',
    storeDescription: '',
    taxCode: '',
    businessAddress: '',
    phone: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        storeName: user.storeName || '',
        storeDescription: user.storeDescription || '',
        taxCode: user.taxCode || '',
        businessAddress: user.businessAddress || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/partner/profile', formData);
      toast.success('Cập nhật thông tin cửa hàng thành công');
      // Cập nhật Redux state mà không reload trang
      await dispatch(fetchCurrentUser());
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  const approvalStatus = () => {
    if (user?.isApproved) {
      return { label: 'Đã được phê duyệt', color: 'bg-green-100 text-green-700 border-green-200', icon: FiCheckCircle };
    }
    return { label: 'Đang chờ phê duyệt', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: FiClock };
  };

  const status = approvalStatus();

  return (
    <div className="max-w-3xl mx-auto animate-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink">Thông tin cửa hàng</h2>
        <p className="text-ink-tertiary text-sm mt-1">Quản lý thông tin kinh doanh của bạn</p>
      </div>

      {/* Approval Status */}
      <div className={`flex items-center space-x-3 px-5 py-4 rounded-2xl border ${status.color}`}>
        <status.icon className="text-lg flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold">{status.label}</p>
          {!user?.isApproved && (
            <p className="text-xs mt-0.5 opacity-80">
              Sau khi được duyệt, bạn có thể đăng sản phẩm và bắt đầu bán hàng
            </p>
          )}
          {user?.isApproved && user?.approvedAt && (
            <p className="text-xs mt-0.5 opacity-80">
              Phê duyệt ngày {new Date(user.approvedAt).toLocaleDateString('vi-VN')}
            </p>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="p-1.5 bg-primary-50/50 rounded-[2rem] ring-1 ring-primary-100/50">
        <div className="bg-white rounded-[calc(2rem-0.375rem)] shadow-premium-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Store Header */}
            <div className="flex items-center space-x-4 pb-6 border-b border-gray-100">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                user?.isApproved ? 'bg-emerald-100' : 'bg-amber-100'
              }`}>
                <FiShoppingBag className={`text-2xl ${user?.isApproved ? 'text-emerald-600' : 'text-amber-600'}`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-ink">{formData.storeName || 'Cửa hàng của bạn'}</h3>
                <p className="text-sm text-ink-secondary">{user?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-ink-secondary mb-1.5">Tên cửa hàng *</label>
                <div className="relative group">
                  <FiShoppingBag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                  <input type="text" name="storeName" value={formData.storeName} onChange={handleChange}
                    placeholder="Tên cửa hàng của bạn" className="input-field pl-10" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1.5">Số điện thoại</label>
                <div className="relative group">
                  <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                    placeholder="0123 456 789" className="input-field pl-10" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1.5">Mã số thuế</label>
                <div className="relative group">
                  <FiTag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                  <input type="text" name="taxCode" value={formData.taxCode} onChange={handleChange}
                    placeholder="1234567890" className="input-field pl-10" />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-ink-secondary mb-1.5">Địa chỉ kinh doanh *</label>
                <div className="relative group">
                  <FiMapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                  <input type="text" name="businessAddress" value={formData.businessAddress} onChange={handleChange}
                    placeholder="123 Nguyễn Huệ, Q.1, TP.HCM" className="input-field pl-10" required />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-ink-secondary mb-1.5">Mô tả cửa hàng</label>
                <div className="relative group">
                  <FiFileText className="absolute left-3.5 top-3 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                  <textarea name="storeDescription" value={formData.storeDescription} onChange={handleChange}
                    placeholder="Giới thiệu về cửa hàng của bạn..." className="input-field pl-10" rows={3} />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <button type="submit" disabled={saving}
                className="btn-primary inline-flex items-center space-x-2 group">
                {saving ? (
                  'Đang lưu...'
                ) : (
                  <>
                    <FiSave />
                    <span>Lưu thay đổi</span>
                    <FiArrowRight className="group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PartnerProfilePage;
