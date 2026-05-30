import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiUser, FiMail, FiPhone, FiMapPin, FiSave, FiCamera, FiArrowRight } from 'react-icons/fi';
import { updateProfile } from '../store/authSlice';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name || '', phone: user.phone || '', address: user.address || '' });
    }
  }, [user]);

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

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-ink mb-8">Thông tin cá nhân</h1>

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

            <div className="pt-4">
              <button type="submit" disabled={saving} className="btn-primary inline-flex items-center space-x-2 group">
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

export default ProfilePage;
