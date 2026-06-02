import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, Image,
  RefreshControl, ActivityIndicator, Modal, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

const AdminRecommendationsScreen = () => {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mlHealth, setMlHealth] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [trendRes, healthRes] = await Promise.all([
        api.get('/recommendations/trending'),
        api.get('/ml/health').catch(() => ({ data: { data: { healthy: false } } })),
      ]);
      setTrending(trendRes.data.data || []);
      setMlHealth(healthRes.data.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const renderProduct = ({ item: p }) => (
    <View style={styles.productCard}>
      <Image source={{ uri: p.images?.[0] }} style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
        <Text style={styles.productPrice}>{(p.discountPrice || p.price).toLocaleString('vi-VN')}₫</Text>
        <Text style={styles.productSold}>{p.soldCount || 0} đã bán</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Gợi ý sản phẩm</Text>
        <View style={[styles.healthBadge, { backgroundColor: mlHealth?.healthy ? '#D1FAE5' : '#F3F4F6' }]}>
          <Text style={[styles.healthText, { color: mlHealth?.healthy ? '#059669' : '#6B7280' }]}>
            ML {mlHealth?.healthy ? '✅' : '❌'}
          </Text>
        </View>
      </View>

      {/* Strategies */}
      <View style={styles.strategiesCard}>
        <Text style={styles.strategiesTitle}>Chiến lược gợi ý</Text>
        {[
          { name: 'Phân cụm (RFM + K-Means)', active: true, desc: 'Gợi ý theo nhóm khách hàng' },
          { name: 'Lọc cộng tác (Item-Item CF)', active: mlHealth?.healthy, desc: 'Dựa trên hành vi mua tương tự' },
          { name: 'Theo phiên (Session)', active: mlHealth?.healthy, desc: 'Dựa trên sản phẩm đang xem' },
          { name: 'Tương tự (Nội dung)', active: true, desc: 'Cùng danh mục, bán chạy nhất' },
          { name: 'Xu hướng (Trending)', active: true, desc: 'Bán chạy toàn hệ thống' },
        ].map((s, idx) => (
          <View key={idx} style={styles.strategyRow}>
            <View style={[styles.strategyDot, { backgroundColor: s.active ? '#059669' : '#D1D5DB' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.strategyName}>{s.name}</Text>
              <Text style={styles.strategyDesc}>{s.desc}</Text>
            </View>
            <Text style={[styles.strategyStatus, { color: s.active ? '#059669' : '#9CA3AF' }]}>{s.active ? 'Đang chạy' : 'Cần ML'}</Text>
          </View>
        ))}
      </View>

      {/* Trending */}
      <View style={styles.trendingSection}>
        <Text style={styles.trendingTitle}>Sản phẩm thịnh hành</Text>
        {loading ? (
          <ActivityIndicator color="#3B82F6" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={trending}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10 }}
            ListEmptyComponent={<Text style={{ color: '#94A3B8', paddingVertical: 20 }}>Chưa có dữ liệu</Text>}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1E293B', flex: 1 },
  healthBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  healthText: { fontSize: 12, fontWeight: '600' },
  strategiesCard: { margin: 16, backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  strategiesTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
  strategyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 10 },
  strategyDot: { width: 8, height: 8, borderRadius: 4 },
  strategyName: { fontSize: 13, fontWeight: '500', color: '#1E293B' },
  strategyDesc: { fontSize: 11, color: '#64748B', marginTop: 2 },
  strategyStatus: { fontSize: 10, fontWeight: '500' },
  trendingSection: { paddingHorizontal: 16 },
  trendingTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
  productCard: { backgroundColor: '#fff', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#E2E8F0', width: 140 },
  productImage: { width: 124, height: 124, borderRadius: 8, backgroundColor: '#F1F5F9' },
  productInfo: { marginTop: 8 },
  productName: { fontSize: 12, fontWeight: '500', color: '#1E293B' },
  productPrice: { fontSize: 13, fontWeight: '700', color: '#3B82F6', marginTop: 2 },
  productSold: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
});

export default AdminRecommendationsScreen;
