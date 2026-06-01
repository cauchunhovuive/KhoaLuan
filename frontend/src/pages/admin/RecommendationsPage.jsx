import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiTrendingUp, FiRefreshCw, FiLayers, FiCpu, FiCheckCircle,
  FiBarChart2, FiActivity, FiZap, FiInfo, FiSend,
  FiPlay, FiServer, FiClock,
} from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const RecommendationsPage = () => {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mlHealth, setMlHealth] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState(null);

  // Training states
  const [trainingSession, setTrainingSession] = useState(false);
  const [sessionTrainResult, setSessionTrainResult] = useState(null);
  const [trainingCF, setTrainingCF] = useState(false);
  const [cfTrainResult, setCfTrainResult] = useState(null);

  // Session test
  const [sessionTestIds, setSessionTestIds] = useState('');
  const [sessionTestResult, setSessionTestResult] = useState([]);
  const [sessionTesting, setSessionTesting] = useState(false);

  const fetchTrending = () => {
    setLoading(true);
    api.get('/recommendations/trending')
      .then(({ data }) => setTrending(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const checkMLHealth = () => {
    api.get('/ml/health')
      .then(({ data }) => setMlHealth(data.data))
      .catch(() => setMlHealth({ healthy: false }))
      .finally(() => {});
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    setEvalResult(null);
    try {
      const { data } = await api.post('/ml/evaluate', { topN: 10 });
      if (data.success) {
        setEvalResult(data.data);
        toast.success('Đánh giá mô hình hoàn tất!');
      } else {
        toast.error(data.data?.message || 'Đánh giá thất bại');
      }
    } catch (err) {
      toast.error('ML Service không khả dụng');
    } finally {
      setEvaluating(false);
    }
  };

  const handleTrainSession = async () => {
    setTrainingSession(true);
    setSessionTrainResult(null);
    try {
      const { data } = await api.post('/ml/session/train');
      if (data.success) {
        setSessionTrainResult(data.data);
        toast.success(data.data.trained ? `Đã huấn luyện Session (${data.data.n_views} lượt xem)!` : data.data.message);
      }
    } catch (err) {
      toast.error('Train session thất bại. ML Service không khả dụng.');
    } finally {
      setTrainingSession(false);
    }
  };

  const handleTrainCF = async () => {
    setTrainingCF(true);
    setCfTrainResult(null);
    try {
      const { data } = await api.post('/ml/cf/train');
      if (data.success) {
        setCfTrainResult(data.data);
        if (data.data.trained) {
          toast.success(`Đã huấn luyện CF: ${data.data.n_orders} đơn hàng, ${data.data.n_products} sản phẩm!`);
        } else {
          toast.error(data.data.message || 'Train CF thất bại');
        }
      }
    } catch (err) {
      toast.error('Train CF thất bại. ML Service không khả dụng.');
    } finally {
      setTrainingCF(false);
    }
  };

  const handleTestSession = async () => {
    const ids = sessionTestIds.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) {
      toast.error('Nhập ít nhất 1 ID sản phẩm');
      return;
    }
    setSessionTesting(true);
    setSessionTestResult([]);
    try {
      const { data } = await api.post('/ml/session/recommend', {
        sessionItems: ids,
        topN: 8,
      });
      setSessionTestResult(data.data || []);
      toast.success('Nhận được gợi ý từ session!');
    } catch (err) {
      toast.error('Test session thất bại');
    } finally {
      setSessionTesting(false);
    }
  };

  useEffect(() => { fetchTrending(); checkMLHealth(); }, []);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink">Gợi ý sản phẩm</h2>
          <p className="text-ink-tertiary text-sm mt-1">Công cụ gợi ý AI — Lọc cộng tác + Theo phiên + Xu hướng</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
            mlHealth?.healthy
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-gray-50 text-gray-500 border-gray-200'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${mlHealth?.healthy ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            <span>ML {mlHealth?.healthy ? 'Trực tuyến' : 'Ngoại tuyến'}</span>
          </div>
          <button onClick={() => { fetchTrending(); checkMLHealth(); }} className="btn-secondary inline-flex items-center space-x-2">
            <FiRefreshCw className="text-sm" />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ML Service Info */}
      {mlHealth?.info && (
        <div className="card p-5">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
              <FiCpu className="text-lg text-violet-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">Thông tin ML</h3>
              <p className="text-xs text-ink-tertiary">{mlHealth.info.service} v{mlHealth.info.version}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            {Object.entries(mlHealth.info.models || {}).map(([key, model]) => (
              <div key={key} className="p-3 bg-surface-secondary rounded-xl">
                <p className="text-xs font-semibold text-ink uppercase mb-1">{key.replace('_', ' ')}</p>
                <p className="text-[10px] text-ink-tertiary leading-relaxed">{model.description}</p>
                <p className="text-[10px] text-primary-600 mt-1 font-medium">{model.endpoints.length} endpoints</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== ML Actions Board ===== */}
      {mlHealth?.healthy && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Train Session */}
          <div className="card p-5">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                <FiClock className="text-lg text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink">Train Session</h3>
                <p className="text-xs text-ink-tertiary">Mô hình Co-occurrence + Sequence</p>
              </div>
            </div>
            <button
              onClick={handleTrainSession}
              disabled={trainingSession}
              className="btn-primary w-full inline-flex items-center justify-center space-x-2 text-sm disabled:opacity-60"
            >
              <FiPlay className={`text-xs ${trainingSession ? 'animate-spin' : ''}`} />
              <span>{trainingSession ? 'Đang huấn luyện...' : 'Huấn luyện Session'}</span>
            </button>
            {sessionTrainResult && (
              <div className={`mt-3 p-2.5 rounded-lg text-xs ${sessionTrainResult.trained ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {sessionTrainResult.trained
                  ? `✅ Đã train: ${sessionTrainResult.n_views} views`
                  : sessionTrainResult.message}
              </div>
            )}
          </div>

          {/* Evaluate Model */}
          <div className="card p-5">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                <FiBarChart2 className="text-lg text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink">Đánh giá mô hình</h3>
                <p className="text-xs text-ink-tertiary">Độ chính xác, Độ bao phủ, F1, NDCG</p>
              </div>
            </div>
            <button
              onClick={handleEvaluate}
              disabled={evaluating}
              className="btn-primary w-full inline-flex items-center justify-center space-x-2 text-sm disabled:opacity-60"
            >
              <FiSend className={`text-xs ${evaluating ? 'animate-spin' : ''}`} />
              <span>{evaluating ? 'Đang đánh giá...' : 'Đánh giá mô hình'}</span>
            </button>
            {evalResult?.metrics && (
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Chính xác', value: evalResult.metrics.precision },
                  { label: 'Bao phủ', value: evalResult.metrics.recall },
                  { label: 'F1', value: evalResult.metrics.f1_score },
                  { label: 'Tỉ lệ trúng', value: evalResult.metrics.hit_rate },
                  { label: 'NDCG', value: evalResult.metrics.ndcg_score },
                  { label: 'Phủ sóng', value: evalResult.metrics.coverage },
                ].map((m) => (
                  <div key={m.label} className="bg-surface-secondary rounded-lg p-2 text-center">
                    <p className="text-[10px] text-ink-tertiary">{m.label}</p>
                    <p className="text-xs font-bold text-ink">
                      {typeof m.value === 'number' ? (m.value * 100).toFixed(1) + '%' : m.value}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {evalResult?.details && (
              <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                <p className="text-[10px] text-ink-tertiary">
                  Mẫu train: {evalResult.details.n_train_samples} | Test: {evalResult.details.n_test_samples} | Người dùng: {evalResult.details.n_test_users} | Top-K: {evalResult.details.top_k}
                </p>
              </div>
            )}
            {evalResult?.message && !evalResult.metrics && (
              <div className="mt-3 p-2.5 rounded-lg text-xs bg-gray-50 text-ink-tertiary">
                {evalResult.message}
              </div>
            )}
          </div>

          {/* Train CF Model */}
          <div className="card p-5">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
                <FiZap className="text-lg text-violet-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink">Huấn luyện CF</h3>
                <p className="text-xs text-ink-tertiary">Item-Item + User-User + ALS + Kết hợp</p>
              </div>
            </div>
            <button
              onClick={handleTrainCF}
              disabled={trainingCF}
              className="btn-primary w-full inline-flex items-center justify-center space-x-2 text-sm disabled:opacity-60"
            >
              <FiZap className={`text-xs ${trainingCF ? 'animate-pulse' : ''}`} />
              <span>{trainingCF ? 'Đang huấn luyện CF...' : 'Huấn luyện CF'}</span>
            </button>
            {cfTrainResult && (
              <div className={`mt-3 p-2.5 rounded-lg text-xs ${cfTrainResult.trained ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {cfTrainResult.trained
                  ? `✅ Item-Item CF + User-User CF + ALS + Hybrid trained (${cfTrainResult.n_orders} orders, ${cfTrainResult.n_products} products)`
                  : cfTrainResult.message}
                {cfTrainResult.models?.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {cfTrainResult.models.map((m, i) => (
                      <span key={i} className="text-[9px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">{m}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Test Session */}
          <div className="card p-5">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
                <FiServer className="text-lg text-purple-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink">Test gợi ý phiên</h3>
                <p className="text-xs text-ink-tertiary">Nhập ID sản phẩm để kiểm tra</p>
              </div>
            </div>
            <div className="flex space-x-2 mb-3">
              <input
                type="text"
                value={sessionTestIds}
                onChange={(e) => setSessionTestIds(e.target.value)}
                placeholder="VD: id-sp-1, id-sp-2"
                className="input-field text-xs flex-1"
              />
            </div>
            <button
              onClick={handleTestSession}
              disabled={sessionTesting}
              className="btn-primary w-full inline-flex items-center justify-center space-x-2 text-sm disabled:opacity-60"
            >
              <FiActivity className={`text-xs ${sessionTesting ? 'animate-pulse' : ''}`} />
              <span>{sessionTesting ? 'Đang kiểm tra...' : 'Kiểm tra gợi ý'}</span>
            </button>
            {sessionTestResult.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[10px] font-semibold text-ink-tertiary uppercase">Sản phẩm gợi ý:</p>
                {sessionTestResult.map((p) => (
                  <Link key={p.id} to={`/products/${p.slug}`}
                    className="flex items-center space-x-2 p-2 bg-surface-secondary rounded-lg hover:bg-surface-tertiary transition-colors"
                  >
                    <div className="w-6 h-6 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                      {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <span className="text-xs text-ink truncate">{p.name}</span>
                    <span className="text-[10px] text-primary-600 font-medium flex-shrink-0">{(p.discountPrice || p.price).toLocaleString('vi-VN')}₫</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ML Strategies Status */}
      <div className="p-1.5 bg-primary-50/50 rounded-[1.5rem] ring-1 ring-primary-100/50">
        <div className="bg-white rounded-[calc(1.5rem-0.375rem)] p-6">
          <h3 className="font-semibold text-ink mb-5 flex items-center space-x-2">
            <FiLayers className="text-primary-600" />              <span>Chiến lược gợi ý — AI</span>
          </h3>
          <div className="space-y-3">
            {[
              { title: 'Theo nhóm (Phân cụm)', desc: 'RFM + K-Means — gợi ý sản phẩm phổ biến trong cùng nhóm khách hàng', active: true, icon: FiActivity },
              { title: 'Theo lịch sử mua (Lọc cộng tác)', desc: 'Item-Item CF + User-User CF + ALS — gợi ý dựa trên hành vi mua của khách hàng tương tự', active: mlHealth?.healthy, icon: FiZap },
              { title: 'Theo phiên (Session)', desc: 'Ma trận Co-occurrence + Sequence — gợi ý dựa trên sản phẩm đang xem trong phiên', active: mlHealth?.healthy, icon: FiBarChart2 },
              { title: 'Tương tự (Nội dung)', desc: 'Cùng danh mục + bán chạy nhất — dự phòng khi ML không khả dụng', active: true, icon: FiInfo },
              { title: 'Xu hướng (Trending)', desc: 'Sản phẩm bán chạy nhất toàn hệ thống, cập nhật theo thời gian thực', active: true, icon: FiTrendingUp },
            ].map((strategy, idx) => {
              const Icon = strategy.icon;
              return (
                <div key={idx} className="flex items-center justify-between p-4 bg-surface-secondary rounded-xl hover:bg-surface-tertiary transition-colors">
                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      strategy.active ? 'bg-emerald-100' : 'bg-gray-100'
                    }`}>
                      <Icon className={`text-sm ${strategy.active ? 'text-emerald-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-ink">{strategy.title}</p>
                      <p className="text-sm text-ink-secondary mt-0.5">{strategy.desc}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border flex-shrink-0 ml-2 ${
                    strategy.active
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-gray-50 text-gray-400 border-gray-200'
                  }`}>
                    {strategy.active ? 'Đang chạy' : 'Cần ML'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trending products */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-ink flex items-center space-x-2">
            <FiTrendingUp className="text-primary-600" />
            <span>Sản phẩm thịnh hành</span>
          </h3>
          <button onClick={fetchTrending} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-1">
            <FiRefreshCw className="text-[10px]" />
            <span>Làm mới</span>
          </button>
        </div>
        {loading ? <LoadingSpinner /> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-fade">
            {trending.map((product) => (
              <Link key={product.id} to={`/products/${product.slug}`}
                className="group rounded-2xl overflow-hidden border border-gray-100 hover:shadow-premium-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="aspect-square bg-surface-secondary overflow-hidden">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <FiTrendingUp className="text-3xl" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-ink truncate">{product.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm font-bold text-primary-600">{(product.discountPrice || product.price).toLocaleString('vi-VN')}₫</p>
                    <span className="text-xs text-ink-tertiary">{product.soldCount} đã bán</span>
                  </div>
                  {product.category?.name && (
                    <p className="text-[10px] text-ink-tertiary mt-1">{product.category.name}</p>
                  )}
                </div>
              </Link>
            ))}
            {trending.length === 0 && (
              <div className="col-span-full py-12 text-center text-ink-tertiary">Chưa có dữ liệu</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationsPage;
