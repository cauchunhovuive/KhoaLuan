import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FiMapPin, FiPhone, FiFileText, FiCreditCard } from 'react-icons/fi';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
  { value: 'COD', label: 'Thanh toán khi nhận hàng', desc: 'Nhận hàng và thanh toán bằng tiền mặt' },
  { value: 'BANKING', label: 'Chuyển khoản ngân hàng', desc: 'Chuyển khoản qua tài khoản ngân hàng' },
  { value: 'MOMO', label: 'Ví MoMo', desc: 'Thanh toán qua ví điện tử MoMo' },
  { value: 'VNPAY', label: 'VNPay', desc: 'Thanh toán qua cổng VNPay' },
];

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, total } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    shippingAddress: user?.address || '',
    phone: user?.phone || '',
    note: '',
    paymentMethod: 'COD',
  });

  useEffect(() => {
    if (items.length === 0) navigate('/cart');
  }, [items, navigate]);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        shippingAddress: prev.shippingAddress || user.address || '',
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.shippingAddress || !formData.phone) {
      toast.error('Vui lòng nhập đầy đủ thông tin giao hàng');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/orders', formData);
      toast.success('Đặt hàng thành công!');
      navigate(`/orders/${data.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Đặt hàng thất bại');
    } finally {
      setLoading(false);
    }
  };

  const shippingFee = total >= 500000 ? 0 : 30000;
  const finalAmount = total + shippingFee;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Thanh toán</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping info */}
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <FiMapPin className="text-primary-600" />
                <span>Thông tin giao hàng</span>
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ *</label>
                  <textarea name="shippingAddress" value={formData.shippingAddress} onChange={handleChange}
                    className="input-field" rows={2} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại *</label>
                  <div className="relative">
                    <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                      className="input-field pl-10" placeholder="0123 456 789" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                  <div className="relative">
                    <FiFileText className="absolute left-3 top-3 text-gray-400" />
                    <textarea name="note" value={formData.note} onChange={handleChange}
                      className="input-field pl-10" rows={2} placeholder="Ghi chú cho đơn hàng..." />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <FiCreditCard className="text-primary-600" />
                <span>Phương thức thanh toán</span>
              </h3>
              <div className="space-y-3">
                {PAYMENT_METHODS.map((method) => (
                  <label key={method.value} className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                    formData.paymentMethod === method.value ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input type="radio" name="paymentMethod" value={method.value} checked={formData.paymentMethod === method.value}
                      onChange={handleChange} className="mt-1 text-primary-600" />
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">{method.label}</p>
                      <p className="text-sm text-gray-500">{method.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Order summary */}
          <div className="card p-6 h-fit">
            <h3 className="font-semibold text-gray-900 mb-4">Đơn hàng</h3>
            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate">{item.product.name} x{item.quantity}</span>
                  <span className="font-medium ml-2">
                    {((item.product.discountPrice || item.product.price) * item.quantity).toLocaleString('vi-VN')}₫
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Tạm tính</span>
                <span>{total.toLocaleString('vi-VN')}₫</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phí vận chuyển</span>
                <span>{shippingFee === 0 ? 'Miễn phí' : `${shippingFee.toLocaleString('vi-VN')}₫`}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-lg font-bold">
                <span>Tổng cộng</span>
                <span className="text-primary-600">{finalAmount.toLocaleString('vi-VN')}₫</span>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-6 py-3">
              {loading ? 'Đang xử lý...' : 'Đặt hàng'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CheckoutPage;
