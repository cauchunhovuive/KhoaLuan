import React, { useState, useRef } from 'react';
import { FiPlay, FiCheckCircle, FiXCircle, FiClock, FiCpu, FiActivity, FiBarChart2, FiZap, FiRefreshCw, FiServer, FiTrendingUp, FiShoppingBag, FiUsers, FiSend, FiLayers } from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';

const TESTS = [
  { key: 'health', label: 'ML Health', icon: FiCpu, endpoint: 'GET /api/ml/health' },
  { key: 'trainSession', label: 'Train Session', icon: FiClock, endpoint: 'POST /api/ml/session/train' },
  { key: 'trainCF', label: 'Train CF Model', icon: FiZap, endpoint: 'POST /api/ml/cf/train' },
  { key: 'graphcfTrain', label: 'Train Graph CF', icon: FiLayers, endpoint: 'POST /api/ml/graphcf/train' },
  { key: 'lightgcnTrain', label: 'Train LightGCN-CF', icon: FiCpu, endpoint: 'POST /api/ml/lightgcncf/train' },
  { key: 'evaluate', label: 'Evaluate Models', icon: FiBarChart2, endpoint: 'POST /api/ml/evaluate' },
  { key: 'cluster', label: 'Run Clustering', icon: FiLayers, endpoint: 'POST /api/clusters/run' },
  { key: 'trending', label: 'Trending Products', icon: FiTrendingUp, endpoint: 'GET /api/recommendations/trending' },
  { key: 'sessionRec', label: 'Session Recommend', icon: FiActivity, endpoint: 'POST /api/ml/session/recommend' },
  { key: 'sessionRic', label: 'Session Recommend (RIC)', icon: FiBarChart2, endpoint: 'POST /api/ml/session/recommend (strategy=ric)' },
  { key: 'graphcfRec', label: 'Graph CF Recommend', icon: FiActivity, endpoint: 'POST /api/ml/graphcf/recommend' },
  { key: 'lightgcnRec', label: 'LightGCN-CF Recommend', icon: FiCpu, endpoint: 'POST /api/ml/lightgcncf/recommend' },
  { key: 'explain', label: 'Explain Recs', icon: FiSend, endpoint: 'POST /api/ml/explain' },
  { key: 'abtestLog', label: 'A/B Test Log', icon: FiShoppingBag, endpoint: 'POST /api/ml/abtest/log' },
  { key: 'abtestCompare', label: 'A/B Test Compare', icon: FiBarChart2, endpoint: 'POST /api/ml/abtest/compare' },
  { key: 'abtestReport', label: 'A/B Test Report', icon: FiServer, endpoint: 'GET /api/ml/abtest/report' },
];

const getSampleCustomer = async () => {
  // Ưu tiên khách hàng CÓ đơn hàng (kết quả gợi ý luôn có ý nghĩa)
  try {
    const { data } = await api.get('/users/with-orders');
    const customers = data?.data || [];
    if (customers.length > 0) return customers[0].id;
  } catch (e) { /* fallback bên dưới */ }
  try {
    const { data: custData } = await api.get('/users?role=CUSTOMER&limit=1');
    const customers = custData?.data?.users || custData?.users || [];
    return customers[0]?.id || null;
  } catch (e) {
    return null;
  }
};

const MLTestPage = () => {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const resultsRef = useRef(null);

  const runSingleTest = async (testKey) => {
    setResults(prev => ({ ...prev, [testKey]: { status: 'running', name: TESTS.find(t => t.key === testKey)?.label } }));
    
    try {
      let res;
      const start = performance.now();

      switch (testKey) {
        case 'health': {
          const { data } = await api.get('/ml/health');
          res = { success: data.success && data.data?.healthy, details: data.data?.info?.service || 'OK', ms: Math.round(performance.now() - start) };
          break;
        }
        case 'trainSession': {
          const { data } = await api.post('/ml/session/train');
          res = { success: data.success && data.data?.trained, details: `${data.data?.n_views || 0} views`, ms: Math.round(performance.now() - start) };
          break;
        }
        case 'trainCF': {
          const { data } = await api.post('/ml/cf/train');
          res = { success: data.success && data.data?.trained, details: `${data.data?.n_orders || 0} orders, ${data.data?.models?.length || 0} models`, ms: Math.round(performance.now() - start) };
          break;
        }
        case 'graphcfTrain': {
          const { data } = await api.post('/ml/graphcf/train');
          res = { success: data.success && data.data?.trained, details: `${data.data?.n_orders || 0} orders, ${data.data?.n_products || 0} products`, ms: Math.round(performance.now() - start) };
          break;
        }
        case 'lightgcnTrain': {
          const { data } = await api.post('/ml/lightgcncf/train');
          res = { success: data.success && data.data?.trained, details: `${data.data?.n_orders || 0} orders, ${data.data?.n_products || 0} products`, ms: Math.round(performance.now() - start) };
          break;
        }
        case 'graphcfRec': {
          const customerId = await getSampleCustomer();
          if (!customerId) { res = { success: false, details: 'No sample customer', ms: 0 }; break; }
          const { data } = await api.post('/ml/graphcf/recommend', { userId: customerId, topN: 5 });
          const recs = data?.data?.recommendations || [];
          res = { success: recs.length > 0, details: `${recs.length} gợi ý`, top: recs.slice(0, 3).map(p => p.name).join(', '), ms: Math.round(performance.now() - start) };
          break;
        }
        case 'lightgcnRec': {
          const customerId = await getSampleCustomer();
          if (!customerId) { res = { success: false, details: 'No sample customer', ms: 0 }; break; }
          const { data } = await api.post('/ml/lightgcncf/recommend', { userId: customerId, topN: 5 });
          const recs = data?.data?.recommendations || [];
          res = { success: recs.length > 0, details: `${recs.length} gợi ý`, top: recs.slice(0, 3).map(p => p.name).join(', '), ms: Math.round(performance.now() - start) };
          break;
        }
        case 'sessionRic': {
          const { data: prodData } = await api.get('/products?limit=5');
          const products = prodData?.data?.products || prodData?.products || [];
          if (products.length < 2) { res = { success: false, details: 'Not enough products', ms: 0 }; break; }
          const { data } = await api.post('/ml/session/recommend', { sessionItems: [products[0].id, products[1].id], topN: 5, strategy: 'ric' });
          const recs = data?.data || [];
          res = { success: recs.length > 0, details: `${recs.length} gợi ý (RIC)`, top: recs.slice(0, 3).map(p => p.name).join(', '), ms: Math.round(performance.now() - start) };
          break;
        }
        case 'evaluate': {
          const { data } = await api.post('/ml/evaluate', { topN: 10 });
          const m = data.data?.metrics;
          res = { success: !!m, details: m ? `Precision: ${(m.precision * 100).toFixed(1)}%, Recall: ${(m.recall * 100).toFixed(1)}%` : data.data?.message, ms: Math.round(performance.now() - start) };
          break;
        }
        case 'cluster': {
          const { data } = await api.post('/clusters/run');
          const clusters = data.data?.clusters || [];
          res = { success: data.success, details: `${clusters.length} clusters, ${data.data?.totalUsers || 0} users`, ms: Math.round(performance.now() - start) };
          break;
        }
        case 'trending': {
          const { data } = await api.get('/recommendations/trending');
          const items = data.data || [];
          res = { success: items.length > 0, details: `${items.length} sản phẩm`, top: items.slice(0, 3).map(p => p.name).join(', '), ms: Math.round(performance.now() - start) };
          break;
        }
        case 'sessionRec': {
          const { data: prodData } = await api.get('/products?limit=5');
          const products = prodData?.data?.products || prodData?.products || [];
          if (products.length < 2) { res = { success: false, details: 'Not enough products', ms: 0 }; break; }
          const { data } = await api.post('/ml/session/recommend', { sessionItems: [products[0].id, products[1].id], topN: 5 });
          const recs = data?.data || [];
          res = { success: true, details: `${recs.length} gợi ý`, top: recs.slice(0, 3).map(p => p.name).join(', '), ms: Math.round(performance.now() - start) };
          break;
        }
        case 'explain': {
          const { data: me } = await api.get('/auth/me');
          const userId = me?.data?.id || me?.id;
          if (!userId) { res = { success: false, details: 'Cannot get user ID', ms: 0 }; break; }
          const { data } = await api.post('/ml/explain', { userId, topN: 5 });
          const recs = data?.data?.recommendations || [];
          const weights = data?.data?.weights || {};
          res = { success: true, details: `${recs.length} recs | weights: ${Object.keys(weights).join(', ')}`, ms: Math.round(performance.now() - start) };
          break;
        }
        case 'abtestLog': {
          const { data: custData } = await api.get('/users?role=CUSTOMER&limit=1');
          const customers = custData?.data?.users || custData?.users || [];
          const { data: prodData2 } = await api.get('/products?limit=1');
          const prods = prodData2?.data?.products || prodData2?.products || [];
          if (!customers.length || !prods.length) { res = { success: false, details: 'No sample data', ms: 0 }; break; }
          const { data } = await api.post('/ml/abtest/log', { group: 'control', userId: customers[0].id, productId: prods[0].id, action: 'impression' });
          res = { success: data.success, details: `${data.data?.action || 'impression'} — ${customers[0].name}`, ms: Math.round(performance.now() - start) };
          break;
        }
        case 'abtestCompare': {
          const { data } = await api.post('/ml/abtest/compare', { groupA: 'control', groupB: 'treatment' });
          res = { success: data.success, details: `Winner: ${data.data?.winner || 'tie'}`, ms: Math.round(performance.now() - start) };
          break;
        }
        case 'abtestReport': {
          const { data } = await api.get('/ml/abtest/report');
          const control = data.data?.control?.total_events || 0;
          const treatment = data.data?.treatment?.total_events || 0;
          res = { success: data.success, details: `Control: ${control} events | Treatment: ${treatment} events`, ms: Math.round(performance.now() - start) };
          break;
        }
        default:
          res = { success: false, details: 'Unknown test', ms: 0 };
      }

      setResults(prev => ({ ...prev, [testKey]: { status: res.success ? 'pass' : 'fail', ...res } }));
      return res.success;
    } catch (e) {
      setResults(prev => ({ ...prev, [testKey]: { status: 'fail', success: false, details: e.message, ms: 0 } }));
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
    toast.success('Hoàn tất!');
    
    // Scroll to results
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const passed = Object.values(results).filter(r => r.status === 'pass').length;
  const failed = Object.values(results).filter(r => r.status === 'fail').length;
  const total = Object.keys(results).length;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink">Kiểm tra ML tự động</h2>
          <p className="text-ink-tertiary text-sm mt-1">Tự động chạy tất cả {TESTS.length} API endpoints ML và báo cáo kết quả</p>
        </div>
        <button onClick={runAll} disabled={running}
          className="btn-primary inline-flex items-center space-x-2 px-6 py-3 disabled:opacity-60 text-sm"
        >
          <FiPlay className={`text-sm ${running ? 'animate-pulse' : ''}`} />
          <span>{running ? 'Đang chạy...' : total > 0 ? 'Chạy lại tất cả' : '▶ Chạy tất cả'}</span>
        </button>
      </div>

      {/* Summary Card */}
      {(total > 0 || running) && (
        <div ref={resultsRef} className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-ink flex items-center space-x-2">
              <FiActivity className="text-primary-600" />
              <span>Kết quả kiểm tra</span>
            </h3>
            {running && (
              <div className="flex items-center space-x-2 text-xs text-primary-600">
                <FiRefreshCw className="animate-spin" />
                <span>Đang chạy...</span>
              </div>
            )}
            {allDone && (
              <div className={`flex items-center space-x-2 text-xs font-semibold ${failed === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                <span>{passed}/{total} thành công</span>
                <span className="text-ink-tertiary">|</span>
                <span>Tỉ lệ: {total > 0 ? Math.round(passed / total * 100) : 0}%</span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {total > 0 && (
            <div className="w-full h-2 bg-gray-100 rounded-full mb-5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-primary-500 rounded-full transition-all duration-500"
                style={{ width: `${(total / TESTS.length) * 100}%` }}
              />
            </div>
          )}

          {/* Test Results */}
          <div className="space-y-2">
            {TESTS.map((test) => {
              const result = results[test.key];
              const Icon = test.icon;
              const isRunning = result?.status === 'running';

              return (
                <div key={test.key} className={`flex items-center justify-between p-3 rounded-xl transition-all duration-300 ${
                  isRunning ? 'bg-blue-50 ring-1 ring-blue-200' :
                  result?.status === 'pass' ? 'bg-emerald-50/60' :
                  result?.status === 'fail' ? 'bg-red-50/60' :
                  'bg-surface-secondary'
                }`}>
                  <div className="flex items-center space-x-3 min-w-0">
                    {/* Status icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isRunning ? 'bg-blue-100' :
                      result?.status === 'pass' ? 'bg-emerald-100' :
                      result?.status === 'fail' ? 'bg-red-100' :
                      'bg-gray-100'
                    }`}>
                      {isRunning ? (
                        <FiRefreshCw className="text-blue-600 text-sm animate-spin" />
                      ) : result?.status === 'pass' ? (
                        <FiCheckCircle className="text-emerald-600 text-sm" />
                      ) : result?.status === 'fail' ? (
                        <FiXCircle className="text-red-600 text-sm" />
                      ) : (
                        <Icon className="text-gray-400 text-sm" />
                      )}
                    </div>

                    {/* Test info */}
                    <div>
                      <p className="text-sm font-medium text-ink">{test.label}</p>
                      <p className="text-[10px] text-ink-tertiary">{test.endpoint}</p>
                      {result?.details && (
                        <p className="text-[11px] mt-0.5 text-ink-secondary">{result.details}</p>
                      )}
                      {result?.top && (
                        <p className="text-[10px] text-ink-tertiary mt-0.5 truncate max-w-md">{result.top}</p>
                      )}
                    </div>
                  </div>

                  {/* Timing */}
                  <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                    {result?.ms > 0 && (
                      <span className="text-[10px] text-ink-tertiary flex items-center space-x-1">
                        <FiClock className="text-[9px]" />
                        <span>{result.ms}ms</span>
                      </span>
                    )}
                    {result?.status === 'pass' && <span className="text-[10px] text-emerald-600 font-medium">OK</span>}
                    {result?.status === 'fail' && <span className="text-[10px] text-red-600 font-medium">LỖI</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Final Summary */}
          {allDone && (
            <div className={`mt-5 p-4 rounded-xl text-sm ${
              failed === 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              <div className="flex items-center space-x-2 font-semibold mb-1">
                {failed === 0 ? <FiCheckCircle className="text-emerald-600" /> : <FiXCircle className="text-amber-600" />}
                <span>{failed === 0 ? 'Tất cả ML endpoints hoạt động tốt!' : `${failed}/${total} test thất bại`}</span>
              </div>
              <p className="text-xs opacity-80 mt-1">
                {failed === 0
                  ? `✅ ${passed}/${total} test passed. ML Engine ổn định: Session-based (HSP/RIC), CF, Graph-based (LightGCN-CF/Graph CF), Clustering, A/B Testing.`
                  : `⚠️ ${failed} test cần kiểm tra lại. Xem chi tiết từng test để biết nguyên nhân.`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {total === 0 && !running && (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FiActivity className="text-2xl text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-ink mb-2">Sẵn sàng kiểm tra!</h3>
          <p className="text-sm text-ink-tertiary max-w-md mx-auto">
            Nhấn <strong>"Chạy tất cả"</strong> để tự động kiểm tra {TESTS.length} API endpoints ML.
            Hệ thống sẽ lần lượt chạy từng test và hiển thị kết quả chi tiết.
          </p>
        </div>
      )}

      {/* ML Endpoints List */}
      <div className="card p-6">
        <h3 className="font-semibold text-ink mb-4 flex items-center space-x-2">
          <FiLayers className="text-primary-600" />
          <span>Danh sách {TESTS.length} ML Endpoints</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {TESTS.map((test) => {
            const Icon = test.icon;
            return (
              <div key={test.key} className="p-3 bg-surface-secondary rounded-xl flex items-center space-x-3">
                <Icon className="text-primary-600 text-sm flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-ink">{test.label}</p>
                  <p className="text-[9px] text-ink-tertiary">{test.endpoint}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MLTestPage;
