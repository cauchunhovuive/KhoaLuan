import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiTrash2, FiMinus, FiPlus, FiShoppingBag, FiArrowLeft } from 'react-icons/fi';
import { fetchCart, updateCartItem, removeFromCart, clearCartAction } from '../store/cartSlice';
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
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <FiShoppingBag className="text-6xl text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Vui lòng đăng nhập</h2>
        <p className="text-gray-600 mb-6">Đăng nhập để xem giỏ hàng của bạn</p>
        <Link to="/login" className="btn-primary">Đăng nhập</Link>
      </div>
    );
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Giỏ hàng</h1>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <FiShoppingBag className="text-6xl text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Giỏ hàng trống</h2>
          <p className="text-gray-600 mb-6">Hãy thêm sản phẩm vào giỏ hàng</p>
          <Link to="/products" className="btn-primary inline-flex items-center space-x-2">
            <FiArrowLeft /><span>Mua sắm ngay</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.product.id} className="card p-4 flex items-center space-x-4">
                <Link to={`/products/${item.product.slug}`} className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {item.product.images?.[0] ? (
                    <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400"><FiShoppingBag /></div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/products/${item.product.slug}`} className="font-medium text-gray-900 hover:text-primary-600 truncate block">
                    {item.product.name}
                  </Link>
                  <p className="text-primary-600 font-bold mt-1">
                    {((item.product.discountPrice || item.product.price) * item.quantity).toLocaleString('vi-VN')}₫
                  </p>
                </div>
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)} className="px-2 py-1 hover:bg-gray-50"><FiMinus size={14} /></button>
                  <span className="px-3 py-1 font-medium text-sm">{item.quantity}</span>
                  <button onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)} className="px-2 py-1 hover:bg-gray-50"><FiPlus size={14} /></button>
                </div>
                <button onClick={() => handleRemove(item.product.id)} className="text-red-500 hover:text-red-600 p-2">
                  <FiTrash2 />
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="card p-6 h-fit">
            <h3 className="font-semibold text-gray-900 mb-4">Tổng giỏ hàng</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Tạm tính</span>
                <span className="font-medium">{total.toLocaleString('vi-VN')}₫</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phí vận chuyển</span>
                <span className="font-medium">{total >= 500000 ? 'Miễn phí' : '30.000₫'}</span>
              </div>
              <div className="border-t pt-3 flex justify-between text-lg">
                <span className="font-semibold">Tổng cộng</span>
                <span className="font-bold text-primary-600">{(total + (total >= 500000 ? 0 : 30000)).toLocaleString('vi-VN')}₫</span>
              </div>
            </div>
            <button onClick={() => navigate('/checkout')} className="btn-primary w-full mt-6 py-3">
              Thanh toán
            </button>
            <Link to="/products" className="block text-center text-sm text-primary-600 hover:text-primary-700 mt-4">
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
