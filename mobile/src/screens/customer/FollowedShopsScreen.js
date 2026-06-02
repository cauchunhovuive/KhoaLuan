import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from 'react-native-toast-message';

const FollowedShopsScreen = ({ navigation }) => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchShops = async () => {
    try {
      const { data } = await api.get('/users/follow');
      setShops(data.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchShops(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchShops();
    setRefreshing(false);
  };

  const handleUnfollow = (partnerId) => {
    Alert.alert('Xác nhận', 'Bỏ theo dõi cửa hàng này?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Bỏ theo dõi', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/users/follow/${partnerId}`);
          Toast.show({ type: 'success', text1: 'Đã bỏ theo dõi' });
          fetchShops();
        } catch { Toast.show({ type: 'error', text1: 'Lỗi' }); }
      }},
    ]);
  };

  const renderShop = ({ item }) => (
    <TouchableOpacity
      style={styles.shopCard}
      onPress={() => navigation.navigate('Shop', { partnerId: item.partnerId })}
    >
      <View style={styles.shopRow}>
        <View style={styles.shopAvatar}>
          <Text style={styles.avatarText}>{item.partner?.storeName?.[0] || 'S'}</Text>
        </View>
        <View style={styles.shopInfo}>
          <Text style={styles.shopName}>{item.partner?.storeName}</Text>
          {item.partner?.storeDescription && (
            <Text style={styles.shopDesc} numberOfLines={2}>{item.partner.storeDescription}</Text>
          )}
          <Text style={styles.followDate}>
            ✓ Đã theo dõi từ {new Date(item.createdAt).toLocaleDateString('vi-VN')}
          </Text>
        </View>
        <TouchableOpacity style={styles.unfollowBtn} onPress={() => handleUnfollow(item.partnerId)}>
          <Text style={styles.unfollowText}>Bỏ theo dõi</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cửa hàng đã theo dõi</Text>
        <Text style={styles.subtitle}>{shops.length} cửa hàng</Text>
      </View>

      <FlatList
        data={shops}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={renderShop}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>❤️</Text>
            <Text style={styles.emptyText}>Chưa theo dõi cửa hàng nào</Text>
            <Text style={styles.emptySubtext}>Theo dõi cửa hàng yêu thích để nhận thông tin khuyến mãi</Text>
            <TouchableOpacity style={styles.exploreBtn} onPress={() => navigation.navigate('Home')}>
              <Text style={styles.exploreText}>Khám phá ngay</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  list: { padding: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  emptySubtext: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  exploreBtn: { marginTop: 16, backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32 },
  exploreText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  shopCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  shopRow: { flexDirection: 'row', alignItems: 'center' },
  shopAvatar: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#059669' },
  shopInfo: { flex: 1, marginRight: 8 },
  shopName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  shopDesc: { fontSize: 13, color: '#64748b', marginTop: 2 },
  followDate: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  unfollowBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#fecaca' },
  unfollowText: { fontSize: 12, color: '#ef4444', fontWeight: '500' },
});

export default FollowedShopsScreen;
