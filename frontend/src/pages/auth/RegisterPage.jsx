import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiUser, FiMail, FiLock, FiPhone, FiArrowRight, FiShoppingBag, FiFileText, FiMapPin, FiTag } from 'react-icons/fi';
import { registerUser, fetchCurrentUser, clearError } from '../../store/authSlice';
import api from '../../services/api';
import toast from 'react-hot-toast';

const RegisterPage = () => {
  const [isPartner, setIsPartner] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: '',
    storeName: '', storeDescription: '', taxCode: '', businessAddress: '',
  });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) navigate('/');
    return () => dispatch(clearError());
  }, [isAuthenticated, navigate, dispatch]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isPartner) {
      try {
        const { data } = await api.post('/partner/register', formData);
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        // Cập nhật Redux state
        dispatch({ type: 'auth/login/fulfilled', payload: data.data });
        await dispatch(fetchCurrentUser());
        toast.success(data.data.message || 'Đăng ký đối tác thành công!');
        navigate('/');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Đăng ký thất bại');
      }
    } else {
      const result = await dispatch(registerUser(formData));
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success('Đăng ký thành công');
        navigate('/');
      }
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-12 relative overflow-hidden bg-gradient-to-b from-surface-secondary to-white">
      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2.5 group">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center group-hover:bg-primary-700 transition-colors shadow-premium-md">
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <span className="text-xl font-bold text-ink">KhoaLuan</span>
          </Link>
        </div>

        {/* Card with double-bezel */}
        <div className="p-1.5 bg-primary-50/50 rounded-[2rem] ring-1 ring-primary-100/50">
          <div className="bg-white rounded-[calc(2rem-0.375rem)] shadow-premium-lg p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-ink">Đăng ký</h2>
              <p className="text-ink-secondary mt-1.5">Tạo tài khoản mới</p>
            </div>

            {/* Toggle customer/partner */}
            <div className="p-1 bg-surface-secondary rounded-xl mb-6">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setIsPartner(false)}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                    !isPartner ? 'bg-white text-ink shadow-premium-sm' : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  Khách hàng
                </button>
                <button
                  type="button"
                  onClick={() => setIsPartner(true)}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isPartner ? 'bg-white text-emerald-700 shadow-premium-sm' : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  <FiShoppingBag className="inline mr-1.5" size={14} />
                  Đối tác
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1.5">Họ tên *</label>
                <div className="relative group">
                  <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                  <input type="text" name="name" value={formData.name} onChange={handleChange}
                    placeholder="Nguyễn Văn A" className="input-field pl-10" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1.5">Email *</label>
                  <div className="relative group">
                    <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                    <input type="email" name="email" value={formData.email} onChange={handleChange}
                      placeholder="your@email.com" className="input-field pl-10" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1.5">Số điện thoại</label>
                  <div className="relative group">
                    <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                      placeholder="0123 456 789" className="input-field pl-10" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1.5">Mật khẩu *</label>
                <div className="relative group">
                  <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                  <input type="password" name="password" value={formData.password} onChange={handleChange}
                    placeholder="••••••••" className="input-field pl-10" required minLength={6} />
                </div>
              </div>

              {/* Partner fields */}
              {isPartner && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Thông tin cửa hàng</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-ink-secondary mb-1.5">Tên cửa hàng *</label>
                      <div className="relative group">
                        <FiShoppingBag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                        <input type="text" name="storeName" value={formData.storeName} onChange={handleChange}
                          placeholder="Shop của bạn" className="input-field pl-10" required={isPartner} />
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
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-secondary mb-1.5">Địa chỉ kinh doanh *</label>
                    <div className="relative group">
                      <FiMapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                      <input type="text" name="businessAddress" value={formData.businessAddress} onChange={handleChange}
                        placeholder="123 Nguyễn Huệ, Q.1, TP.HCM" className="input-field pl-10" required={isPartner} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-secondary mb-1.5">Mô tả cửa hàng</label>
                    <div className="relative group">
                      <FiFileText className="absolute left-3.5 top-3 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                      <textarea name="storeDescription" value={formData.storeDescription} onChange={handleChange}
                        placeholder="Giới thiệu ngắn về cửa hàng của bạn..."
                        className="input-field pl-10" rows={2} />
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <p className="text-xs text-amber-800">
                      <strong>Lưu ý:</strong> Tài khoản đối tác cần được Admin phê duyệt trước khi có thể đăng sản phẩm. Bạn sẽ nhận được thông báo khi được duyệt.
                    </p>
                  </div>
                </div>
              )}

              <button type="submit" disabled={loading} className={`btn w-full py-3 group ${isPartner ? 'bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-[0.98] shadow-premium-sm' : 'btn-primary w-full py-3 group'}`}>
                <span className="flex items-center justify-center space-x-2">
                  {loading ? (
                    'Đang xử lý...'
                  ) : (
                    <>
                      <span>{isPartner ? 'Đăng ký làm đối tác' : 'Đăng ký'}</span>
                      <FiArrowRight className="group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </span>
              </button>
            </form>

            <p className="text-center text-sm text-ink-secondary mt-5">
              Đã có tài khoản?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium transition-colors">
                Đăng nhập
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
