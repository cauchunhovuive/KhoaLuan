import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert,
  RefreshControl, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

const STATUS_MAP = {
  PENDING: { label: 'Chờ xử lý', color: '#D97706', bg: '#FEF3C7' },
  APPROVED: { label: 'Đã duyệt', color: '#2563EB', bg: '#DBEAFE' },
  REJECTED: { label: 'Từ chối', color: '#EF4444', bg: '#FEE2E2' },
  REFUNDED: { label: 'Đã hoàn tiền', color: '#059669', bg: '#D1FAE5' },
};

const AdminRefundsScreen = () => {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState(null);

  const fetchRefunds = useCallback(async () => {
    try {
      const params = { page, limit: 10 };
      if (filter) params.status = filter;
      const { data } = await api.get('/refunds', { params });
      setRefunds(data.data.refunds);
      setTotalPages(data.data.pagination.totalPages);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Không thể tải yêu cầu hoàn tiền' });
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { fetchRefunds(); }, [fetchRefunds]);

  const handleResolve = (id, status) => {
    const action = status === 'REFUNDED' ? 'Hoàn tiền' : status === 'APPROVED' ? 'Duyệt' : 'Từ chối';
    Alert.alert(action, `Xác nhận ${action.toLowerCase()} yêu cầu này?`, [
      { text: 'Huỷ', style: 'cancel' },
      { text: action, onPress: async () => {
        try {
          await api.put(`/refunds/${id}`, { status, adminReply: status === 'REJECTED' ? 'Từ chối bởi admin' : undefined });
          Toast.show({ type: 'success', text1: `${action} thành công` });
          setSelected(null);
          fetchRefunds();
        } catch (err) { Toast.show({ type: 'error', text1: err.response?.data?.message || 'Lỗi' }); }
      }},
    ]);
  };

  const renderRefund = ({ item: r }) => {
    const statusInfo = STATUS_MAP[r.status] || { label: r.status, color: '#6B7280', bg: '#F3F4F6' };
    return (
      <TouchableOpacity style={styles.refundCard} onPress={() => setSelected(r)}>
        <View style={styles.refundHeader}>
          <View style={[styles.statusIcon, { backgroundColor: statusInfo.bg }]}>
            <Text style={{ fontSize: 18 }}>🔄</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.userName}>{r.user?.name}</Text>
            <View style={styles.refundMeta}>
              <View style={[styles.badge, { backgroundColor: statusInfo.bg }]}>
                <Text style={[styles.badgeText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
              </View>
              <Text style={styles.metaText}>#{r.order?.id?.slice(0, 8)}</Text>
            </View>
          </View>
          <Text style={styles.amount}>{(r.amount || r.order?.finalAmount || 0).toLocaleString('vi-VN')}₫</Text>
        </View>
        <Text style={styles.reason}>{r.reason}</Text>
        {r.description && <Text style={styles.description}>{r.description}</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Quản lý hoàn tiền</Text>
      </View>

      <View style={styles.filterRow}>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={['', 'PENDING', 'APPROVED', 'REJECTED', 'REFUNDED']}
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
          data={refunds}
          renderItem={renderRefund}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyIcon}>🔄</Text><Text style={styles.emptyText}>Không có yêu cầu hoàn tiền</Text></View>}
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

      <Modal visible={!!selected} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết yêu cầu</Text>
              <TouchableOpacity onPress={() => setSelected(null)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            {selected && (
              <>
                <View style={styles.detailGrid}>
                  <Text style={styles.detailItem}>Khách hàng: <Text style={{ fontWeight: '600' }}>{selected.user?.name}</Text></Text>
                  <Text style={styles.detailItem}>Số tiền: <Text style={{ fontWeight: '600' }}>{(selected.amount || selected.order?.finalAmount || 0).toLocaleString('vi-VN')}₫</Text></Text>
                  <Text style={styles.detailItem}>Lý do: <Text style={{ fontWeight: '600' }}>{selected.reason}</Text></Text>
                  <Text style={styles.detailItem}>Ngày: <Text style={{ fontWeight: '600' }}>{new Date(selected.createdAt).toLocaleDateString('vi-VN')}</Text></Text>
                </View>
                {selected.description && (
                  <View style={styles.descBox}>
                    <Text style={styles.descLabel}>Mô tả:</Text>
                    <Text style={styles.descText}>{selected.description}</Text>
                  </View>
                )}
                {selected.adminReply && (
                  <View style={styles.adminReplyBox}>
                    <Text style={styles.descLabel}>Phản hồi admin:</Text>
                    <Text style={styles.descText}>{selected.adminReply}</Text>
                  </View>
                )}
                {(selected.status === 'PENDING' || selected.status === 'APPROVED') && (
                  <View style={styles.resolveRow}>
                    <TouchableOpacity style={styles.refundBtn} onPress={() => handleResolve(selected.id, 'REFUNDED')}>
                      <Text style={styles.refundBtnText}>✓ Hoàn tiền</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectRefundBtn} onPress={() => handleResolve(selected.id, 'REJECTED')}>
                      <Text style={styles.rejectRefundBtnText}>✕ Từ chối</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
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
  refundCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  refundHeader: { flexDirection: 'row', alignItems: 'center' },
  statusIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  refundMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  metaText: { fontSize: 11, color: '#94A3B8' },
  amount: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  reason: { fontSize: 13, color: '#475569', marginTop: 8 },
  description: { fontSize: 12, color: '#64748B', marginTop: 4, backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#94A3B8' },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, paddingVertical: 16 },
  pageBtn: { padding: 10, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  modalClose: { fontSize: 20, color: '#94A3B8', padding: 4 },
  detailGrid: { gap: 8 },
  detailItem: { fontSize: 13, color: '#475569' },
  descBox: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, marginTop: 12 },
  descLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4 },
  descText: { fontSize: 13, color: '#1E293B' },
  adminReplyBox: { backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginTop: 8 },
  resolveRow: { flexDirection: 'row', gap: 12, marginTop: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 },
  refundBtn: { flex: 1, backgroundColor: '#059669', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  refundBtnText: { color: '#fff', fontWeight: '600' },
  rejectRefundBtn: { flex: 1, backgroundColor: '#FEE2E2', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  rejectRefundBtnText: { color: '#EF4444', fontWeight: '600' },
});

export default AdminRefundsScreen;
