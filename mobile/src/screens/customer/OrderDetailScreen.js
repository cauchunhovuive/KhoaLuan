import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

const STATUS_LABELS = {
  PENDING: '🕐 Chờ xác nhận', CONFIRMED: '✅ Đã xác nhận',
  SHIPPING: '📦 Đang giao', DELIVERED: '🎉 Hoàn thành', CANCELLED: '❌ Đã huỷ',
};

const OrderDetailScreen = ({ route }) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/orders/${orderId}`).then(({ data }) => setOrder(data.data)).catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleCancel = async () => {
    Alert.alert('Xác nhận', 'Huỷ đơn hàng này?', [
      { text: 'Không', style: 'cancel' },
      { text: 'Huỷ đơn', style: 'destructive', onPress: async () => {
        try {
          await api.put(`/orders/${orderId}/cancel`);
          const { data } = await api.get(`/orders/${orderId}`);
          setOrder(data.data);
          Alert.alert('Thành công', 'Đơn hàng đã được huỷ');
        } catch { Alert.alert('Lỗi', 'Không thể huỷ đơn hàng'); }
      }},
    ]);
  };

  if (loading) return <LoadingSpinner />;
  if (!order) return <View style={styles.center}><Text>Không tìm thấy đơn hàng</Text></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.statusCard}>
          <Text style={styles.statusIcon}>
            {order.status === 'PENDING' ? '🕐' : order.status === 'CONFIRMED' ? '✅' : order.status === 'SHIPPING' ? '📦' : order.status === 'DELIVERED' ? '🎉' : '❌'}
          </Text>
          <Text style={styles.statusText}>{STATUS_LABELS[order.status]}</Text>
          <Text style={styles.statusDate}>{new Date(order.createdAt).toLocaleString('vi-VN')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sản phẩm</Text>
          {order.orderItems?.map((item) => (
            <View key={item.id} style={styles.productRow}>
              <Text style={styles.productName} numberOfLines={1}>{item.product?.name}</Text>
              <Text style={styles.productQty}>x{item.quantity}</Text>
              <Text style={styles.productPrice}>{(item.price * item.quantity).toLocaleString('vi-VN')}₫</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chi tiết thanh toán</Text>
          <View style={styles.row}><Text style={styles.label}>Tạm tính</Text><Text style={styles.value}>{order.totalAmount?.toLocaleString('vi-VN')}₫</Text></View>
          <View style={styles.row}><Text style={styles.label}>Phí vận chuyển</Text><Text style={styles.value}>{order.shippingFee === 0 ? 'Miễn phí' : `${order.shippingFee?.toLocaleString('vi-VN')}₫`}</Text></View>
          {order.discountAmount > 0 && <View style={styles.row}><Text style={styles.label}>Giảm giá</Text><Text style={[styles.value, { color: '#10b981' }]}>-{order.discountAmount?.toLocaleString('vi-VN')}₫</Text></View>}
          <View style={[styles.row, styles.totalRow]}><Text style={styles.totalLabel}>Tổng cộng</Text><Text style={styles.totalValue}>{order.finalAmount?.toLocaleString('vi-VN')}₫</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Địa chỉ giao hàng</Text>
          <Text style={styles.address}>{order.shippingAddress}</Text>
          <Text style={styles.phone}>{order.phone}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thanh toán</Text>
          <Text style={styles.paymentMethod}>
            {order.paymentMethod === 'COD' ? '💵 Thanh toán khi nhận hàng' : order.paymentMethod === 'MOMO' ? '💜 MoMo' : order.paymentMethod === 'VNPAY' ? '🛡️ VNPay' : `🏦 ${order.paymentMethod}`}
          </Text>
          <Text style={[styles.paymentStatus, order.paymentStatus === 'PAID' ? { color: '#10b981' } : { color: '#f59e0b' }]}>
            {order.paymentStatus === 'PAID' ? '✅ Đã thanh toán' : '⏳ Chưa thanh toán'}
          </Text>
        </View>

        {order.status === 'PENDING' && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelText}>Huỷ đơn hàng</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16 },
  statusCard: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  statusIcon: { fontSize: 48, marginBottom: 8 },
  statusText: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  statusDate: { fontSize: 13, color: '#64748b', marginTop: 4 },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },
  productRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  productName: { flex: 1, fontSize: 14, color: '#1e293b' },
  productQty: { fontSize: 14, color: '#64748b', marginRight: 12 },
  productPrice: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 14, color: '#64748b' },
  value: { fontSize: 14, color: '#1e293b' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: '#3b82f6' },
  address: { fontSize: 14, color: '#475569', marginBottom: 4 },
  phone: { fontSize: 14, color: '#475569' },
  paymentMethod: { fontSize: 14, color: '#1e293b', marginBottom: 4 },
  paymentStatus: { fontSize: 14, fontWeight: '500' },
  cancelBtn: { backgroundColor: '#fef2f2', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  cancelText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
});

export default OrderDetailScreen;
