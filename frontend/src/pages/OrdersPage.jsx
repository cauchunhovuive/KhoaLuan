import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiPackage, FiChevronRight, FiShoppingBag, FiChevronLeft } from 'react-icons/fi';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

const STATUS_MAP = {
  PENDING: { label: 'Chờ xác nhận', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  CONFIRMED: { label: 'Đã xác nhận', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  SHIPPING: { label: 'Đang giao', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  DELIVERED: { label: 'Đã giao', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'Đã hủy', color: 'bg-red-50 text-red-700 border-red-200' },
};

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 10 };
    if (filter) params.status = filter;
    api.get('/orders', { params }).then(({ data }) => {
      setOrders(data.data.orders || []);
      const pag = data.data.pagination;
      if (pag) setTotalPages(pag.totalPages);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [filter, page]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-ink mb-6">Đơn hàng của tôi</h1>

      {/* Filter tabs */}
      <div className="flex items-center space-x-2 mb-6 overflow-x-auto pb-1">
        {['', 'PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED'].map((status) => (
          <button key={status} onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              filter === status 
                ? 'bg-primary-600 text-white shadow-premium-sm' 
                : 'bg-surface-secondary text-ink-secondary hover:bg-surface-tertiary'
            }`}>
            {STATUS_MAP[status]?.label || 'Tất cả'}
          </button>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mb-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-xl border border-gray-200 text-ink-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            <FiChevronLeft />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${p === page ? 'bg-primary-600 text-white shadow-premium-sm' : 'border border-gray-200 text-ink-secondary hover:bg-surface-secondary'}`}>
              {p}
            </button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-2 rounded-xl border border-gray-200 text-ink-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            <FiChevronRight />
          </button>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FiPackage className="text-6xl text-gray-300 mx-auto mb-4" />
          <p className="text-ink-secondary font-medium mb-2">Chưa có đơn hàng nào</p>
          <p className="text-ink-tertiary text-sm mb-6">Bắt đầu mua sắm để có đơn hàng đầu tiên</p>
          <Link to="/products" className="btn-primary inline-flex items-center space-x-2">
            <FiShoppingBag /><span>Mua sắm ngay</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4 stagger-fade">
          {orders.map((order) => (
            <Link key={order.id} to={`/orders/${order.id}`} className="card p-5 block hover:shadow-premium-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-ink-tertiary font-mono">#{order.id.slice(0, 8)}</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border ${STATUS_MAP[order.status]?.color}`}>
                    {STATUS_MAP[order.status]?.label}
                  </span>
                </div>
                <FiChevronRight className="text-gray-400" />
              </div>
              <div className="flex items-center space-x-3">
                {order.orderItems?.slice(0, 4).map((item) => (
                  <div key={item.id} className="w-12 h-12 bg-surface-secondary rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-gray-100">
                    {item.product?.images?.[0] ? (
                      <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300"><FiPackage size={16} /></div>
                    )}
                  </div>
                ))}
                {order.orderItems?.length > 4 && (
                  <div className="w-12 h-12 bg-surface-tertiary rounded-xl flex items-center justify-center text-sm font-medium text-ink-secondary">
                    +{order.orderItems.length - 4}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <span className="text-sm text-ink-tertiary">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</span>
                <span className="font-bold text-primary-600">{order.finalAmount.toLocaleString('vi-VN')}₫</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
