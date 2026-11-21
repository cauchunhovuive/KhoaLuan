import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FiUsers, FiPackage, FiShoppingBag, FiGrid, FiTrendingUp, FiArrowUpRight,
  FiBarChart2, FiPieChart, FiActivity, FiUserPlus,
  FiRefreshCw, FiCalendar, FiCpu, FiCheckCircle, FiXCircle,
  FiZap, FiClock, FiLayers,
} from 'react-icons/fi';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import api from '../../services/api';

const MONTH_NAMES = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

const formatVND = (v) => {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return v;
};

/* ═══════════════════════════════════════════
   PREMIUM SKELETON COMPONENTS
   ═══════════════════════════════════════════ */

const SkeletonBlock = ({ className = '' }) => (
  <div className={`skeleton-bg rounded-xl ${className}`} />
);

const SkeletonCard = () => (
  <div className="card-double-bezel overflow-hidden">
    <div className="card-inner">
      <div className="flex items-center justify-between mb-4">
        <SkeletonBlock className="h-4 w-20" />
        <div className="w-10 h-10 rounded-xl skeleton-bg" />
      </div>
      <SkeletonBlock className="h-9 w-28 mb-2" />
      <SkeletonBlock className="h-3 w-24" />
    </div>
  </div>
);

const SkeletonSectionHeader = () => (
  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
    <div className="flex items-center space-x-3">
      <div className="w-9 h-9 rounded-xl skeleton-bg" />
      <div className="space-y-2">
        <SkeletonBlock className="h-4 w-40" />
        <SkeletonBlock className="h-3 w-24" />
      </div>
    </div>
    <SkeletonBlock className="h-6 w-20 rounded-lg" />
  </div>
);

const SkeletonChart = ({ height = 220 }) => {
  const barHeights = useMemo(
    () => [1,2,3,4,5,6,7,8,9,10,11,12].map(() => 35 + Math.random() * 65),
    []
  );
  return (
    <div className="p-6 space-y-4">
      {/* Chart area */}
      <div className="relative" style={{ height }}>
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="w-full h-px bg-gray-100" />
          ))}
        </div>
        {/* Fake line chart */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
          <path
            d="M0,160 C40,160 60,100 100,90 C140,80 160,50 200,45 C240,40 260,70 300,60 C340,50 360,30 400,25"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="2"
            className="animate-pulse-soft"
          />
        </svg>
        {/* Shimmer overlay */}
        <div className="absolute inset-0 shimmer-bg opacity-30 rounded-xl" />
      </div>

      {/* Summary boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl p-4 skeleton-bg">
            <SkeletonBlock className="h-3 w-20 mb-2" />
            <SkeletonBlock className="h-5 w-24" />
          </div>
        ))}
      </div>

      {/* Bar chart skeleton - stable heights via useMemo */}
      <div className="flex items-end space-x-3 h-20">
        {barHeights.map((h, i) => (
          <div
            key={i}
            className="flex-1 skeleton-bg rounded-t-md"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
};

const SkeletonCategoryBar = () => (
  <div className="space-y-3 p-6">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full skeleton-bg" />
            <SkeletonBlock className="h-3 w-24" />
          </div>
          <SkeletonBlock className="h-3 w-10" />
        </div>
        <div className="w-full h-2 rounded-full skeleton-bg" />
      </div>
    ))}
  </div>
);

const SkeletonOrderRow = () => (
  <div className="flex items-center px-5 py-3.5 space-x-3">
    <div className="flex items-center space-x-2 flex-1">
      <SkeletonBlock className="w-8 h-8 rounded-lg" />
      <SkeletonBlock className="h-4 w-28" />
    </div>
    <div className="flex items-center space-x-2 flex-1">
      <SkeletonBlock className="w-7 h-7 rounded-lg" />
      <SkeletonBlock className="h-4 w-20" />
    </div>
    <SkeletonBlock className="h-4 w-16 flex-shrink-0" />
    <SkeletonBlock className="h-5 w-20 rounded-lg flex-shrink-0" />
    <SkeletonBlock className="h-4 w-14 flex-shrink-0" />
  </div>
);

const DashboardSkeleton = () => (
  <div className="animate-fade-in space-y-6">
    {/* ── Header skeleton ── */}
    <div className="flex items-center justify-between">
      <div className="space-y-2.5">
        <SkeletonBlock className="h-8 w-40" />
        <SkeletonBlock className="h-4 w-64" />
      </div>
      <SkeletonBlock className="h-9 w-24 rounded-xl" />
    </div>

    {/* ── Stat cards skeleton ── */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {[1, 2, 3, 4].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>

    {/* ── Charts skeleton ── */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Revenue chart */}
      <div className="lg:col-span-2 card-double-bezel overflow-hidden">
        <div className="card-inner p-0">
          <SkeletonSectionHeader />
          <SkeletonChart height={220} />
        </div>
      </div>

      {/* Category chart */}
      <div className="card-double-bezel overflow-hidden">
        <div className="card-inner p-0">
          <SkeletonSectionHeader />
          <SkeletonCategoryBar />
        </div>
      </div>

      {/* Status chart */}
      <div className="card-double-bezel overflow-hidden">
        <div className="card-inner p-0">
          <SkeletonSectionHeader />
          <SkeletonCategoryBar />
        </div>
      </div>

      {/* User growth chart */}
      <div className="lg:col-span-2 card-double-bezel overflow-hidden">
        <div className="card-inner p-0">
          <SkeletonSectionHeader />
          <div className="p-6 space-y-4">
            {/* Summary boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl p-4 skeleton-bg">
                  <SkeletonBlock className="h-3 w-24 mb-2" />
                  <SkeletonBlock className="h-5 w-16" />
                </div>
              ))}
            </div>
            {/* Chart skeleton */}
            <div className="relative h-44">
              <div className="absolute inset-0 flex flex-col justify-between">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="w-full h-px bg-gray-100" />
                ))}
              </div>
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
                <path
                  d="M0,120 C50,120 80,90 120,80 C160,70 180,50 220,45 C260,40 280,55 320,50 C360,45 380,35 400,30"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                  className="animate-pulse-soft"
                />
              </svg>
              <div className="absolute inset-0 shimmer-bg opacity-30 rounded-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* ML Engine skeleton */}
      <div className="lg:col-span-2 card-double-bezel overflow-hidden">
        <div className="card-inner p-0">
          <SkeletonSectionHeader />
          <div className="p-5 space-y-4">
            <div className="p-4 rounded-2xl skeleton-bg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl skeleton-bg" />
                <div className="space-y-2 flex-1">
                  <SkeletonBlock className="h-4 w-44" />
                  <SkeletonBlock className="h-3 w-56" />
                </div>
                <SkeletonBlock className="h-6 w-16 rounded-full" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3.5 rounded-xl skeleton-bg">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-lg skeleton-bg" />
                    <div className="space-y-1.5 flex-1">
                      <SkeletonBlock className="h-3 w-32" />
                      <SkeletonBlock className="h-2 w-48" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Clusters skeleton */}
      <div className="card-double-bezel overflow-hidden">
        <div className="card-inner p-0">
          <SkeletonSectionHeader />
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl skeleton-bg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl skeleton-bg" />
                  <div className="space-y-1.5">
                    <SkeletonBlock className="h-4 w-28" />
                    <SkeletonBlock className="h-3 w-20" />
                  </div>
                </div>
                <SkeletonBlock className="h-5 w-8" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top products skeleton */}
      <div className="card-double-bezel overflow-hidden">
        <div className="card-inner p-0">
          <SkeletonSectionHeader />
          <div className="divide-y divide-gray-50">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center px-5 py-3.5 space-x-3">
                <SkeletonBlock className="w-6 h-6 rounded-lg" />
                <SkeletonBlock className="w-9 h-9 rounded-lg" />
                <div className="space-y-1.5 flex-1">
                  <SkeletonBlock className="h-4 w-40" />
                  <SkeletonBlock className="h-3 w-20" />
                </div>
                <SkeletonBlock className="h-5 w-12" />
                <SkeletonBlock className="h-3 w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent orders skeleton */}
      <div className="lg:col-span-2 card-double-bezel overflow-hidden">
        <div className="card-inner p-0">
          <SkeletonSectionHeader />
          <div className="divide-y divide-gray-50">
            {/* Table header */}
            <div className="flex items-center px-5 py-3 bg-surface-secondary space-x-3">
              <SkeletonBlock className="h-3 w-20 flex-1" />
              <SkeletonBlock className="h-3 w-16 flex-1" />
              <SkeletonBlock className="h-3 w-14 flex-shrink-0" />
              <SkeletonBlock className="h-3 w-16 flex-shrink-0" />
              <SkeletonBlock className="h-3 w-12 flex-shrink-0" />
            </div>
            {/* Rows */}
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonOrderRow key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════
   CHART TOOLTIP
   ═══════════════════════════════════════════ */

const ChartTooltip = ({ active, payload, label, formatter }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card px-4 py-3 animate-scale-in min-w-[140px]"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.48)',
        }}
      >
        <p className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider mb-1.5">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, idx) => (
            <div key={idx} className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                <span className="text-xs text-ink-secondary">{entry.name}</span>
              </div>
              <span className="text-xs font-bold text-ink">
                {formatter ? formatter(entry.name, entry.value) : entry.value}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-gray-100/50">
          <div className="flex items-center space-x-1 text-[9px] text-ink-tertiary">
            <FiClock className="text-[8px]" />
            <span>Hover để xem chi tiết</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

/* ═══════════════════════════════════════════
   STAT CARD
   ═══════════════════════════════════════════ */

const StatCard = ({ icon: Icon, label, value, color, link, extra, trend }) => (
  <Link to={link} className="group card-double-bezel overflow-hidden">
    <div className="card-inner">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ink-secondary font-medium">{label}</p>
        <div className={`w-10 h-10 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
          <Icon className="text-white text-lg" />
        </div>
      </div>
      <p className="text-3xl font-bold text-ink tracking-tight">{value}</p>
      {extra && <div className="mt-2">{extra}</div>}
      {trend !== undefined && (
        <div className={`flex items-center space-x-1 mt-2 text-xs ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          <FiTrendingUp className={`text-xs ${trend < 0 ? 'rotate-180' : ''}`} />
          <span>{trend >= 0 ? '+' : ''}{trend}% so với tháng trước</span>
        </div>
      )}
      <div className="flex items-center space-x-1 mt-2 text-xs text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <span>Chi tiết</span>
        <FiArrowUpRight className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </div>
    </div>
  </Link>
);

/* ═══════════════════════════════════════════
   GLASS SECTION WRAPPER
   ═══════════════════════════════════════════ */

const GlassSection = ({ icon: Icon, iconBg, iconColor, title, subtitle, action, children, fullWidth }) => (
  <div className={`${fullWidth ? 'lg:col-span-2' : ''} card-double-bezel`}>
    <div className="card-inner p-0">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center`}>
            <Icon className={`text-lg ${iconColor}`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
            {subtitle && <p className="text-xs text-ink-tertiary">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  </div>
);

/* ═══════════════════════════════════════════
   STATUS BADGE
   ═══════════════════════════════════════════ */

const StatusBadge = ({ status }) => {
  const styles = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
    SHIPPING: 'bg-purple-50 text-purple-700 border-purple-200',
    DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  };
  const labels = {
    PENDING: 'Chờ xử lý', CONFIRMED: 'Đã xác nhận', SHIPPING: 'Đang giao',
    DELIVERED: 'Đã giao', CANCELLED: 'Đã huỷ',
  };
  return (
    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border ${styles[status] || 'bg-gray-50 text-gray-700'}`}>
      {labels[status] || status}
    </span>
  );
};

/* ═══════════════════════════════════════════
   ML METRICS PANEL
   ═══════════════════════════════════════════ */

const MLMetricsPanel = ({ mlHealth }) => {
  const [mlInfo, setMlInfo] = useState(null);
  const [mlInfoLoading, setMlInfoLoading] = useState(false);

  useEffect(() => {
    if (mlHealth) {
      setMlInfoLoading(true);
      api.get('/ml/health')
        .then(({ data }) => setMlInfo(data.data?.info || data.data))
        .catch(() => {})
        .finally(() => setMlInfoLoading(false));
    }
  }, [mlHealth]);

  const models = mlInfo?.models || {};
  const modelEntries = Object.entries(models);

  return (
    <div className="p-5 space-y-4">
      {/* ML Status Bar */}
      <div className={`p-4 rounded-2xl border transition-all ${
        mlHealth
          ? 'bg-emerald-50/50 border-emerald-200'
          : 'bg-red-50/50 border-red-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              mlHealth ? 'bg-emerald-100' : 'bg-red-100'
            }`}>
              {mlHealth ? (
                <FiCheckCircle className="text-emerald-600 text-lg" />
              ) : (
                <FiXCircle className="text-red-600 text-lg" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">ML Service {mlHealth ? 'Đang hoạt động' : 'Ngoại tuyến'}</p>
              <p className="text-xs text-ink-tertiary">
                {mlHealth
                  ? `Phiên bản: ${mlInfo?.version || '2.0.0'} · ${mlInfo?.service || 'KhoaLuan AI Engine'}`
                  : 'Kết nối tới http://localhost:8000 thất bại'}
              </p>
            </div>
          </div>
          {mlHealth && (
            <span className="flex items-center space-x-1.5 text-xs text-emerald-600 bg-emerald-100 px-3 py-1.5 rounded-full font-medium">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse-soft" />
              <span>Online</span>
            </span>
          )}
        </div>
      </div>

      {/* Model Cards */}
      {modelEntries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {modelEntries.map(([key, model]) => (
            <div key={key} className="p-3.5 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiZap className="text-primary-600 text-sm" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink capitalize">{key.replace(/_/g, ' ')}</p>
                  <p className="text-[10px] text-ink-tertiary leading-relaxed mt-0.5 line-clamp-2">
                    {model.description || 'Đã sẵn sàng'}
                  </p>
                  {model.endpoints && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {model.endpoints.map((ep) => (
                        <span key={ep} className="text-[8px] bg-gray-50 text-ink-tertiary px-1.5 py-0.5 rounded-md border border-gray-100">
                          {ep}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Links */}
      <div className="flex items-center space-x-3">
        <Link to="/admin/clusters"
          className="flex items-center space-x-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 bg-violet-50 px-3.5 py-2 rounded-xl hover:bg-violet-100 transition-colors">
          <FiLayers className="text-xs" />
          <span>Phân cụm KH</span>
        </Link>
        <Link to="/admin/ml-test"
          className="flex items-center space-x-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3.5 py-2 rounded-xl hover:bg-emerald-100 transition-colors">
          <FiActivity className="text-xs" />
          <span>Kiểm tra ML</span>
        </Link>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════ */

const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div className="py-12 text-center">
    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
      <Icon className="text-2xl text-gray-300" />
    </div>
    <p className="text-sm text-ink-tertiary">{title}</p>
    {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
  </div>
);

/* ═══════════════════════════════════════════
   MAIN DASHBOARD PAGE
   ═══════════════════════════════════════════ */

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [orderStatusData, setOrderStatusData] = useState([]);
  const [userGrowthData, setUserGrowthData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, monthlyRes, catRes, statusRes, growthRes, ordersRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/monthly-chart'),
        api.get('/dashboard/category-chart'),
        api.get('/dashboard/order-status-chart'),
        api.get('/dashboard/user-growth'),
        api.get('/dashboard/recent-orders'),
      ]);
      setStats(statsRes.data.data);
      setMonthlyData(monthlyRes.data.data || []);
      setCategoryData(catRes.data.data || []);
      setOrderStatusData(statusRes.data.data || []);
      setUserGrowthData(growthRes.data.data || []);
      setRecentOrders(ordersRes.data.data || []);
    } catch (err) {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  /* ── Show premium skeleton while loading ── */
  if (loading) return <DashboardSkeleton />;

  /* ── Error state ── */
  if (!stats) return (
    <div className="flex flex-col items-center justify-center py-20 text-ink-secondary">
      <FiTrendingUp className="text-4xl mb-3 text-gray-300" />
      <p className="font-medium">Không thể tải dữ liệu</p>
      <button onClick={fetchAll} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">
        Thử lại
      </button>
    </div>
  );

  // Prepare chart data
  const chartData = monthlyData.map((m) => ({
    ...m,
    label: MONTH_NAMES[m.month - 1] || `T${m.month}`,
  }));
  const hasMonthlyData = chartData.some((m) => m.revenue > 0 || m.orders > 0);

  const growthData = userGrowthData.map((m) => ({
    ...m,
    label: MONTH_NAMES[m.month - 1] || `T${m.month}`,
  }));
  const hasGrowthData = growthData.some((m) => m.total > 0);

  const mlHealthy = stats.mlService?.healthy;

  return (
    <div className="animate-fade-in space-y-6">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink tracking-tight">Tổng quan</h2>
          <p className="text-ink-secondary text-sm mt-1">Thống kê toàn bộ hệ thống · Tự động cập nhật sau 60s</p>
        </div>
        <button onClick={fetchAll} className="btn-ghost text-sm flex items-center space-x-1.5 px-4 py-2 rounded-xl hover:bg-surface-tertiary transition-all active:scale-[0.97]">
          <FiRefreshCw className="text-xs" />
          <span>Làm mới</span>
        </button>
      </div>

      {/* ═══ Overview Cards (Premium Glass) ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={FiUsers} label="Người dùng" value={stats.overview.totalUsers}
          color="from-blue-500 to-blue-600" link="/admin/users" trend={5} />
        <StatCard icon={FiPackage} label="Sản phẩm" value={stats.overview.totalProducts}
          color="from-violet-500 to-violet-600" link="/admin/products" />
        <StatCard icon={FiShoppingBag} label="Đối tác" value={stats.overview.totalPartners}
          color="from-emerald-500 to-emerald-600" link="/admin/partners" />
        <StatCard icon={FiGrid} label="Danh mục" value={stats.overview.totalCategories}
          color="from-amber-500 to-amber-600" link="/admin/categories" />
      </div>

      {/* ═══ Main Charts Grid ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Doanh thu & Đơn hàng ── */}
        <GlassSection
          icon={FiBarChart2} iconBg="bg-violet-100" iconColor="text-violet-600"
          title="Doanh thu & Đơn hàng theo tháng"
          subtitle={`Năm ${new Date().getFullYear()}`}
          action={<span className="text-xs text-violet-600 bg-violet-50 px-3 py-1.5 rounded-lg font-medium">Theo tháng</span>}
          fullWidth
        >
          <div className="p-6">
            {hasMonthlyData ? (
              <div className="space-y-6">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4c6ef5" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#4c6ef5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#f1f5f9' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={formatVND} />
                    <Tooltip content={<ChartTooltip formatter={(name, val) => `${val.toLocaleString('vi-VN')}₫`} />} />
                    <Area type="monotone" dataKey="revenue" stroke="#4c6ef5" strokeWidth={2} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4, fill: '#4c6ef5', stroke: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-violet-50 to-white rounded-xl p-4 border border-violet-100">
                    <p className="text-xs text-ink-tertiary">Tổng doanh thu</p>
                    <p className="text-lg font-bold text-ink mt-1">
                      {chartData.reduce((s, m) => s + m.revenue, 0).toLocaleString('vi-VN')}₫
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl p-4 border border-emerald-100">
                    <p className="text-xs text-ink-tertiary">Tổng đơn hàng</p>
                    <p className="text-lg font-bold text-ink mt-1">
                      {chartData.reduce((s, m) => s + m.orders, 0)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-4 border border-amber-100">
                    <p className="text-xs text-ink-tertiary">Tổng huỷ</p>
                    <p className="text-lg font-bold text-ink mt-1">
                      {chartData.reduce((s, m) => s + m.cancelled, 0)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-white rounded-xl p-4 border border-red-100">
                    <p className="text-xs text-ink-tertiary">Doanh thu mất</p>
                    <p className="text-lg font-bold text-red-600 mt-1">
                      {chartData.reduce((s, m) => s + (m.revenueLost || 0), 0).toLocaleString('vi-VN')}₫
                    </p>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#f1f5f9' }} tickLine={false} />
                    <YAxis hide />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="orders" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="cancelled" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={FiBarChart2} title="Chưa có dữ liệu doanh thu" subtitle="Dữ liệu sẽ hiển thị sau khi có đơn hàng" />
            )}
          </div>
        </GlassSection>

        {/* ── Sản phẩm theo danh mục ── */}
        <GlassSection
          icon={FiPieChart} iconBg="bg-amber-100" iconColor="text-amber-600"
          title="Sản phẩm theo danh mục"
          subtitle={`${categoryData.length} danh mục`}
        >
          <div className="p-6">
            {categoryData.length > 0 ? (
              <div className="space-y-3">
                {categoryData.map((cat) => (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-xs text-ink truncate">{cat.name}</span>
                      </div>
                      <span className="text-xs font-medium text-ink-tertiary flex-shrink-0 ml-2">{cat.count} SP</span>
                    </div>
                    <div className="w-full h-2 bg-surface-tertiary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={FiPieChart} title="Chưa có dữ liệu" />
            )}
          </div>
        </GlassSection>

        {/* ── Trạng thái đơn hàng ── */}
        <GlassSection
          icon={FiActivity} iconBg="bg-emerald-100" iconColor="text-emerald-600"
          title="Trạng thái đơn hàng"
          subtitle={`${orderStatusData.reduce((s, o) => s + o.count, 0)} đơn`}
        >
          <div className="p-6">
            {orderStatusData.length > 0 ? (
              <div className="space-y-3">
                {orderStatusData.map((item) => (
                  <div key={item.status}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-ink">{item.label}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-ink">{item.count}</span>
                        <span className="text-[10px] text-ink-tertiary">({item.percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-surface-tertiary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${item.percentage}%`, backgroundColor: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={FiActivity} title="Chưa có đơn hàng" />
            )}
          </div>
        </GlassSection>

        {/* ── Người dùng mới ── */}
        <GlassSection
          icon={FiUserPlus} iconBg="bg-blue-100" iconColor="text-blue-600"
          title="Người dùng mới theo tháng"
          subtitle={`Năm ${new Date().getFullYear()}`}
          fullWidth
        >
          <div className="p-6">
            {hasGrowthData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-4 border border-blue-100">
                    <p className="text-xs text-ink-tertiary">Tổng người dùng mới</p>
                    <p className="text-lg font-bold text-ink mt-1">{growthData.reduce((s, m) => s + m.total, 0)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-sky-50 to-white rounded-xl p-4 border border-sky-100">
                    <p className="text-xs text-ink-tertiary">Khách hàng mới</p>
                    <p className="text-lg font-bold text-blue-600 mt-1">{growthData.reduce((s, m) => s + m.customers, 0)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl p-4 border border-emerald-100">
                    <p className="text-xs text-ink-tertiary">Đối tác mới</p>
                    <p className="text-lg font-bold text-emerald-600 mt-1">{growthData.reduce((s, m) => s + m.partners, 0)}</p>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={growthData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#f1f5f9' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="total" stroke="#4c6ef5" strokeWidth={2} dot={{ r: 3, fill: '#4c6ef5' }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="customers" stroke="#0ea5e9" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="partners" stroke="#10b981" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={FiUserPlus} title="Chưa có dữ liệu người dùng mới" />
            )}
          </div>
        </GlassSection>

        {/* ── ML Engine Metrics ── */}
        <GlassSection
          icon={FiCpu} iconBg={mlHealthy ? 'bg-emerald-100' : 'bg-gray-100'}
          iconColor={mlHealthy ? 'text-emerald-600' : 'text-gray-500'}
          title="AI Engine"
          subtitle={mlHealthy ? 'Tất cả models sẵn sàng' : 'Chưa kết nối ML Service'}
          fullWidth
        >
          <MLMetricsPanel mlHealth={mlHealthy} />
        </GlassSection>

        {/* ── Phân cụm khách hàng ── */}
        <GlassSection
          icon={FiLayers} iconBg="bg-purple-100" iconColor="text-purple-600"
          title="Phân cụm khách hàng"
          subtitle={`${stats.clusterStats?.length || 0} nhóm`}
          action={
            <Link to="/admin/clusters" className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center space-x-0.5">
              <span>Chi tiết</span>
              <FiArrowUpRight className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          }
        >
          <div className="p-5 space-y-3">
            {stats.clusterStats?.map((cluster) => (
              <div key={cluster.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-secondary hover:bg-surface-tertiary transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${cluster.color}20` }}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cluster.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{cluster.name}</p>
                    <p className="text-xs text-ink-tertiary">{cluster.percentage}% khách hàng</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-ink">{cluster.userCount}</span>
              </div>
            ))}
          </div>
        </GlassSection>

        {/* ── Sản phẩm bán chạy ── */}
        <GlassSection
          icon={FiShoppingBag} iconBg="bg-amber-100" iconColor="text-amber-600"
          title="Sản phẩm bán chạy"
          subtitle="Top doanh số"
          action={
            <Link to="/admin/products" className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center space-x-0.5">
              <span>Xem tất cả</span>
              <FiArrowUpRight className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          }
        >
          <div className="divide-y divide-gray-50">
            {stats.topProducts?.slice(0, 5).map((product, idx) => (
              <div key={product.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-surface-secondary/50 transition-colors">
                <div className="flex items-center space-x-3 min-w-0">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    idx === 0 ? 'bg-amber-100 text-amber-700' :
                    idx === 1 ? 'bg-gray-100 text-gray-600' :
                    idx === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-50 text-gray-400'
                  }`}>{idx + 1}</span>
                  <div className="w-9 h-9 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                    {product.images?.[0] && <img src={product.images[0]} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{product.name}</p>
                    <p className="text-xs text-ink-tertiary">{product.price.toLocaleString('vi-VN')}₫</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 flex-shrink-0 ml-3">
                  <span className="text-sm font-semibold text-ink">{product.soldCount}</span>
                  <span className="text-xs text-ink-tertiary">đã bán</span>
                </div>
              </div>
            ))}
          </div>
        </GlassSection>

        {/* ── Đơn hàng gần đây ── */}
        <GlassSection
          icon={FiCalendar} iconBg="bg-blue-100" iconColor="text-blue-600"
          title="Đơn hàng gần đây"
          subtitle={`${recentOrders.length} đơn mới nhất`}
          action={
            <Link to="/admin/orders" className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center space-x-0.5">
              <span>Xem tất cả</span>
              <FiArrowUpRight className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          }
          fullWidth
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-secondary text-left">
                  <th className="px-5 py-3 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Khách hàng</th>
                  <th className="px-5 py-3 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Sản phẩm</th>
                  <th className="px-5 py-3 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Tổng tiền</th>
                  <th className="px-5 py-3 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Trạng thái</th>
                  <th className="px-5 py-3 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Ngày</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-surface-secondary/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-ink">{order.user?.name}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-2">
                        {order.orderItems?.slice(0, 2).map((item, idx) => (
                          <div key={idx} className="w-8 h-8 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {item.product?.images?.[0] && <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />}
                          </div>
                        ))}
                        <span className="text-xs text-ink-tertiary truncate max-w-[120px]">
                          {order.orderItems?.[0]?.product?.name || '...'}
                          {order.orderItems?.length > 1 && ` +${order.orderItems.length - 1}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-ink">
                      {order.finalAmount?.toLocaleString('vi-VN')}₫
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3.5 text-ink-tertiary text-xs">
                      {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-ink-tertiary text-sm">
                      Chưa có đơn hàng nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassSection>
      </div>
    </div>
  );
};

export default DashboardPage;
