import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiPackage, FiChevronLeft, FiMapPin, FiPhone, FiCreditCard } from 'react-icons/fi';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const STATUS_MAP = {
  PENDING: { label: 'Chờ xác nhận', color: 'bg-amber-50 text-amber-700 border-amber-200', step: 1 },
  CONFIRMED: { label: 'Đã xác nhận', color: 'bg-blue-50 text-blue-700 border-blue-200', step: 2 },
  SHIPPING: { label: 'Đang giao', color: 'bg-purple-50 text-purple-700 border-purple-200', step: 3 },
  DELIVERED: { label: 'Đã giao', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', step: 4 },
  CANCELLED: { label: 'Đã hủy', color: 'bg-red-50 text-red-700 border-red-200', step: 0 },
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
  if (!order) return <div className="section-container py-20 text-center text-ink-secondary">Không tìm thấy đơn hàng</div>;

  const status = STATUS_MAP[order.status] || STATUS_MAP.PENDING;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <Link to="/orders" className="inline-flex items-center space-x-1.5 text-ink-tertiary hover:text-primary-600 mb-6 transition-colors">
        <FiChevronLeft />
        <span>Quay lại đơn hàng</span>
      </Link>

      {/* Order header */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-xl font-bold text-ink">Đơn hàng #{order.id.slice(0, 8)}</h1>
            <p className="text-sm text-ink-tertiary mt-0.5">{new Date(order.createdAt).toLocaleString('vi-VN')}</p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-xl border ${status.color}`}>{status.label}</span>
        </div>

        {/* Status progress */}
        {order.status !== 'CANCELLED' && (
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4].map((step) => (
              <React.Fragment key={step}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  status.step >= step ? 'bg-primary-600 text-white shadow-premium-sm' : 'bg-surface-tertiary text-ink-tertiary'
                }`}>{step}</div>
                {step < 4 && (
                  <div className={`flex-1 h-1 rounded-full ${status.step > step ? 'bg-primary-600' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order items */}
        <div className="card p-6">
          <h3 className="font-semibold text-ink mb-4">Sản phẩm</h3>
          <div className="space-y-3">
            {order.orderItems?.map((item) => (
              <div key={item.id} className="flex items-center space-x-3 p-3 bg-surface-secondary rounded-xl">
                <div className="w-14 h-14 bg-white rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-gray-100">
                  {item.product?.images?.[0] ? (
                    <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                  ) : <div className="w-full h-full flex items-center justify-center text-gray-300"><FiPackage /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/products/${item.product?.slug}`} className="text-sm font-medium text-ink hover:text-primary-600 truncate block transition-colors">
                    {item.product?.name}
                  </Link>
                  <p className="text-sm text-ink-tertiary">x{item.quantity}</p>
                </div>
                <span className="font-semibold text-ink flex-shrink-0">{(item.price * item.quantity).toLocaleString('vi-VN')}₫</span>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold text-ink mb-3 flex items-center space-x-2">
              <FiMapPin className="text-primary-600" />
              <span>Địa chỉ giao hàng</span>
            </h3>
            <p className="text-sm text-ink-secondary leading-relaxed">{order.shippingAddress}</p>
            <p className="text-sm text-ink-secondary flex items-center space-x-1.5 mt-2">
              <FiPhone className="text-gray-400" size={14} />
              <span>{order.phone}</span>
            </p>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-ink mb-3 flex items-center space-x-2">
              <FiCreditCard className="text-primary-600" />
              <span>Thanh toán</span>
            </h3>
            <p className="text-sm text-ink-secondary">
              {order.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng' : order.paymentMethod}
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-secondary">Tạm tính</span>
                <span className="font-medium text-ink">{order.totalAmount.toLocaleString('vi-VN')}₫</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">Phí ship</span>
                <span className="font-medium text-ink">{order.shippingFee === 0 ? 'Miễn phí' : `${order.shippingFee.toLocaleString('vi-VN')}₫`}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-base">
                <span className="text-ink">Tổng</span>
                <span className="text-primary-600">{order.finalAmount.toLocaleString('vi-VN')}₫</span>
              </div>
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
