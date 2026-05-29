import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiPackage, FiShoppingBag, FiDollarSign, FiTrendingUp, FiPieChart } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(({ data }) => setStats(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!stats) return <p className="text-gray-500">Không thể tải dữ liệu</p>;

  const overviewCards = [
    { icon: FiUsers, label: 'Người dùng', value: stats.overview.totalUsers, color: 'bg-blue-500', link: '/admin/users' },
    { icon: FiPackage, label: 'Sản phẩm', value: stats.overview.totalProducts, color: 'bg-purple-500', link: '/admin/products' },
    { icon: FiShoppingBag, label: 'Đơn hàng', value: stats.overview.totalOrders, color: 'bg-green-500', link: '/admin/orders' },
    { icon: FiDollarSign, label: 'Doanh thu', value: `${(stats.overview.totalRevenue / 1000000).toFixed(1)}M`, color: 'bg-orange-500', link: '/admin/orders' },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Tổng quan</h2>

      {/* Overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {overviewCards.map((card) => (
          <Link key={card.label} to={card.link} className="card p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center`}>
                <card.icon className="text-white text-xl" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent orders */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Đơn hàng gần đây</h3>
            <Link to="/admin/orders" className="text-sm text-primary-600 hover:text-primary-700">Xem tất cả</Link>
          </div>
          <div className="space-y-3">
            {stats.recentOrders?.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-900">#{order.id.slice(0, 8)}</p>
                  <p className="text-gray-500">{order.user?.name}</p>
                </div>
                <span className="font-medium">{order.finalAmount.toLocaleString('vi-VN')}₫</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cluster stats */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Phân cụm khách hàng</h3>
            <Link to="/admin/clusters" className="text-sm text-primary-600 hover:text-primary-700">Chi tiết</Link>
          </div>
          <div className="space-y-3">
            {stats.clusterStats?.map((cluster) => (
              <div key={cluster.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cluster.color }} />
                  <span className="text-sm text-gray-700">{cluster.name}</span>
                </div>
                <span className="text-sm font-medium">{cluster.userCount} người dùng</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top products */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Sản phẩm bán chạy</h3>
            <Link to="/admin/products" className="text-sm text-primary-600 hover:text-primary-700">Xem tất cả</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-3 font-medium">Sản phẩm</th>
                  <th className="pb-3 font-medium">Giá</th>
                  <th className="pb-3 font-medium">Đã bán</th>
                  <th className="pb-3 font-medium">Đánh giá</th>
                </tr>
              </thead>
              <tbody>
                {stats.topProducts?.slice(0, 5).map((product) => (
                  <tr key={product.id} className="border-b border-gray-50">
                    <td className="py-3 font-medium text-gray-900">{product.name}</td>
                    <td className="py-3">{product.price.toLocaleString('vi-VN')}₫</td>
                    <td className="py-3">{product.soldCount}</td>
                    <td className="py-3">{product.rating?.toFixed(1) || '0'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
