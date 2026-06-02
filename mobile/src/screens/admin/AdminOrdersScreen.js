import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Image,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

const STATUS_MAP = {
  PENDING: { label: 'Chờ xác nhận', color: '#F59E0B', bg: '#FEF3C7' },
  CONFIRMED: { label: 'Đã xác nhận', color: '#2563EB', bg: '#DBEAFE' },
  SHIPPING: { label: 'Đang giao', color: '#7C3AED', bg: '#EDE9FE' },
  DELIVERED: { label: 'Đã giao', color: '#059669', bg: '#D1FAE5' },
  CANCELLED: { label: 'Đã hủy', color: '#EF4444', bg: '#FEE2E2' },
};

const AdminOrdersScreen = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      const params = { limit: 50 };
      if (filter) params.status = filter;
      const { data } = await api.get('/orders/admin/all', { params });
      setOrders(data.data.orders);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Không thể tải đơn hàng' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleUpdateStatus = (orderId, currentStatus) => {
    const options = Object.entries(STATUS_MAP)
      .filter(([key]) => key !== currentStatus && key !== 'CANCELLED' && currentStatus !== 'DELIVERED' && currentStatus !== 'CANCELLED')
      .map(([key, val]) => ({
        text: val.label,
        onPress: async () => {
          try {
            await api.put(`/orders/${orderId}/status`, { status: key });
            Toast.show({ type: 'success', text1: 'Cập nhật trạng thái thành công' });
            fetchOrders();
          } catch (err) {
            Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi' });
          }
        },
      }));

    Alert.alert('Cập nhật trạng thái', 'Chọn trạng thái mới:', [...options, { text: 'Huỷ', style: 'cancel' }]);
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const renderOrderItem = (item, idx) => {
    const product = item.product || {};
    const price = item.price || 0;
    return (
      <View key={item.id || idx} style={styles.itemRow}>
        <Image
          source={{ uri: product.images?.[0] }}
          style={styles.itemImage}
        />
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>{product.name || 'Đã xoá'}</Text>
          <Text style={styles.itemPrice}>{(price).toLocaleString('vi-VN')}₫ × {item.quantity}</Text>
        </View>
        <Text style={styles.itemTotal}>{(price * item.quantity).toLocaleString('vi-VN')}₫</Text>
      </View>
    );
  };

  const renderOrder = ({ item }) => {
    const statusInfo = STATUS_MAP[item.status] || { label: item.status, color: '#6B7280', bg: '#F3F4F6' };
    const isExpanded = expandedId === item.id;
    return (
      <View style={styles.orderCard}>
        <TouchableOpacity onPress={() => toggleExpand(item.id)}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderId}>#{item.id.slice(0, 8)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
              <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            </View>
          </View>

          <View style={styles.orderBody}>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{item.user?.name || 'Khách'}</Text>
              <Text style={styles.customerEmail}>{item.user?.email || ''}</Text>
              <Text style={styles.itemCount}>{item.orderItems?.length || 0} sản phẩm</Text>
            </View>
            <View style={styles.amountCol}>
              <Text style={styles.amount}>{item.finalAmount?.toLocaleString('vi-VN')}₫</Text>
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text>
            </View>
          </View>

          {/* Expand indicator */}
          <Text style={styles.expandHint}>{isExpanded ? '▲ Thu gọn' : '▼ Chi tiết'}</Text>
        </TouchableOpacity>

        {/* Expanded detail */}
        {isExpanded && (
          <View style={styles.expandedSection}>
            {/* Order items */}
            {item.orderItems?.length > 0 && (
              <View style={styles.itemsSection}>
                <Text style={styles.expandedSectionTitle}>📦 Sản phẩm ({item.orderItems.length})</Text>
                {item.orderItems.map((oi, idx) => renderOrderItem(oi, idx))}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tạm tính</Text>
                  <Text style={styles.totalValue}>{(item.subtotal || 0).toLocaleString('vi-VN')}₫</Text>
                </View>
                {item.shippingFee > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Phí ship</Text>
                    <Text style={styles.totalValue}>{(item.shippingFee || 0).toLocaleString('vi-VN')}₫</Text>
                  </View>
                )}
                {item.discountAmount > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Giảm giá</Text>
                    <Text style={[styles.totalValue, { color: '#059669' }]}>-{(item.discountAmount || 0).toLocaleString('vi-VN')}₫</Text>
                  </View>
                )}
                <View style={[styles.totalRow, { borderTopWidth: 2, borderTopColor: '#1E293B', paddingTop: 8, marginTop: 4 }]}>
                  <Text style={[styles.totalLabel, { fontWeight: '700', color: '#1E293B' }]}>Thành tiền</Text>
                  <Text style={[styles.totalValue, { fontSize: 16, fontWeight: '700', color: '#1E293B' }]}>{(item.finalAmount || 0).toLocaleString('vi-VN')}₫</Text>
                </View>
              </View>
            )}

            {/* Customer info */}
            <View style={styles.infoSection}>
              <Text style={styles.expandedSectionTitle}>👤 Khách hàng</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tên:</Text>
                <Text style={styles.infoValue}>{item.user?.name || '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{item.user?.email || '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Điện thoại:</Text>
                <Text style={styles.infoValue}>{item.shippingPhone || item.user?.phone || '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Địa chỉ:</Text>
                <Text style={styles.infoValue}>{item.shippingAddress || '—'}</Text>
              </View>
            </View>

            {/* Payment info */}
            <View style={styles.infoSection}>
              <Text style={styles.expandedSectionTitle}>💰 Thanh toán</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phương thức:</Text>
                <Text style={styles.infoValue}>
                  {item.paymentMethod === 'MOMO' ? 'Ví MoMo' : item.paymentMethod === 'VNPAY' ? 'VNPay' : 'COD'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Mã giao dịch:</Text>
                <Text style={styles.infoValue}>{item.transactionId || '—'}</Text>
              </View>
              {item.coupon && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Mã giảm giá:</Text>
                  <Text style={styles.infoValue}>{item.coupon.code}</Text>
                </View>
              )}
            </View>

            {/* Update status */}
            {item.status !== 'CANCELLED' && item.status !== 'DELIVERED' && (
              <TouchableOpacity style={styles.updateBtn} onPress={() => handleUpdateStatus(item.id, item.status)}>
                <Text style={styles.updateBtnText}>Cập nhật trạng thái →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const filters = ['', 'PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Quản lý đơn hàng</Text>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterList}
          renderItem={({ item: s }) => (
            <TouchableOpacity
              style={[styles.filterTab, filter === s && styles.activeFilterTab]}
              onPress={() => setFilter(s)}
            >
              <Text style={[styles.filterText, filter === s && styles.activeFilterText]}>
                {STATUS_MAP[s]?.label || 'Tất cả'}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>Không có đơn hàng nào</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
  filterRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff' },
  filterList: { paddingHorizontal: 12, gap: 8 },
  filterTab: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#F1F5F9' },
  activeFilterTab: { backgroundColor: '#3B82F6' },
  filterText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  activeFilterText: { color: '#fff' },
  list: { padding: 12, paddingBottom: 32 },
  orderCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  orderId: { fontSize: 14, fontWeight: '700', color: '#1E293B', fontFamily: 'monospace' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
  orderBody: { flexDirection: 'row' },
  customerName: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  customerEmail: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  itemCount: { fontSize: 12, color: '#64748B', marginTop: 4 },
  amountCol: { alignItems: 'flex-end' },
  amount: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  date: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  expandHint: { fontSize: 11, color: '#3B82F6', fontWeight: '500', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', textAlign: 'center' },

  // Expanded section
  expandedSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  expandedSectionTitle: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8 },
  itemsSection: { marginBottom: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 10 },
  itemImage: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#F1F5F9' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 12, fontWeight: '500', color: '#1E293B' },
  itemPrice: { fontSize: 11, color: '#64748B', marginTop: 2 },
  itemTotal: { fontSize: 12, fontWeight: '600', color: '#1E293B' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalLabel: { fontSize: 13, color: '#64748B' },
  totalValue: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  infoSection: { marginBottom: 16, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { fontSize: 12, color: '#64748B' },
  infoValue: { fontSize: 12, fontWeight: '500', color: '#1E293B', flex: 1, textAlign: 'right' },
  updateBtn: { backgroundColor: '#3B82F6', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  updateBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#94A3B8' },
});

export default AdminOrdersScreen;
