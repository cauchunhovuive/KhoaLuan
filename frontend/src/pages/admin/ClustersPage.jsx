import React, { useEffect, useState } from 'react';
import { FiRefreshCw, FiUsers, FiPieChart, FiLayers, FiCpu, FiBarChart2, FiDatabase, FiCheckCircle } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const ClustersPage = () => {
  const [clusters, setClusters] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [mlConnected, setMlConnected] = useState(false);

  const fetchClusters = () => {
    setLoading(true);
    api.get('/clusters/stats')
      .then(({ data }) => {
        setClusters(data.data.clusters || []);
        setTotalUsers(data.data.totalUsers || 0);
        setMlConnected(data.data.mlConnected || false);
      })
      .catch(() => toast.error('Không thể tải dữ liệu phân cụm'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchClusters(); }, []);

  const handleRunClustering = async () => {
    setRunning(true);
    try {
      await api.post('/clusters/run');
      toast.success('Đã chạy phân cụm thành công');
      fetchClusters();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Chạy phân cụm thất bại');
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink">Phân cụm khách hàng</h2>
          <p className="text-ink-tertiary text-sm mt-1">Phân tích RFM + Phân cụm K-Means — AI</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
            mlConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${mlConnected ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            <span>ML {mlConnected ? 'Đã kết nối' : 'Chưa kết nối'}</span>
          </div>
          <button onClick={handleRunClustering} disabled={running}
            className="btn-primary inline-flex items-center space-x-2 disabled:opacity-60">
            <FiRefreshCw className={`text-sm ${running ? 'animate-spin' : ''}`} />
            <span>{running ? 'Đang xử lý...' : 'Chạy phân cụm'}</span>
          </button>
        </div>
      </div>

      {/* Cluster cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 stagger-fade">
        {clusters.map((cluster) => (
          <div key={cluster.id} className="card p-5 hover:border-gray-200 transition-all duration-200 hover:-translate-y-0.5">
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-4 h-4 rounded-xl" style={{ backgroundColor: cluster.color || '#6366F1' }} />
              <h3 className="font-semibold text-ink">{cluster.name}</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-xl">
                <div className="flex items-center space-x-2 text-ink-secondary">
                  <FiUsers size={14} />
                  <span className="text-sm">Người dùng</span>
                </div>
                <span className="text-sm font-bold text-ink">{cluster.userCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-xl">
                <div className="flex items-center space-x-2 text-ink-secondary">
                  <FiPieChart size={14} />
                  <span className="text-sm">Phần trăm</span>
                </div>
                <span className="text-lg font-bold text-primary-600">{cluster.percentage}%</span>
              </div>
            </div>
            {cluster.description && (
              <p className="text-xs text-ink-tertiary mt-4 leading-relaxed">{cluster.description}</p>
            )}
          </div>
        ))}
      </div>

      {/* ML Cluster Profiles & Detailed Info */}
      <div className="p-1.5 bg-primary-50/50 rounded-[1.5rem] ring-1 ring-primary-100/50">
        <div className="bg-white rounded-[calc(1.5rem-0.375rem)] p-6">
          <h3 className="font-semibold text-ink mb-5 flex items-center space-x-2">
            <FiLayers className="text-primary-600" />
            <span>Hồ sơ nhóm khách hàng — RFM Analysis</span>
            {mlConnected && <FiCheckCircle className="text-emerald-500 text-sm" />}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                name: 'Khách hàng VIP',
                desc: 'Khách hàng thân thiết, chi tiêu cao, mua sắm thường xuyên. Cần ưu đãi đặc biệt và chăm sóc riêng.',
                color: '#10B981',
                rfm: 'R: 4-5 ★ | F: 4-5 ★ | M: 4-5 ★',
                strategy: 'Chương trình VIP, ưu đãi độc quyền, quà tặng sinh nhật',
              },
              {
                name: 'Khách hàng Tiềm năng',
                desc: 'Khách hàng có tiềm năng phát triển, cần được chăm sóc và khuyến khích mua nhiều hơn.',
                color: '#3B82F6',
                rfm: 'R: 3-4 ★ | F: 2-3 ★ | M: 2-3 ★',
                strategy: 'Email marketing, voucher giảm giá, gợi ý sản phẩm liên quan',
              },
              {
                name: 'Khách hàng Mới',
                desc: 'Khách hàng mới, cần trải nghiệm tốt để giữ chân và phát triển thành khách hàng trung thành.',
                color: '#F59E0B',
                rfm: 'R: 5 ★ | F: 1 ★ | M: 1-2 ★',
                strategy: 'Email chào mừng, ưu đãi lần đầu, hướng dẫn sử dụng',
              },
              {
                name: 'Khách hàng Rời rạc',
                desc: 'Khách hàng ít tương tác, cần chiến dịch tái kích hoạt và ưu đãi đặc biệt.',
                color: '#EF4444',
                rfm: 'R: 1-2 ★ | F: 1 ★ | M: 1 ★',
                strategy: 'Campaign tái kích hoạt, voucher hấp dẫn, khảo sát lý do rời bỏ',
              },
            ].map((profile, idx) => (
              <div key={idx} className="flex items-start space-x-3 p-4 bg-surface-secondary rounded-xl hover:bg-surface-tertiary transition-colors">
                <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: profile.color }} />
                <div>
                  <p className="font-medium text-ink">{profile.name}</p>
                  <p className="text-sm text-ink-secondary mt-1 leading-relaxed">{profile.desc}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-[10px] bg-violet-50 text-violet-700 px-2 py-0.5 rounded-lg border border-violet-200 font-medium">
                      {profile.rfm}
                    </span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg border border-blue-200 font-medium">
                      {profile.strategy}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Total Users Summary */}
      {totalUsers > 0 && (
        <div className="card p-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <FiDatabase className="text-lg text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-ink-tertiary">Tổng số khách hàng đã phân cụm</p>
              <p className="text-xl font-bold text-ink">{totalUsers.toLocaleString('vi-VN')} người dùng</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClustersPage;
