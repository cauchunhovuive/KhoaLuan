import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FiMapPin, FiPhone, FiFileText, FiCreditCard, FiTruck, FiTag, FiX, FiCheck, FiChevronDown } from 'react-icons/fi';
import api from '../services/api';
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
    shippingAddress: '',
    phone: '',
    note: '',
    paymentMethod: 'COD',
  });
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [showAddressPicker, setShowAddressPicker] = useState(false);

  useEffect(() => {
    if (items.length === 0) navigate('/cart');
  }, [items, navigate]);

  useEffect(() => {
    fetchAddresses();
  }, []);

  useEffect(() => {
    if (user && !formData.shippingAddress) {
      setFormData((prev) => ({
        ...prev,
        shippingAddress: prev.shippingAddress || user.address || '',
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [user]);

  const fetchAddresses = async () => {
    try {
      const { data } = await api.get('/addresses');
      const addrs = data.data || [];
      setSavedAddresses(addrs);
      // Auto-select default address
      const defaultAddr = addrs.find(a => a.isDefault) || addrs[0];
      if (defaultAddr) {
        const fullAddress = `${defaultAddr.street}${defaultAddr.ward ? `, ${defaultAddr.ward}` : ''}${defaultAddr.district ? `, ${defaultAddr.district}` : ''}, ${defaultAddr.city}`;
        setFormData(prev => ({
          ...prev,
          shippingAddress: prev.shippingAddress || fullAddress,
          phone: prev.phone || defaultAddr.phone || user?.phone || '',
        }));
      }
    } catch (err) {
      // User might not be logged in or no addresses
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectAddress = (addr) => {
    const fullAddress = `${addr.street}${addr.ward ? `, ${addr.ward}` : ''}${addr.district ? `, ${addr.district}` : ''}, ${addr.city}`;
    setFormData({
      ...formData,
      shippingAddress: fullAddress,
      phone: addr.phone || formData.phone,
    });
    setShowAddressPicker(false);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    try {
      const { data } = await api.post('/coupons/validate', { code: couponCode });
      setAppliedCoupon(data.data);
      setCouponCode(data.data.code);
      toast.success('Áp dụng mã giảm giá thành công!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Mã giảm giá không hợp lệ');
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.shippingAddress || !formData.phone) {
      toast.error('Vui lòng nhập đầy đủ thông tin giao hàng');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/orders', {
        ...formData,
        couponCode: appliedCoupon?.code || null,
      });
      toast.success('Đặt hàng thành công!');
      navigate(`/orders/${data.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Đặt hàng thất bại');
    } finally {
      setLoading(false);
    }
  };

  const shippingFee = total >= 500000 ? 0 : 30000;
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'PERCENTAGE') {
      discountAmount = (total * appliedCoupon.value) / 100;
      if (appliedCoupon.maxDiscount && discountAmount > appliedCoupon.maxDiscount) {
        discountAmount = appliedCoupon.maxDiscount;
      }
    } else {
      discountAmount = appliedCoupon.value;
    }
  }
  const finalAmount = Math.max(0, total + shippingFee - discountAmount);

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

                {/* Saved Addresses Picker */}
                {savedAddresses.length > 0 && (
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={() => setShowAddressPicker(!showAddressPicker)}
                      className="w-full flex items-center justify-between p-3 bg-surface-secondary rounded-xl border border-gray-200 hover:border-gray-300 transition-all text-left"
                    >
                      <div className="flex items-center space-x-3">
                        <FiMapPin className="text-primary-600 text-lg" />
                        <div>
                          <p className="text-sm font-medium text-ink">Chọn từ địa chỉ đã lưu</p>
                          <p className="text-xs text-ink-tertiary">{savedAddresses.length} địa chỉ</p>
                        </div>
                      </div>
                      <FiChevronDown className={`text-gray-400 transition-transform ${showAddressPicker ? 'rotate-180' : ''}`} />
                    </button>

                    {showAddressPicker && (
                      <div className="mt-2 space-y-2">
                        {savedAddresses.map((addr) => {
                          const fullAddr = `${addr.street}${addr.ward ? `, ${addr.ward}` : ''}${addr.district ? `, ${addr.district}` : ''}, ${addr.city}`;
                          const isSelected = formData.shippingAddress === fullAddr;
                          return (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => handleSelectAddress(addr)}
                              className={`w-full text-left p-3 rounded-xl border transition-all ${
                                isSelected
                                  ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600/20'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-surface-secondary'
                              }`}
                            >
                              <div className="flex items-start space-x-3">
                                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                  isSelected ? 'border-primary-600' : 'border-gray-300'
                                }`}>
                                  {isSelected && <div className="w-2 h-2 rounded-full bg-primary-600" />}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <p className="text-sm font-medium text-ink">{addr.fullName || 'Người nhận'}</p>
                                    {addr.label && (
                                      <span className="text-[10px] text-ink-tertiary bg-surface-secondary px-2 py-0.5 rounded-full">{addr.label}</span>
                                    )}
                                    {addr.isDefault && (
                                      <span className="text-[10px] text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">Mặc định</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-ink-secondary mt-0.5">{addr.phone}</p>
                                  <p className="text-xs text-ink-tertiary mt-0.5">{fullAddr}</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

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

            {/* Coupon */}
            <div className="border-t pt-4 mb-4">
              {appliedCoupon ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FiCheck className="text-green-600 text-sm" />
                      <div>
                        <span className="font-mono font-bold text-sm text-green-700">{appliedCoupon.code}</span>
                        <p className="text-xs text-green-600">
                          {appliedCoupon.type === 'PERCENTAGE' ? `Giảm ${appliedCoupon.value}%` : `Giảm ${appliedCoupon.value.toLocaleString('vi-VN')}₫`}
                          {appliedCoupon.maxDiscount && ` (tối đa ${appliedCoupon.maxDiscount.toLocaleString('vi-VN')}₫)`}
                        </p>
                      </div>
                    </div>
                    <button onClick={handleRemoveCoupon} className="text-green-600 hover:text-green-700 p-1 rounded-lg hover:bg-green-100 transition-colors">
                      <FiX size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-ink-tertiary mb-1.5 uppercase tracking-wider">Mã giảm giá</label>
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <FiTag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                        className="w-full pl-9 pr-3 py-2 bg-surface-secondary border border-gray-200 rounded-xl text-sm text-ink font-mono placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all uppercase"
                        placeholder="Nhập mã giảm giá"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={!couponCode.trim() || validatingCoupon}
                      className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
                    >
                      {validatingCoupon ? '...' : 'Áp dụng'}
                    </button>
                  </div>
                </div>
              )}
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
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center space-x-1">
                    <FiTag className="text-xs" />
                    <span>Giảm giá</span>
                  </span>
                  <span className="font-medium">-{discountAmount.toLocaleString('vi-VN')}₫</span>
                </div>
              )}
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
