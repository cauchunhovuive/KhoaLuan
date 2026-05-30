import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiHeart, FiShoppingBag, FiBox } from 'react-icons/fi';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const FollowedShopsPage = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchShops = () => {
    setLoading(true);
    api.get('/users/follow')
      .then(({ data }) => setShops(data.data))
      .catch(() => toast.error('Không thể tải danh sách'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchShops(); }, []);

  const handleUnfollow = async (partnerId) => {
    try {
      await api.delete(`/users/follow/${partnerId}`);
      toast.success('Đã bỏ theo dõi');
      fetchShops();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-ink mb-6">Cửa hàng đã theo dõi</h1>

      <div className="space-y-3">
        {shops.map((s) => (
          <div key={s.id} className="card p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 min-w-0 flex-1">
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {s.partner?.avatar ? (
                    <img src={s.partner.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <FiBox className="text-emerald-600 text-xl" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-ink">{s.partner?.storeName || s.partner?.name}</h3>
                  {s.partner?.storeDescription && (
                    <p className="text-sm text-ink-tertiary mt-0.5 line-clamp-2">{s.partner.storeDescription}</p>
                  )}
                  <p className="text-xs text-ink-tertiary mt-1.5">Theo dõi từ {new Date(s.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
              <div className="flex items-start space-x-2 ml-4">
                <button onClick={() => handleUnfollow(s.partner.id)}
                  className="px-4 py-2 text-sm font-medium bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors">
                  Bỏ theo dõi
                </button>
              </div>
            </div>
          </div>
        ))}
        {shops.length === 0 && (
          <div className="text-center py-16 text-ink-tertiary">
            <FiHeart className="text-3xl mx-auto mb-3" />
            <p className="font-medium">Chưa theo dõi cửa hàng nào</p>
            <p className="text-sm mt-1">Theo dõi cửa hàng yêu thích để nhận thông tin khuyến mãi</p>
            <Link to="/products" className="btn-primary inline-flex items-center space-x-2 mt-4">
              <FiShoppingBag /><span>Khám phá ngay</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowedShopsPage;
