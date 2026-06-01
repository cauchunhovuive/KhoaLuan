import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  FiTrash2, FiMinus, FiPlus, FiShoppingBag, FiArrowLeft, FiChevronRight,
  FiShield, FiTruck, FiCheck,
} from 'react-icons/fi';
import { fetchCart, updateCartItem, removeFromCart } from '../store/cartSlice';
import LazyImage from '../components/common/LazyImage';
import toast from 'react-hot-toast';

const CartSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="card-double-bezel">
        <div className="card-inner">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 skeleton-bg rounded-xl shrink-0" />
            <div className="space-y-3 flex-1 min-w-0">
              <div className="h-4 w-44 skeleton-bg rounded" />
              <div className="h-5 w-24 skeleton-bg rounded" />
            </div>
            <div className="w-28 h-9 skeleton-bg rounded-xl" />
            <div className="w-9 h-9 skeleton-bg rounded-xl" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const CartQuantityControl = ({ quantity, onDecrease, onIncrease }) => (
  <div className="flex items-center card-double-bezel">
    <div className="card-inner p-0 flex items-center">
      <button
        onClick={onDecrease}
        disabled={quantity <= 1}
        className="p-2.5 text-ink-secondary hover:text-ink hover:bg-surface-secondary transition-all duration-200 rounded-[calc(1.25rem-0.375rem-0.25rem)] active:scale-[0.92] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        <FiMinus size={14} />
      </button>
      <span className="w-10 text-center font-semibold text-sm text-ink border-x border-gray-100 py-2.5 select-none">
        {quantity}
      </span>
      <button
        onClick={onIncrease}
        className="p-2.5 text-ink-secondary hover:text-ink hover:bg-surface-secondary transition-all duration-200 rounded-[calc(1.25rem-0.375rem-0.25rem)] active:scale-[0.92]"
      >
        <FiPlus size={14} />
      </button>
    </div>
  </div>
);

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
      <div className="overflow-hidden">
        <div className="max-w-xl mx-auto px-4 py-24 text-center animate-fade-in">
          <div className="card-double-bezel">
            <div className="card-inner py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-50 to-primary-100 rounded-3xl flex items-center justify-center mx-auto mb-6 ring-1 ring-primary-200/50 shadow-premium-sm">
                <FiShoppingBag className="text-primary-600 text-3xl" />
              </div>
              <h2 className="text-xl font-bold text-ink mb-2">Vui lòng đăng nhập</h2>
              <p className="text-ink-tertiary text-sm mb-8">Đăng nhập để xem và quản lý giỏ hàng của bạn</p>
              <Link
                to="/login"
                className="group relative overflow-hidden inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-semibold hover:bg-primary-700 active:scale-[0.97] transition-all duration-200 shadow-premium-md"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <FiArrowLeft />
                <span>Đăng nhập</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 animate-fade-in">
        {/* ═══ Header ═══ */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-ink tracking-tight">Giỏ hàng</h1>
          {items.length > 0 && (
            <p className="text-ink-tertiary text-sm mt-1">
              <span className="font-semibold text-ink">{items.length}</span> sản phẩm trong giỏ hàng
            </p>
          )}
        </div>

        {loading ? (
          <CartSkeleton />
        ) : items.length === 0 ? (
          /* ═══ Empty State ═══ */
          <div className="card-double-bezel animate-in">
            <div className="card-inner py-20 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-50 to-primary-100 rounded-3xl flex items-center justify-center mx-auto mb-6 ring-1 ring-primary-200/50 shadow-premium-sm">
                <FiShoppingBag className="text-primary-600 text-3xl" />
              </div>
              <h2 className="text-xl font-bold text-ink mb-2">Giỏ hàng trống</h2>
              <p className="text-ink-tertiary text-sm mb-8 max-w-xs mx-auto">
                Hãy thêm sản phẩm vào giỏ hàng để bắt đầu mua sắm
              </p>
              <Link
                to="/products"
                className="group relative overflow-hidden inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-semibold hover:bg-primary-700 active:scale-[0.97] transition-all duration-200 shadow-premium-md"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span>Mua sắm ngay</span>
                <FiChevronRight className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ═══ Cart Items ═══ */}
            <div className="lg:col-span-2 space-y-3">
              {items.map((item, index) => {
                const unitPrice = item.product.discountPrice || item.product.price;
                const lineTotal = unitPrice * item.quantity;
                return (
                  <div
                    key={item.product.id}
                    className="card-double-bezel animate-in"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div className="card-inner">
                      <div className="flex items-center space-x-4">
                        {/* Product Image */}
                        <Link
                          to={`/products/${item.product.slug}`}
                          className="w-20 h-20 shrink-0 rounded-xl overflow-hidden ring-1 ring-gray-100 group/image"
                        >
                          {item.product.images?.[0] ? (
                            <LazyImage
                              src={item.product.images[0]}
                              alt={item.product.name}
                              wrapperClassName="w-full h-full"
                              className="w-full h-full object-cover group-hover/image:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 bg-surface-secondary">
                              <FiShoppingBag />
                            </div>
                          )}
                        </Link>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/products/${item.product.slug}`}
                            className="font-medium text-ink hover:text-primary-600 transition-colors duration-200 truncate block text-sm"
                          >
                            {item.product.name}
                          </Link>
                          <div className="flex items-center space-x-2 mt-1.5">
                            <span className="text-lg font-bold text-primary-600">
                              {unitPrice.toLocaleString('vi-VN')}₫
                            </span>
                            {item.product.discountPrice && (
                              <span className="text-xs text-ink-tertiary line-through">
                                {item.product.price.toLocaleString('vi-VN')}₫
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-ink-tertiary mt-0.5">
                            Thành tiền: <span className="font-semibold text-ink">{lineTotal.toLocaleString('vi-VN')}₫</span>
                          </p>
                        </div>

                        {/* Quantity Control */}
                        <div className="flex flex-col items-center space-y-2 shrink-0">
                          <CartQuantityControl
                            quantity={item.quantity}
                            onDecrease={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                            onIncrease={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                          />
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => handleRemove(item.product.id)}
                          className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 active:scale-[0.88] shrink-0"
                          title="Xoá sản phẩm"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ═══ Summary Sidebar ═══ */}
            <div className="space-y-4">
              <div className="card-double-bezel sticky top-24">
                <div className="card-inner p-6">
                  <h3 className="font-semibold text-ink mb-5 pb-4 border-b border-gray-100 flex items-center space-x-2">
                    <FiShoppingBag className="text-primary-600 text-lg" />
                    <span>Tổng giỏ hàng</span>
                  </h3>

                  <div className="space-y-3.5 text-sm">
                    {/* Items count */}
                    <div className="flex justify-between">
                      <span className="text-ink-secondary">Số lượng</span>
                      <span className="font-medium text-ink">{items.length} sản phẩm</span>
                    </div>

                    {/* Subtotal */}
                    <div className="flex justify-between">
                      <span className="text-ink-secondary">Tạm tính</span>
                      <span className="font-semibold text-ink">{total.toLocaleString('vi-VN')}₫</span>
                    </div>

                    {/* Shipping */}
                    <div className="flex justify-between items-center">
                      <span className="text-ink-secondary flex items-center space-x-1.5">
                        <FiTruck className="text-xs text-ink-tertiary" />
                        <span>Phí vận chuyển</span>
                      </span>
                      {total >= 500000 ? (
                        <span className="font-medium text-emerald-600 flex items-center space-x-1">
                          <FiCheck className="text-xs" />
                          <span>Miễn phí</span>
                        </span>
                      ) : (
                        <span className="font-medium text-ink">
                          30.000₫
                          <span className="text-ink-tertiary text-[10px] ml-1">(còn {Math.max(0, 500000 - total).toLocaleString('vi-VN')}₫ mới miễn phí)</span>
                        </span>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-100" />
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center mt-3 mb-6">
                    <span className="font-semibold text-ink text-base">Tổng cộng</span>
                    <span className="text-xl font-bold text-primary-600">
                      {(total + (total >= 500000 ? 0 : 30000)).toLocaleString('vi-VN')}₫
                    </span>
                  </div>

                  {/* Checkout button */}
                  <button
                    onClick={() => navigate('/checkout')}
                    className="group relative overflow-hidden w-full inline-flex items-center justify-center space-x-2 px-6 py-3.5 bg-primary-600 text-white rounded-2xl font-semibold hover:bg-primary-700 active:scale-[0.97] transition-all duration-200 shadow-premium-md"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <span>Thanh toán ngay</span>
                    <FiChevronRight className="group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* Continue shopping */}
                  <Link
                    to="/products"
                    className="block text-center text-sm text-primary-600 hover:text-primary-700 mt-4 transition-colors duration-200 hover:underline underline-offset-2"
                  >
                    Tiếp tục mua sắm
                  </Link>

                  {/* Trust badges */}
                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center space-x-4 text-[10px] text-ink-tertiary">
                    <span className="flex items-center space-x-1">
                      <FiShield className="text-xs" />
                      <span>Thanh toán an toàn</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <FiTruck className="text-xs" />
                      <span>Miễn phí vận chuyển từ 500K</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Free shipping progress bar */}
              {total < 500000 && (
                <div className="card-double-bezel animate-in">
                  <div className="card-inner p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-ink-tertiary">Miễn phí vận chuyển</p>
                      <p className="text-xs font-medium text-primary-600">
                        còn {Math.max(0, 500000 - total).toLocaleString('vi-VN')}₫
                      </p>
                    </div>
                    <div className="w-full h-2 bg-surface-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                        style={{ width: `${Math.min(100, (total / 500000) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
