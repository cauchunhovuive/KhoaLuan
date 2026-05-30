import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiPackage, FiShoppingBag, FiGrid, FiTrendingUp, FiArrowUpRight } from 'react-icons/fi';
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
  if (!stats) return (
    <div className="flex flex-col items-center justify-center py-20 text-ink-secondary">
      <FiTrendingUp className="text-4xl mb-3 text-gray-300" />
      <p className="font-medium">Không thể tải dữ liệu</p>
    </div>
  );

  const overviewCards = [
    { icon: FiUsers, label: 'Người dùng', value: stats.overview.totalUsers, color: 'from-blue-500 to-blue-600', link: '/admin/users' },
    { icon: FiPackage, label: 'Sản phẩm', value: stats.overview.totalProducts, color: 'from-purple-500 to-purple-600', link: '/admin/products' },
    { icon: FiShoppingBag, label: 'Đối tác', value: stats.overview.totalPartners, color: 'from-emerald-500 to-emerald-600', link: '/admin/partners' },
    { icon: FiGrid, label: 'Danh mục', value: stats.overview.totalCategories, color: 'from-amber-500 to-amber-600', link: '/admin/categories' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink">Tổng quan</h2>
        <p className="text-ink-secondary text-sm mt-1">Thống kê hoạt động cửa hàng</p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {overviewCards.map((card) => (
          <Link key={card.label} to={card.link} className="group card p-0 overflow-hidden hover:shadow-premium-lg transition-all duration-200 hover:-translate-y-0.5">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-ink-secondary font-medium">{card.label}</p>
                <div className={`w-10 h-10 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <card.icon className="text-white text-lg" />
                </div>
              </div>
              <p className="text-3xl font-bold text-ink tracking-tight">{card.value}</p>
              <div className="flex items-center space-x-1 mt-2 text-xs text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Chi tiết</span>
                <FiArrowUpRight className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Cluster stats */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-ink">Phân cụm khách hàng</h3>
              <p className="text-xs text-ink-secondary mt-0.5">{stats.clusterStats?.length || 0} nhóm</p>
            </div>
            <Link to="/admin/clusters" className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors flex items-center space-x-0.5 group">
              <span>Chi tiết</span>
              <FiArrowUpRight className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
          <div className="space-y-3">
            {stats.clusterStats?.map((cluster) => (
              <div key={cluster.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-secondary">
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
        </div>

        {/* Top products */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-ink">Sản phẩm bán chạy</h3>
              <p className="text-xs text-ink-secondary mt-0.5">Top sản phẩm có doanh số cao nhất</p>
            </div>
            <Link to="/admin/products" className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors flex items-center space-x-0.5 group">
              <span>Xem tất cả</span>
              <FiArrowUpRight className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  <th className="pb-3 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Sản phẩm</th>
                  <th className="pb-3 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Giá</th>
                  <th className="pb-3 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Đã bán</th>
                  <th className="pb-3 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Đánh giá</th>
                </tr>
              </thead>
              <tbody>
                {stats.topProducts?.slice(0, 5).map((product, idx) => (
                  <tr key={product.id} className="border-b border-gray-50 hover:bg-surface-secondary transition-colors">
                    <td className="py-3.5">
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-mono text-ink-tertiary w-5">{String(idx + 1).padStart(2, '0')}</span>
                        <span className="font-medium text-ink">{product.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 font-medium">{product.price.toLocaleString('vi-VN')}₫</td>
                    <td className="py-3.5">
                      <span className="font-medium">{product.soldCount}</span>
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center space-x-1">
                        <span className="text-yellow-500 text-xs">★</span>
                        <span className="font-medium">{product.rating?.toFixed(1) || '0'}</span>
                      </div>
                    </td>
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
