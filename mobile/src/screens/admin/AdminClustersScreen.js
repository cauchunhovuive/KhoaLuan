import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

const CLUSTER_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const PROFILES = [
  { name: 'Khách hàng VIP', desc: 'Chi tiêu cao, mua thường xuyên. Cần ưu đãi đặc biệt và chăm sóc riêng.', color: '#10B981', rfm: 'R: 4-5 ★ | F: 4-5 ★ | M: 4-5 ★', strategy: 'Chương trình VIP, ưu đãi độc quyền' },
  { name: 'Khách hàng Tiềm năng', desc: 'Có tiềm năng phát triển, cần khuyến khích mua nhiều hơn.', color: '#3B82F6', rfm: 'R: 3-4 ★ | F: 2-3 ★ | M: 2-3 ★', strategy: 'Email marketing, voucher giảm giá' },
  { name: 'Khách hàng Mới', desc: 'Cần trải nghiệm tốt để giữ chân.', color: '#F59E0B', rfm: 'R: 5 ★ | F: 1 ★ | M: 1-2 ★', strategy: 'Email chào mừng, ưu đãi lần đầu' },
  { name: 'Khách hàng Rời rạc', desc: 'Ít tương tác, cần tái kích hoạt.', color: '#EF4444', rfm: 'R: 1-2 ★ | F: 1 ★ | M: 1 ★', strategy: 'Campaign tái kích hoạt, voucher hấp dẫn' },
];

const AdminClustersScreen = () => {
  const [clusters, setClusters] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [mlConnected, setMlConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchClusters = useCallback(async () => {
    try {
      const { data } = await api.get('/clusters/stats');
      setClusters(data.data.clusters || []);
      setTotalUsers(data.data.totalUsers || 0);
      setMlConnected(data.data.mlConnected || false);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Không thể tải dữ liệu phân cụm' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClusters(); }, [fetchClusters]);

  const handleRun = async () => {
    setRunning(true);
    try {
      await api.post('/clusters/run');
      Toast.show({ type: 'success', text1: 'Đã chạy phân cụm thành công' });
      fetchClusters();
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Chạy phân cụm thất bại' });
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Phân cụm khách hàng</Text>
          <View style={styles.headerRight}>
            <View style={[styles.mlBadge, { backgroundColor: mlConnected ? '#D1FAE5' : '#F3F4F6' }]}>
              <Text style={[styles.mlBadgeText, { color: mlConnected ? '#059669' : '#6B7280' }]}>
                ML {mlConnected ? '✅' : '❌'}
              </Text>
            </View>
            <TouchableOpacity style={[styles.runBtn, running && { opacity: 0.6 }]} onPress={handleRun} disabled={running}>
              <Text style={styles.runBtnText}>{running ? '🔄 Đang chạy...' : '▶ Chạy phân cụm'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cluster Cards */}
        <View style={styles.clusterGrid}>
          {clusters.map((c, idx) => (
            <View key={c.id} style={styles.clusterCard}>
              <View style={[styles.clusterDot, { backgroundColor: c.color || CLUSTER_COLORS[idx % CLUSTER_COLORS.length] }]} />
              <Text style={styles.clusterName}>{c.name}</Text>
              <View style={styles.clusterStat}>
                <Text style={styles.clusterStatLabel}>Người dùng</Text>
                <Text style={styles.clusterStatValue}>{c.userCount}</Text>
              </View>
              <View style={styles.clusterStat}>
                <Text style={styles.clusterStatLabel}>Phần trăm</Text>
                <Text style={[styles.clusterStatValue, { color: '#3B82F6' }]}>{c.percentage}%</Text>
              </View>
              {c.description && <Text style={styles.clusterDesc}>{c.description}</Text>}
            </View>
          ))}
        </View>

        {/* Profiles */}
        <View style={styles.profilesSection}>
          <Text style={styles.sectionTitle}>Hồ sơ nhóm khách hàng — RFM Analysis</Text>
          {PROFILES.map((p, idx) => (
            <View key={idx} style={styles.profileCard}>
              <View style={[styles.profileDot, { backgroundColor: p.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{p.name}</Text>
                <Text style={styles.profileDesc}>{p.desc}</Text>
                <View style={styles.tagRow}>
                  <View style={styles.tag}><Text style={styles.tagText}>{p.rfm}</Text></View>
                  <View style={[styles.tag, { backgroundColor: '#EFF6FF' }]}><Text style={[styles.tagText, { color: '#2563EB' }]}>{p.strategy}</Text></View>
                </View>
              </View>
            </View>
          ))}
        </View>

        {totalUsers > 0 && (
          <View style={styles.totalCard}>
            <Text style={styles.totalText}>Tổng số khách hàng đã phân cụm</Text>
            <Text style={styles.totalValue}>{totalUsers.toLocaleString('vi-VN')} người dùng</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1E293B', flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mlBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  mlBadgeText: { fontSize: 11, fontWeight: '600' },
  runBtn: { backgroundColor: '#3B82F6', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  runBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  clusterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  clusterCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', width: '47%' },
  clusterDot: { width: 16, height: 16, borderRadius: 8, marginBottom: 10 },
  clusterName: { fontSize: 15, fontWeight: '600', color: '#1E293B', marginBottom: 12 },
  clusterStat: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  clusterStatLabel: { fontSize: 12, color: '#64748B' },
  clusterStatValue: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  clusterDesc: { fontSize: 11, color: '#94A3B8', marginTop: 8 },
  profilesSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
  profileCard: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 8, gap: 10 },
  profileDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  profileName: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  profileDesc: { fontSize: 12, color: '#64748B', marginTop: 2 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { backgroundColor: '#EDE9FE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 9, color: '#7C3AED', fontWeight: '500' },
  totalCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  totalText: { fontSize: 13, color: '#64748B' },
  totalValue: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginTop: 4 },
});

export default AdminClustersScreen;
