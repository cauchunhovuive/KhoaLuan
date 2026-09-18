import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiUser, FiPhone, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { checkEmail, loginUser, registerUser, clearError } from '../../store/authSlice';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [step, setStep] = useState('login'); // login | register
  const [formData, setFormData] = useState({ email: '', password: '', name: '', phone: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  // Nếu đã đăng nhập thì redirect về trang chủ
  useEffect(() => {
    if (isAuthenticated) navigate('/');
    return () => dispatch(clearError());
  }, [isAuthenticated, navigate, dispatch]);

  useEffect(() => {
    if (error && step === 'login') toast.error(error);
  }, [error, step]);

  useEffect(() => {
    if (error && step === 'register') {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, step, dispatch]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Bước 1: Kiểm tra email → nếu chưa có thì chuyển sang đăng ký
  const handleCheckEmail = async (e) => {
    e.preventDefault();
    setChecking(true);
    try {
      const result = await dispatch(checkEmail(formData.email));
      if (result.meta.requestStatus === 'fulfilled') {
        const { exists, authProvider } = result.payload;
        if (!exists) {
          // Email chưa đăng ký → chuyển sang form đăng ký inline
          setStep('register');
          toast('Email chưa đăng ký tài khoản. Vui lòng nhập thông tin để đăng ký.', {
            icon: '📝',
            duration: 4000,
          });
        } else {
          // Email đã tồn tại → đăng nhập
          if (authProvider === 'google') {
            toast.error('Tài khoản này được đăng nhập qua Google. Vui lòng dùng Google để đăng nhập.');
            setChecking(false);
            return;
          }
          const loginResult = await dispatch(loginUser({ email: formData.email, password: formData.password }));
          if (loginResult.meta.requestStatus === 'fulfilled') {
            toast.success('Đăng nhập thành công');
            navigate('/');
          }
        }
      }
    } catch (err) {
      toast.error('Có lỗi xảy ra, vui lòng thử lại');
    }
    setChecking(false);
  };

  // Bước 2: Đăng ký tài khoản mới
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast.error('Vui lòng nhập họ tên');
      return;
    }
    const result = await dispatch(registerUser({
      email: formData.email,
      password: formData.password,
      name: formData.name,
      phone: formData.phone,
    }));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Đăng ký thành công! Chào mừng bạn đến với KhoaLuan.');
      navigate('/');
    }
  };

  // Quay lại form login
  const backToLogin = () => {
    setStep('login');
    dispatch(clearError());
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

        {/* Card */}
        <div className="p-1.5 bg-primary-50/50 rounded-[2rem] ring-1 ring-primary-100/50">
          <div className="bg-white rounded-[calc(2rem-0.375rem)] shadow-premium-lg p-8">
            {/* ────────── FORM ĐĂNG NHẬP ────────── */}
            {step === 'login' && (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-ink">Đăng nhập</h2>
                  <p className="text-ink-secondary mt-1.5">Chào mừng bạn trở lại!</p>
                </div>

                <form onSubmit={handleCheckEmail} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-ink-secondary mb-1.5">Email</label>
                    <div className="relative group">
                      <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="your@email.com"
                        className="input-field pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-secondary mb-1.5">Mật khẩu</label>
                    <div className="relative group">
                      <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className="input-field pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ink-secondary transition-colors"
                      >
                        {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={checking || loading} className="btn-primary w-full py-3 group">
                    <span className="flex items-center justify-center space-x-2">
                      {checking ? (
                        <span className="flex items-center space-x-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Đang kiểm tra...</span>
                        </span>
                      ) : loading ? (
                        'Đang đăng nhập...'
                      ) : (
                        <>
                          <span>Đăng nhập</span>
                          <FiArrowRight className="group-hover:translate-x-0.5 transition-transform" />
                        </>
                      )}
                    </span>
                  </button>
                </form>

                {/* Google OAuth */}
                <div className="mt-5">
                  <div className="relative mb-5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white px-3 text-ink-tertiary">hoặc tiếp tục với</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const apiUrl = import.meta.env.VITE_API_URL;
                      const backendUrl = apiUrl?.startsWith('http')
                        ? apiUrl.replace(/\/api$/, '')
                        : 'http://localhost:5000';
                      window.location.href = `${backendUrl}/api/auth/google`;
                    }}
                    className="w-full flex items-center justify-center space-x-3 py-3 px-4 border-2 border-gray-200 rounded-xl
                      hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 group"
                  >
                    <FcGoogle className="w-5 h-5" />
                    <span className="text-sm font-medium text-ink-secondary group-hover:text-ink transition-colors">
                      Google
                    </span>
                  </button>
                </div>

                <p className="text-center text-sm text-ink-secondary mt-6">
                  Chưa có tài khoản?{' '}
                  <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium transition-colors">
                    Đăng ký ngay
                  </Link>
                </p>

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <p className="text-xs text-ink-tertiary text-center">
                    Tài khoản demo: admin@example.com / password123
                  </p>
                </div>
              </>
            )}

            {/* ────────── FORM ĐĂNG KÝ INLINE ────────── */}
            {step === 'register' && (
              <>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mb-3">
                    <FiAlertCircle className="text-amber-600" size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-ink">Email chưa đăng ký</h2>
                  <p className="text-ink-secondary mt-1.5">
                    <span className="font-medium text-primary-600">{formData.email}</span> chưa có tài khoản.
                    Nhập thông tin để đăng ký ngay.
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Email + Password (đã điền sẵn, readonly) */}
                  <div className="bg-surface-secondary rounded-xl p-3 space-y-2">
                    <div className="flex items-center space-x-2 text-xs text-ink-tertiary">
                      <FiCheckCircle className="text-green-500" size={14} />
                      <span>Thông tin đã nhập</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <FiMail className="text-gray-400 shrink-0" size={16} />
                      <span className="text-ink font-medium truncate">{formData.email}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <FiLock className="text-gray-400 shrink-0" size={16} />
                      <span className="text-ink">{'•'.repeat(formData.password.length)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-secondary mb-1.5">Họ tên *</label>
                    <div className="relative group">
                      <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Nguyễn Văn A"
                        className="input-field pl-10"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-secondary mb-1.5">Số điện thoại</label>
                    <div className="relative group">
                      <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="0123 456 789"
                        className="input-field pl-10"
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="btn-primary w-full py-3 group">
                    <span className="flex items-center justify-center space-x-2">
                      {loading ? (
                        'Đang đăng ký...'
                      ) : (
                        <>
                          <span>Đăng ký tài khoản</span>
                          <FiArrowRight className="group-hover:translate-x-0.5 transition-transform" />
                        </>
                      )}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={backToLogin}
                    className="w-full text-center text-sm text-ink-secondary hover:text-ink transition-colors py-2"
                  >
                    ← Quay lại đăng nhập
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
