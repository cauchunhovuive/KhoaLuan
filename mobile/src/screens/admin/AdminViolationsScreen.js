import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

const STATUS_MAP = {
  PENDING: { label: 'Chờ xử lý', color: '#D97706', bg: '#FEF3C7' },
  INVESTIGATING: { label: 'Đang điều tra', color: '#2563EB', bg: '#DBEAFE' },
  RESOLVED: { label: 'Đã xử lý', color: '#059669', bg: '#D1FAE5' },
  DISMISSED: { label: 'Bác bỏ', color: '#6B7280', bg: '#F3F4F6' },
};

const AdminViolationsScreen = () => {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchViolations = useCallback(async () => {
    try {
      const params = { page, limit: 10 };
      if (filter) params.status = filter;
      const { data } = await api.get('/violations', { params });
      setViolations(data.data.violations);
      setTotalPages(data.data.pagination.totalPages);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Không thể tải vi phạm' });
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { fetchViolations(); }, [fetchViolations]);

  const handleResolve = (id, status, penalty = null) => {
    const action = status === 'RESOLVED' ? (penalty === 'BAN' ? 'Khóa' : penalty === 'SUSPEND' ? 'Tạm khóa' : 'Xử lý') : status === 'INVESTIGATING' ? 'Điều tra' : 'Bác bỏ';
    Alert.alert(action, `Xác nhận?`, [
      { text: 'Huỷ', style: 'cancel' },
      { text: action, onPress: async () => {
        try { await api.put(`/violations/${id}`, { status, penalty }); Toast.show({ type: 'success', text1: 'Đã cập nhật' }); fetchViolations(); }
        catch (err) { Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi' }); }
      }},
    ]);
  };

  const renderViolation = ({ item: v }) => {
    const statusInfo = STATUS_MAP[v.status] || { label: v.status, color: '#6B7280', bg: '#F3F4F6' };
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.icon, { backgroundColor: statusInfo.bg }]}>
            <Text style={{ fontSize: 18 }}>⚠️</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={styles.headerRow}>
              <Text style={styles.targetType}>{v.targetType === 'SHOP' ? 'Cửa hàng' : 'Sản phẩm'}</Text>
              <View style={[styles.badge, { backgroundColor: statusInfo.bg }]}>
                <Text style={[styles.badgeText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
              </View>
            </View>
            <Text style={styles.reason}>{v.reason}</Text>
            {v.description && <Text style={styles.desc}>{v.description}</Text>}
            <Text style={styles.meta}>Mã: {v.targetId?.slice(0, 12)} | {new Date(v.createdAt).toLocaleDateString('vi-VN')}</Text>
          </View>
        </View>

        {v.status === 'PENDING' && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.investigateBtn} onPress={() => handleResolve(v.id, 'INVESTIGATING')}>
              <Text style={styles.investigateBtnText}>🔍 Điều tra</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.warnBtn} onPress={() => handleResolve(v.id, 'RESOLVED', 'WARNING')}>
              <Text style={styles.warnBtnText}>⚠️ Cảnh cáo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.suspendBtn} onPress={() => handleResolve(v.id, 'RESOLVED', 'SUSPEND')}>
              <Text style={styles.suspendBtnText}>⏸️ Tạm khóa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.banBtn} onPress={() => handleResolve(v.id, 'RESOLVED', 'BAN')}>
              <Text style={styles.banBtnText}>🔒 Khóa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dismissBtn} onPress={() => handleResolve(v.id, 'DISMISSED')}>
              <Text style={styles.dismissBtnText}>✕ Bác bỏ</Text>
            </TouchableOpacity>
          </View>
        )}
        {v.status === 'INVESTIGATING' && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.resolveBtn} onPress={() => handleResolve(v.id, 'RESOLVED')}>
              <Text style={styles.resolveBtnText}>✓ Giải quyết</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dismissBtn} onPress={() => handleResolve(v.id, 'DISMISSED')}>
              <Text style={styles.dismissBtnText}>✕ Bác bỏ</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Vi phạm & Báo cáo</Text>
      </View>

      <View style={styles.filterRow}>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={['', 'PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED']}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
          renderItem={({ item: s }) => (
            <TouchableOpacity style={[styles.filterTab, filter === s && styles.activeFilter]} onPress={() => { setFilter(s); setPage(1); }}>
              <Text style={[styles.filterText, filter === s && styles.activeFilterText]}>{STATUS_MAP[s]?.label || 'Tất cả'}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={violations}
          renderItem={renderViolation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyIcon}>🛡️</Text><Text style={styles.emptyText}>Không có vi phạm</Text></View>}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity onPress={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={[styles.pageBtn, page === 1 && { opacity: 0.4 }]}><Text>◀</Text></TouchableOpacity>
                <Text>{page}/{totalPages}</Text>
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
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
  filterRow: { paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  filterTab: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#F1F5F9' },
  activeFilter: { backgroundColor: '#3B82F6' },
  filterText: { fontSize: 12, color: '#64748B' },
  activeFilterText: { color: '#fff' },
  list: { padding: 12, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row' },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  targetType: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  reason: { fontSize: 13, color: '#475569', marginTop: 4 },
  desc: { fontSize: 12, color: '#64748B', marginTop: 4 },
  meta: { fontSize: 11, color: '#94A3B8', marginTop: 6 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  investigateBtn: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#DBEAFE', borderRadius: 8 },
  investigateBtnText: { fontSize: 11, color: '#2563EB', fontWeight: '500' },
  warnBtn: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#FEF3C7', borderRadius: 8 },
  warnBtnText: { fontSize: 11, color: '#D97706', fontWeight: '500' },
  suspendBtn: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#FFEDD5', borderRadius: 8 },
  suspendBtnText: { fontSize: 11, color: '#EA580C', fontWeight: '500' },
  banBtn: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#FEE2E2', borderRadius: 8 },
  banBtnText: { fontSize: 11, color: '#EF4444', fontWeight: '500' },
  dismissBtn: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#F3F4F6', borderRadius: 8 },
  dismissBtnText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  resolveBtn: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#D1FAE5', borderRadius: 8 },
  resolveBtnText: { fontSize: 11, color: '#059669', fontWeight: '500' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#94A3B8' },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, paddingVertical: 16 },
  pageBtn: { padding: 10, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
});

export default AdminViolationsScreen;
