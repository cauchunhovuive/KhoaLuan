import React, { useEffect, useState } from 'react';
import { FiTrendingUp, FiRefreshCw } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const RecommendationsPage = () => {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrending = () => {
    setLoading(true);
    api.get('/recommendations/trending')
      .then(({ data }) => setTrending(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTrending(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Gợi ý sản phẩm</h2>
          <p className="text-sm text-gray-500 mt-1">Sản phẩm gợi ý cho từng nhóm khách hàng</p>
        </div>
        <button onClick={fetchTrending} className="btn-secondary flex items-center space-x-2">
          <FiRefreshCw /><span>Làm mới</span>
        </button>
      </div>

      {/* Trending products */}
      <div className="card p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <FiTrendingUp className="text-primary-600" />
          <span>Sản phẩm thịnh hành</span>
        </h3>
        {loading ? <LoadingSpinner /> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {trending.map((product) => (
              <div key={product.id} className="card p-3">
                <div className="aspect-square bg-gray-100 rounded-lg mb-2 overflow-hidden">
                  {product.images?.[0] && (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                <p className="text-sm font-bold text-primary-600">{product.price.toLocaleString('vi-VN')}₫</p>
                <p className="text-xs text-gray-500 mt-1">Đã bán: {product.soldCount}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommendation strategies */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Chiến lược gợi ý</h3>
        <div className="space-y-4">
          {[
            { title: 'Gợi ý theo nhóm (Cluster-based)', desc: 'Sản phẩm phổ biến trong cùng nhóm khách hàng', active: true },
            { title: 'Gợi ý theo lịch sử mua (Collaborative)', desc: 'Dựa trên sản phẩm đã mua của khách hàng tương tự', active: false },
            { title: 'Sản phẩm tương tự (Content-based)', desc: 'Sản phẩm cùng danh mục với sản phẩm đã xem', active: true },
            { title: 'Xu hướng (Trending)', desc: 'Sản phẩm bán chạy nhất trong thời gian gần đây', active: true },
          ].map((strategy, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{strategy.title}</p>
                <p className="text-sm text-gray-600">{strategy.desc}</p>
              </div>
              <span className={`badge ${strategy.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-500'}`}>
                {strategy.active ? 'Đang chạy' : 'Chưa kích hoạt'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecommendationsPage;
