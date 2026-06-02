import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiXCircle, FiLoader, FiArrowRight, FiShoppingBag } from 'react-icons/fi';
import api from '../services/api';

const PaymentResultPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [result, setResult] = useState(null);

  const success = searchParams.get('success') === 'true';
  const message = searchParams.get('message') || '';
  const orderId = searchParams.get('orderId') || '';

  useEffect(() => {
    const verifyPayment = async () => {
      if (!orderId) {
        setVerifying(false);
        setResult({ success, message });
        return;
      }

      try {
        const { data } = await api.get(`/payments/status/${orderId}`);
        const order = data.data;
        setResult({
          success: order.paymentStatus === 'PAID',
          message: order.paymentStatus === 'PAID' ? 'Thanh toán thành công!' : 'Thanh toán chưa hoàn tất',
          orderId: order.id,
          amount: order.finalAmount,
          paymentMethod: order.paymentMethod,
        });
      } catch (err) {
        setResult({ success, message: message || 'Đã có lỗi xảy ra', orderId });
      } finally {
        setVerifying(false);
      }
    };

    // Chỉ verify nếu có query params từ cổng thanh toán
    if (searchParams.toString()) {
      verifyPayment();
    } else {
      setVerifying(false);
      setResult({ success: false, message: 'Không có thông tin thanh toán' });
    }
  }, [orderId]);

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FiLoader className="text-4xl text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-ink-secondary">Đang xác nhận thanh toán...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="bg-white rounded-3xl shadow-premium-xl p-8 md:p-12 max-w-md w-full text-center animate-fade-in">
        {/* Icon */}
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
          result?.success
            ? 'bg-emerald-100'
            : 'bg-red-100'
        }`}>
          {result?.success ? (
            <FiCheckCircle className="text-4xl text-emerald-600" />
          ) : (
            <FiXCircle className="text-4xl text-red-600" />
          )}
        </div>

        {/* Title */}
        <h1 className={`text-2xl font-bold mb-2 ${
          result?.success ? 'text-emerald-800' : 'text-red-800'
        }`}>
          {result?.success ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
        </h1>

        <p className="text-ink-tertiary text-sm mb-6">
          {result?.message || message || (result?.success ? 'Cảm ơn bạn đã mua hàng!' : 'Vui lòng thử lại sau.')}
        </p>

        {/* Order details */}
        {result?.orderId && (
          <div className="bg-surface-secondary rounded-2xl p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-ink-tertiary">Mã đơn hàng</span>
              <span className="font-mono text-ink font-medium">#{result.orderId.slice(0, 8)}</span>
            </div>
            {result?.amount && (
              <div className="flex justify-between text-sm">
                <span className="text-ink-tertiary">Số tiền</span>
                <span className="font-semibold text-ink">{result.amount.toLocaleString('vi-VN')}₫</span>
              </div>
            )}
            {result?.paymentMethod && (
              <div className="flex justify-between text-sm">
                <span className="text-ink-tertiary">Phương thức</span>
                <span className="font-medium text-ink">{result.paymentMethod}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {result?.orderId && (
            <button
              onClick={() => navigate(`/orders/${result.orderId}`)}
              className="w-full inline-flex items-center justify-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-semibold hover:bg-primary-700 active:scale-[0.97] transition-all duration-200"
            >
              <FiShoppingBag />
              <span>Xem đơn hàng</span>
            </button>
          )}
          <button
            onClick={() => navigate('/')}
            className="w-full inline-flex items-center justify-center space-x-2 px-6 py-3 bg-surface-secondary text-ink rounded-2xl font-semibold hover:bg-surface-tertiary active:scale-[0.97] transition-all duration-200 border border-gray-200"
          >
            <FiArrowRight />
            <span>Về trang chủ</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentResultPage;
