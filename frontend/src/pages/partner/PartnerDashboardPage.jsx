import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiPackage, FiShoppingBag, FiDollarSign, FiTrendingUp, FiArrowUpRight,
  FiBarChart2, FiAward, FiChevronRight, FiRefreshCw,
} from 'react-icons/fi';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white shadow-premium-lg border border-gray-100 rounded-xl px-4 py-3">
        <p className="text-xs font-medium text-ink-tertiary mb-1">Tháng {label}</p>
        {payload.map((entry, idx) => (
          <p key={idx} className="text-sm font-semibold" style={{ color: entry.color }}>
            {entry.name === 'revenue' ? `${entry.value.toLocaleString('vi-VN')}₫` : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ProductTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white shadow-premium-lg border border-gray-100 rounded-xl px-4 py-3">
        <p className="text-xs font-medium text-ink-tertiary mb-1">{payload[0]?.payload?.name}</p>
        <p className="text-sm font-semibold text-violet-600">{payload[0]?.value?.toLocaleString('vi-VN')}₫</p>
      </div>
    );
  }
  return null;
};

const monthNames = ['', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

const PartnerDashboardPage = () => {
  const [data, setData] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchData = async () => {
    try {
      const [dashboardRes, revenueRes] = await Promise.all([
        api.get('/partner/dashboard'),
        api.get('/partner/revenue?period=monthly'),
      ]);
      setData(dashboardRes.data.data);
      setRevenueData(revenueRes.data.data);
    } catch (err) {
      console.error('Failed to fetch partner dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <LoadingSpinner size="skeleton" />;

  const stats = [
    {
      label: 'Sản phẩm đã đăng',
      value: data?.overview?.totalProducts || 0,
      icon: FiPackage,
      color: 'bg-blue-500',
      change: `${data?.overview?.activeProducts || 0} đang bán`,
    },
    {
      label: 'Đơn hàng',
      value: data?.overview?.totalOrders || 0,
      icon: FiShoppingBag,
      color: 'bg-emerald-500',
      change: '',
    },
    {
      label: 'Doanh thu',
      value: (data?.overview?.totalRevenue || 0).toLocaleString('vi-VN') + '₫',
      icon: FiDollarSign,
      color: 'bg-violet-500',
      change: `${revenueData?.totalOrders || 0} đơn đã giao`,
    },
    {
      label: 'Tỉ lệ duyệt',
      value: data?.overview?.totalProducts > 0
        ? Math.round((data?.overview?.activeProducts / data?.overview?.totalProducts) * 100) + '%'
        : '0%',
      icon: FiTrendingUp,
      color: 'bg-amber-500',
      change: 'sản phẩm active',
    },
  ];

  // Prepare chart data
  const chartData = Array.from({ length: 12 }, (_, i) => ({
    name: i + 1,
    month: monthNames[i + 1],
    revenue: 0,
    orders: 0,
  }));

  revenueData?.monthlyRevenue?.forEach((m) => {
    if (m.month >= 1 && m.month <= 12) {
      chartData[m.month - 1].revenue = m.revenue;
      chartData[m.month - 1].orders = m.orders;
    }
  });

  const hasRevenueData = chartData.some((m) => m.revenue > 0);

  return (
    <div className="space-y-6 stagger-fade">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-premium-sm hover:shadow-premium-md transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center shadow-sm`}>
                <stat.icon className="text-white text-lg" />
              </div>
            </div>
            <p className="text-2xl font-bold text-ink">{stat.value}</p>
            <p className="text-sm text-ink-secondary mt-1">{stat.label}</p>
            {stat.change && (
              <p className="text-xs text-ink-tertiary mt-1 flex items-center">
                <FiArrowUpRight className="mr-0.5" />
                {stat.change}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-premium-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
              <FiBarChart2 className="text-lg text-violet-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink">Doanh thu theo tháng</h2>
              <p className="text-xs text-ink-tertiary">
                Năm {new Date().getFullYear()} · Tổng: {(revenueData?.totalRevenue || 0).toLocaleString('vi-VN')}₫
              </p>
            </div>
          </div>
          <span className="text-xs text-violet-600 bg-violet-50 px-3 py-1.5 rounded-lg font-medium">
            Theo tháng
          </span>
        </div>
        <div className="p-6">
          {hasRevenueData ? (
            <div className="space-y-6">
              {/* Revenue Area Chart */}
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#f1f5f9' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#7c3aed"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#7c3aed', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>

              {/* Orders Bar Chart */}
              <div>
                <p className="text-xs font-medium text-ink-tertiary mb-3 uppercase tracking-wider">Số đơn hàng theo tháng</p>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={{ stroke: '#f1f5f9' }}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="orders" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <FiBarChart2 className="text-2xl text-gray-300" />
              </div>
              <p className="text-sm text-ink-tertiary">Chưa có dữ liệu doanh thu</p>
              <p className="text-xs text-gray-400 mt-1">Dữ liệu sẽ xuất hiện sau khi có đơn hàng hoàn thành</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Products */}
      {revenueData?.topProducts?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-premium-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-3">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
              <FiAward className="text-lg text-amber-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink">Top sản phẩm bán chạy</h2>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {revenueData.topProducts.map((product, idx) => (
              <div key={idx} className="px-6 py-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    idx === 0 ? 'bg-amber-100 text-amber-700' :
                    idx === 1 ? 'bg-gray-100 text-gray-600' :
                    idx === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-50 text-gray-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="w-9 h-9 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                    {product.image && (
                      <img src={product.image} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{product.name}</p>
                    <p className="text-xs text-ink-tertiary">Đã bán: {product.quantity}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-violet-600 flex-shrink-0 ml-4">
                  {product.revenue.toLocaleString('vi-VN')}₫
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/partner/products" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-premium-sm hover:shadow-premium-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
              <FiPackage className="text-2xl text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-ink">Quản lý sản phẩm</h3>
              <p className="text-sm text-ink-secondary mt-0.5">Thêm, sửa, xoá sản phẩm của bạn</p>
            </div>
            <FiChevronRight className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
          </div>
        </Link>
        <Link to="/partner/orders" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-premium-sm hover:shadow-premium-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <FiShoppingBag className="text-2xl text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-ink">Quản lý đơn hàng</h3>
              <p className="text-sm text-ink-secondary mt-0.5">Xem và xử lý đơn hàng</p>
            </div>
            <FiChevronRight className="text-gray-300 group-hover:text-blue-500 transition-colors" />
          </div>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-premium-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Đơn hàng gần đây</h2>
          <Link to="/partner/orders" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center space-x-1">
            <span>Xem tất cả</span>
            <FiChevronRight className="text-[10px]" />
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {data?.recentOrders?.length > 0 ? (
            data.recentOrders.slice(0, 5).map((item, idx) => (
              <div key={idx} className="px-6 py-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden">
                    {item.product?.images?.[0] && (
                      <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{item.product?.name}</p>
                    <p className="text-xs text-ink-tertiary">SL: {item.quantity} - {item.order?.user?.name}</p>
                  </div>
                </div>
                <span className={`badge text-xs ${
                  item.order?.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                  item.order?.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                  item.order?.status === 'SHIPPING' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {item.order?.status === 'PENDING' && 'Chờ xử lý'}
                  {item.order?.status === 'CONFIRMED' && 'Đã xác nhận'}
                  {item.order?.status === 'SHIPPING' && 'Đang giao'}
                  {item.order?.status === 'DELIVERED' && 'Đã giao'}
                  {item.order?.status === 'CANCELLED' && 'Đã huỷ'}
                </span>
              </div>
            ))
          ) : (
            <div className="px-6 py-12 text-center text-gray-400">
              <FiShoppingBag className="mx-auto text-2xl mb-2" />
              <p className="text-sm">Chưa có đơn hàng nào</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PartnerDashboardPage;
