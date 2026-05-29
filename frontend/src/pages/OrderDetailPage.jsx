import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiPackage, FiChevronLeft, FiMapPin, FiPhone, FiCreditCard } from 'react-icons/fi';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const STATUS_MAP = {
  PENDING: { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800', step: 1 },
  CONFIRMED: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-800', step: 2 },
  SHIPPING: { label: 'Đang giao', color: 'bg-purple-100 text-purple-800', step: 3 },
  DELIVERED: { label: 'Đã giao', color: 'bg-green-100 text-green-800', step: 4 },
  CANCELLED: { label: 'Đã hủy', color: 'bg-red-100 text-red-800', step: 0 },
};

const OrderDetailPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/orders/${id}`)
      .then(({ data }) => setOrder(data.data))
      .catch(() => toast.error('Không thể tải đơn hàng'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    if (!confirm('Bạn có chắc muốn hủy đơn hàng này?')) return;
    try {
      await api.put(`/orders/${id}/cancel`);
      toast.success('Đã hủy đơn hàng');
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Hủy đơn thất bại');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!order) return <div className="text-center py-16">Không tìm thấy đơn hàng</div>;

  const status = STATUS_MAP[order.status] || STATUS_MAP.PENDING;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/orders" className="flex items-center space-x-1 text-gray-600 hover:text-primary-600 mb-6">
        <FiChevronLeft /><span>Quay lại đơn hàng</span>
      </Link>

      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Đơn hàng #{order.id.slice(0, 8)}</h1>
            <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleString('vi-VN')}</p>
          </div>
          <span className={`badge text-sm px-3 py-1 ${status.color}`}>{status.label}</span>
        </div>

        {/* Status progress */}
        {order.status !== 'CANCELLED' && (
          <div className="flex items-center space-x-2 mb-4">
            {[1, 2, 3, 4].map((step) => (
              <React.Fragment key={step}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  status.step >= step ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>{step}</div>
                {step < 4 && <div className={`flex-1 h-1 ${status.step > step ? 'bg-primary-600' : 'bg-gray-200'}`} />}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order items */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Sản phẩm</h3>
          <div className="space-y-3">
            {order.orderItems?.map((item) => (
              <div key={item.id} className="flex items-center space-x-3">
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {item.product?.images?.[0] ? (
                    <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                  ) : <div className="w-full h-full flex items-center justify-center text-gray-400"><FiPackage /></div>}
                </div>
                <div className="flex-1">
                  <Link to={`/products/${item.product?.slug}`} className="text-sm font-medium text-gray-900 hover:text-primary-600">
                    {item.product?.name}
                  </Link>
                  <p className="text-sm text-gray-500">x{item.quantity}</p>
                </div>
                <span className="font-medium">{(item.price * item.quantity).toLocaleString('vi-VN')}₫</span>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
              <FiMapPin className="text-primary-600" /><span>Địa chỉ giao hàng</span>
            </h3>
            <p className="text-sm text-gray-600">{order.shippingAddress}</p>
            <p className="text-sm text-gray-600 flex items-center space-x-1 mt-1">
              <FiPhone className="text-gray-400" /><span>{order.phone}</span>
            </p>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
              <FiCreditCard className="text-primary-600" /><span>Thanh toán</span>
            </h3>
            <p className="text-sm text-gray-600">
              {order.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng' : order.paymentMethod}
            </p>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Tạm tính</span><span>{order.totalAmount.toLocaleString('vi-VN')}₫</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Phí ship</span><span>{order.shippingFee === 0 ? 'Miễn phí' : `${order.shippingFee.toLocaleString('vi-VN')}₫`}</span></div>
              <div className="border-t pt-1 flex justify-between font-bold"><span>Tổng</span><span className="text-primary-600">{order.finalAmount.toLocaleString('vi-VN')}₫</span></div>
            </div>
          </div>

          {order.status === 'PENDING' && (
            <button onClick={handleCancel} className="btn-danger w-full">Hủy đơn hàng</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
