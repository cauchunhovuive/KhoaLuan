import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiShoppingBag, FiEye, FiChevronDown, FiSearch } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const statusColors = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  SHIPPING: 'bg-violet-100 text-violet-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const statusLabels = {
  PENDING: 'Chờ xử lý',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã huỷ',
};

const PartnerOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (statusFilter) params.append('status', statusFilter);
      const { data } = await api.get(`/partner/orders?${params}`);
      setOrders(data.data.orders);
      setTotalPages(data.data.pagination.totalPages);
    } catch (err) {
      toast.error('Không thể tải đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/partner/orders/${orderId}/status`, { status: newStatus });
      toast.success('Cập nhật trạng thái đơn hàng thành công');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi cập nhật');
    }
  };

  if (loading) return <LoadingSpinner size="skeleton" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Đơn hàng</h2>
          <p className="text-sm text-ink-secondary mt-0.5">Đơn hàng có chứa sản phẩm của bạn</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
            !statusFilter ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-ink-secondary hover:bg-surface-secondary border border-gray-200'
          }`}
        >
          Tất cả
        </button>
        {['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              statusFilter === s ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-ink-secondary hover:bg-surface-secondary border border-gray-200'
            }`}
          >
            {statusLabels[s]}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {orders.length > 0 ? (
          orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-premium-sm overflow-hidden">
              <div
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-surface-secondary/50 transition-colors"
              >
                <div className="flex items-center space-x-4 min-w-0">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FiShoppingBag className="text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      Đơn hàng #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-ink-tertiary mt-0.5">
                      {order.user?.name} - {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`badge text-xs ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                  <FiChevronDown className={`text-gray-400 transition-transform ${expandedOrder === order.id ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {expandedOrder === order.id && (
                <div className="border-t border-gray-50 px-6 py-4 space-y-4">
                  <div className="space-y-2">
                    {order.orderItems?.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                            {item.product?.images?.[0] && (
                              <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-ink truncate">{item.product?.name}</p>
                            <p className="text-xs text-ink-tertiary">SL: {item.quantity}</p>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-ink">
                          {(item.price * item.quantity).toLocaleString('vi-VN')}₫
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="text-sm text-ink-secondary">
                      <p>{order.user?.phone}</p>
                      <p className="text-xs">{order.shippingAddress}</p>
                    </div>
                    <p className="text-base font-bold text-ink">
                      {order.finalAmount.toLocaleString('vi-VN')}₫
                    </p>
                  </div>

                  {/* Partner actions */}
                  {order.status === 'PENDING' && (
                    <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'CONFIRMED')}
                        className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all"
                      >
                        Xác nhận đơn
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                        className="px-4 py-2 text-sm font-medium bg-red-100 text-red-700 rounded-xl hover:bg-red-200 active:scale-[0.98] transition-all"
                      >
                        Từ chối
                      </button>
                    </div>
                  )}
                  {order.status === 'CONFIRMED' && (
                    <div className="pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'SHIPPING')}
                        className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all"
                      >
                        Đã giao cho vận chuyển
                      </button>
                    </div>
                  )}
                  {order.status === 'SHIPPING' && (
                    <div className="pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                        className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-xl hover:bg-green-700 active:scale-[0.98] transition-all"
                      >
                        Xác nhận đã giao
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center text-gray-400 shadow-premium-sm">
            <FiShoppingBag className="mx-auto text-3xl mb-3" />
            <p className="text-sm font-medium">Chưa có đơn hàng nào</p>
            <p className="text-xs mt-1">Khi khách hàng đặt sản phẩm của bạn, đơn hàng sẽ hiển thị ở đây</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                p === page ? 'bg-emerald-600 text-white' : 'text-ink-secondary hover:bg-surface-secondary'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PartnerOrdersPage;
