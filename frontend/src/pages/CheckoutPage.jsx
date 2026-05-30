import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FiMapPin, FiPhone, FiFileText, FiCreditCard, FiTruck } from 'react-icons/fi';
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
    <div className="section-container py-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-ink mb-8">Thanh toán</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping info */}
            <div className="p-1.5 bg-primary-50/50 rounded-[1.5rem] ring-1 ring-primary-100/50">
              <div className="bg-white rounded-[calc(1.5rem-0.375rem)] p-6">
                <h3 className="font-semibold text-ink mb-5 flex items-center space-x-2 pb-3 border-b border-gray-100">
                  <FiTruck className="text-primary-600" />
                  <span>Thông tin giao hàng</span>
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-secondary mb-1.5">Địa chỉ *</label>
                    <div className="relative group">
                      <FiMapPin className="absolute left-3.5 top-3 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                      <textarea name="shippingAddress" value={formData.shippingAddress} onChange={handleChange}
                        className="input-field pl-10" rows={2} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-secondary mb-1.5">Số điện thoại *</label>
                    <div className="relative group">
                      <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                        className="input-field pl-10" placeholder="0123 456 789" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-secondary mb-1.5">Ghi chú</label>
                    <div className="relative group">
                      <FiFileText className="absolute left-3.5 top-3 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                      <textarea name="note" value={formData.note} onChange={handleChange}
                        className="input-field pl-10" rows={2} placeholder="Ghi chú cho đơn hàng..." />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div className="card p-6">
              <h3 className="font-semibold text-ink mb-5 flex items-center space-x-2 pb-3 border-b border-gray-100">
                <FiCreditCard className="text-primary-600" />
                <span>Phương thức thanh toán</span>
              </h3>
              <div className="space-y-3">
                {PAYMENT_METHODS.map((method) => (
                  <label key={method.value} className={`flex items-start p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                    formData.paymentMethod === method.value 
                      ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600/20' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-surface-secondary'
                  }`}>
                    <input type="radio" name="paymentMethod" value={method.value} checked={formData.paymentMethod === method.value}
                      onChange={handleChange} className="mt-0.5 text-primary-600 focus:ring-primary-500" />
                    <div className="ml-3">
                      <p className="font-medium text-ink text-sm">{method.label}</p>
                      <p className="text-xs text-ink-tertiary mt-0.5">{method.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Order summary */}
          <div className="card p-6 h-fit sticky top-24">
            <h3 className="font-semibold text-ink mb-5 pb-3 border-b border-gray-100">Đơn hàng</h3>
            <div className="space-y-3 mb-6">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span className="text-ink-secondary truncate min-w-0">{item.product.name} <span className="text-ink-tertiary">x{item.quantity}</span></span>
                  <span className="font-medium text-ink ml-2 flex-shrink-0">
                    {((item.product.discountPrice || item.product.price) * item.quantity).toLocaleString('vi-VN')}₫
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-secondary">Tạm tính</span>
                <span className="font-medium text-ink">{total.toLocaleString('vi-VN')}₫</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">Phí vận chuyển</span>
                <span className="font-medium text-ink">{shippingFee === 0 ? 'Miễn phí' : `${shippingFee.toLocaleString('vi-VN')}₫`}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-lg font-bold">
                <span className="text-ink">Tổng cộng</span>
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
