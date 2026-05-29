import React, { useEffect, useState } from 'react';
import { FiRefreshCw, FiUsers, FiPieChart } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const ClustersPage = () => {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchClusters = () => {
    setLoading(true);
    api.get('/clusters/stats')
      .then(({ data }) => setClusters(data.data.clusters || []))
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Phân cụm khách hàng</h2>
          <p className="text-sm text-gray-500 mt-1">RFM Analysis + K-Means Clustering</p>
        </div>
        <button onClick={handleRunClustering} disabled={running}
          className="btn-primary flex items-center space-x-2">
          <FiRefreshCw className={`${running ? 'animate-spin' : ''}`} />
          <span>{running ? 'Đang xử lý...' : 'Chạy phân cụm'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {clusters.map((cluster) => (
          <div key={cluster.id} className="card p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cluster.color || '#6366F1' }} />
              <h3 className="font-semibold text-gray-900">{cluster.name}</h3>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-gray-600">
                <FiUsers />
                <span className="text-sm">{cluster.userCount} người dùng</span>
              </div>
              <span className="text-lg font-bold text-primary-600">{cluster.percentage}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Cluster details */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <FiPieChart className="text-primary-600" />
          <span>Chi tiết các nhóm khách hàng</span>
        </h3>
        <div className="space-y-4">
          {[
            { name: 'Khách hàng VIP', desc: 'Khách hàng thân thiết, chi tiêu cao, mua sắm thường xuyên. Cần ưu đãi đặc biệt và chăm sóc riêng.', color: '#10B981' },
            { name: 'Khách hàng Tiềm năng', desc: 'Khách hàng có tiềm năng phát triển, cần được chăm sóc và khuyến khích mua nhiều hơn.', color: '#3B82F6' },
            { name: 'Khách hàng Mới', desc: 'Khách hàng mới, cần trải nghiệm tốt để giữ chân và phát triển thành khách hàng trung thành.', color: '#F59E0B' },
            { name: 'Khách hàng Rời rạc', desc: 'Khách hàng ít tương tác, cần chiến dịch tái kích hoạt và ưu đãi đặc biệt.', color: '#EF4444' },
          ].map((profile, idx) => (
            <div key={idx} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
              <div className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: profile.color }} />
              <div>
                <p className="font-medium text-gray-900">{profile.name}</p>
                <p className="text-sm text-gray-600 mt-1">{profile.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClustersPage;
