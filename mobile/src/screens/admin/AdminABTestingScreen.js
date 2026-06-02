import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

const AdminABTestingScreen = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [compareResult, setCompareResult] = useState(null);
  const [logging, setLogging] = useState(false);
  const [logForm, setLogForm] = useState({ group: 'control', userId: '', productId: '', action: 'impression', revenue: '0' });
  const [sampleData, setSampleData] = useState({ customers: [], products: [] });

  const fetchReport = async () => {
    try {
      const { data } = await api.get('/ml/abtest/report');
      setReport(data.data || data);
    } catch { /* no data yet */ }
    finally { setLoading(false); }
  };

  const fetchSampleData = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        api.get('/users?role=CUSTOMER&limit=10'),
        api.get('/products?limit=10'),
      ]);
      setSampleData({
        customers: custRes.data?.data?.users || [],
        products: prodRes.data?.data?.products || [],
      });
    } catch {}
  };

  useEffect(() => { fetchReport(); fetchSampleData(); }, []);

  const handleCompare = async () => {
    setComparing(true);
    try {
      const { data } = await api.post('/ml/abtest/compare', { groupA: 'control', groupB: 'treatment' });
      setCompareResult(data.data || data);
      Toast.show({ type: 'success', text1: 'So sánh hoàn tất!' });
    } catch {
      Toast.show({ type: 'error', text1: 'So sánh thất bại' });
    } finally { setComparing(false); }
  };

  const handleLog = async () => {
    if (!logForm.userId || !logForm.productId) { Toast.show({ type: 'error', text1: 'Nhập userId và productId' }); return; }
    setLogging(true);
    try {
      await api.post('/ml/abtest/log', { ...logForm, revenue: parseFloat(logForm.revenue) || 0 });
      Toast.show({ type: 'success', text1: 'Đã ghi nhận' });
      fetchReport();
    } catch { Toast.show({ type: 'error', text1: 'Ghi thất bại' }); }
    finally { setLogging(false); }
  };

  const fillSample = (group, action, revenue = 0) => {
    const { customers, products } = sampleData;
    const randCust = customers[Math.floor(Math.random() * customers.length)];
    const randProd = products[Math.floor(Math.random() * products.length)];
    setLogForm({ group, userId: randCust?.id || '', productId: randProd?.id || '', action, revenue: String(revenue) });
  };

  const handleSampleBatch = async () => {
    const { customers, products } = sampleData;
    if (customers.length < 2 || products.length < 2) { Toast.show({ type: 'error', text1: 'Cần đủ dữ liệu mẫu' }); return; }
    const actions = ['impression', 'impression', 'click', 'add_to_cart', 'purchase'];
    const revenues = [0, 0, 0, 0, 500000];
    for (let i = 0; i < actions.length; i++) {
      await api.post('/ml/abtest/log', {
        group: i % 2 === 0 ? 'control' : 'treatment',
        userId: customers[i % customers.length].id,
        productId: products[i % products.length].id,
        action: actions[i],
        revenue: revenues[i],
      });
    }
    Toast.show({ type: 'success', text1: 'Đã ghi 5 tương tác mẫu!' });
    fetchReport();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Thử nghiệm A/B</Text>
        </View>

        {/* Report Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Báo cáo A/B</Text>
          {loading ? (
            <ActivityIndicator color="#3B82F6" />
          ) : report ? (
            <>
              <View style={styles.statGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Đối chứng</Text>
                  <Text style={styles.statValue}>{report.control?.total_events || 0}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Thử nghiệm</Text>
                  <Text style={styles.statValue}>{report.treatment?.total_events || 0}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Click ĐC</Text>
                  <Text style={styles.statValue}>{report.control?.clicks || 0}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Click TN</Text>
                  <Text style={styles.statValue}>{report.treatment?.clicks || 0}</Text>
                </View>
              </View>
              <View style={styles.detailGrid}>
                <View style={styles.detailCol}>
                  <Text style={styles.detailColTitle}>Nhóm Đối chứng</Text>
                  <View style={styles.detailRow}><Text>Mua:</Text><Text style={{ fontWeight: '600' }}>{report.control?.purchases || 0}</Text></View>
                  <View style={styles.detailRow}><Text>Doanh thu:</Text><Text style={{ fontWeight: '600' }}>{(report.control?.revenue || 0).toLocaleString('vi-VN')}₫</Text></View>
                  <View style={styles.detailRow}><Text>CTR:</Text><Text style={{ fontWeight: '600' }}>{report.control?.ctr ? (report.control.ctr * 100).toFixed(1) + '%' : '0%'}</Text></View>
                </View>
                <View style={styles.detailCol}>
                  <Text style={styles.detailColTitle}>Nhóm Thử nghiệm</Text>
                  <View style={styles.detailRow}><Text>Mua:</Text><Text style={{ fontWeight: '600' }}>{report.treatment?.purchases || 0}</Text></View>
                  <View style={styles.detailRow}><Text>Doanh thu:</Text><Text style={{ fontWeight: '600' }}>{(report.treatment?.revenue || 0).toLocaleString('vi-VN')}₫</Text></View>
                  <View style={styles.detailRow}><Text>CTR:</Text><Text style={{ fontWeight: '600' }}>{report.treatment?.ctr ? (report.treatment.ctr * 100).toFixed(1) + '%' : '0%'}</Text></View>
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.noData}>Chưa có dữ liệu. Nhấn "Ghi 5 mẫu" để bắt đầu!</Text>
          )}
        </View>

        {/* Log Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ghi nhận tương tác</Text>
          <Text style={styles.label}>Nhóm</Text>
          <View style={styles.radioRow}>
            {['control', 'treatment'].map((g) => (
              <TouchableOpacity key={g} style={[styles.radio, logForm.group === g && styles.radioActive]} onPress={() => setLogForm({ ...logForm, group: g })}>
                <Text style={[styles.radioText, logForm.group === g && styles.radioTextActive]}>{g === 'control' ? 'Đối chứng' : 'Thử nghiệm'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Mã người dùng</Text>
          <TextInput style={styles.input} value={logForm.userId} onChangeText={(t) => setLogForm({ ...logForm, userId: t })} />
          <Text style={styles.label}>Mã sản phẩm</Text>
          <TextInput style={styles.input} value={logForm.productId} onChangeText={(t) => setLogForm({ ...logForm, productId: t })} />
          <Text style={styles.label}>Hành động</Text>
          <View style={styles.radioRow}>
            {['impression', 'click', 'add_to_cart', 'purchase'].map((a) => (
              <TouchableOpacity key={a} style={[styles.radioSm, logForm.action === a && styles.radioActive]} onPress={() => setLogForm({ ...logForm, action: a })}>
                <Text style={[styles.radioTextSm, logForm.action === a && styles.radioTextActive]}>{a === 'add_to_cart' ? 'Thêm giỏ' : a === 'impression' ? 'Xem' : a === 'purchase' ? 'Mua' : 'Click'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Doanh thu (₫)</Text>
          <TextInput style={styles.input} value={logForm.revenue} onChangeText={(t) => setLogForm({ ...logForm, revenue: t })} keyboardType="numeric" />
          <TouchableOpacity style={styles.logBtn} onPress={handleLog} disabled={logging}>
            <Text style={styles.logBtnText}>{logging ? 'Đang ghi...' : 'Ghi nhận'}</Text>
          </TouchableOpacity>

          {sampleData.customers.length > 0 && (
            <View style={styles.sampleSection}>
              <Text style={styles.sampleTitle}>Log mẫu nhanh</Text>
              <View style={styles.sampleGrid}>
                <TouchableOpacity style={styles.sampleBtn} onPress={() => fillSample('control', 'impression')}>
                  <Text style={styles.sampleBtnText}>👁 ĐC Xem</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.sampleBtn, { backgroundColor: '#EDE9FE' }]} onPress={() => fillSample('treatment', 'click')}>
                  <Text style={styles.sampleBtnText}>🖱 TN Click</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.sampleBtn, { backgroundColor: '#FEF3C7' }]} onPress={() => fillSample('control', 'add_to_cart')}>
                  <Text style={styles.sampleBtnText}>🛒 ĐC Giỏ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.sampleBtn, { backgroundColor: '#D1FAE5' }]} onPress={() => fillSample('treatment', 'purchase', 500000)}>
                  <Text style={styles.sampleBtnText}>💰 TN Mua</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.batchBtn} onPress={handleSampleBatch}>
                <Text style={styles.batchBtnText}>⚡ Ghi 5 tương tác mẫu</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Compare */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>So sánh nhóm</Text>
          <TouchableOpacity style={styles.compareBtn} onPress={handleCompare} disabled={comparing}>
            <Text style={styles.compareBtnText}>{comparing ? 'Đang so sánh...' : 'So sánh Đối chứng vs Thử nghiệm'}</Text>
          </TouchableOpacity>
          {compareResult && (
            <View style={styles.compareResult}>
              {Object.entries(compareResult).map(([key, val]) => (
                <View key={key} style={styles.compareRow}>
                  <Text style={{ color: '#64748B' }}>{key.replace(/_/g, ' ')}</Text>
                  <Text style={{ fontWeight: '600', color: '#1E293B' }}>{typeof val === 'number' ? (val * 100).toFixed(1) + '%' : String(val)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statCard: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, width: '47%' },
  statLabel: { fontSize: 11, color: '#64748B' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginTop: 4 },
  detailGrid: { flexDirection: 'row', gap: 12 },
  detailCol: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12 },
  detailColTitle: { fontSize: 11, fontWeight: '600', color: '#64748B', marginBottom: 8, textTransform: 'uppercase' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  noData: { textAlign: 'center', color: '#94A3B8', paddingVertical: 24 },
  label: { fontSize: 12, fontWeight: '500', color: '#475569', marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 10, fontSize: 13, color: '#1E293B', marginBottom: 4 },
  radioRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  radio: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center' },
  radioActive: { backgroundColor: '#3B82F6' },
  radioText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  radioTextActive: { color: '#fff' },
  radioSm: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#F1F5F9' },
  radioTextSm: { fontSize: 11, color: '#64748B' },
  logBtn: { backgroundColor: '#3B82F6', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  logBtnText: { color: '#fff', fontWeight: '600' },
  sampleSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  sampleTitle: { fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', marginBottom: 8 },
  sampleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sampleBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#DBEAFE' },
  sampleBtnText: { fontSize: 10, color: '#2563EB', fontWeight: '500' },
  batchBtn: { backgroundColor: '#7C3AED', paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  batchBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  compareBtn: { backgroundColor: '#3B82F6', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  compareBtnText: { color: '#fff', fontWeight: '500', fontSize: 13 },
  compareResult: { marginTop: 12, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12 },
  compareRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
});

export default AdminABTestingScreen;
