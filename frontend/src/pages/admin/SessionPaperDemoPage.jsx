import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiBookOpen, FiPlay, FiRefreshCw, FiClock, FiBarChart2, FiCpu, FiZap,
  FiActivity, FiLayers, FiCheckCircle, FiArrowRight, FiEye, FiInfo,
  FiTrendingUp, FiDatabase, FiAward,
} from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';

// ============================================================
// Demo data — giống hệt demo_paper.py (cửa hàng điện thoại)
// Dùng khi chưa train model từ view logs thật
// ============================================================
const DEMO_PRODUCTS = [
  { id: 'ip15', name: 'iPhone 15', label: 'iPhone 15' },
  { id: 'ip15_case', name: 'Ốp lưng iPhone 15', label: 'Ốp iPhone 15' },
  { id: 'ip15_cu', name: 'Củ sạc iPhone 20W', label: 'Củ sạc 20W' },
  { id: 'airpod', name: 'AirPods', label: 'AirPods' },
  { id: 'galaxy', name: 'Samsung Galaxy S24', label: 'Galaxy S24' },
  { id: 'ss_case', name: 'Ốp lưng Galaxy S24', label: 'Ốp Galaxy' },
  { id: 'ss_cu', name: 'Củ sạc Samsung 25W', label: 'Củ sạc 25W' },
  { id: 'galaxy_buds', name: 'Galaxy Buds', label: 'Galaxy Buds' },
];

const DEMO_SESSIONS = [
  { session_id: 's1', items: ['ip15', 'ip15_case', 'ip15_cu'] },
  { session_id: 's2', items: ['ip15', 'ip15_case', 'airpod'] },
  { session_id: 's3', items: ['ip15', 'ip15_case', 'ip15_cu', 'airpod'] },
  { session_id: 's4', items: ['ip15', 'ip15_cu'] },
  { session_id: 's5', items: ['galaxy', 'ss_case', 'ss_cu'] },
  { session_id: 's6', items: ['galaxy', 'ss_case'] },
  { session_id: 's7', items: ['galaxy', 'ss_cu', 'galaxy_buds'] },
  { session_id: 's8', items: ['ip15', 'airpod'] },
];

const STRATEGIES = [
  { value: 'hybrid', label: 'Hybrid', desc: 'Kết hợp co-occurrence + sequence', color: 'bg-primary-600' },
  { value: 'cooccurrence', label: 'Co-occurrence', desc: 'Quan hệ InSameSession — nền của RIC', color: 'bg-blue-600' },
  { value: 'sequence', label: 'Sequence', desc: 'Markov chain P(next | current) — tiền đề của HSP', color: 'bg-indigo-600' },
  { value: 'hsp', label: 'HSP', desc: 'Hierarchical Sequence Probability — P2 → P1 → P0', color: 'bg-violet-600' },
  { value: 'ric', label: 'RIC', desc: 'Recurrent Item Co-occurrence — hồi quy w(t) = α·w(t-1) + (1-α)·c(t)', color: 'bg-rose-600' },
  { value: 'ric_cil', label: 'RIC-CiL', desc: 'RIC Current-item-Last — chỉ trọng số hóa item vừa xem', color: 'bg-pink-600' },
  { value: 'popularity', label: 'Popularity', desc: 'Cold-start fallback — tương ứng P0 của HSP', color: 'bg-gray-600' },
];

const STRATEGY_MAP = Object.fromEntries(STRATEGIES.map(s => [s.value, s]));

// ============================================================
// Local mini recommender — chạy demo ngay không cần ML service
// Cùng công thức với session_recommender.py
// ============================================================
function buildLocalModel(sessions) {
  const next = {};   // next[a] = {b: count}
  const cooc = {};   // cooc[a] = {b: count}
  const sessCount = {}; // sessions(x)
  let totalItems = 0;
  const itemCount = {};

  sessions.forEach(s => {
    const seen = new Set(s.items);
    seen.forEach(p => { sessCount[p] = (sessCount[p] || 0) + 1; });
    s.items.forEach(p => { itemCount[p] = (itemCount[p] || 0) + 1; totalItems += 1; });
    for (let i = 0; i < s.items.length; i++) {
      const a = s.items[i];
      if (i + 1 < s.items.length) {
        const b = s.items[i + 1];
        next[a] = next[a] || {}; next[a][b] = (next[a][b] || 0) + 1;
      }
      for (let j = i + 1; j < s.items.length; j++) {
        const b = s.items[j];
        cooc[a] = cooc[a] || {}; cooc[a][b] = (cooc[a][b] || 0) + 1;
        cooc[b] = cooc[b] || {}; cooc[b][a] = (cooc[b][a] || 0) + 1;
      }
    }
  });

  return { next, cooc, sessCount, itemCount, totalItems, nSessions: sessions.length };
}

function localRecommend(model, prefix, strategy, topN = 3, alpha = 0.5) {
  const { next, cooc, sessCount, itemCount, totalItems } = model;
  const results = {};

  if (strategy === 'cooccurrence') {
    const cur = prefix[prefix.length - 1];
    Object.entries(cooc[cur] || {}).forEach(([b, c]) => { if (!prefix.includes(b)) results[b] = c; });
  } else if (strategy === 'sequence') {
    const cur = prefix[prefix.length - 1];
    const row = next[cur] || {};
    const tot = Object.values(row).reduce((s, v) => s + v, 0) || 1;
    Object.entries(row).forEach(([b, c]) => { if (!prefix.includes(b)) results[b] = c / tot; });
  }

  if (strategy === 'hsp') {
    // P2
    if (prefix.length >= 2) {
      // dựng P2 on-the-fly từ next chain
      const a = prefix[prefix.length - 2], b = prefix[prefix.length - 1];
      // count(A,B→C): đếm các phiên có A→B→C
      let p2 = {};
      DEMO_SESSIONS.forEach(s => {
        for (let i = 0; i + 2 < s.items.length + 1; i++) {
          if (s.items[i] === a && s.items[i + 1] === b && s.items[i + 2]) {
            const c = s.items[i + 2];
            p2[c] = (p2[c] || 0) + 1;
          }
        }
      });
      Object.entries(p2).forEach(([c, v]) => { if (!prefix.includes(c)) results[c] = { score: v, level: 'P2' }; });
    }
    // P1
    const cur = prefix[prefix.length - 1];
    const row = next[cur] || {};
    const tot = Object.values(row).reduce((s, v) => s + v, 0) || 1;
    Object.entries(row).forEach(([b, c]) => {
      if (prefix.includes(b)) return;
      const p = c / tot;
      if (!results[b] || results[b].level !== 'P2') results[b] = { score: p, level: 'P1' };
    });
    // P0
    Object.entries(itemCount).forEach(([p, c]) => {
      if (prefix.includes(p)) return;
      const p0 = c / totalItems;
      if (!results[p]) results[p] = { score: p0, level: 'P0' };
    });
    return Object.entries(results)
      .map(([pid, r]) => ({ product_id: pid, score: r.score, hsp_level: r.level, reason: `HSP ${r.level}` }))
      .sort((x, y) => y.score - x.score)
      .slice(0, topN);
  }

  if (strategy === 'ric' || strategy === 'ric_cil') {
    // gamma(x, o) = cooc(x, o)/sessions(x); w(t) = α·w(t-1) + (1-α)·gamma(current)
    const weights = {};
    prefix.forEach(item => {
      const g = {};
      Object.entries(cooc[item] || {}).forEach(([o, c]) => {
        g[o] = c / (sessCount[item] || 1);
      });
      Object.keys(weights).forEach(o => { weights[o] = alpha * (weights[o] || 0); });
      Object.entries(g).forEach(([o, gv]) => {
        if (strategy === 'ric_cil' && o !== prefix[prefix.length - 1]) return;
        weights[o] = (weights[o] || 0) + (1 - alpha) * gv;
      });
    });
    Object.entries(weights).forEach(([o, w]) => { if (!prefix.includes(o)) results[o] = w; });
  }

  if (strategy === 'popularity' || strategy === 'hybrid') {
    Object.entries(itemCount).forEach(([p, c]) => {
      if (prefix.includes(p)) return;
      results[p] = (results[p] || 0) + c / totalItems;
    });
  }

  return Object.entries(results)
    .map(([pid, score]) => ({
      product_id: pid, score,
      reason: strategy === 'popularity' ? 'Phổ biến nhất' : `${strategy} score`,
    }))
    .sort((x, y) => y.score - x.score)
    .slice(0, topN);
}

// ============================================================
// Component
// ============================================================
const SessionPaperDemoPage = () => {
  const [mlHealth, setMlHealth] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Session đang mô phỏng
  const [sessionItems, setSessionItems] = useState(['ip15', 'ip15_case']);
  const [strategy, setStrategy] = useState('hsp');
  const [alpha, setAlpha] = useState(0.5);
  const [topN, setTopN] = useState(5);

  // Kết quả
  const [result, setResult] = useState(null);
  const [testing, setTesting] = useState(false);

  // So sánh chiến lược
  const [compareResult, setCompareResult] = useState(null);
  const [comparing, setComparing] = useState(false);

  // Data Yoochoose + benchmark
  const [paperData, setPaperData] = useState(null);
  const [paperDataError, setPaperDataError] = useState(null);
  const [benchMaxTest, setBenchMaxTest] = useState(500);
  const [benchResult, setBenchResult] = useState(null);
  const [benchmarking, setBenchmarking] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Nguồn model cho panel gợi ý: 'shop' (view logs DB) | 'paper' (Yoochoose 375k phiên)
  const [modelSource, setModelSource] = useState('shop');
  const [paperRecs, setPaperRecs] = useState([]);
  const [paperTesting, setPaperTesting] = useState(false);

  const model = useMemo(() => buildLocalModel(DEMO_SESSIONS), []);

  useEffect(() => {
    api.get('/ml/health').then(({ data }) => setMlHealth(data.data)).catch(() => setMlHealth({ healthy: false }));
    api.get('/products?limit=50')
      .then(({ data }) => {
        const list = data?.data?.products || data?.products || [];
        setProducts(list);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
    loadPaperData();
  }, []);

  const productName = (id) => {
    const inDemo = DEMO_PRODUCTS.find(p => p.id === id);
    if (inDemo) return inDemo.name;
    const inDb = products.find(p => p.id === id);
    return inDb ? inDb.name : id;
  };

  const currentStrategy = STRATEGY_MAP[strategy];

  const runRecommend = async () => {
    setTesting(true);
    setResult(null);
    try {
      const { data } = await api.post('/ml/session/recommend', {
        sessionItems,
        topN,
        strategy,
        alpha: (strategy === 'ric' || strategy === 'ric_cil') ? alpha : null,
      });
      // Panel demo cục bộ chỉ có ý nghĩa khi phiên toàn sản phẩm mẫu của bài báo
      // (8 phiên iPhone/Galaxy). Chọn sản phẩm thật → model demo không có dữ liệu,
      // sẽ rơi vào fallback popularity và hiển thị sai → thay bằng giải thích.
      const isDemoSession = sessionItems.every(id => DEMO_PRODUCTS.some(p => p.id === id));
      setResult({
        recs: data.data || [],
        meta: data.meta || {},
        isDemoSession,
        local: isDemoSession ? localRecommend(model, sessionItems, strategy, topN, alpha) : null,
      });
      if (!data.data?.length) toast.error('Không có gợi ý — thử thêm sản phẩm hoặc đổi strategy');
    } catch (e) {
      toast.error('Lỗi gọi API: ' + (e.response?.data?.message || e.message));
    } finally {
      setTesting(false);
    }
  };

  const runCompare = async () => {
    setComparing(true);
    setCompareResult(null);
    try {
      const strategies = ['cooccurrence', 'sequence', 'hsp', 'ric_cil', 'hybrid'];
      const results = await Promise.all(strategies.map(s => {
        if (modelSource === 'paper') {
          return api.post('/ml/paper/recommend', { sessionItems, topN: 3, strategy: s })
            .then(({ data }) => ({
              strategy: s,
              recs: (data.data?.recommendations || []).map(r => ({ ...r, name: `Sản phẩm #${r.product_id}` })),
            }))
            .catch(() => ({ strategy: s, recs: [] }));
        }
        return api.post('/ml/session/recommend', { sessionItems, topN: 3, strategy: s })
          .then(({ data }) => ({ strategy: s, recs: data.data || [] }))
          .catch(() => ({ strategy: s, recs: [] }));
      }));
      setCompareResult(results);
    } finally {
      setComparing(false);
    }
  };

  const loadPaperData = () => {
    setPaperDataError(null);
    api.get('/ml/paper/data')
      .then(({ data }) => setPaperData(data.data || null))
      .catch((e) => setPaperDataError(e.response?.data?.message || e.message));
  };

  const runBenchmark = async () => {
    setBenchmarking(true);
    setBenchResult(null);
    try {
      const { data } = await api.post('/ml/paper/benchmark', { maxTest: benchMaxTest });
      if (data.success) {
        setBenchResult(data.data);
        toast.success(`Benchmark xong: ${data.data.rows?.length || 0} phương pháp đánh giá`);
      } else {
        toast.error('Benchmark thất bại');
      }
    } catch (e) {
      toast.error('Lỗi benchmark: ' + (e.response?.data?.message || e.message));
    } finally {
      setBenchmarking(false);
    }
  };

  const resetBenchmark = async () => {
    setResetting(true);
    try {
      const { data } = await api.post('/ml/paper/reset');
      if (data.success) {
        setBenchResult(null);
        toast.success(data.data?.message || 'Đã reset — lần sau sẽ train lại từ đầu');
      }
    } catch (e) {
      toast.error('Lỗi reset: ' + (e.response?.data?.message || e.message));
    } finally {
      setResetting(false);
    }
  };

  const runPaperRecommend = async () => {
    if (!sessionItems.length) return;
    setPaperTesting(true);
    setPaperRecs([]);
    try {
      const { data } = await api.post('/ml/paper/recommend', {
        sessionItems,
        topN,
        strategy,
        alpha: (strategy === 'ric' || strategy === 'ric_cil') ? alpha : null,
      });
      if (data.success) {
        setPaperRecs(data.data?.recommendations || []);
        toast.success('Gợi ý từ model Yoochoose (375k phiên thật)!');
      }
    } catch (e) {
      toast.error('Lỗi: ' + (e.response?.data?.message || e.message));
    } finally {
      setPaperTesting(false);
    }
  };

  const toggleItem = (id) => {
    setSessionItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const renderScore = (r) => {
    const s = r.score ?? r.probability ?? 0;
    return typeof s === 'number' ? s.toFixed(4) : String(s);
  };

  const recList = (recs, showLevel = false) => (
    <div className="space-y-1.5">
      {recs.map((p, i) => (
        <div key={p.id || p.product_id} className="flex items-center space-x-2 p-2 bg-surface-secondary rounded-lg">
          <span className="w-5 h-5 bg-primary-100 text-primary-700 rounded text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
          {p.images?.[0] && <img src={p.images[0]} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />}
          <span className="text-xs text-ink truncate flex-1">{p.name || productName(p.product_id || p.id)}</span>
          {showLevel && p.hsp_level && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${
              p.hsp_level === 'P2' ? 'bg-violet-100 text-violet-700' :
              p.hsp_level === 'P1' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-600'
            }`}>{p.hsp_level}</span>
          )}
          {p.reason && <span className="text-[10px] text-ink-tertiary truncate max-w-[180px] hidden sm:block">{p.reason}</span>}
          <span className="text-[10px] text-primary-600 font-semibold flex-shrink-0">{renderScore(p)}</span>
        </div>
      ))}
      {!recs.length && <p className="text-xs text-ink-tertiary p-2">Chưa có gợi ý.</p>}
    </div>
  );

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink flex items-center space-x-2">
            <FiBookOpen className="text-primary-600" />
            <span>Demo bài báo — Session-based (HSP &amp; RIC)</span>
          </h2>
          <p className="text-ink-tertiary text-sm mt-1">
            Delianidi et al., Applied Sciences 13(1):394, 2023 — DOI 10.3390/app13010394
          </p>
        </div>
        <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border w-fit ${
          mlHealth?.healthy ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${mlHealth?.healthy ? 'bg-emerald-500' : 'bg-gray-400'}`} />
          <span>ML {mlHealth?.healthy ? 'Trực tuyến' : 'Ngoại tuyến'}</span>
        </div>
      </div>

      {/* BƯỚC 1 — Session builder */}
      <div className="card p-6">
        <div className="flex items-center space-x-3 mb-1">
          <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center"><FiEye className="text-lg text-blue-600" /></div>
          <div>
            <h3 className="text-sm font-semibold text-ink">Bước 1 — Mô phỏng phiên duyệt web</h3>
            <p className="text-xs text-ink-tertiary">Bấm chọn các sản phẩm khách "đã xem" theo thứ tự — đầu tiên là xa nhất, cuối cùng là vừa xem</p>
          </div>
        </div>

        {/* Demo products */}
        <p className="text-[10px] font-semibold text-ink-tertiary uppercase mt-4 mb-2">Sản phẩm mẫu (dữ liệu demo_paper.py — 8 phiên lịch sử)</p>
        <div className="flex flex-wrap gap-2">
          {DEMO_PRODUCTS.map(p => (
            <button key={p.id} onClick={() => toggleItem(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                sessionItems.includes(p.id)
                  ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                  : 'bg-surface-secondary text-ink border-gray-200 hover:border-primary-300'
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* DB products */}
        {products.length > 0 && (
          <>
            <p className="text-[10px] font-semibold text-ink-tertiary uppercase mt-4 mb-2">Sản phẩm thật trong shop (view logs của hệ thống)</p>
            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
              {products.slice(0, 30).map(p => (
                <button key={p.id} onClick={() => toggleItem(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    sessionItems.includes(p.id)
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-surface-secondary text-ink border-gray-200 hover:border-emerald-300'
                  }`}>
                  {p.name.length > 26 ? p.name.slice(0, 26) + '…' : p.name}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Session path */}
        <div className="mt-4 p-3 bg-blue-50/60 rounded-xl">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold text-blue-700 uppercase">Phiên đang mô phỏng ({sessionItems.length} sản phẩm, thứ tự xem)</p>
            {sessionItems.length > 0 && (
              <button onClick={() => setSessionItems([])}
                className="text-[10px] text-red-500 hover:text-red-600 font-medium">
                Xoá hết
              </button>
            )}
          </div>
          {sessionItems.length ? (
            <div className="flex flex-wrap items-center gap-1">
              {sessionItems.map((id, i) => (
                <React.Fragment key={id}>
                  {i > 0 && <FiArrowRight className="text-blue-400 text-xs" />}
                  <button onClick={() => setSessionItems(prev => prev.filter(x => x !== id))}
                    title="Bấm để bỏ khỏi phiên"
                    className="px-2 py-0.5 bg-white rounded text-[11px] text-ink border border-blue-200 hover:border-red-300">
                    {productName(id)} ×
                  </button>
                </React.Fragment>
              ))}
            </div>
          ) : <p className="text-xs text-blue-400">Chưa chọn sản phẩm nào.</p>}
        </div>
      </div>

      {/* BƯỚC 2 — Strategy + alpha + chạy */}
      <div className="card p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center"><FiCpu className="text-lg text-violet-600" /></div>
          <div>
            <h3 className="text-sm font-semibold text-ink">Bước 2 — Chọn chiến lược &amp; chạy gợi ý</h3>
            <p className="text-xs text-ink-tertiary">Mỗi strategy là một sub-model trong bài báo — kết quả thay đổi ngay khi đổi</p>
          </div>
        </div>

        {/* Toggle nguồn model */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
          <div className="flex items-center space-x-1 p-1 bg-surface-secondary rounded-xl w-fit">
            <button onClick={() => setModelSource('shop')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                modelSource === 'shop' ? 'bg-emerald-600 text-white shadow-sm' : 'text-ink-secondary hover:text-ink'
              }`}>
              🏪 Model shop — train từ view logs thật
            </button>
            <button onClick={() => setModelSource('paper')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                modelSource === 'paper' ? 'bg-cyan-700 text-white shadow-sm' : 'text-ink-secondary hover:text-ink'
              }`}>
              📄 Model bài báo — Yoochoose 375k phiên thật
            </button>
          </div>
          {modelSource === 'paper' && (
            <p className="text-[10px] text-cyan-700">Lần đầu chạy sẽ train model trên 375,043 phiên (~13s) — model ẩn danh, sản phẩm hiển thị dạng mã số</p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
          {STRATEGIES.map(s => (
            <button key={s.value} onClick={() => setStrategy(s.value)} title={s.desc}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                strategy === s.value ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-300' : 'border-gray-200 bg-surface-secondary hover:border-primary-200'
              }`}>
              <div className="flex items-center space-x-1.5">
                <div className={`w-2 h-2 rounded-full ${s.color}`} />
                <p className="text-xs font-bold text-ink">{s.label}</p>
              </div>
              <p className="text-[9px] text-ink-tertiary mt-1 leading-tight line-clamp-2">{s.desc}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {(strategy === 'ric' || strategy === 'ric_cil') && (
            <div className="flex-1 min-w-[220px]">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-ink">α (forgetting factor)</span>
                <span className="text-primary-600 font-mono font-bold">{alpha.toFixed(1)}</span>
              </div>
              <input type="range" min="0.1" max="0.9" step="0.1" value={alpha}
                onChange={e => setAlpha(parseFloat(e.target.value))}
                className="w-full accent-primary-600" />
              <div className="flex justify-between text-[9px] text-ink-tertiary">
                <span>0.1 — quên nhanh, bám item vừa xem</span>
                <span>0.9 — nhớ cả phiên</span>
              </div>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <select value={topN} onChange={e => setTopN(parseInt(e.target.value))} className="input-field text-xs w-24">
              {[3, 5, 8, 10].map(n => <option key={n} value={n}>Top {n}</option>)}
            </select>
            <button
              onClick={modelSource === 'paper' ? runPaperRecommend : runRecommend}
              disabled={testing || paperTesting || !sessionItems.length}
              className="btn-primary inline-flex items-center space-x-2 px-5 py-2.5 text-sm disabled:opacity-60">
              <FiPlay className={`text-xs ${testing || paperTesting ? 'animate-pulse' : ''}`} />
              <span>{testing || paperTesting ? 'Đang chạy...' : modelSource === 'paper' ? 'Chạy gợi ý (Yoochoose)' : 'Chạy gợi ý'}</span>
            </button>
          </div>
        </div>

        {/* Result — model Yoochoose */}
        {modelSource === 'paper' && (paperTesting || paperRecs.length > 0) && (
          <div className="mt-5">
            <div className="p-4 bg-cyan-50/50 rounded-xl border border-cyan-100">
              <p className="text-xs font-bold text-cyan-800 mb-2 flex items-center">
                <FiDatabase className="mr-1.5" /> Kết quả từ model Yoochoose — train trên 375,043 phiên mua sắm thật (RecSys 2015)
              </p>
              {paperTesting ? (
                <div className="flex items-center space-x-2 text-xs text-ink-tertiary p-2">
                  <FiRefreshCw className="animate-spin text-cyan-600" />
                  <span>Đang chạy (lần đầu train model ~13 giây)...</span>
                </div>
              ) : (
                <div className="max-w-xl">
                  {recList(paperRecs.map(r => ({ ...r, name: `Sản phẩm #${r.product_id}` })), strategy === 'hsp')}
                </div>
              )}
              <p className="text-[10px] text-cyan-600 mt-2">
                Data bài báo ẩn danh → sản phẩm hiển thị dạng mã số (Sản phẩm #19). Chất lượng gợi ý phản ánh model học từ data lớn — khác hẳn model shop chỉ có ~1k views.
              </p>
            </div>
          </div>
        )}

        {/* Result — model shop */}
        {modelSource === 'shop' && result && (
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <p className="text-xs font-bold text-emerald-700 mb-2 flex items-center">
                <FiCheckCircle className="mr-1.5" /> Kết quả ML service (model train từ view logs thật)
              </p>
              {result.meta.strategy && <p className="text-[10px] text-emerald-600 mb-2">strategy: {result.meta.strategy} · {result.recs.length} gợi ý</p>}
              {recList(result.recs, strategy === 'hsp')}
              {!result.recs.length && <p className="text-xs text-amber-600">ML chưa có dữ liệu — xem kết quả demo bên phải.</p>}
            </div>
            <div className="p-4 bg-violet-50/50 rounded-xl border border-violet-100">
              <p className="text-xs font-bold text-violet-700 mb-2 flex items-center">
                <FiLayers className="mr-1.5" /> {result.isDemoSession
                  ? 'Cùng thuật toán chạy trên dữ liệu demo bài báo (8 phiên iPhone/Galaxy)'
                  : 'Panel demo — cần sản phẩm mẫu của bài báo'}
              </p>
              {result.isDemoSession ? (
                <>
                  {recList(result.local, strategy === 'hsp')}
                  <p className="text-[10px] text-violet-500 mt-2">Cùng công thức P2→P1→P0 / w(t)=α·w(t-1)+(1-α)·c(t) — chạy trên dữ liệu mẫu để thấy rõ cơ chế.</p>
                </>
              ) : (
                <div className="text-xs text-ink-secondary space-y-2 p-3 bg-white rounded-lg border border-violet-100">
                  <p><b>Phiên đang chứa sản phẩm thật của shop</b> — panel này chỉ minh họa thuật toán trên 8 phiên mẫu iPhone/Galaxy (bộ nút xanh dương ở Bước 1), không có dữ liệu về sản phẩm thật nên không chạy ở đây.</p>
                  <p>→ Kết quả chuẩn là <b>panel trái</b>: ML service đã train trên toàn bộ view logs thật của hệ thống.</p>
                  <p className="text-violet-500">Muốn xem cơ chế thuật toán từng bước? Bấm nút "Xoá hết" rồi chọn lại sản phẩm mẫu (iPhone 15, Ốp lưng…).</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BƯỚC 3 — So sánh chiến lược */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center"><FiBarChart2 className="text-lg text-amber-600" /></div>
            <div>
              <h3 className="text-sm font-semibold text-ink">Bước 3 — So sánh 5 chiến lược trên cùng phiên</h3>
              <p className="text-xs text-ink-tertiary">Bước 7 của demo_paper.py — thấy ngay sự khác biệt giữa các sub-model</p>
            </div>
          </div>
          <button onClick={runCompare} disabled={comparing || !sessionItems.length}
            className="btn-secondary inline-flex items-center space-x-2 text-sm disabled:opacity-60">
            <FiRefreshCw className={`text-xs ${comparing ? 'animate-spin' : ''}`} />
            <span>{comparing ? 'Đang so sánh...' : 'So sánh tất cả'}</span>
          </button>
        </div>

        {compareResult && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-ink-tertiary border-b border-gray-100">
                  <th className="py-2 pr-3 font-semibold">Chiến lược</th>
                  <th className="py-2 px-3 font-semibold">Top-3 gợi ý (score)</th>
                </tr>
              </thead>
              <tbody>
                {compareResult.map(({ strategy: s, recs }) => {
                  const info = STRATEGY_MAP[s];
                  return (
                    <tr key={s} className="border-b border-gray-50">
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center space-x-1.5">
                          <div className={`w-2 h-2 rounded-full ${info?.color || 'bg-gray-400'}`} />
                          <span className="font-semibold text-ink">{info?.label || s}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {recs.length ? recs.map((r, i) => (
                          <span key={r.id || r.product_id} className="inline-block mr-2 mb-1 px-1.5 py-0.5 bg-surface-secondary rounded text-[10px]">
                            {i + 1}. {r.name || productName(r.product_id)} <span className="text-primary-600 font-mono">{renderScore(r)}</span>
                          </span>
                        )) : <span className="text-ink-tertiary">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!compareResult && !comparing && (
          <p className="text-xs text-ink-tertiary">Bấm "So sánh tất cả" để chạy lần lượt cooccurrence → sequence → hsp → ric_cil → hybrid trên phiên hiện tại.</p>
        )}
      </div>

      {/* DATA THẬT BÀI BÁO — Yoochoose + Benchmark */}
      <div className="card p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-9 h-9 bg-cyan-100 rounded-xl flex items-center justify-center">
            <FiDatabase className="text-lg text-cyan-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">Data thật của bài báo — Yoochoose &amp; Benchmark trực tiếp</h3>
            <p className="text-xs text-ink-tertiary">Dataset RecSys Challenge 2015 (375,043 phiên mua sắm thật) — track trong repo tại backend/ml/datasets/yoochoose/</p>
          </div>
        </div>

        {paperDataError && (
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl text-xs mb-4">
            ⚠️ Không tải được data từ ML service: {paperDataError}. Hãy chắc chắn ML service đang chạy.
          </div>
        )}

        {paperData && (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
              {[
                { label: 'Phiên train', value: paperData.n_train_sessions?.toLocaleString('vi-VN'), icon: FiLayers },
                { label: 'Sản phẩm', value: paperData.n_products?.toLocaleString('vi-VN'), icon: FiTrendingUp },
                { label: 'Lượt xem', value: paperData.total_clicks?.toLocaleString('vi-VN'), icon: FiEye },
                { label: 'Độ dài phiên TB', value: paperData.avg_session_length, icon: FiActivity },
                { label: 'Mẫu test', value: paperData.n_test_samples?.toLocaleString('vi-VN'), icon: FiBarChart2 },
              ].map((s) => (
                <div key={s.label} className="p-3 bg-cyan-50/60 rounded-xl border border-cyan-100">
                  <p className="text-[10px] text-cyan-700 uppercase font-semibold">{s.label}</p>
                  <p className="text-lg font-bold text-ink mt-0.5">{s.value ?? '—'}</p>
                </div>
              ))}
            </div>

            {/* Sample sessions — data thô */}
            <div className="mb-4">
              <p className="text-[10px] font-semibold text-ink-tertiary uppercase mb-2">Mẫu dữ liệu thô — 5 phiên đầu tiên (mỗi dòng = 1 phiên: chuỗi sản phẩm khách đã xem)</p>
              <div className="space-y-1">
                {paperData.sample_sessions?.map((s) => (
                  <div key={s.session_id} className="flex items-center space-x-2 text-xs p-2 bg-surface-secondary rounded-lg">
                    <span className="text-[10px] font-mono text-ink-tertiary w-14 flex-shrink-0">{s.session_id}</span>
                    <div className="flex flex-wrap items-center gap-1">
                      {s.items.map((it, idx) => (
                        <React.Fragment key={idx}>
                          {idx > 0 && <FiArrowRight className="text-gray-300 text-[10px]" />}
                          <span className="px-1.5 py-0.5 bg-white rounded text-[10px] text-ink border border-gray-100">{it}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Benchmark runner */}
            <div className="p-4 bg-gradient-to-r from-cyan-50 to-violet-50 rounded-xl border border-cyan-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center space-x-2">
                  <FiAward className="text-violet-600" />
                  <div>
                    <p className="text-sm font-bold text-ink">Chạy benchmark ngay trên data này</p>
                    <p className="text-[11px] text-ink-tertiary">Train trên toàn bộ phiên thật (~11s lần đầu) → đo MRR@K / Recall@K đúng protocol bài báo</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <select value={benchMaxTest} onChange={(e) => setBenchMaxTest(parseInt(e.target.value))} className="input-field text-xs w-36">
                    <option value={200}>200 phiên test (nhanh)</option>
                    <option value={500}>500 phiên test</option>
                    <option value={2000}>2,000 phiên test</option>
                    <option value={5000}>5,000 phiên test (đầy đủ)</option>
                  </select>
                  <button onClick={runBenchmark} disabled={benchmarking || resetting}
                    className="btn-primary inline-flex items-center space-x-2 px-4 py-2.5 text-sm disabled:opacity-60">
                    <FiPlay className={`text-xs ${benchmarking ? 'animate-pulse' : ''}`} />
                    <span>{benchmarking ? 'Đang chạy...' : 'Chạy benchmark'}</span>
                  </button>
                  <button onClick={resetBenchmark} disabled={benchmarking || resetting}
                    title="Xóa model đã cache — lần benchmark sau sẽ train lại từ đầu trên 375k phiên (~13s)"
                    className="btn-secondary inline-flex items-center space-x-2 px-3 py-2.5 text-sm disabled:opacity-60">
                    <FiRefreshCw className={`text-xs ${resetting ? 'animate-spin' : ''}`} />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {benchmarking && (
                <div className="flex items-center space-x-2 text-xs text-ink-tertiary p-2">
                  <FiRefreshCw className="animate-spin text-primary-600" />
                  <span>Lần đầu train model trên 375k phiên mất ~11 giây — vui lòng chờ...</span>
                </div>
              )}

              {benchResult && (
                <div className="mt-2">
                  <p className="text-[11px] text-ink-tertiary mb-2">
                    Train: <b>{benchResult.train_seconds}s</b> {benchResult.cached_model && '(model cached — bấm Reset để train lại)'} · Đánh giá: <b>{benchResult.max_test}</b> phiên test · Train sessions: <b>{benchResult.n_train_sessions?.toLocaleString('vi-VN')}</b>
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-ink-tertiary border-b border-gray-200">
                          <th className="py-2 pr-3 font-semibold">Phương pháp</th>
                          <th className="py-2 px-2 font-semibold">MRR@10</th>
                          <th className="py-2 px-2 font-semibold">MRR@20</th>
                          <th className="py-2 px-2 font-semibold">MRR@30</th>
                          <th className="py-2 px-2 font-semibold">Rec@10</th>
                          <th className="py-2 px-2 font-semibold">Rec@20</th>
                          <th className="py-2 px-2 font-semibold">Rec@30</th>
                          <th className="py-2 pl-2 font-semibold">Thời gian</th>
                        </tr>
                      </thead>
                      <tbody>
                        {benchResult.rows?.map((r) => {
                          const best = Math.max(...benchResult.rows.map(x => x['mrr@10']));
                          const isBest = r['mrr@10'] === best;
                          return (
                            <tr key={r.method} className={`border-b border-gray-100 ${isBest ? 'bg-emerald-50/70' : ''}`}>
                              <td className="py-2 pr-3 font-semibold text-ink">
                                {r.method} {isBest && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded ml-1">TỐT NHẤT</span>}
                              </td>
                              <td className="py-2 px-2 font-mono font-bold text-primary-700">{r['mrr@10'].toFixed(4)}</td>
                              <td className="py-2 px-2 font-mono text-ink-secondary">{r['mrr@20'].toFixed(4)}</td>
                              <td className="py-2 px-2 font-mono text-ink-secondary">{r['mrr@30'].toFixed(4)}</td>
                              <td className="py-2 px-2 font-mono text-ink-secondary">{r['recall@10'].toFixed(4)}</td>
                              <td className="py-2 px-2 font-mono text-ink-secondary">{r['recall@20'].toFixed(4)}</td>
                              <td className="py-2 px-2 font-mono text-ink-secondary">{r['recall@30'].toFixed(4)}</td>
                              <td className="py-2 pl-2 text-[10px] text-ink-tertiary">{r.eval_seconds}s · n={r.n_evaluated}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Alpha tuning */}
                  <p className="text-[10px] font-semibold text-ink-tertiary uppercase mt-4 mb-2">Tác động của α (forgetting factor) lên RIC — đúng phần tuning của bài báo</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {benchResult.alpha_tuning?.map((a) => (
                      <div key={a.alpha} className="p-2 bg-white rounded-lg border border-gray-100 text-center">
                        <p className="text-xs font-bold text-ink">α = {a.alpha}</p>
                        <p className="text-[11px] font-mono text-primary-700 mt-0.5">MRR@10 = {a['mrr@10'].toFixed(4)}</p>
                        <p className="text-[10px] font-mono text-ink-tertiary">Rec@10 = {a['recall@10'].toFixed(4)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {!paperData && !paperDataError && (
          <p className="text-xs text-ink-tertiary">Đang tải dữ liệu Yoochoose từ ML service...</p>
        )}
      </div>

      {/* Giải thích cơ chế */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-ink mb-4 flex items-center">
          <FiInfo className="text-primary-600 mr-2" /> Cơ chế trong bài báo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-violet-50/60 rounded-xl">
            <p className="font-bold text-violet-700 mb-2">HSP — Hierarchical Sequence Probability</p>
            <ul className="space-y-1.5 text-ink-secondary leading-relaxed">
              <li><span className="font-mono font-semibold">P0(A)</span> = appearances(A)/total — cold-start, luôn có kết quả</li>
              <li><span className="font-mono font-semibold">P1(B|A)</span> = count(A→B)/count(A) — cặp liền kề</li>
              <li><span className="font-mono font-semibold">P2(C|A,B)</span> = count(A,B→C)/count(A,B) — bộ ba liền kề</li>
              <li>Gợi ý theo hierarchy <b>P2 → P1 → P0</b>, không trùng lặp → tag màu trên kết quả</li>
            </ul>
          </div>
          <div className="p-4 bg-rose-50/60 rounded-xl">
            <p className="font-bold text-rose-700 mb-2">RIC — Recurrent Item Co-occurrence</p>
            <ul className="space-y-1.5 text-ink-secondary leading-relaxed">
              <li><span className="font-mono font-semibold">γ(o|x)</span> = cooc(x,o)/sessions(x) — độ tin cậy</li>
              <li><span className="font-mono font-semibold">w(t) = α·w(t-1) + (1-α)·c(t)</span> — hồi quy bậc 1 theo từng lượt xem</li>
              <li>α nhỏ = quên nhanh, bám item vừa xem; α lớn = nhớ cả phiên</li>
              <li>Kéo slider α (bước 2) để thấy thứ tự gợi ý thay đổi trực tiếp</li>
            </ul>
          </div>
        </div>
        <p className="text-[10px] text-ink-tertiary mt-3">
          Benchmark offline trên Yoochoose (375k phiên, trong repo): RIC đạt MRR@10 = 0.1902, vượt sequence (0.1855) và co-occurrence (0.1595) — xem <span className="font-mono">backend/ml/benchmark_yoochoose_results.txt</span> hoặc chạy <span className="font-mono">python -m session.benchmark_hsp_ric --dataset yoochoose --max_test 500</span>.
        </p>
      </div>
    </div>
  );
};

export default SessionPaperDemoPage;
