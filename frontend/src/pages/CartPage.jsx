import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiTrash2, FiMinus, FiPlus, FiShoppingBag, FiArrowLeft } from 'react-icons/fi';
import { fetchCart, updateCartItem, removeFromCart } from '../store/cartSlice';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const CartPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, total, loading } = useSelector((state) => state.cart);
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) dispatch(fetchCart());
  }, [dispatch, isAuthenticated]);

  const handleQuantityChange = (productId, newQty) => {
    if (newQty < 1) return;
    dispatch(updateCartItem({ productId, quantity: newQty }));
  };

  const handleRemove = (productId) => {
    dispatch(removeFromCart(productId))
      .unwrap()
      .then(() => toast.success('Đã xóa sản phẩm'))
      .catch((err) => toast.error(err));
  };

  if (!isAuthenticated) {
    return (
      <div className="section-container py-20 text-center">
        <FiShoppingBag className="text-6xl text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-ink mb-2">Vui lòng đăng nhập</h2>
        <p className="text-ink-secondary mb-6">Đăng nhập để xem giỏ hàng của bạn</p>
        <Link to="/login" className="btn-primary">Đăng nhập</Link>
      </div>
    );
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="section-container py-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-ink mb-8">Giỏ hàng</h1>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <FiShoppingBag className="text-6xl text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-ink mb-2">Giỏ hàng trống</h2>
          <p className="text-ink-secondary mb-6">Hãy thêm sản phẩm vào giỏ hàng</p>
          <Link to="/products" className="btn-primary inline-flex items-center space-x-2">
            <FiArrowLeft /><span>Mua sắm ngay</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-4 stagger-fade">
            {items.map((item) => (
              <div key={item.product.id} className="card p-4 flex items-center space-x-4">
                <Link to={`/products/${item.product.slug}`} className="w-20 h-20 bg-surface-secondary rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-gray-100">
                  {item.product.images?.[0] ? (
                    <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300"><FiShoppingBag /></div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/products/${item.product.slug}`} className="font-medium text-ink hover:text-primary-600 truncate block transition-colors">
                    {item.product.name}
                  </Link>
                  <p className="text-primary-600 font-bold mt-1">
                    {((item.product.discountPrice || item.product.price) * item.quantity).toLocaleString('vi-VN')}₫
                  </p>
                </div>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                  <button onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)} className="px-2.5 py-2 hover:bg-surface-secondary transition-colors"><FiMinus size={14} /></button>
                  <span className="px-3.5 py-2 font-medium text-sm text-ink border-x border-gray-200">{item.quantity}</span>
                  <button onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)} className="px-2.5 py-2 hover:bg-surface-secondary transition-colors"><FiPlus size={14} /></button>
                </div>
                <button onClick={() => handleRemove(item.product.id)} className="p-2.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                  <FiTrash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="card p-6 h-fit sticky top-24">
            <h3 className="font-semibold text-ink mb-5 pb-3 border-b border-gray-100">Tổng giỏ hàng</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-secondary">Tạm tính</span>
                <span className="font-medium text-ink">{total.toLocaleString('vi-VN')}₫</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">Phí vận chuyển</span>
                <span className="font-medium text-ink">{total >= 500000 ? 'Miễn phí' : '30.000₫'}</span>
              </div>
              <div className="border-t pt-3 flex justify-between text-lg">
                <span className="font-semibold text-ink">Tổng cộng</span>
                <span className="font-bold text-primary-600">{(total + (total >= 500000 ? 0 : 30000)).toLocaleString('vi-VN')}₫</span>
              </div>
            </div>
            <button onClick={() => navigate('/checkout')} className="btn-primary w-full mt-6 py-3">
              Thanh toán
            </button>
            <Link to="/products" className="block text-center text-sm text-primary-600 hover:text-primary-700 mt-4 transition-colors">
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
