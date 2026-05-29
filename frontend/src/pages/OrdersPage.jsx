import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiPackage, FiChevronRight } from 'react-icons/fi';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

const STATUS_MAP = {
  PENDING: { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800' },
  CONFIRMED: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-800' },
  SHIPPING: { label: 'Đang giao', color: 'bg-purple-100 text-purple-800' },
  DELIVERED: { label: 'Đã giao', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Đã hủy', color: 'bg-red-100 text-red-800' },
};

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const params = {};
    if (filter) params.status = filter;
    api.get('/orders', { params }).then(({ data }) => {
      setOrders(data.data.orders || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [filter]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Đơn hàng của tôi</h1>

      {/* Filter tabs */}
      <div className="flex space-x-2 mb-6 overflow-x-auto">
        {['', 'PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED'].map((status) => (
          <button key={status} onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === status ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {STATUS_MAP[status]?.label || 'Tất cả'}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <FiPackage className="text-6xl text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Chưa có đơn hàng nào</p>
          <Link to="/products" className="btn-primary mt-4 inline-block">Mua sắm ngay</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link key={order.id} to={`/orders/${order.id}`} className="card p-4 block hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-sm text-gray-500">Đơn hàng #{order.id.slice(0, 8)}</span>
                  <span className={`ml-3 badge ${STATUS_MAP[order.status]?.color}`}>
                    {STATUS_MAP[order.status]?.label}
                  </span>
                </div>
                <FiChevronRight className="text-gray-400" />
              </div>
              <div className="flex items-center space-x-4">
                {order.orderItems?.slice(0, 3).map((item) => (
                  <div key={item.id} className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.product?.images?.[0] ? (
                      <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400"><FiPackage /></div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <span className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</span>
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
