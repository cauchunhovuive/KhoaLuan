import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';

const STATUS_LABELS = {
  PENDING: '🕐 Chờ xác nhận', CONFIRMED: '✅ Đã xác nhận',
  SHIPPING: '📦 Đang giao', DELIVERED: '🎉 Hoàn thành', CANCELLED: '❌ Đã huỷ',
};

const OrdersScreen = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders');
      setOrders(data.data.orders || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const renderOrder = ({ item }) => (
    <TouchableOpacity style={styles.orderCard} onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>Đơn hàng #{item.id.slice(0, 8)}</Text>
        <Text style={styles.orderStatus}>{STATUS_LABELS[item.status] || item.status}</Text>
      </View>
      {item.orderItems?.slice(0, 3).map((oi) => (
        <Text key={oi.id} style={styles.orderProduct} numberOfLines={1}>• {oi.product?.name}</Text>
      ))}
      {item.orderItems?.length > 3 && <Text style={styles.moreText}>...và {item.orderItems.length - 3} sản phẩm khác</Text>}
      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>{item.finalAmount?.toLocaleString('vi-VN')}₫</Text>
        <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Đơn hàng của tôi</Text>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={renderOrder}
        ListEmptyComponent={loading ? null : <Text style={styles.empty}>Chưa có đơn hàng nào</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  list: { padding: 16 },
  orderCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  orderId: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  orderStatus: { fontSize: 13, fontWeight: '500' },
  orderProduct: { fontSize: 13, color: '#64748b', marginBottom: 2 },
  moreText: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  orderTotal: { fontSize: 18, fontWeight: 'bold', color: '#3b82f6' },
  orderDate: { fontSize: 12, color: '#94a3b8' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 15 },
});

export default OrdersScreen;
