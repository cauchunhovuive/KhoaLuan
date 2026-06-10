import React, { useEffect, useState } from 'react';
import { FiBarChart2, FiRefreshCw, FiActivity, FiSend, FiTrash2, FiInfo, FiUsers, FiShoppingBag, FiEye, FiMousePointer, FiDollarSign, FiCheckCircle, FiXCircle, FiZap } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const ABTestingPage = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [compareResult, setCompareResult] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [logging, setLogging] = useState(false);
  const [sampleData, setSampleData] = useState({ customers: [], products: [] });
  const [loggingBatch, setLoggingBatch] = useState(false);

  // Log form
  const [logForm, setLogForm] = useState({
    group: 'control',
    userId: '',
    productId: '',
    action: 'impression',
    revenue: 0,
  });

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/ml/abtest/report');
      const raw = data.data || data;
      // Map metrics_per_group lên top-level cho frontend dễ đọc
      setReport({
        ...raw.metrics_per_group,
        comparisons: raw.comparisons,
        confidence_level: raw.confidence_level,
        groups: raw.groups,
      });
    } catch (err) {
      toast.error('Không thể tải báo cáo A/B Test');
    } finally {
      setLoading(false);
    }
  };

  // Lấy dữ liệu mẫu cho nút Log Mẫu
  const fetchSampleData = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        api.get('/users?role=CUSTOMER&limit=20'),
        api.get('/products?limit=20'),
      ]);
      const customers = custRes.data?.data?.users || custRes.data?.users || [];
      const products = prodRes.data?.data?.products || prodRes.data?.products || [];
      setSampleData({ customers, products });
    } catch (e) {
      // Không lấy được dữ liệu mẫu — vẫn hoạt động bình thường
    }
  };

  useEffect(() => {
    fetchReport();
    fetchSampleData();
  }, []);

  const handleCompare = async () => {
    setComparing(true);
    setCompareResult(null);
    try {
      const { data } = await api.post('/ml/abtest/compare', {
        groupA: 'control',
        groupB: 'treatment',
      });
      const raw = data.data || data;
      // So sánh trả về dict với key là 'control_vs_treatment' chứa comparison data
      const comparisons = raw.comparisons || raw;
      setCompareResult(comparisons);
      toast.success('So sánh hoàn tất!');
    } catch (err) {
      toast.error('So sánh thất bại');
    } finally {
      setComparing(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Xác nhận reset toàn bộ dữ liệu A/B Test?')) return;
    setResetting(true);
    try {
      await api.post('/ml/abtest/reset');
      toast.success('Đã reset A/B Test');
      setCompareResult(null);
      fetchReport();
    } catch (err) {
      toast.error('Reset thất bại');
    } finally {
      setResetting(false);
    }
  };

  const getRandomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const handleLog = async () => {
    if (!logForm.userId || !logForm.productId) {
      toast.error('Nhập userId và productId');
      return;
    }
    setLogging(true);
    try {
      await api.post('/ml/abtest/log', logForm);
      toast.success(`Đã ghi: ${logForm.group} - ${logForm.action}`);
      // Sau khi ghi thành công, tự động fill userId + productId ngẫu nhiên từ dữ liệu mẫu
      const { customers, products } = sampleData;
      const nextCust = customers.length > 0 ? getRandomFrom(customers) : null;
      const nextProd = products.length > 0 ? getRandomFrom(products) : null;
      setLogForm({
        group: logForm.group === 'control' ? 'treatment' : 'control',  // Đảo nhóm
        userId: nextCust?.id || '',
        productId: nextProd?.id || '',
        action: 'impression',
        revenue: 0,
      });
      fetchReport();
    } catch (err) {
      toast.error('Ghi nhận thất bại');
    } finally {
      setLogging(false);
    }
  };

  // Log mẫu nhanh: gửi trực tiếp một tương tác (không cần điền form)
  const handleQuickLog = async (group, action, revenue = 0) => {
    const { customers, products } = sampleData;
    const randCust = customers[Math.floor(Math.random() * customers.length)];
    const randProd = products[Math.floor(Math.random() * products.length)];
    if (!randCust || !randProd) {
      toast.error('Không có dữ liệu mẫu');
      return;
    }
    try {
      await api.post('/ml/abtest/log', {
        group,
        userId: randCust.id,
        productId: randProd.id,
        action,
        revenue,
      });
      toast.success(`✅ Đã ghi: ${group} - ${action}`, { duration: 2000 });
      fetchReport();
    } catch (err) {
      toast.error('Ghi thất bại');
    }
  };

  // Log mẫu: gửi trực tiếp 5 tương tác (batch)
  const handleSampleBatch = async () => {
    const { customers, products } = sampleData;
    if (customers.length < 2 || products.length < 2) {
      toast.error('Cần ít nhất 2 khách hàng và 2 sản phẩm');
      return;
    }
    setLoggingBatch(true);
    try {
      const actions = ['impression', 'impression', 'click', 'add_to_cart', 'purchase'];
      const revenues = [0, 0, 0, 0, 500000];
      const batch = actions.map((action, i) => ({
        group: i % 2 === 0 ? 'control' : 'treatment',
        userId: customers[i % customers.length].id,
        productId: products[i % products.length].id,
        action,
        revenue: revenues[i],
      }));
      for (const log of batch) {
        await api.post('/ml/abtest/log', log);
      }
      toast.success(`Đã ghi ${batch.length} tương tác mẫu!`);
      fetchReport();
    } catch (err) {
      toast.error('Ghi batch thất bại');
    } finally {
      setLoggingBatch(false);
    }
  };

  // Format giá trị compare dựa trên loại metric
  const formatCompareValue = (key, value) => {
    if (typeof value !== 'number') return String(value);
    // Các metric là tỷ lệ (0-1) → nhân 100 thành %
    const rateMetrics = ['ctr', 'conversion_rate', 'purchase_rate', 'click_rate', 'impression_rate', 'rate'];
    if (rateMetrics.some(m => key.includes(m))) {
      return (value * 100).toFixed(1) + '%';
    }
    // Revenue → format tiền VNĐ
    if (key.includes('revenue') || key.includes('doanh_thu')) {
      return value.toLocaleString('vi-VN') + '₫';
    }
    // Còn lại (sample_size, clicks, purchases, ...) → số nguyên
    return value.toLocaleString('vi-VN');
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">Thử nghiệm A/B</h2>
          <p className="text-ink-tertiary text-sm mt-1">So sánh hiệu quả chiến lược gợi ý — Nhóm đối chứng vs Nhóm thử nghiệm</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => { fetchReport(); fetchSampleData(); }} className="btn-secondary inline-flex items-center space-x-2 text-sm">
            <FiRefreshCw className="text-xs" />
            <span>Làm mới</span>
          </button>
          <button onClick={handleReset} disabled={resetting}
            className="btn-secondary inline-flex items-center space-x-2 text-sm text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-60"
          >
            <FiTrash2 className="text-xs" />
            <span>{resetting ? 'Đang xoá...' : 'Xoá dữ liệu'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Report */}
        <div className="lg:col-span-2 card p-6">
          <h3 className="font-semibold text-ink mb-4 flex items-center space-x-2">
            <FiBarChart2 className="text-primary-600" />
            <span>Báo cáo A/B</span>
          </h3>

          {loading ? (
            <LoadingSpinner />
          ) : report ? (
            <div className="space-y-4">
              {/* Summary stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Sự kiện Đối chứng', value: report.control?.total_events || 0, icon: FiEye, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Sự kiện Thử nghiệm', value: report.treatment?.total_events || 0, icon: FiEye, color: 'text-violet-600', bg: 'bg-violet-50' },
                  { label: 'Click Đối chứng', value: report.control?.clicks || 0, icon: FiMousePointer, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Click Thử nghiệm', value: report.treatment?.clicks || 0, icon: FiMousePointer, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map((stat) => (
                  <div key={stat.label} className={`${stat.bg} rounded-xl p-4`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <stat.icon className={`text-sm ${stat.color}`} />
                      <p className="text-xs text-ink-tertiary">{stat.label}</p>
                    </div>
                    <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 bg-surface-secondary rounded-xl">
                  <p className="text-xs font-semibold text-ink-tertiary uppercase mb-2">Nhóm Đối chứng (Control)</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Mua hàng:</span><span className="font-semibold">{report.control?.purchases || 0}</span></div>
                    <div className="flex justify-between"><span>Doanh thu:</span><span className="font-semibold">{(report.control?.revenue || 0).toLocaleString('vi-VN')}₫</span></div>
                    <div className="flex justify-between"><span>Người dùng:</span><span className="font-semibold">{report.control?.unique_users || 0}</span></div>
                    <div className="flex justify-between"><span>CTR:</span><span className="font-semibold">{report.control?.ctr ? (report.control.ctr * 100).toFixed(1) + '%' : '0%'}</span></div>
                  </div>
                </div>
                <div className="p-4 bg-surface-secondary rounded-xl">
                  <p className="text-xs font-semibold text-ink-tertiary uppercase mb-2">Nhóm Thử nghiệm (Treatment)</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Mua hàng:</span><span className="font-semibold">{report.treatment?.purchases || 0}</span></div>
                    <div className="flex justify-between"><span>Doanh thu:</span><span className="font-semibold">{(report.treatment?.revenue || 0).toLocaleString('vi-VN')}₫</span></div>
                    <div className="flex justify-between"><span>Người dùng:</span><span className="font-semibold">{report.treatment?.unique_users || 0}</span></div>
                    <div className="flex justify-between"><span>CTR:</span><span className="font-semibold">{report.treatment?.ctr ? (report.treatment.ctr * 100).toFixed(1) + '%' : '0%'}</span></div>
                  </div>
                </div>
              </div>

              {/* Comparison */}
              {report.comparisons && (() => {
                const compKey = Object.keys(report.comparisons)[0];
                const compData = compKey ? report.comparisons[compKey] : null;
                if (!compData) return null;
                return (
                  <div className="p-4 bg-gradient-to-r from-primary-50 to-violet-50 rounded-xl border border-primary-100">
                    <p className="text-xs font-semibold text-ink-tertiary uppercase mb-2">So sánh</p>
                    <div className="space-y-1 text-sm">
                      {Object.entries(compData).map(([key, val]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-ink-secondary">{key.replace(/_/g, ' ')}</span>
                          {typeof val === 'object' && val !== null ? (
                            <span className="font-semibold text-ink">
                              {val.winner ? `${val.winner} (${val.improvement_pct > 0 ? '+' : ''}${val.improvement_pct}%)` : ''}
                            </span>
                          ) : (
                            <span className={`font-semibold ${typeof val === 'number' && val > 0 ? 'text-emerald-600' : typeof val === 'number' && val < 0 ? 'text-red-600' : 'text-ink'}`}>
                              {typeof val === 'number' ? (val > 0 ? '+' : '') + (val * 100).toFixed(1) + '%' : String(val)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="py-12 text-center text-ink-tertiary">Chưa có dữ liệu. Nhấn <strong>"Ghi 5 tương tác mẫu"</strong> để bắt đầu!</div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Log Interaction */}
          <div className="card p-5">
            <h3 className="font-semibold text-ink mb-4 flex items-center space-x-2">
              <FiSend className="text-primary-600 text-sm" />
              <span>Ghi nhận tương tác</span>
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-ink-tertiary mb-1 block">Nhóm</label>
                <select value={logForm.group} onChange={(e) => setLogForm(p => ({ ...p, group: e.target.value }))}
                  className="input-field text-xs w-full">
                  <option value="control">Đối chứng (Control)</option>
                  <option value="treatment">Thử nghiệm (Treatment)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-ink-tertiary mb-1 block">Mã người dùng</label>
                <input type="text" value={logForm.userId} onChange={(e) => setLogForm(p => ({ ...p, userId: e.target.value }))}
                  placeholder="user-id" className="input-field text-xs w-full" />
              </div>
              <div>
                <label className="text-xs text-ink-tertiary mb-1 block">Mã sản phẩm</label>
                <input type="text" value={logForm.productId} onChange={(e) => setLogForm(p => ({ ...p, productId: e.target.value }))}
                  placeholder="product-id" className="input-field text-xs w-full" />
              </div>
              <div>
                <label className="text-xs text-ink-tertiary mb-1 block">Hành động</label>
                <select value={logForm.action} onChange={(e) => setLogForm(p => ({ ...p, action: e.target.value }))}
                  className="input-field text-xs w-full">
                  <option value="impression">Xem (Impression)</option>
                  <option value="click">Nhấp (Click)</option>
                  <option value="add_to_cart">Thêm giỏ hàng</option>
                  <option value="purchase">Mua hàng</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-ink-tertiary mb-1 block">Doanh thu (₫)</label>
                <input type="number" value={logForm.revenue} onChange={(e) => setLogForm(p => ({ ...p, revenue: parseFloat(e.target.value) || 0 }))}
                  className="input-field text-xs w-full" />
              </div>

              {/* Nút ghi nhận */}
              <button onClick={handleLog} disabled={logging}
                className="btn-primary w-full inline-flex items-center justify-center space-x-2 text-sm disabled:opacity-60">
                <FiSend className={`text-xs ${logging ? 'animate-spin' : ''}`} />
                <span>{logging ? 'Đang ghi...' : 'Ghi nhận'}</span>
              </button>

              {/* Nút Log Mẫu — nhanh chóng tạo dữ liệu test */}
              {sampleData.customers.length > 0 && sampleData.products.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-[10px] font-semibold text-ink-tertiary uppercase mb-2">Log mẫu nhanh</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleQuickLog('control', 'impression')}
                      className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors active:scale-95">
                      👁 Đối chứng Xem
                    </button>
                    <button onClick={() => handleQuickLog('treatment', 'click')}
                      className="text-[10px] bg-violet-50 text-violet-700 px-2 py-1.5 rounded-lg border border-violet-200 hover:bg-violet-100 transition-all active:scale-95">
                      🖱 Thử nghiệm Click
                    </button>
                    <button onClick={() => handleQuickLog('control', 'add_to_cart')}
                      className="text-[10px] bg-amber-50 text-amber-700 px-2 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-100 transition-all active:scale-95">
                      🛒 Đối chứng Thêm giỏ
                    </button>
                    <button onClick={() => handleQuickLog('treatment', 'purchase', 500000)}
                      className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-all active:scale-95">
                      💰 Thử nghiệm Mua (500K)
                    </button>
                  </div>
                  <button onClick={handleSampleBatch} disabled={loggingBatch}
                    className="mt-2 w-full text-xs bg-gradient-to-r from-primary-500 to-violet-500 text-white px-2 py-2.5 rounded-lg hover:opacity-90 transition-all disabled:opacity-60 inline-flex items-center justify-center space-x-1.5 active:scale-[0.98] font-medium"
                  >
                    <FiZap className={`text-sm ${loggingBatch ? 'animate-pulse' : ''}`} />
                    <span>{loggingBatch ? 'Đang ghi 5 mẫu...' : '⚡ Ghi 5 tương tác mẫu'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Compare */}
          <div className="card p-5">
            <h3 className="font-semibold text-ink mb-4 flex items-center space-x-2">
              <FiActivity className="text-primary-600 text-sm" />
              <span>So sánh nhóm</span>
            </h3>
            <button onClick={handleCompare} disabled={comparing}
              className="btn-primary w-full inline-flex items-center justify-center space-x-2 text-sm disabled:opacity-60">
              <FiBarChart2 className={`text-xs ${comparing ? 'animate-pulse' : ''}`} />
              <span>{comparing ? 'Đang so sánh...' : 'So sánh Đối chứng vs Thử nghiệm'}</span>
            </button>
            {compareResult && (
              <div className="mt-3 p-3 bg-surface-secondary rounded-xl text-xs space-y-1">
                {Object.entries(compareResult).map(([key, val]) => (
                  <div key={key} className="py-1">
                    <p className="text-ink-tertiary font-medium mb-1">{key.replace(/_/g, ' ')}</p>
                    {typeof val === 'object' && val !== null ? (
                      <div className="space-y-0.5 pl-2">
                        {val.control !== undefined && <div className="flex justify-between"><span>Control:</span><span>{formatCompareValue(key, val.control)}</span></div>}
                        {val.treatment !== undefined && <div className="flex justify-between"><span>Treatment:</span><span>{formatCompareValue(key, val.treatment)}</span></div>}
                        {val.winner !== undefined && <div className="flex justify-between font-medium text-primary-600"><span>Người thắng:</span><span>{val.winner}</span></div>}
                        {val.improvement_pct !== undefined && <div className="flex justify-between"><span>Cải thiện:</span><span className={val.improvement_pct > 0 ? 'text-emerald-600' : 'text-red-600'}>{val.improvement_pct > 0 ? '+' : ''}{val.improvement_pct}%</span></div>}
                      </div>
                    ) : (
                      <span className="font-semibold text-ink">{String(val)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ABTestingPage;
