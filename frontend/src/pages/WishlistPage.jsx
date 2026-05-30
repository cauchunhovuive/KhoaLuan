import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiHeart, FiShoppingCart, FiTrash2, FiArrowLeft, FiStar } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWishlist, removeFromWishlist } from '../store/wishlistSlice';
import { addToCart } from '../store/cartSlice';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const WishlistPage = () => {
  const dispatch = useDispatch();
  const { items: wishlist, loading } = useSelector((state) => state.wishlist);

  useEffect(() => {
    dispatch(fetchWishlist());
  }, [dispatch]);

  const handleRemove = async (productId, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await dispatch(removeFromWishlist(productId)).unwrap();
      toast.success('Đã xoá khỏi danh sách yêu thích');
    } catch (err) {
      toast.error('Xoá thất bại');
    }
  };

  const handleAddToCart = (productId, e) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(addToCart({ productId, quantity: 1 }))
      .unwrap()
      .then(() => toast.success('Đã thêm vào giỏ hàng'))
      .catch((err) => toast.error(err || 'Thêm thất bại'));
  };

  if (loading) return <LoadingSpinner size="skeleton" />;

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <Link to="/" className="inline-flex items-center space-x-2 text-sm text-ink-tertiary hover:text-primary-600 transition-colors mb-4">
          <FiArrowLeft className="text-xs" />
          <span>Tiếp tục mua sắm</span>
        </Link>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
            <FiHeart className="text-xl text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink">Danh sách yêu thích</h1>
            <p className="text-sm text-ink-tertiary mt-0.5">{wishlist.length} sản phẩm</p>
          </div>
        </div>
      </div>

      {/* Wishlist Grid */}
      {wishlist.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {wishlist.map((product) => {
            const price = product.discountPrice || product.price;
            const hasDiscount = product.discountPrice && product.discountPrice < product.price;
            return (
              <Link
                key={product.id}
                to={`/products/${product.slug}`}
                className="group bg-white rounded-2xl border border-gray-100 shadow-premium-sm hover:shadow-premium-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
              >
                <div className="relative aspect-square bg-surface-secondary overflow-hidden">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <FiHeart className="text-4xl" />
                    </div>
                  )}
                  {hasDiscount && (
                    <span className="absolute top-3 left-3 bg-red-500 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-sm">
                      -{Math.round((1 - product.discountPrice / product.price) * 100)}%
                    </span>
                  )}
                  <button
                    onClick={(e) => handleRemove(product.id, e)}
                    className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-500 hover:text-white"
                  >
                    <FiTrash2 className="text-xs" />
                  </button>
                  {product.stock > 0 && (
                    <button
                      onClick={(e) => handleAddToCart(product.id, e)}
                      className="absolute bottom-3 right-3 w-9 h-9 bg-white shadow-premium-md rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200 hover:bg-primary-600 hover:text-white"
                    >
                      <FiShoppingCart className="text-sm" />
                    </button>
                  )}
                  {product.stock === 0 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-sm font-medium bg-black/60 px-3 py-1.5 rounded-lg">Hết hàng</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  {product.category?.name && (
                    <p className="text-[11px] font-medium text-ink-tertiary uppercase tracking-wider mb-1.5">{product.category.name}</p>
                  )}
                  <h3 className="text-sm font-medium text-ink leading-snug line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors">
                    {product.name}
                  </h3>
                  <div className="flex items-center space-x-1.5 mb-2.5">
                    <FiStar className="text-yellow-500 text-[10px]" />
                    <span className="text-xs text-ink-secondary font-medium">{product.rating?.toFixed(1) || '0.0'}</span>
                    <span className="text-xs text-ink-tertiary">({product.soldCount || 0} đã bán)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-base font-bold text-primary-600">{price.toLocaleString('vi-VN')}₫</span>
                    {hasDiscount && (
                      <span className="text-xs text-ink-tertiary line-through">{product.price.toLocaleString('vi-VN')}₫</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-premium-sm p-16 text-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <FiHeart className="text-3xl text-red-300" />
          </div>
          <h3 className="text-base font-semibold text-ink mb-2">Danh sách yêu thích trống</h3>
          <p className="text-sm text-ink-tertiary mb-6">Hãy thêm sản phẩm bạn yêu thích để dễ dàng tìm lại sau này</p>
          <Link to="/products" className="btn-primary inline-flex items-center space-x-2">
            <FiShoppingCart />
            <span>Khám phá sản phẩm</span>
          </Link>
        </div>
      )}
    </div>
  );
};

export default WishlistPage;
