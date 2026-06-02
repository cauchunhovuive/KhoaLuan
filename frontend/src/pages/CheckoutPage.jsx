import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FiMapPin, FiPhone, FiFileText, FiCreditCard, FiTruck, FiTag, FiX, FiCheck,
  FiChevronDown, FiHome, FiBriefcase, FiStar, FiShield, FiDollarSign,
  FiSmartphone, FiArrowRight, FiRotateCcw,
} from 'react-icons/fi';
import api from '../services/api';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
  { value: 'COD', label: 'Thanh toán khi nhận hàng', desc: 'Nhận hàng và thanh toán bằng tiền mặt', icon: FiDollarSign, color: 'from-emerald-500 to-emerald-600' },
  { value: 'BANKING', label: 'Chuyển khoản ngân hàng', desc: 'Chuyển khoản qua tài khoản ngân hàng', icon: FiCreditCard, color: 'from-blue-500 to-blue-600' },
  { value: 'MOMO', label: 'Ví MoMo', desc: 'Thanh toán qua ví điện tử MoMo', icon: FiSmartphone, color: 'from-purple-500 to-purple-600' },
  { value: 'VNPAY', label: 'VNPay', desc: 'Thanh toán qua cổng VNPay', icon: FiShield, color: 'from-cyan-500 to-cyan-600' },
];

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-center space-x-3 pb-4 border-b border-gray-100 mb-5">
    <div className="w-9 h-9 bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl flex items-center justify-center ring-1 ring-primary-200/50 shrink-0">
      <Icon className="text-primary-600 text-sm" />
    </div>
    <div>
      <h3 className="font-semibold text-ink text-sm">{title}</h3>
      {subtitle && <p className="text-[10px] text-ink-tertiary">{subtitle}</p>}
    </div>
  </div>
);

const RadioCheck = ({ checked }) => (
  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
    checked ? 'border-primary-600' : 'border-gray-300'
  }`}>
    {checked && (
      <div className="w-2.5 h-2.5 rounded-full bg-primary-600 animate-scale-in" />
    )}
  </div>
);

const AddressSkeleton = () => (
  <div className="space-y-2">
    {[1, 2].map((i) => (
      <div key={i} className="p-3 skeleton-bg rounded-xl">
        <div className="flex items-start space-x-3">
          <div className="w-4 h-4 skeleton-bg rounded-full mt-0.5" />
          <div className="space-y-2 flex-1">
            <div className="h-3.5 w-32 skeleton-bg rounded" />
            <div className="h-3 w-48 skeleton-bg rounded" />
            <div className="h-3 w-40 skeleton-bg rounded" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

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
  const addressPickerRef = useRef(null);

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

  // Close address picker on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (addressPickerRef.current && !addressPickerRef.current.contains(e.target)) {
        setShowAddressPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchAddresses = async () => {
    try {
      const { data } = await api.get('/addresses');
      const addrs = data.data || [];
      setSavedAddresses(addrs);
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
      // silent
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
      // 1. Tạo đơn hàng
      const { data } = await api.post('/orders', {
        ...formData,
        couponCode: appliedCoupon?.code || null,
      });

      const orderId = data.data.id;

      // 2. Xử lý thanh toán theo phương thức
      const paymentMethod = formData.paymentMethod;

      if (paymentMethod === 'COD') {
        // Thanh toán khi nhận hàng — chuyển thẳng tới order detail
        toast.success('Đặt hàng thành công!');
        navigate(`/orders/${orderId}`);

      } else if (paymentMethod === 'VNPAY') {
        // Tạo URL thanh toán VNPay và redirect
        const { data: vnpayData } = await api.post('/payments/vnpay/create', { orderId });
        if (vnpayData.success && vnpayData.data?.paymentUrl) {
          window.location.href = vnpayData.data.paymentUrl;
        } else {
          toast.error('Không thể tạo URL thanh toán VNPay');
          navigate(`/orders/${orderId}`);
        }

      } else if (paymentMethod === 'MOMO') {
        // Tạo thanh toán MoMo và redirect
        const { data: momoData } = await api.post('/payments/momo/create', { orderId });
        if (momoData.success && momoData.data?.payUrl) {
          window.location.href = momoData.data.payUrl;
        } else {
          toast.error('Không thể tạo thanh toán MoMo');
          navigate(`/orders/${orderId}`);
        }

      } else if (paymentMethod === 'BANKING') {
        // Chuyển khoản ngân hàng — hiển thị thông tin tài khoản
        toast.success('Đặt hàng thành công! Vui lòng chuyển khoản theo thông tin bên dưới.');
        navigate(`/orders/${orderId}?payment=pending`);
      }
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

  // Redirect if cart empty
  if (items.length === 0) return null;

  return (
    <div className="overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 animate-fade-in">
        {/* ═══ Header ═══ */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-ink tracking-tight">Thanh toán</h1>
          <p className="text-ink-tertiary text-sm mt-1">Xác nhận thông tin và hoàn tất đơn hàng</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ═══ Left Column ═══ */}
            <div className="lg:col-span-2 space-y-6">

              {/* ── Shipping Info Section ── */}
              <div className="card-double-bezel">
                <div className="card-inner">
                  <SectionHeader icon={FiTruck} title="Thông tin giao hàng" subtitle="Nhập địa chỉ nhận hàng" />

                  {/* Saved Addresses Picker */}
                  {loadingAddresses ? (
                    <AddressSkeleton />
                  ) : savedAddresses.length > 0 && (
                    <div className="mb-5" ref={addressPickerRef}>
                      <button
                        type="button"
                        onClick={() => setShowAddressPicker(!showAddressPicker)}
                        className="w-full flex items-center justify-between p-3 bg-surface-secondary rounded-2xl border border-gray-200 hover:border-gray-300 hover:bg-surface-tertiary transition-all duration-200 text-left active:scale-[0.99]"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl flex items-center justify-center ring-1 ring-primary-200/50">
                            <FiMapPin className="text-primary-600 text-sm" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-ink">Chọn từ địa chỉ đã lưu</p>
                            <p className="text-xs text-ink-tertiary">{savedAddresses.length} địa chỉ</p>
                          </div>
                        </div>
                        <FiChevronDown className={`text-gray-400 transition-all duration-300 ${showAddressPicker ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Address picker dropdown */}
                      <div
                        className={`mt-2 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                          showAddressPicker ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="space-y-2 pt-1">
                          {savedAddresses.map((addr, idx) => {
                            const fullAddr = `${addr.street}${addr.ward ? `, ${addr.ward}` : ''}${addr.district ? `, ${addr.district}` : ''}, ${addr.city}`;
                            const isSelected = formData.shippingAddress === fullAddr;
                            return (
                              <button
                                key={addr.id}
                                type="button"
                                onClick={() => handleSelectAddress(addr)}
                                className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 active:scale-[0.99] ${
                                  isSelected
                                    ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600/20 shadow-premium-sm'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-surface-secondary'
                                }`}
                                style={{ animationDelay: `${idx * 40}ms` }}
                              >
                                <div className="flex items-start space-x-3">
                                  <RadioCheck checked={isSelected} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center flex-wrap gap-1.5">
                                      <p className="text-sm font-medium text-ink">{addr.fullName || 'Người nhận'}</p>
                                      {addr.label && (
                                        <span className="inline-flex items-center space-x-0.5 text-[10px] text-ink-tertiary bg-surface-secondary px-2 py-0.5 rounded-full">
                                          {addr.label === 'Nhà' ? <FiHome size={10} /> : addr.label === 'Cơ quan' ? <FiBriefcase size={10} /> : <FiStar size={10} />}
                                          <span>{addr.label}</span>
                                        </span>
                                      )}
                                      {addr.isDefault && (
                                        <span className="inline-flex items-center space-x-0.5 text-[10px] text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                                          <FiCheck size={9} />
                                          <span>Mặc định</span>
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-ink-secondary mt-0.5">{addr.phone}</p>
                                    <p className="text-xs text-ink-tertiary mt-0.5 leading-relaxed">{fullAddr}</p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manual address form */}
                  <div className="space-y-4">
                    {/* Address textarea */}
                    <div>
                      <label className="block text-xs font-semibold text-ink-tertiary uppercase tracking-[0.08em] mb-2">
                        Địa chỉ <span className="text-red-400">*</span>
                      </label>
                      <div className="card-double-bezel">
                        <div className="card-inner p-0 flex items-start">
                          <div className="flex items-center justify-center w-11 h-11 shrink-0 mt-2.5">
                            <FiMapPin className="text-sm text-ink-tertiary" />
                          </div>
                          <textarea
                            name="shippingAddress"
                            value={formData.shippingAddress}
                            onChange={handleChange}
                            className="flex-1 bg-transparent border-none outline-none text-ink placeholder:text-gray-400 text-sm pr-4 py-3 min-w-0 resize-none"
                            rows={2}
                            placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-semibold text-ink-tertiary uppercase tracking-[0.08em] mb-2">
                        Số điện thoại <span className="text-red-400">*</span>
                      </label>
                      <div className="card-double-bezel">
                        <div className="card-inner p-0 flex items-center">
                          <div className="flex items-center justify-center w-11 h-11 shrink-0">
                            <FiPhone className="text-sm text-ink-tertiary" />
                          </div>
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="flex-1 bg-transparent border-none outline-none text-ink placeholder:text-gray-400 text-sm pr-4 py-3 min-w-0"
                            placeholder="0123 456 789"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Note */}
                    <div>
                      <label className="block text-xs font-semibold text-ink-tertiary uppercase tracking-[0.08em] mb-2">
                        Ghi chú <span className="text-ink-tertiary/50 font-normal normal-case">(không bắt buộc)</span>
                      </label>
                      <div className="card-double-bezel">
                        <div className="card-inner p-0 flex items-start">
                          <div className="flex items-center justify-center w-11 h-11 shrink-0 mt-2.5">
                            <FiFileText className="text-sm text-ink-tertiary" />
                          </div>
                          <textarea
                            name="note"
                            value={formData.note}
                            onChange={handleChange}
                            className="flex-1 bg-transparent border-none outline-none text-ink placeholder:text-gray-400 text-sm pr-4 py-3 min-w-0 resize-none"
                            rows={2}
                            placeholder="Ghi chú cho đơn hàng..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Payment Method Section ── */}
              <div className="card-double-bezel">
                <div className="card-inner">
                  <SectionHeader icon={FiCreditCard} title="Phương thức thanh toán" subtitle="Chọn cách bạn muốn thanh toán" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PAYMENT_METHODS.map((method) => {
                      const Icon = method.icon;
                      const isActive = formData.paymentMethod === method.value;
                      return (
                        <label
                          key={method.value}
                          className={`relative overflow-hidden flex items-start p-4 rounded-2xl border cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                            isActive
                              ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600/20 shadow-premium-sm'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-surface-secondary'
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={method.value}
                            checked={isActive}
                            onChange={handleChange}
                            className="sr-only"
                          />
                          <div className="flex items-start space-x-3 w-full">
                            <div className={`w-9 h-9 rounded-2xl bg-gradient-to-br ${method.color} flex items-center justify-center shrink-0 ring-1 ring-white/20 shadow-premium-sm ${
                              isActive ? '' : 'opacity-80'
                            }`}>
                              <Icon className="text-white text-sm" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-ink text-sm">{method.label}</p>
                                <RadioCheck checked={isActive} />
                              </div>
                              <p className="text-xs text-ink-tertiary mt-0.5">{method.desc}</p>
                            </div>
                          </div>

                          {/* Active indicator line */}
                          {isActive && (
                            <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ Right Column — Order Summary ═══ */}
            <div className="space-y-4">
              <div className="card-double-bezel sticky top-24">
                <div className="card-inner p-6">
                  <h3 className="font-semibold text-ink mb-5 pb-4 border-b border-gray-100 flex items-center space-x-2">
                    <FiFileText className="text-primary-600 text-lg" />
                    <span>Đơn hàng</span>
                    <span className="text-xs text-ink-tertiary font-normal ml-auto">({items.length} món)</span>
                  </h3>

                  {/* Order items */}
                  <div className="space-y-3 mb-6 max-h-[280px] overflow-y-auto pr-1">
                    {items.map((item, idx) => {
                      const unitPrice = item.product.discountPrice || item.product.price;
                      return (
                        <div
                          key={item.product.id}
                          className="flex justify-between text-sm py-2 border-b border-gray-50 last:border-0 animate-in"
                          style={{ animationDelay: `${idx * 30}ms` }}
                        >
                          <div className="flex items-start space-x-3 min-w-0 flex-1">
                            {/* Tiny product thumbnail */}
                            <div className="w-10 h-10 bg-surface-secondary rounded-xl overflow-hidden shrink-0 ring-1 ring-gray-100">
                              {item.product.images?.[0] ? (
                                <img
                                  src={item.product.images[0]}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                                  ?
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-ink truncate text-xs font-medium">{item.product.name}</p>
                              <p className="text-ink-tertiary text-[10px] mt-0.5">x{item.quantity}</p>
                            </div>
                          </div>
                          <span className="font-medium text-ink text-xs ml-2 shrink-0">
                            {(unitPrice * item.quantity).toLocaleString('vi-VN')}₫
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* ── Coupon Section ── */}
                  <div className="border-t pt-4 mb-4">
                    {appliedCoupon ? (
                      <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-3.5 animate-in">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                              <FiCheck className="text-emerald-600 text-sm" />
                            </div>
                            <div>
                              <span className="font-mono font-bold text-sm text-emerald-800">{appliedCoupon.code}</span>
                              <p className="text-xs text-emerald-600 mt-0.5">
                                {appliedCoupon.type === 'PERCENTAGE'
                                  ? `Giảm ${appliedCoupon.value}%`
                                  : `Giảm ${appliedCoupon.value.toLocaleString('vi-VN')}₫`
                                }
                                {appliedCoupon.maxDiscount && ` (tối đa ${appliedCoupon.maxDiscount.toLocaleString('vi-VN')}₫)`}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveCoupon}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-emerald-500 hover:text-emerald-700 hover:bg-emerald-100 transition-all active:scale-[0.9]"
                          >
                            <FiX size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-ink-tertiary uppercase tracking-[0.08em] mb-2">
                          Mã giảm giá
                        </label>
                        <div className="flex items-center space-x-2">
                          <div className="card-double-bezel flex-1">
                            <div className="card-inner p-0 flex items-center">
                              <div className="flex items-center justify-center w-10 h-10 shrink-0">
                                <FiTag className="text-sm text-ink-tertiary" />
                              </div>
                              <input
                                type="text"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyCoupon())}
                                className="flex-1 bg-transparent border-none outline-none text-ink placeholder:text-gray-400 text-sm pr-3 py-2.5 min-w-0 font-mono uppercase"
                                placeholder="Nhập mã"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleApplyCoupon}
                            disabled={!couponCode.trim() || validatingCoupon}
                            className="px-4 py-2.5 text-sm font-semibold bg-primary-600 text-white rounded-2xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] transition-all duration-200 shadow-premium-sm shrink-0"
                          >
                            {validatingCoupon ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                            ) : (
                              'Áp dụng'
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Price Breakdown ── */}
                  <div className="border-t pt-4 space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-ink-secondary">Tạm tính</span>
                      <span className="font-medium text-ink">{total.toLocaleString('vi-VN')}₫</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-secondary flex items-center space-x-1.5">
                        <FiTruck className="text-[10px]" />
                        <span>Phí vận chuyển</span>
                      </span>
                      <span className={`font-medium ${shippingFee === 0 ? 'text-emerald-600' : 'text-ink'}`}>
                        {shippingFee === 0 ? 'Miễn phí' : `${shippingFee.toLocaleString('vi-VN')}₫`}
                      </span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span className="flex items-center space-x-1">
                          <FiTag className="text-xs" />
                          <span>Giảm giá</span>
                        </span>
                        <span className="font-medium">-{discountAmount.toLocaleString('vi-VN')}₫</span>
                      </div>
                    )}

                    {/* Free shipping progress */}
                    {total < 500000 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 mt-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-amber-700 font-medium flex items-center space-x-1">
                            <FiTruck className="text-xs" />
                            <span>Miễn phí vận chuyển</span>
                          </span>
                          <span className="text-[10px] font-semibold text-amber-700">
                            còn {Math.max(0, 500000 - total).toLocaleString('vi-VN')}₫
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-amber-200/60 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                            style={{ width: `${Math.min(100, (total / 500000) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Total */}
                    <div className="border-t pt-3 mt-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-ink text-base">Tổng cộng</span>
                        <span className="text-xl font-bold text-primary-600">
                          {finalAmount.toLocaleString('vi-VN')}₫
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── Place Order Button ── */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative overflow-hidden w-full inline-flex items-center justify-center space-x-2 px-6 py-3.5 bg-primary-600 text-white rounded-2xl font-semibold hover:bg-primary-700 active:scale-[0.97] transition-all duration-200 shadow-premium-md disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <span>Đặt hàng</span>
                        <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>

                  {/* Trust badges */}
                  <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-center space-x-4 text-[10px] text-ink-tertiary">
                    <span className="flex items-center space-x-1">
                      <FiShield className="text-xs" />
                      <span>Bảo mật thông tin</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <FiRotateCcw className="text-xs" />
                      <span>Đổi trả miễn phí</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <FiTruck className="text-xs" />
                      <span>Giao hàng toàn quốc</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CheckoutPage;
