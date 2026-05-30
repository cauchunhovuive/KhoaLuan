import React, { useEffect, useState } from 'react';
import { FiTrendingUp, FiRefreshCw, FiLayers } from 'react-icons/fi';
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
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink">Gợi ý sản phẩm</h2>
          <p className="text-ink-tertiary text-sm mt-1">Sản phẩm gợi ý cho từng nhóm khách hàng</p>
        </div>
        <button onClick={fetchTrending} className="btn-secondary inline-flex items-center space-x-2">
          <FiRefreshCw className="text-sm" />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Trending products */}
      <div className="card p-6">
        <h3 className="font-semibold text-ink mb-5 flex items-center space-x-2">
          <FiTrendingUp className="text-primary-600" />
          <span>Sản phẩm thịnh hành</span>
        </h3>
        {loading ? <LoadingSpinner /> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-fade">
            {trending.map((product) => (
              <div key={product.id} className="group rounded-2xl overflow-hidden border border-gray-100 hover:shadow-premium-md hover:-translate-y-0.5 transition-all duration-200">
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
                  <p className="text-sm font-bold text-primary-600 mt-1">{product.price.toLocaleString('vi-VN')}₫</p>
                  <p className="text-xs text-ink-tertiary mt-1">Đã bán: {product.soldCount}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommendation strategies */}
      <div className="p-1.5 bg-primary-50/50 rounded-[1.5rem] ring-1 ring-primary-100/50">
        <div className="bg-white rounded-[calc(1.5rem-0.375rem)] p-6">
          <h3 className="font-semibold text-ink mb-5 flex items-center space-x-2">
            <FiLayers className="text-primary-600" />
            <span>Chiến lược gợi ý</span>
          </h3>
          <div className="space-y-3">
            {[
              { title: 'Gợi ý theo nhóm (Cluster-based)', desc: 'Sản phẩm phổ biến trong cùng nhóm khách hàng', active: true },
              { title: 'Gợi ý theo lịch sử mua (Collaborative)', desc: 'Dựa trên sản phẩm đã mua của khách hàng tương tự', active: false },
              { title: 'Sản phẩm tương tự (Content-based)', desc: 'Sản phẩm cùng danh mục với sản phẩm đã xem', active: true },
              { title: 'Xu hướng (Trending)', desc: 'Sản phẩm bán chạy nhất trong thời gian gần đây', active: true },
            ].map((strategy, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-surface-secondary rounded-xl hover:bg-surface-tertiary transition-colors">
                <div>
                  <p className="font-medium text-ink">{strategy.title}</p>
                  <p className="text-sm text-ink-secondary mt-0.5">{strategy.desc}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border ${
                  strategy.active 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-gray-50 text-gray-400 border-gray-200'
                }`}>
                  {strategy.active ? 'Đang chạy' : 'Chưa kích hoạt'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendationsPage;
