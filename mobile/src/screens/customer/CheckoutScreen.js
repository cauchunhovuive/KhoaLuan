import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import api from '../../services/api';
import { clearCart } from '../../store/cartSlice';
import Toast from 'react-native-toast-message';

const PAYMENT_METHODS = [
  { value: 'COD', label: '💵 Thanh toán khi nhận hàng' },
  { value: 'BANKING', label: '🏦 Chuyển khoản' },
  { value: 'MOMO', label: '💜 MoMo' },
  { value: 'VNPAY', label: '🛡️ VNPay' },
];

const CheckoutScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { items, total } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);
  const [address, setAddress] = useState(user?.address || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [showCouponInput, setShowCouponInput] = useState(false);

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showAddressPicker, setShowAddressPicker] = useState(false);

  useEffect(() => {
    if (items.length === 0) navigation.goBack();
  }, [items, navigation]);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const { data } = await api.get('/addresses');
      const addrs = data.data || [];
      setSavedAddresses(addrs);
      const defaultAddr = addrs.find(a => a.isDefault) || addrs[0];
      if (defaultAddr) {
        const fullAddr = `${defaultAddr.street}${defaultAddr.ward ? `, ${defaultAddr.ward}` : ''}${defaultAddr.district ? `, ${defaultAddr.district}` : ''}, ${defaultAddr.city}`;
        setAddress(fullAddr);
        setPhone(defaultAddr.phone || phone);
      }
    } catch {}
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

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    try {
      const { data } = await api.post('/coupons/validate', { code: couponCode });
      setAppliedCoupon(data.data);
      Toast.show({ type: 'success', text1: 'Áp dụng mã giảm giá thành công!' });
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Mã giảm giá không hợp lệ' });
      setAppliedCoupon(null);
    } finally { setValidatingCoupon(false); }
  };

  const handlePlaceOrder = async () => {
    if (!address.trim() || !phone.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ và số điện thoại');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/orders', {
        shippingAddress: address,
        phone,
        paymentMethod,
        note,
        couponCode: appliedCoupon?.code || null,
      });
      dispatch(clearCart());
      Alert.alert('Đặt hàng thành công!', `Mã đơn hàng: #${data.data.id.slice(0, 8)}`, [
        { text: 'Xem đơn hàng', onPress: () => navigation.navigate('OrderDetail', { orderId: data.data.id }) },
      ]);
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Đặt hàng thất bại');
    } finally {
      setLoading(false);
    }
  };

  // Shipping fee progress percentage
  const shippingProgress = Math.min(100, (total / 500000) * 100);
  const remainingForFree = Math.max(0, 500000 - total);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Shipping */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Thông tin giao hàng</Text>

          {/* Saved Addresses */}
          {savedAddresses.length > 0 && (
            <TouchableOpacity style={styles.addressPicker} onPress={() => setShowAddressPicker(!showAddressPicker)}>
              <Text style={styles.addressPickerText}>
                📍 Chọn từ địa chỉ đã lưu ({savedAddresses.length})
              </Text>
              <Text style={styles.arrow}>{showAddressPicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
          )}

          {showAddressPicker && savedAddresses.map((addr) => {
            const fullAddr = `${addr.street}${addr.ward ? `, ${addr.ward}` : ''}${addr.district ? `, ${addr.district}` : ''}, ${addr.city}`;
            return (
              <TouchableOpacity
                key={addr.id}
                style={[styles.addressOption, address === fullAddr && styles.addressOptionActive]}
                onPress={() => { setAddress(fullAddr); setPhone(addr.phone || phone); setShowAddressPicker(false); }}
              >
                <Text style={styles.addressLabel}>{addr.label} {addr.isDefault ? '(Mặc định)' : ''}</Text>
                <Text style={styles.addressDetail}>{fullAddr}</Text>
                <Text style={styles.addressPhone}>{addr.phone}</Text>
              </TouchableOpacity>
            );
          })}

          <TextInput
            style={styles.input}
            placeholder="Địa chỉ *"
            value={address}
            onChangeText={setAddress}
            multiline
            placeholderTextColor="#94a3b8"
          />
          <TextInput
            style={styles.input}
            placeholder="Số điện thoại *"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholderTextColor="#94a3b8"
          />
          <TextInput
            style={styles.input}
            placeholder="Ghi chú (không bắt buộc)"
            value={note}
            onChangeText={setNote}
            multiline
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Coupon */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.couponToggle} onPress={() => setShowCouponInput(!showCouponInput)}>
            <Text style={styles.sectionTitle}>🎟️ Mã giảm giá</Text>
            <Text style={styles.arrow}>{showCouponInput ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showCouponInput && !appliedCoupon && (
            <View style={styles.couponRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Nhập mã giảm giá"
                value={couponCode}
                onChangeText={setCouponCode}
                autoCapitalize="characters"
                placeholderTextColor="#94a3b8"
              />
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={handleApplyCoupon}
                disabled={validatingCoupon || !couponCode.trim()}
              >
                {validatingCoupon ? <ActivityIndicator color="#fff" /> : <Text style={styles.applyBtnText}>Áp dụng</Text>}
              </TouchableOpacity>
            </View>
          )}

          {appliedCoupon && (
            <View style={styles.appliedCoupon}>
              <View>
                <Text style={styles.appliedCode}>{appliedCoupon.code}</Text>
                <Text style={styles.appliedDesc}>
                  {appliedCoupon.type === 'PERCENTAGE'
                    ? `Giảm ${appliedCoupon.value}%${appliedCoupon.maxDiscount ? ` (tối đa ${appliedCoupon.maxDiscount.toLocaleString('vi-VN')}₫)` : ''}`
                    : `Giảm ${appliedCoupon.value.toLocaleString('vi-VN')}₫`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setAppliedCoupon(null); setCouponCode(''); }}>
                <Text style={styles.removeCoupon}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.browseCouponsBtn}
            onPress={() => navigation.navigate('Coupons')}
          >
            <Text style={styles.browseCouponsText}>Khám phá mã giảm giá →</Text>
          </TouchableOpacity>
        </View>

        {/* Payment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 Phương thức thanh toán</Text>
          {PAYMENT_METHODS.map((pm) => (
            <TouchableOpacity
              key={pm.value}
              style={[styles.paymentOption, paymentMethod === pm.value && styles.paymentActive]}
              onPress={() => setPaymentMethod(pm.value)}
            >
              <Text style={styles.paymentText}>{pm.label}</Text>
              <View style={[styles.radio, paymentMethod === pm.value && styles.radioActive]}>
                {paymentMethod === pm.value && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📄 Đơn hàng ({items.length} món)</Text>
          {items.map((item) => {
            const unitPrice = item.effectivePrice || item.product?.discountPrice || item.product?.price || 0;
            return (
              <View key={item.product?.id} style={styles.orderItem}>
                <Text style={styles.orderItemName} numberOfLines={1}>{item.product?.name}</Text>
                <Text style={styles.orderItemQty}>x{item.quantity}</Text>
                <Text style={styles.orderItemPrice}>{(unitPrice * item.quantity).toLocaleString('vi-VN')}₫</Text>
              </View>
            );
          })}
        </View>

        {/* Shipping Progress */}
        {total < 500000 && (
          <View style={styles.shippingProgress}>
            <View style={styles.shippingProgressHeader}>
              <Text style={styles.shippingProgressText}>🚚 Miễn phí vận chuyển</Text>
              <Text style={styles.shippingRemaining}>còn {remainingForFree.toLocaleString('vi-VN')}₫</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${shippingProgress}%` }]} />
            </View>
          </View>
        )}

        {/* Totals */}
        <View style={styles.section}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tạm tính</Text>
            <Text style={styles.totalValue}>{total.toLocaleString('vi-VN')}₫</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Phí vận chuyển</Text>
            <Text style={[styles.totalValue, shippingFee === 0 && { color: '#059669' }]}>
              {shippingFee === 0 ? 'Miễn phí' : `${shippingFee.toLocaleString('vi-VN')}₫`}
            </Text>
          </View>
          {discountAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: '#059669' }]}>🎉 Giảm giá</Text>
              <Text style={[styles.totalValue, { color: '#059669' }]}>-{discountAmount.toLocaleString('vi-VN')}₫</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandLabel}>Tổng cộng</Text>
            <Text style={styles.grandValue}>{finalAmount.toLocaleString('vi-VN')}₫</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.orderBtn} onPress={handlePlaceOrder} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.orderBtnText}>Đặt hàng</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 16 },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },
  input: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0', color: '#1e293b' },
  
  // Address
  addressPicker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#dbeafe', borderRadius: 10, padding: 12, marginBottom: 12 },
  addressPickerText: { fontSize: 14, color: '#3b82f6', fontWeight: '500' },
  arrow: { fontSize: 12, color: '#94a3b8' },
  addressOption: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  addressOptionActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  addressLabel: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  addressDetail: { fontSize: 13, color: '#475569', marginTop: 2 },
  addressPhone: { fontSize: 12, color: '#64748b', marginTop: 2 },

  // Coupon
  couponToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  couponRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  applyBtn: { backgroundColor: '#3b82f6', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16 },
  applyBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  appliedCoupon: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#d1fae5', borderRadius: 12, padding: 14 },
  appliedCode: { fontSize: 15, fontWeight: 'bold', color: '#059669', fontFamily: 'monospace' },
  appliedDesc: { fontSize: 12, color: '#047857', marginTop: 2 },
  removeCoupon: { fontSize: 18, color: '#059669', padding: 4 },
  browseCouponsBtn: { marginTop: 8, alignItems: 'center' },
  browseCouponsText: { fontSize: 13, color: '#3b82f6', fontWeight: '500' },

  // Payment
  paymentOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  paymentActive: {},
  paymentText: { fontSize: 15, color: '#1e293b' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: '#3b82f6' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#3b82f6' },

  // Order items
  orderItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  orderItemName: { flex: 1, fontSize: 14, color: '#1e293b' },
  orderItemQty: { fontSize: 14, color: '#64748b', marginRight: 12 },
  orderItemPrice: { fontSize: 14, fontWeight: '600', color: '#1e293b' },

  // Shipping progress
  shippingProgress: { backgroundColor: '#fffbeb', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#fde68a' },
  shippingProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  shippingProgressText: { fontSize: 13, fontWeight: '500', color: '#92400e' },
  shippingRemaining: { fontSize: 12, color: '#92400e', fontWeight: '600' },
  progressBar: { height: 6, backgroundColor: '#fde68a', borderRadius: 3 },
  progressFill: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 3 },

  // Totals
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLabel: { fontSize: 14, color: '#64748b' },
  totalValue: { fontSize: 14, color: '#1e293b' },
  grandTotal: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, marginTop: 4 },
  grandLabel: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  grandValue: { fontSize: 22, fontWeight: 'bold', color: '#3b82f6' },

  // Submit
  orderBtn: { backgroundColor: '#3b82f6', borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 24 },
  orderBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});

export default CheckoutScreen;
