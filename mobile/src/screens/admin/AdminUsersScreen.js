import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert,
  RefreshControl, ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

const ROLE_LABELS = { ADMIN: 'Quản trị viên', PARTNER: 'Đối tác', CUSTOMER: 'Khách hàng' };
const ROLE_COLORS = {
  ADMIN: '#7C3AED', PARTNER: '#059669', CUSTOMER: '#6B7280',
};

const AdminUsersScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = useCallback(async () => {
    try {
      const params = { page, limit: 10, search };
      let res;
      if (activeTab === 'customers') {
        res = await api.get('/users', { params: { ...params, role: 'CUSTOMER' } });
        setUsers(res.data.data.users);
      } else if (activeTab === 'partners') {
        res = await api.get('/partner/admin/all', { params });
        setUsers(res.data.data.partners);
      } else {
        res = await api.get('/users', { params: { ...params, limit: 100 } });
        setUsers(res.data.data.users);
      }
      const pag = res.data.data.pagination;
      if (pag) setTotalPages(pag.totalPages);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Không thể tải dữ liệu' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, search, activeTab]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSearch = () => { setPage(1); };

  const handleChangeRole = (userId, userName, newRole) => {
    Alert.alert(
      'Đổi vai trò',
      `Đổi vai trò của ${userName} thành ${ROLE_LABELS[newRole]}?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              await api.put(`/users/${userId}`, { role: newRole });
              Toast.show({ type: 'success', text1: `Đã đổi thành ${ROLE_LABELS[newRole]}` });
              fetchUsers();
            } catch (err) {
              Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi' });
            }
          },
        },
      ]
    );
  };

  const [rejectModal, setRejectModal] = useState({ visible: false, id: null });
  const [rejectReason, setRejectReason] = useState('');

  const handleApprovePartner = async (id, approved) => {
    if (!approved) {
      setRejectModal({ visible: true, id });
      setRejectReason('');
      return;
    }
    try {
      await api.put(`/partner/admin/${id}/approve`, { approved });
      Toast.show({ type: 'success', text1: 'Đã duyệt đối tác' });
      fetchUsers();
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi' });
    }
  };

  const tabs = [
    { key: 'all', label: 'Tất cả' },
    { key: 'customers', label: 'Khách hàng' },
    { key: 'partners', label: 'Đối tác' },
  ];

  const renderUser = ({ item }) => {
    const isPartner = activeTab === 'partners' || item.role === 'PARTNER';
    return (
      <View style={styles.userCard}>
        <View style={styles.userHeader}>
          <View style={[styles.avatar, { backgroundColor: item.role === 'ADMIN' ? '#EDE9FE' : '#DBEAFE' }]}>
            <Text style={[styles.avatarText, { color: item.role === 'ADMIN' ? '#7C3AED' : '#2563EB' }]}>
              {(item.name || item.storeName || '?')[0]}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{item.name || item.storeName}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
          </View>
          {item.isApproved !== undefined && (
            <View style={[styles.badge, { backgroundColor: item.isApproved ? '#D1FAE5' : '#FEF3C7' }]}>
              <Text style={[styles.badgeText, { color: item.isApproved ? '#059669' : '#D97706' }]}>
                {item.isApproved ? 'Đã duyệt' : 'Chờ duyệt'}
              </Text>
            </View>
          )}
        </View>

        {isPartner ? (
          <View style={styles.partnerDetails}>
            <Text style={styles.detailText}>🏪 {item.storeDescription || 'Không có mô tả'}</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>📞 {item.phone || '—'}</Text>
              <Text style={styles.detailLabel}>📦 {item._count?.products || 0} SP</Text>
            </View>
            {item.rejectedReason && (
              <Text style={styles.rejectedText}>Lý do: {item.rejectedReason}</Text>
            )}
            {!item.isApproved && activeTab === 'partners' && (
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprovePartner(item.id, true)}>
                  <Text style={styles.approveBtnText}>✓ Duyệt</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => handleApprovePartner(item.id, false)}>
                  <Text style={styles.rejectBtnText}>✕ Từ chối</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.roleRow}>
            <Text style={styles.detailLabel}>Vai trò:</Text>
            <TouchableOpacity
              style={[styles.roleBadge, { backgroundColor: `${ROLE_COLORS[item.role] || '#6B7280'}15` }]}
              onPress={() => {
                const roles = ['CUSTOMER', 'PARTNER', 'ADMIN'];
                const currentIdx = roles.indexOf(item.role);
                const nextRole = roles[(currentIdx + 1) % roles.length];
                handleChangeRole(item.id, item.name, nextRole);
              }}
            >
              <Text style={[styles.roleText, { color: ROLE_COLORS[item.role] || '#6B7280' }]}>
                {ROLE_LABELS[item.role] || item.role} (chạm để đổi)
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {item.totalSpent !== undefined && (
          <View style={styles.statsRow}>
            <Text style={styles.statText}>Đã mua: {item.orderCount || 0} đơn</Text>
            <Text style={styles.statValue}>{(item.totalSpent || 0).toLocaleString('vi-VN')}₫</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Quản lý người dùng</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => { setActiveTab(tab.key); setPage(1); }}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm tên, email..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUsers(); }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>Không tìm thấy người dùng</Text>
            </View>
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                  onPress={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <Text style={styles.pageBtnText}>◀</Text>
                </TouchableOpacity>
                <Text style={styles.pageInfo}>{page} / {totalPages}</Text>
                <TouchableOpacity
                  style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
                  onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <Text style={styles.pageBtnText}>▶</Text>
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
  tabRow: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#F1F5F9' },
  activeTab: { backgroundColor: '#3B82F6' },
  tabText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  activeTabText: { color: '#fff' },
  searchContainer: { padding: 12, backgroundColor: '#fff' },
  searchInput: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 12, fontSize: 14, color: '#1E293B' },
  list: { padding: 12, paddingBottom: 32 },
  userCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  userHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: 'bold' },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  userEmail: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  partnerDetails: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  detailRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  detailLabel: { fontSize: 12, color: '#64748B' },
  detailText: { fontSize: 13, color: '#475569' },
  rejectedText: { fontSize: 12, color: '#EF4444', marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  approveBtn: { flex: 1, backgroundColor: '#059669', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  approveBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  rejectBtn: { flex: 1, backgroundColor: '#FEE2E2', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  rejectBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  roleText: { fontSize: 12, fontWeight: '500' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  statText: { fontSize: 12, color: '#94A3B8' },
  statValue: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#94A3B8' },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, paddingVertical: 16 },
  pageBtn: { padding: 10, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontSize: 14, color: '#475569' },
  pageInfo: { fontSize: 14, fontWeight: '500', color: '#475569' },
});

export default AdminUsersScreen;
