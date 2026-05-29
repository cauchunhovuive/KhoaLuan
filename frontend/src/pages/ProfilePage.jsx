import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiUser, FiMail, FiPhone, FiMapPin, FiSave, FiCamera } from 'react-icons/fi';
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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Thông tin cá nhân</h1>

      <div className="card p-8">
        {/* Avatar */}
        <div className="flex items-center space-x-4 mb-8">
          <div className="relative">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-600">{user?.name?.[0] || 'U'}</span>
            </div>
            <button className="absolute bottom-0 right-0 bg-primary-600 text-white p-1.5 rounded-full hover:bg-primary-700">
              <FiCamera size={14} />
            </button>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{user?.name}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên</label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" name="name" value={formData.name} onChange={handleChange}
                className="input-field pl-10" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="email" value={user?.email || ''} className="input-field pl-10 bg-gray-50" disabled />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
            <div className="relative">
              <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                className="input-field pl-10" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
            <div className="relative">
              <FiMapPin className="absolute left-3 top-3 text-gray-400" />
              <textarea name="address" value={formData.address} onChange={handleChange}
                className="input-field pl-10" rows={2} />
            </div>
          </div>

          <div className="pt-4">
            <button type="submit" disabled={saving} className="btn-primary flex items-center space-x-2">
              <FiSave />
              <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
