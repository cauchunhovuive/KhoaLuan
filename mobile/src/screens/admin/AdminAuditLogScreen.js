import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

const ACTION_COLORS = {
  CREATE: { bg: '#D1FAE5', color: '#059669' },
  UPDATE: { bg: '#DBEAFE', color: '#2563EB' },
  DELETE: { bg: '#FEE2E2', color: '#EF4444' },
  APPROVE: { bg: '#D1FAE5', color: '#059669' },
  BAN: { bg: '#FEE2E2', color: '#DC2626' },
};

const AdminAuditLogScreen = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      const params = { page, limit: 10 };
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entity = entityFilter;
      const { data } = await api.get('/audit', { params });
      setLogs(data.data.logs);
      setTotalPages(data.data.pagination.totalPages);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Không thể tải audit log' });
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, entityFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const renderLog = ({ item: log }) => {
    const ac = ACTION_COLORS[log.action] || { bg: '#F3F4F6', color: '#6B7280' };
    return (
      <View style={styles.logRow}>
        <View style={styles.logLeft}>
          <View style={[styles.actionBadge, { backgroundColor: ac.bg }]}>
            <Text style={[styles.actionBadgeText, { color: ac.color }]}>{log.action}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.logUser}>{log.user?.name} <Text style={styles.logRole}>({log.user?.role})</Text></Text>
            <Text style={styles.logEntity}>{log.entity}{log.entityId ? ` • ${log.entityId.slice(0, 12)}` : ''}</Text>
            {log.details && <Text style={styles.logDetails} numberOfLines={1}>{log.details}</Text>}
          </View>
        </View>
        <Text style={styles.logTime}>{new Date(log.createdAt).toLocaleString('vi-VN')}</Text>
      </View>
    );
  };

  const actions = ['', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'BAN'];
  const entities = ['', 'USER', 'PRODUCT', 'ORDER', 'COUPON', 'BANNER', 'FLASH_SALE', 'REFUND', 'VIOLATION'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Audit Log</Text>
      </View>

      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Hành động</Text>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={actions}
          keyExtractor={(item) => item}
          contentContainerStyle={{ gap: 6 }}
          renderItem={({ item: a }) => (
            <TouchableOpacity style={[styles.filterChip, actionFilter === a && styles.activeFilter]} onPress={() => { setActionFilter(a); setPage(1); }}>
              <Text style={[styles.filterChipText, actionFilter === a && styles.activeFilterText]}>{a || 'Tất cả'}</Text>
            </TouchableOpacity>
          )}
        />
        <Text style={[styles.filterLabel, { marginTop: 8 }]}>Đối tượng</Text>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={entities}
          keyExtractor={(item) => item}
          contentContainerStyle={{ gap: 6 }}
          renderItem={({ item: e }) => (
            <TouchableOpacity style={[styles.filterChip, entityFilter === e && styles.activeFilter]} onPress={() => { setEntityFilter(e); setPage(1); }}>
              <Text style={[styles.filterChipText, entityFilter === e && styles.activeFilterText]}>{e || 'Tất cả'}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={logs}
          renderItem={renderLog}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyIcon}>📜</Text><Text style={styles.emptyText}>Chưa có log</Text></View>}
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
  filterSection: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 6 },
  filterChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#F1F5F9' },
  activeFilter: { backgroundColor: '#3B82F6' },
  filterChipText: { fontSize: 10, color: '#64748B' },
  activeFilterText: { color: '#fff' },
  list: { padding: 12, paddingBottom: 32 },
  logRow: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: '#F1F5F9' },
  logLeft: { flexDirection: 'row' },
  actionBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6, alignSelf: 'flex-start' },
  actionBadgeText: { fontSize: 10, fontWeight: '600', fontFamily: 'monospace' },
  logUser: { fontSize: 13, fontWeight: '500', color: '#1E293B' },
  logRole: { fontSize: 11, color: '#94A3B8', fontWeight: '400' },
  logEntity: { fontSize: 11, color: '#64748B', marginTop: 2 },
  logDetails: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  logTime: { fontSize: 10, color: '#94A3B8', marginTop: 6 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#94A3B8' },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, paddingVertical: 16 },
  pageBtn: { padding: 10, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
});

export default AdminAuditLogScreen;
