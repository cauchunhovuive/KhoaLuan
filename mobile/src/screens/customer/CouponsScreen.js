import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from 'react-native-toast-message';

const CouponsScreen = ({ navigation }) => {
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [savedCoupons, setSavedCoupons] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('available');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchCoupons = async () => {
    try {
      const params = typeFilter ? { type: typeFilter } : {};
      const [availRes, savedRes] = await Promise.all([
        api.get('/coupons/available', { params }),
        api.get('/coupons/saved'),
      ]);
      setAvailableCoupons(availRes.data.data?.coupons || []);
      const saved = savedRes.data.data || [];
      setSavedCoupons(saved);
      setSavedIds(new Set(saved.map(c => c.id)));
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchCoupons(); }, [typeFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCoupons();
    setRefreshing(false);
  };

  const handleSave = async (couponId) => {
    try {
      await api.post(`/coupons/saved/${couponId}`);
      setSavedIds(prev => new Set([...prev, couponId]));
      Toast.show({ type: 'success', text1: 'Đã lưu mã giảm giá!' });
      const { data } = await api.get('/coupons/saved');
      setSavedCoupons(data.data || []);
    } catch { Toast.show({ type: 'error', text1: 'Lưu thất bại' }); }
  };

  const handleUnsave = async (couponId) => {
    try {
      await api.delete(`/coupons/saved/${couponId}`);
      setSavedIds(prev => { const next = new Set(prev); next.delete(couponId); return next; });
      Toast.show({ type: 'success', text1: 'Đã xoá khỏi danh sách' });
      setSavedCoupons(prev => prev.filter(c => c.id !== couponId));
    } catch { Toast.show({ type: 'error', text1: 'Xoá thất bại' }); }
  };

  const handleCopyCode = (code) => {
    // Copy to clipboard is tricky in RN, show the code clearly instead
    Toast.show({ type: 'success', text1: `Mã: ${code}`, text2: 'Hãy nhập mã này khi thanh toán' });
  };

  if (loading) return <LoadingSpinner />;

  const renderCoupon = ({ item }) => {
    const isSaved = savedIds.has(item.id);
    const discountLabel = item.type === 'PERCENTAGE' ? `Giảm ${item.value}%` : `Giảm ${item.value.toLocaleString('vi-VN')}₫`;

    return (
      <View style={styles.couponCard}>
        <View style={styles.couponRow}>
          <View style={[styles.couponBadge, item.type === 'PERCENTAGE' ? styles.percentBadge : styles.fixedBadge]}>
            <Text style={styles.badgeText}>{item.type === 'PERCENTAGE' ? `${item.value}%` : `${(item.value/1000).toFixed(0)}K`}</Text>
            <Text style={styles.badgeSub}>{item.type === 'PERCENTAGE' ? 'GIẢM' : 'GIẢM'}</Text>
          </View>
          <View style={styles.couponInfo}>
            <View style={styles.codeRow}>
              <Text style={styles.couponCode}>{item.code}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={() => handleCopyCode(item.code)}>
                <Text style={styles.copyText}>Sao chép</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.couponDesc}>{discountLabel}{item.maxDiscount ? ` (tối đa ${item.maxDiscount.toLocaleString('vi-VN')}₫)` : ''}</Text>
            {item.minOrderValue > 0 && <Text style={styles.couponMin}>Đơn tối thiểu {item.minOrderValue.toLocaleString('vi-VN')}₫</Text>}
            {item.expiresAt && (
              <Text style={styles.couponExpiry}>HSD: {new Date(item.expiresAt).toLocaleDateString('vi-VN')}</Text>
            )}
          </View>
        </View>
        <View style={styles.couponActions}>
          <TouchableOpacity
            style={[styles.saveBtn, isSaved && styles.savedBtn]}
            onPress={() => isSaved ? handleUnsave(item.id) : handleSave(item.id)}
          >
            <Text style={[styles.saveBtnText, isSaved && styles.savedBtnText]}>
              {isSaved ? '✓ Đã lưu' : '🔖 Lưu'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const coupons = activeTab === 'available' ? availableCoupons : savedCoupons;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎫 Mã giảm giá</Text>
        <Text style={styles.subtitle}>{availableCoupons.length} mã khả dụng</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['available', 'saved'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'available' ? '🎫 Tất cả mã' : `🔖 Đã lưu (${savedIds.size})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Type filter */}
      {activeTab === 'available' && (
        <View style={styles.filterRow}>
          {['', 'PERCENTAGE', 'FIXED'].map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.filterChip, typeFilter === type && styles.filterChipActive]}
              onPress={() => setTypeFilter(type)}
            >
              <Text style={[styles.filterChipText, typeFilter === type && styles.filterChipTextActive]}>
                {type === '' ? 'Tất cả' : type === 'PERCENTAGE' ? '% Giảm %' : '₫ Cố định'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={coupons}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={renderCoupon}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎫</Text>
            <Text style={styles.emptyText}>{activeTab === 'available' ? 'Chưa có mã giảm giá' : 'Chưa lưu mã nào'}</Text>
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
  tabs: { flexDirection: 'row', margin: 16, backgroundColor: '#fff', borderRadius: 12, padding: 3, borderWidth: 1, borderColor: '#e2e8f0' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#3b82f6' },
  tabText: { fontSize: 13, fontWeight: '500', color: '#64748b' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  filterChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  filterChipText: { fontSize: 12, color: '#475569' },
  filterChipTextActive: { color: '#fff' },
  list: { padding: 16, paddingTop: 0 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748b' },

  couponCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  couponRow: { flexDirection: 'row' },
  couponBadge: { width: 60, height: 72, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  percentBadge: { backgroundColor: '#3b82f6' },
  fixedBadge: { backgroundColor: '#059669' },
  badgeText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  badgeSub: { fontSize: 9, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  couponInfo: { flex: 1 },
  codeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  couponCode: { fontSize: 15, fontWeight: 'bold', color: '#1e293b', fontFamily: 'monospace', marginRight: 8 },
  copyBtn: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#dbeafe' },
  copyText: { fontSize: 11, color: '#3b82f6', fontWeight: '600' },
  couponDesc: { fontSize: 13, color: '#475569', marginBottom: 2 },
  couponMin: { fontSize: 11, color: '#94a3b8' },
  couponExpiry: { fontSize: 11, color: '#f59e0b', marginTop: 2 },
  couponActions: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', alignItems: 'flex-end' },
  saveBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  savedBtn: { backgroundColor: '#d1fae5', borderColor: '#a7f3d0' },
  saveBtnText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  savedBtnText: { color: '#059669' },
});

export default CouponsScreen;
