import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';

const PartnerDashboardScreen = ({ navigation }) => {
  const [data, setData] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [dashboardRes, revenueRes] = await Promise.all([
        api.get('/partner/dashboard'),
        api.get('/partner/revenue?period=monthly').catch(() => ({ data: { data: null } })),
      ]);
      setData(dashboardRes.data.data);
      setRevenueData(revenueRes.data.data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const overview = data?.overview || {};
  const stats = [
    { label: 'Sản phẩm', value: String(overview.totalProducts || 0), sub: `${overview.activeProducts || 0} đang bán`, color: '#3B82F6', icon: '📦' },
    { label: 'Đơn hàng', value: String(overview.totalOrders || 0), sub: '', color: '#10B981', icon: '📋' },
    { label: 'Doanh thu', value: (overview.totalRevenue || 0).toLocaleString('vi-VN') + '₫', sub: `${revenueData?.totalOrders || 0} đơn đã giao`, color: '#8B5CF6', icon: '💰' },
    { label: 'Tỉ lệ duyệt', value: overview.totalProducts > 0 ? Math.round((overview.activeProducts / overview.totalProducts) * 100) + '%' : '0%', sub: 'SP active', color: '#F59E0B', icon: '📊' },
  ];

  const topProducts = revenueData?.topProducts || [];
  const monthlyRevenue = revenueData?.monthlyRevenue || [];
  const totalRevenue = revenueData?.totalRevenue || 0;
  const currentYear = new Date().getFullYear();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.header}>
          <Text style={styles.title}>🛠️ Bảng điều khiển</Text>
          <Text style={styles.subtitle}>Quản lý cửa hàng của bạn</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat, idx) => (
            <View key={idx} style={[styles.statCard, { borderLeftColor: stat.color }]}>
              <View style={styles.statRow}>
                <Text style={styles.statIcon}>{stat.icon}</Text>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              </View>
              <Text style={styles.statLabel}>{stat.label}</Text>
              {stat.sub ? <Text style={styles.statSub}>{stat.sub}</Text> : null}
            </View>
          ))}
        </View>

        {/* Revenue Summary */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📈</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.sectionTitle}>Doanh thu theo tháng</Text>
              <Text style={styles.sectionSub}>Năm {currentYear} · Tổng: {totalRevenue.toLocaleString('vi-VN')}₫</Text>
            </View>
          </View>
          {monthlyRevenue.length > 0 ? (
            <View style={styles.revenueList}>
              {monthlyRevenue.map((m, idx) => (
                <View key={idx} style={styles.revenueRow}>
                  <Text style={styles.monthLabel}>Tháng {m.month}</Text>
                  <View style={styles.revenueBar}>
                    <View style={[styles.revenueFill, { width: `${Math.min((m.revenue / Math.max(...monthlyRevenue.map(x => x.revenue), 1)) * 100, 100)}%` }]} />
                  </View>
                  <Text style={styles.monthRevenue}>{m.revenue.toLocaleString('vi-VN')}₫</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noData}>Chưa có dữ liệu doanh thu</Text>
          )}
          <View style={styles.orderSummary}>
            <Text style={styles.orderSummaryTitle}>Số đơn theo tháng</Text>
            <View style={styles.revenueList}>
              {monthlyRevenue.map((m, idx) => (
                <View key={idx} style={styles.revenueRow}>
                  <Text style={styles.monthLabel}>T{m.month}</Text>
                  <View style={styles.revenueBar}>
                    <View style={[styles.orderFill, { width: `${Math.min((m.orders / Math.max(...monthlyRevenue.map(x => x.orders), 1)) * 100, 100)}%` }]} />
                  </View>
                  <Text style={styles.monthRevenue}>{m.orders} đơn</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Top Products */}
        {topProducts.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🏆</Text>
              <Text style={[styles.sectionTitle, { marginLeft: 10 }]}>Top sản phẩm bán chạy</Text>
            </View>
            {topProducts.map((p, idx) => (
              <View key={idx} style={styles.topProductRow}>
                <View style={[styles.rankBadge, {
                  backgroundColor: idx === 0 ? '#FEF3C7' : idx === 1 ? '#F1F5F9' : idx === 2 ? '#FFEDD5' : '#F8FAFC',
                }]}>
                  <Text style={[styles.rankText, {
                    color: idx === 0 ? '#D97706' : idx === 1 ? '#6B7280' : idx === 2 ? '#EA580C' : '#9CA3AF',
                  }]}>{idx + 1}</Text>
                </View>
                <Image source={{ uri: p.image }} style={styles.topProductImage} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.topProductName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.topProductSold}>Đã bán: {p.quantity}</Text>
                </View>
                <Text style={styles.topProductRevenue}>{p.revenue.toLocaleString('vi-VN')}₫</Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('PartnerProducts')}>
            <Text style={styles.qaIcon}>📦</Text>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.qaTitle}>Quản lý sản phẩm</Text>
              <Text style={styles.qaDesc}>Thêm, sửa, xoá sản phẩm</Text>
            </View>
            <Text style={styles.qaArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('PartnerOrders')}>
            <Text style={styles.qaIcon}>📋</Text>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.qaTitle}>Quản lý đơn hàng</Text>
              <Text style={styles.qaDesc}>Xem và xử lý đơn hàng</Text>
            </View>
            <Text style={styles.qaArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Orders */}
        {data?.recentOrders?.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📋</Text>
              <Text style={[styles.sectionTitle, { marginLeft: 10, flex: 1 }]}>Đơn hàng gần đây</Text>
              <TouchableOpacity onPress={() => navigation.navigate('PartnerOrders')}>
                <Text style={styles.viewAll}>Xem tất cả →</Text>
              </TouchableOpacity>
            </View>
            {data.recentOrders.slice(0, 5).map((item, idx) => (
              <View key={idx} style={styles.recentOrderRow}>
                <Image source={{ uri: item.product?.images?.[0] }} style={styles.recentOrderImage} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.recentOrderName} numberOfLines={1}>{item.product?.name}</Text>
                  <Text style={styles.recentOrderMeta}>SL: {item.quantity} - {item.order?.user?.name}</Text>
                </View>
                <View style={[styles.statusBadge, {
                  backgroundColor: item.order?.status === 'DELIVERED' ? '#D1FAE5' : item.order?.status === 'PENDING' ? '#FEF3C7' : item.order?.status === 'SHIPPING' ? '#DBEAFE' : '#F3F4F6',
                }]}>
                  <Text style={[styles.statusText, {
                    color: item.order?.status === 'DELIVERED' ? '#059669' : item.order?.status === 'PENDING' ? '#D97706' : item.order?.status === 'SHIPPING' ? '#2563EB' : '#6B7280',
                  }]}>
                    {item.order?.status === 'PENDING' ? 'Chờ XN' : item.order?.status === 'CONFIRMED' ? 'Đã XN' : item.order?.status === 'SHIPPING' ? 'Đang giao' : item.order?.status === 'DELIVERED' ? 'Đã giao' : 'Đã huỷ'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, width: '47%', borderLeftWidth: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statIcon: { fontSize: 20 },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },
  statSub: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  sectionCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIcon: { fontSize: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  sectionSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  revenueList: { gap: 4 },
  revenueRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  monthLabel: { fontSize: 11, color: '#64748B', width: 60 },
  revenueBar: { flex: 1, height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  revenueFill: { height: '100%', backgroundColor: '#8B5CF6', borderRadius: 4 },
  orderFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 4 },
  monthRevenue: { fontSize: 11, color: '#475569', fontWeight: '500', width: 80, textAlign: 'right' },
  noData: { textAlign: 'center', color: '#94A3B8', paddingVertical: 24, fontSize: 13 },
  orderSummary: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  orderSummaryTitle: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 8 },
  topProductRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  rankBadge: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 12, fontWeight: 'bold' },
  topProductImage: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#F1F5F9' },
  topProductName: { fontSize: 13, fontWeight: '500', color: '#1E293B' },
  topProductSold: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  topProductRevenue: { fontSize: 13, fontWeight: '700', color: '#8B5CF6' },
  quickActions: { gap: 10, marginBottom: 16 },
  quickActionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  qaIcon: { fontSize: 24 },
  qaTitle: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  qaDesc: { fontSize: 12, color: '#64748B', marginTop: 2 },
  qaArrow: { fontSize: 22, color: '#94A3B8' },
  viewAll: { fontSize: 12, color: '#059669', fontWeight: '500' },
  recentOrderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  recentOrderImage: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#F1F5F9' },
  recentOrderName: { fontSize: 13, fontWeight: '500', color: '#1E293B' },
  recentOrderMeta: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 9, fontWeight: '600' },
});

export default PartnerDashboardScreen;
