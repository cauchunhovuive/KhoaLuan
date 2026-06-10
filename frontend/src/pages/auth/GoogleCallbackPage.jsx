import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { fetchCurrentUser } from '../../store/authSlice';

const GoogleCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [status, setStatus] = useState('Đang xác thực...');

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');

    if (error || !token) {
      setStatus('Xác thực thất bại, đang chuyển hướng...');
      setTimeout(() => navigate('/login?error=google_auth_failed'), 1500);
      return;
    }

    // Lưu token vào localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);

    // Fetch thông tin user
    dispatch(fetchCurrentUser()).then(() => {
      setStatus('Đăng nhập thành công!');
      setTimeout(() => navigate('/'), 500);
    });
  }, [searchParams, navigate, dispatch]);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-ink-secondary font-medium">{status}</p>
      </div>
    </div>
  );
};

export default GoogleCallbackPage;
