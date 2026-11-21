import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

const TESTS = [
  { key: 'health', label: 'ML Health', endpoint: 'GET /api/ml/health' },
  { key: 'trainSession', label: 'Train Session', endpoint: 'POST /api/ml/session/train' },
  { key: 'cluster', label: 'Run Clustering', endpoint: 'POST /api/clusters/run' },
  { key: 'trending', label: 'Trending Products', endpoint: 'GET /api/recommendations/trending' },
  { key: 'sessionRec', label: 'Session Recommend', endpoint: 'POST /api/ml/session/recommend' },
];

const AdminMLTestScreen = () => {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);
  const [allDone, setAllDone] = useState(false);

  const runSingleTest = async (testKey) => {
    setResults(prev => ({ ...prev, [testKey]: { status: 'running' } }));
    try {
      let res;
      const start = Date.now();

      switch (testKey) {
        case 'health': {
          const { data } = await api.get('/ml/health');
          res = { status: 'pass', details: data.data?.info?.service || 'OK', ms: Math.round(Date.now() - start) };
          break;
        }
        case 'trainSession': {
          const { data } = await api.post('/ml/session/train');
          res = { status: 'pass', details: `${data.data?.n_views || 0} views`, ms: Math.round(Date.now() - start) };
          break;
        }
        case 'cluster': {
          const { data } = await api.post('/clusters/run');
          res = { status: 'pass', details: `${(data.data?.clusters || []).length} clusters`, ms: Math.round(Date.now() - start) };
          break;
        }
        case 'trending': {
          const { data } = await api.get('/recommendations/trending');
          res = { status: 'pass', details: `${(data.data || []).length} sản phẩm`, ms: Math.round(Date.now() - start) };
          break;
        }
        case 'sessionRec': {
          const { data: prodData } = await api.get('/products?limit=2');
          const products = prodData?.data?.products || [];
          if (products.length < 2) { res = { status: 'fail', details: 'Not enough products', ms: 0 }; break; }
          const { data } = await api.post('/ml/session/recommend', { sessionItems: [products[0].id, products[1].id], topN: 5 });
          res = { status: 'pass', details: `${(data?.data || []).length} gợi ý`, ms: Math.round(Date.now() - start) };
          break;
        }
        default:
          res = { status: 'fail', details: 'Unknown', ms: 0 };
      }

      setResults(prev => ({ ...prev, [testKey]: res }));
      return res.status === 'pass';
    } catch (e) {
      setResults(prev => ({ ...prev, [testKey]: { status: 'fail', details: e.message, ms: 0 } }));
      return false;
    }
  };

  const runAll = async () => {
    setRunning(true);
    setAllDone(false);
    setResults({});
    for (const test of TESTS) {
      await runSingleTest(test.key);
    }
    setAllDone(true);
    setRunning(false);
    Toast.show({ type: 'success', text1: 'Hoàn tất kiểm tra ML!' });
  };

  const passed = Object.values(results).filter(r => r.status === 'pass').length;
  const failed = Object.values(results).filter(r => r.status === 'fail').length;
  const total = Object.keys(results).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Kiểm tra ML</Text>
          <TouchableOpacity style={[styles.runAllBtn, running && { opacity: 0.6 }]} onPress={runAll} disabled={running}>
            <Text style={styles.runAllBtnText}>{running ? '🔄 Đang chạy...' : '▶ Chạy tất cả'}</Text>
          </TouchableOpacity>
        </View>

        {total > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>
              Kết quả: {passed}/{total} thành công
              {allDone && (failed === 0 ? ' ✅ Tất cả OK!' : ` ⚠️ ${failed} lỗi`)}
            </Text>
            {total > 0 && (
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${(total / TESTS.length) * 100}%` }]} />
              </View>
            )}
          </View>
        )}

        <View style={styles.testList}>
          {TESTS.map((test) => {
            const result = results[test.key];
            const isRunning = result?.status === 'running';
            const isPass = result?.status === 'pass';
            return (
              <View key={test.key} style={[styles.testItem, isRunning && styles.testRunning, isPass && styles.testPass, result?.status === 'fail' && styles.testFail]}>
                <View style={styles.testInfo}>
                  <Text style={styles.testLabel}>{test.label}</Text>
                  <Text style={styles.testEndpoint}>{test.endpoint}</Text>
                  {result?.details && <Text style={styles.testDetails}>{result.details}</Text>}
                </View>
                <View style={styles.testStatus}>
                  {isRunning && <ActivityIndicator size="small" color="#3B82F6" />}
                  {isPass && <Text style={styles.passIcon}>✅</Text>}
                  {result?.status === 'fail' && <Text style={styles.failIcon}>❌</Text>}
                  {result?.ms > 0 && <Text style={styles.msText}>{result.ms}ms</Text>}
                </View>
              </View>
            );
          })}
        </View>

        {total === 0 && !running && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🧪</Text>
            <Text style={styles.emptyTitle}>Sẵn sàng kiểm tra!</Text>
            <Text style={styles.emptyText}>Nhấn "Chạy tất cả" để tự động kiểm tra {TESTS.length} ML endpoints.</Text>
          </View>
        )}

        <View style={styles.endpointList}>
          <Text style={styles.sectionTitle}>Danh sách {TESTS.length} ML Endpoints</Text>
          {TESTS.map((test) => (
            <View key={test.key} style={styles.endpointItem}>
              <Text style={styles.endpointName}>{test.label}</Text>
              <Text style={styles.endpointPath}>{test.endpoint}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1E293B', flex: 1 },
  runAllBtn: { backgroundColor: '#3B82F6', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  runAllBtnText: { color: '#fff', fontWeight: '600' },
  summaryCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  summaryTitle: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 8 },
  progressBar: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#3B82F6', borderRadius: 3 },
  testList: { marginBottom: 16, gap: 6 },
  testItem: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#F1F5F9' },
  testRunning: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  testPass: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  testFail: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  testInfo: { flex: 1 },
  testLabel: { fontSize: 14, fontWeight: '500', color: '#1E293B' },
  testEndpoint: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  testDetails: { fontSize: 11, color: '#64748B', marginTop: 4 },
  testStatus: { justifyContent: 'center', alignItems: 'flex-end', gap: 4 },
  passIcon: { fontSize: 18 },
  failIcon: { fontSize: 18 },
  msText: { fontSize: 10, color: '#94A3B8' },
  emptyCard: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 40, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  endpointList: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 10 },
  endpointItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, marginBottom: 4 },
  endpointName: { fontSize: 12, color: '#1E293B', fontWeight: '500' },
  endpointPath: { fontSize: 10, color: '#94A3B8' },
});

export default AdminMLTestScreen;
