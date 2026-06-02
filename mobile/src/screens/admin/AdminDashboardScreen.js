import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';

const STATUS_LABELS = {
  PENDING: 'Chờ xử lý', CONFIRMED: 'Đã xác nhận', SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao', CANCELLED: 'Đã hủy',
};
const STATUS_COLORS = {
  PENDING: '#F59E0B', CONFIRMED: '#2563EB', SHIPPING: '#7C3AED',
  DELIVERED: '#059669', CANCELLED: '#EF4444',
};

const ADMIN_MENU = [
  { key: 'Users', icon: '👥', label: 'Người dùng' },
  { key: 'Orders', icon: '📋', label: 'Đơn hàng' },
  { key: 'Products', icon: '📦', label: 'Sản phẩm' },
  { key: 'Categories', icon: '📁', label: 'Danh mục' },
  { key: 'Banners', icon: '🖼️', label: 'Banner' },
  { key: 'FlashSales', icon: '⚡', label: 'Flash Sale' },
  { key: 'Coupons', icon: '🎫', label: 'Mã giảm giá' },
  { key: 'Partners', icon: '🏪', label: 'Đối tác' },
  { key: 'Refunds', icon: '🔄', label: 'Hoàn tiền' },
  { key: 'Violations', icon: '⚠️', label: 'Vi phạm' },
  { key: 'Recommendations', icon: '📊', label: 'Gợi ý SP' },
  { key: 'Clusters', icon: '🧠', label: 'Phân cụm' },
  { key: 'MLTest', icon: '🧪', label: 'Kiểm tra ML' },
  { key: 'ABTesting', icon: '🔬', label: 'A/B Test' },
  { key: 'AuditLog', icon: '📜', label: 'Audit Log' },
  { key: 'Settings', icon: '⚙️', label: 'Cài đặt' },
];

const AdminDashboardScreen = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [mlHealth, setMlHealth] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [dashRes, mlRes, productsRes, ordersRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/ml/health').catch(() => ({ data: { data: { healthy: false } } })),
        api.get('/products', { params: { limit: 5, sort: 'sold' } }).catch(() => ({ data: { data: { products: [] } } })),
        api.get('/orders/admin/all', { params: { limit: 5 } }).catch(() => ({ data: { data: { orders: [] } } })),
      ]);
      setStats(dashRes.data.data);
      setMlHealth(mlRes.data.data);
      setTopProducts(productsRes.data.data.products || []);
      setRecentOrders(ordersRes.data.data.orders || []);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const statCards = [
    { label: 'Người dùng', value: stats?.overview?.totalUsers ?? stats?.totalUsers ?? '0', color: '#3B82F6', link: 'AdminUsers' },
    { label: 'Sản phẩm', value: stats?.overview?.totalProducts ?? stats?.totalProducts ?? '0', color: '#8B5CF6', link: 'AdminProducts' },
    { label: 'Đối tác', value: stats?.overview?.totalPartners ?? (stats?.totalPartners || '0'), color: '#10B981', link: 'AdminPartners' },
    { label: 'Doanh thu', value: `${(stats?.totalRevenue || 0).toLocaleString('vi-VN')}₫`, color: '#F59E0B', link: 'AdminOrders' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Bảng điều khiển</Text>
            <Text style={styles.subtitle}>Tổng quan hệ thống</Text>
          </View>
          <TouchableOpacity onPress={fetchAll} style={styles.reloadBtn}>
            <Text style={styles.reloadBtnText}>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* ML Health */}
        <View style={[styles.mlCard, { backgroundColor: mlHealth?.healthy ? '#F0FDF4' : '#FEF2F2' }]}>
          <Text style={styles.mlIcon}>{mlHealth?.healthy ? '✅' : '❌'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.mlTitle}>ML Service {mlHealth?.healthy ? 'Hoạt động' : 'Ngoại tuyến'}</Text>
            <Text style={styles.mlDesc}>
              {mlHealth?.healthy
                ? `${mlHealth.info?.version || '2.0'} · ${mlHealth.info?.service || 'AI Engine'}`
                : 'Kết nối ML thất bại'}
            </Text>
          </View>
          <TouchableOpacity style={styles.mlDetailBtn} onPress={() => navigation.navigate('AdminMLTest')}>
            <Text style={styles.mlDetailBtnText}>Chi tiết</Text>
          </TouchableOpacity>
        </View>

        {/* Stat Cards */}
        {loading ? (
          <ActivityIndicator size="large" color="#3B82F6" style={{ marginVertical: 20 }} />
        ) : (
          <>
            <View style={styles.statsGrid}>
              {statCards.map((stat, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.statCard, { borderLeftColor: stat.color }]}
                  onPress={() => navigation.navigate(stat.link)}
                >
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Top Products */}
            {topProducts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>🏆 Sản phẩm bán chạy</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('AdminProducts')}>
                    <Text style={styles.seeAll}>Xem tất cả →</Text>
                  </TouchableOpacity>
                </View>
                {topProducts.map((p, idx) => (
                  <View key={p.id} style={styles.productRow}>
                    <Text style={[styles.rank, idx === 0 && { color: '#F59E0B' }, idx === 1 && { color: '#94A3B8' }, idx === 2 && { color: '#D97706' }]}>
                      #{idx + 1}
                    </Text>
                    <Image source={{ uri: p.images?.[0] }} style={styles.productThumb} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                      <Text style={styles.productPrice}>{(p.discountPrice || p.price).toLocaleString('vi-VN')}₫</Text>
                    </View>
                    <Text style={styles.productSold}>{p.soldCount || 0} đã bán</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Recent Orders */}
            {recentOrders.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>📋 Đơn hàng gần đây</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('AdminOrders')}>
                    <Text style={styles.seeAll}>Xem tất cả →</Text>
                  </TouchableOpacity>
                </View>
                {recentOrders.map((order) => (
                  <TouchableOpacity key={order.id} style={styles.orderCard} onPress={() => navigation.navigate('AdminOrders')}>
                    <View style={styles.orderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
                        <Text style={styles.orderCustomer}>{order.user?.name || 'Khách'}</Text>
                      </View>
                      <View style={styles.orderRight}>
                        <Text style={styles.orderAmount}>{order.finalAmount?.toLocaleString('vi-VN')}₫</Text>
                        <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[order.status]}20` }]}>
                          <Text style={[styles.statusText, { color: STATUS_COLORS[order.status] }]}>
                            {STATUS_LABELS[order.status] || order.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleString('vi-VN')} · {order.orderItems?.length || 0} SP</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Quick Management Menu */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚡ Quản lý nhanh</Text>
              <View style={styles.menuGrid}>
                {ADMIN_MENU.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={styles.menuItem}
                    onPress={() => navigation.navigate(`Admin${item.key}`)}
                  >
                    <Text style={styles.menuIcon}>{item.icon}</Text>
                    <Text style={styles.menuText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  subtitle: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  reloadBtn: { padding: 8 },
  reloadBtnText: { fontSize: 20 },
  mlCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, padding: 14, borderRadius: 14, marginBottom: 16, gap: 10 },
  mlIcon: { fontSize: 24 },
  mlTitle: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  mlDesc: { fontSize: 11, color: '#64748B', marginTop: 2 },
  mlDetailBtn: { backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  mlDetailBtnText: { fontSize: 11, color: '#3B82F6', fontWeight: '500' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  statCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, width: '47%', borderLeftWidth: 4, borderWidth: 1, borderColor: '#F1F5F9', borderLeftColor: undefined },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
  statLabel: { fontSize: 13, color: '#64748B', marginTop: 4 },
  section: { padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  seeAll: { fontSize: 12, color: '#3B82F6', fontWeight: '500' },
  productRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 6, borderWidth: 1, borderColor: '#F1F5F9', gap: 10 },
  rank: { fontSize: 14, fontWeight: '700', color: '#94A3B8', width: 28 },
  productThumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#F1F5F9' },
  productName: { fontSize: 13, fontWeight: '500', color: '#1E293B' },
  productPrice: { fontSize: 11, color: '#64748B', marginTop: 2 },
  productSold: { fontSize: 11, color: '#059669', fontWeight: '500' },
  orderCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: '#F1F5F9' },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  orderCustomer: { fontSize: 11, color: '#64748B', marginTop: 2 },
  orderRight: { alignItems: 'flex-end' },
  orderAmount: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: '600' },
  orderDate: { fontSize: 10, color: '#94A3B8', marginTop: 6 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  menuItem: { width: '30%', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  menuIcon: { fontSize: 24, marginBottom: 4 },
  menuText: { fontSize: 11, color: '#1E293B', fontWeight: '500', textAlign: 'center' },
});

export default AdminDashboardScreen;
