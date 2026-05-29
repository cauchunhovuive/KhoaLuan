import React, { useEffect, useState } from 'react';
import { FiSearch, FiChevronDown } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED'];
const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  SHIPPING: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
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
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Quản lý đơn hàng</h2>

      {/* Filter tabs */}
      <div className="flex space-x-2 mb-6 overflow-x-auto">
        {['', ...STATUS_OPTIONS].map((status) => (
          <button key={status} onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === status ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {STATUS_LABELS[status] || 'Tất cả'}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="p-4 font-medium">Mã đơn</th>
                <th className="p-4 font-medium">Khách hàng</th>
                <th className="p-4 font-medium">Sản phẩm</th>
                <th className="p-4 font-medium">Tổng tiền</th>
                <th className="p-4 font-medium">Trạng thái</th>
                <th className="p-4 font-medium">Ngày</th>
                <th className="p-4 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="p-4 font-mono text-xs">#{order.id.slice(0, 8)}</td>
                  <td className="p-4">
                    <p className="font-medium text-gray-900">{order.user?.name}</p>
                    <p className="text-xs text-gray-500">{order.user?.email}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-gray-600">{order.orderItems?.length} sản phẩm</p>
                  </td>
                  <td className="p-4 font-medium">{order.finalAmount.toLocaleString('vi-VN')}₫</td>
                  <td className="p-4">
                    <span className={`badge ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500 text-xs">
                    {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="p-4">
                    {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
                      <select
                        value=""
                        onChange={(e) => e.target.value && handleUpdateStatus(order.id, e.target.value)}
                        className="text-xs border border-gray-300 rounded-lg px-2 py-1"
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
      )}
    </div>
  );
};

export default OrdersManagePage;
