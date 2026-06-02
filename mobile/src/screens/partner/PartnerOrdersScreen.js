import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Alert,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

const STATUS_MAP = {
  PENDING: { label: 'Chờ xử lý', color: '#D97706', bg: '#FEF3C7', next: 'CONFIRMED', nextLabel: 'Xác nhận' },
  CONFIRMED: { label: 'Đã xác nhận', color: '#2563EB', bg: '#DBEAFE', next: 'SHIPPING', nextLabel: 'Đã giao VC' },
  SHIPPING: { label: 'Đang giao', color: '#7C3AED', bg: '#EDE9FE', next: 'DELIVERED', nextLabel: 'Đã giao' },
  DELIVERED: { label: 'Đã giao', color: '#059669', bg: '#D1FAE5', next: null, nextLabel: '' },
  CANCELLED: { label: 'Đã huỷ', color: '#EF4444', bg: '#FEE2E2', next: null, nextLabel: '' },
};

const PartnerOrdersScreen = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expanded, setExpanded] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      const params = { page, limit: 10 };
      if (filter) params.status = filter;
      const { data } = await api.get('/partner/orders', { params });
      setOrders(data.data.orders);
      setTotalPages(data.data.pagination.totalPages);
    } catch { Toast.show({ type: 'error', text1: 'Không thể tải đơn hàng' }); }
    finally { setLoading(false); setRefreshing(false); }
  }, [page, filter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleUpdateStatus = (orderId, status) => {
    const statusInfo = STATUS_MAP[status];
    if (!statusInfo?.next) return;
    Alert.alert('Cập nhật trạng thái', `Chuyển sang "${statusInfo.nextLabel}"?`, [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xác nhận', onPress: async () => {
        try { await api.put(`/orders/${orderId}/status`, { status: statusInfo.next }); Toast.show({ type: 'success', text1: `Đã cập nhật: ${statusInfo.nextLabel}` }); fetchOrders(); }
        catch { Toast.show({ type: 'error', text1: 'Lỗi' }); }
      }},
    ]);
  };

  const handleCancel = (orderId) => {
    Alert.alert('Từ chối đơn', 'Từ chối đơn hàng này?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Từ chối', style: 'destructive', onPress: async () => {
        try { await api.put(`/orders/${orderId}/status`, { status: 'CANCELLED' }); Toast.show({ type: 'success', text1: 'Đã từ chối' }); fetchOrders(); }
        catch { Toast.show({ type: 'error', text1: 'Lỗi' }); }
      }},
    ]);
  };

  const filters = ['', 'PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>📋 Đơn hàng</Text>
      </View>

      <FlatList horizontal showsHorizontalScrollIndicator={false} data={filters}
        keyExtractor={(item) => item}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
        renderItem={({ item: s }) => (
          <TouchableOpacity style={[styles.filterChip, filter === s && styles.filterChipActive]} onPress={() => { setFilter(s === filter ? '' : s); setPage(1); }}>
            <Text style={[styles.filterText, filter === s && styles.filterTextActive]}>{STATUS_MAP[s]?.label || '📋 Tất cả'}</Text>
          </TouchableOpacity>
        )}
      />

      {loading ? <ActivityIndicator size="large" color="#059669" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} />}
          renderItem={({ item }) => {
            const isExpanded = expanded === item.id;
            const statusInfo = STATUS_MAP[item.status] || { label: item.status, color: '#6B7280', bg: '#F3F4F6', next: null };
            return (
              <View style={styles.orderCard}>
                <TouchableOpacity style={styles.orderHeader} onPress={() => setExpanded(isExpanded ? null : item.id)}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.orderRow}>
                      <Text style={styles.orderId}>#{item.id.slice(0, 8)}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                        <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.orderCustomer}>{item.user?.name} - {item.phone}</Text>
                    <Text style={styles.orderAmount}>{item.finalAmount?.toLocaleString('vi-VN')}₫</Text>
                  </View>
                  <Text style={styles.expandArrow}>{isExpanded ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.expandedSection}>
                    {/* Order Items */}
                    <View style={styles.itemsList}>
                      {item.orderItems?.map((oi, idx) => (
                        <View key={idx} style={styles.itemRow}>
                          <Image source={{ uri: oi.product?.images?.[0] }} style={styles.itemImage} />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.itemName} numberOfLines={1}>{oi.product?.name}</Text>
                            <Text style={styles.itemMeta}>SL: {oi.quantity} × {oi.price.toLocaleString('vi-VN')}₫</Text>
                          </View>
                          <Text style={styles.itemTotal}>{(oi.price * oi.quantity).toLocaleString('vi-VN')}₫</Text>
                        </View>
                      ))}
                    </View>

                    {/* Customer Info */}
                    <View style={styles.infoBox}>
                      <Text style={styles.infoText}>📞 {item.user?.phone || '—'}</Text>
                      <Text style={styles.infoText}>📍 {item.shippingAddress || '—'}</Text>
                      <Text style={styles.infoText}>💳 {item.paymentMethod || '—'}</Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.actionRow}>
                      {statusInfo.next && (
                        <TouchableOpacity style={styles.nextBtn} onPress={() => handleUpdateStatus(item.id, item.status)}>
                          <Text style={styles.nextBtnText}>→ {statusInfo.nextLabel}</Text>
                        </TouchableOpacity>
                      )}
                      {item.status === 'PENDING' && (
                        <TouchableOpacity style={styles.cancelOrderBtn} onPress={() => handleCancel(item.id)}>
                          <Text style={styles.cancelOrderBtnText}>✕ Từ chối</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>Không có đơn hàng</Text>}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity onPress={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={[styles.pageBtn, page === 1 && { opacity: 0.4 }]}><Text>◀</Text></TouchableOpacity>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <TouchableOpacity key={p} onPress={() => setPage(p)}
                    style={[styles.pageNum, p === page && styles.pageNumActive]}>
                    <Text style={[styles.pageNumText, p === page && styles.pageNumTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={[styles.pageBtn, page === totalPages && { opacity: 0.4 }]}><Text>▶</Text></TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  filterBar: { maxHeight: 48, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff' },
  filterContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterChip: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#F1F5F9' },
  filterChipActive: { backgroundColor: '#059669' },
  filterText: { fontSize: 12, color: '#475569' },
  filterTextActive: { color: '#fff' },
  list: { padding: 12, paddingBottom: 40 },
  orderCard: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  orderHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderId: { fontSize: 13, fontWeight: '700', color: '#1E293B', fontFamily: 'monospace' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '600' },
  orderCustomer: { fontSize: 13, color: '#475569', marginTop: 4 },
  orderAmount: { fontSize: 16, fontWeight: '700', color: '#059669', marginTop: 4 },
  expandArrow: { fontSize: 12, color: '#94A3B8', marginLeft: 8 },
  expandedSection: { borderTopWidth: 1, borderTopColor: '#F1F5F9', padding: 14 },
  itemsList: { gap: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemImage: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#F1F5F9' },
  itemName: { fontSize: 13, color: '#1E293B', fontWeight: '500' },
  itemMeta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  itemTotal: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  infoBox: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, marginTop: 10, gap: 4 },
  infoText: { fontSize: 12, color: '#475569' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  nextBtn: { flex: 1, backgroundColor: '#059669', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  cancelOrderBtn: { flex: 1, backgroundColor: '#FEE2E2', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  cancelOrderBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 13 },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 40 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 16, flexWrap: 'wrap' },
  pageBtn: { padding: 10, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  pageNum: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  pageNumActive: { backgroundColor: '#059669', borderColor: '#059669' },
  pageNumText: { fontSize: 13, color: '#475569' },
  pageNumTextActive: { color: '#fff' },
});

export default PartnerOrdersScreen;
