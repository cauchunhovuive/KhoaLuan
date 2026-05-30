import React, { useEffect, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED'];
const STATUS_COLORS = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
  SHIPPING: 'bg-purple-50 text-purple-700 border-purple-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};
const STATUS_LABELS = {
  PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao', CANCELLED: 'Đã hủy',
};

const OrdersManagePage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchOrders = () => {
    setLoading(true);
    const params = { limit: 50 };
    if (filter) params.status = filter;
    api.get('/orders/admin/all', { params })
      .then(({ data }) => setOrders(data.data.orders))
      .catch(() => toast.error('Không thể tải đơn hàng'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [filter]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      toast.success('Cập nhật trạng thái thành công');
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi');
    }
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-ink">Quản lý đơn hàng</h2>
        <p className="text-ink-tertiary text-sm mt-1">Theo dõi và xử lý đơn hàng</p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {['', ...STATUS_OPTIONS].map((status) => (
          <button key={status} onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              filter === status 
                ? 'bg-primary-600 text-white shadow-premium-sm' 
                : 'bg-surface-secondary text-ink-secondary hover:bg-surface-tertiary'
            }`}>
            {STATUS_LABELS[status] || 'Tất cả'}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner size="table" /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-secondary text-left">
                  <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Mã đơn</th>
                  <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Khách hàng</th>
                  <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Sản phẩm</th>
                  <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Tổng tiền</th>
                  <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Trạng thái</th>
                  <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Ngày</th>
                  <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-gray-100 hover:bg-surface-secondary/50 transition-colors">
                    <td className="p-4">
                      <span className="font-mono text-xs font-bold text-ink">#{order.id.slice(0, 8)}</span>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-ink">{order.user?.name}</p>
                      <p className="text-xs text-ink-tertiary">{order.user?.email}</p>
                    </td>
                    <td className="p-4 text-ink-secondary">{order.orderItems?.length} sản phẩm</td>
                    <td className="p-4 font-semibold text-ink">{order.finalAmount.toLocaleString('vi-VN')}₫</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td className="p-4 text-ink-tertiary text-xs">
                      {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="p-4">
                      {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
                        <select
                          value=""
                          onChange={(e) => e.target.value && handleUpdateStatus(order.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                        >
                          <option value="">Cập nhật</option>
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s} disabled={s === order.status}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersManagePage;
