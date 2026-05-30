import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPackage, FiShoppingBag, FiDollarSign, FiTrendingUp, FiArrowUpRight } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const PartnerDashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: res } = await api.get('/partner/dashboard');
        setData(res.data);
      } catch (err) {
        console.error('Failed to fetch partner dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner size="skeleton" />;

  const stats = [
    { label: 'Sản phẩm đã đăng', value: data?.overview?.totalProducts || 0, icon: FiPackage, color: 'bg-blue-500', change: `${data?.overview?.activeProducts || 0} đang bán` },
    { label: 'Đơn hàng', value: data?.overview?.totalOrders || 0, icon: FiShoppingBag, color: 'bg-emerald-500', change: '' },
    { label: 'Doanh thu', value: (data?.overview?.totalRevenue || 0).toLocaleString('vi-VN') + '₫', icon: FiDollarSign, color: 'bg-violet-500', change: '' },
    { label: 'Tỉ lệ duyệt', value: data?.overview?.totalProducts > 0 ? Math.round((data?.overview?.activeProducts / data?.overview?.totalProducts) * 100) + '%' : '0%', icon: FiTrendingUp, color: 'bg-amber-500', change: 'sản phẩm active' },
  ];

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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/partner/products" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-premium-sm hover:shadow-premium-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
              <FiPackage className="text-2xl text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-ink">Quản lý sản phẩm</h3>
              <p className="text-sm text-ink-secondary mt-0.5">Thêm, sửa, xoá sản phẩm của bạn</p>
            </div>
          </div>
        </Link>
        <Link to="/partner/orders" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-premium-sm hover:shadow-premium-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <FiShoppingBag className="text-2xl text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-ink">Quản lý đơn hàng</h3>
              <p className="text-sm text-ink-secondary mt-0.5">Xem và xử lý đơn hàng</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-premium-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-ink">Đơn hàng gần đây</h2>
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
