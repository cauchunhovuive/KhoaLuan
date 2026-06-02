import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

const AdminPartnersScreen = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPartners = useCallback(async () => {
    try {
      const params = { page, limit: 10, search };
      if (filter === 'approved') params.isApproved = 'true';
      if (filter === 'pending') params.isApproved = 'false';
      const { data } = await api.get('/partner/admin/all', { params });
      setPartners(data.data.partners);
      setTotalPages(data.data.pagination.totalPages);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Không thể tải đối tác' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, filter, search]);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  const handleApprove = (id, approved) => {
    if (!approved) {
      Alert.alert('Từ chối', 'Nhập lý do từ chối (để trống để huỷ):', [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              await api.put(`/partner/admin/${id}/approve`, { approved, rejectedReason: 'Từ chối bởi admin' });
              Toast.show({ type: 'success', text1: 'Đã từ chối' });
              fetchPartners();
            } catch (err) { Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi' }); }
          },
        },
      ]);
      return;
    }
    Alert.alert('Duyệt đối tác', 'Duyệt đối tác này?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Duyệt', onPress: async () => {
        try { await api.put(`/partner/admin/${id}/approve`, { approved }); Toast.show({ type: 'success', text1: 'Đã duyệt' }); fetchPartners(); }
        catch (err) { Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi' }); }
      }},
    ]);
  };

  const renderPartner = ({ item }) => (
    <View style={styles.partnerCard}>
      <View style={styles.partnerHeader}>
        <View style={[styles.partnerIcon, { backgroundColor: item.isApproved ? '#D1FAE5' : '#FEF3C7' }]}>
          <Text style={{ fontSize: 24 }}>🏪</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.partnerNameRow}>
            <Text style={styles.partnerName}>{item.storeName || item.name}</Text>
            <View style={[styles.badge, { backgroundColor: item.isApproved ? '#D1FAE5' : '#FEF3C7' }]}>
              <Text style={[styles.badgeText, { color: item.isApproved ? '#059669' : '#D97706' }]}>
                {item.isApproved ? 'Đã duyệt' : 'Chờ duyệt'}
              </Text>
            </View>
          </View>
          <Text style={styles.partnerEmail}>{item.name} — {item.email}</Text>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <Text style={styles.infoItem}>📞 {item.phone || '—'}</Text>
        <Text style={styles.infoItem}>🏪 {item.businessAddress || '—'}</Text>
        <Text style={styles.infoItem}>📋 MST: {item.taxCode || '—'}</Text>
        <Text style={styles.infoItem}>📦 {item._count?.products || 0} SP</Text>
      </View>

      {item.rejectedReason && (
        <View style={styles.rejectedBox}>
          <Text style={styles.rejectedText}>Lý do từ chối: {item.rejectedReason}</Text>
        </View>
      )}

      {!item.isApproved ? (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item.id, true)}>
            <Text style={styles.approveBtnText}>✓ Duyệt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectBtn} onPress={() => handleApprove(item.id, false)}>
            <Text style={styles.rejectBtnText}>✕ Từ chối</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.revokeBtn} onPress={() => handleApprove(item.id, false)}>
          <Text style={styles.revokeBtnText}>Thu hồi duyệt</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Quản lý đối tác</Text>
      </View>

      {/* Search + Filter */}
      <View style={styles.filterSection}>
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Tìm tên, email, cửa hàng..." onSubmitEditing={() => setPage(1)} />
        <View style={styles.filterTabs}>
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'pending', label: 'Chờ duyệt' },
            { key: 'approved', label: 'Đã duyệt' },
          ].map((t) => (
            <TouchableOpacity key={t.key} style={[styles.filterTab, filter === t.key && styles.activeFilter]} onPress={() => { setFilter(t.key); setPage(1); }}>
              <Text style={[styles.filterText, filter === t.key && styles.activeFilterText]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={partners}
          renderItem={renderPartner}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPartners(); }} />}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyIcon}>🏪</Text><Text style={styles.emptyText}>Không tìm thấy đối tác</Text></View>}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity onPress={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={[styles.pageBtn, page === 1 && { opacity: 0.4 }]}>
                  <Text>◀</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 14, color: '#475569' }}>{page}/{totalPages}</Text>
                <TouchableOpacity onPress={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={[styles.pageBtn, page === totalPages && { opacity: 0.4 }]}>
                  <Text>▶</Text>
                </TouchableOpacity>
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
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
  filterSection: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  searchInput: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 12, fontSize: 14, color: '#1E293B', marginBottom: 10 },
  filterTabs: { flexDirection: 'row', gap: 8 },
  filterTab: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#F1F5F9' },
  activeFilter: { backgroundColor: '#3B82F6' },
  filterText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  activeFilterText: { color: '#fff' },
  list: { padding: 12, paddingBottom: 32 },
  partnerCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  partnerHeader: { flexDirection: 'row', alignItems: 'center' },
  partnerIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  partnerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  partnerName: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  partnerEmail: { fontSize: 12, color: '#64748B', marginTop: 2 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  infoItem: { fontSize: 11, color: '#64748B', backgroundColor: '#F8FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  rejectedBox: { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 8, marginTop: 8 },
  rejectedText: { fontSize: 12, color: '#EF4444' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  approveBtn: { flex: 1, backgroundColor: '#059669', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  approveBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  rejectBtn: { flex: 1, backgroundColor: '#FEE2E2', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  rejectBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  revokeBtn: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', alignItems: 'center' },
  revokeBtnText: { fontSize: 13, color: '#EF4444', fontWeight: '500' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#94A3B8' },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, paddingVertical: 16 },
  pageBtn: { padding: 10, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
});

export default AdminPartnersScreen;
