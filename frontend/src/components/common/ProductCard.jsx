import React, { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiShoppingCart, FiStar, FiShoppingBag, FiChevronRight } from 'react-icons/fi';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { addToCart } from '../../store/cartSlice';
import LazyImage from './LazyImage';

const ProductCard = ({ product, hideStoreInfo, index = 0 }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleCardClick = useCallback(() => {
    navigate(`/products/${product.slug}`);
  }, [navigate, product.slug]);

  const handleAddToCart = (e) => {
    e.stopPropagation();
    dispatch(addToCart({ productId: product.id, quantity: 1 }))
      .unwrap()
      .then(() => toast.success('Đã thêm vào giỏ hàng'))
      .catch((err) => toast.error(err || 'Thêm thất bại'));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

  const price = product.discountPrice || product.price;
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;
  const discountPct = hasDiscount ? Math.round((1 - product.discountPrice / product.price) * 100) : 0;

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className="group card-double-bezel cursor-pointer"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="card-inner p-0 overflow-hidden">
        {/* Image */}
        <div className="relative overflow-hidden rounded-t-[calc(1rem-0.375rem)]">
          {product.images?.[0] ? (
            <LazyImage
              src={product.images[0]}
              alt={product.name}
              wrapperClassName="aspect-square"
              className="group-hover:scale-105 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
            />
          ) : (
            <div className="aspect-square bg-surface-secondary flex items-center justify-center text-gray-300">
              <FiShoppingCart className="text-4xl" />
            </div>
          )}

          {/* Discount badge */}
          {hasDiscount && (
            <span className="absolute top-3 left-3 bg-gradient-to-br from-red-500 to-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-lg shadow-red-500/20">
              -{discountPct}%
            </span>
          )}

          {/* Rating pill */}
          <div className="absolute top-3 right-3 flex items-center space-x-1 px-2 py-1 bg-white/80 backdrop-blur-md rounded-full text-[10px] font-semibold text-ink shadow-sm">
            <FiStar className="text-yellow-500 text-[9px]" />
            <span>{product.rating?.toFixed(1) || '0.0'}</span>
          </div>

          {/* Quick add to cart */}
          <button
            onClick={handleAddToCart}
            className="absolute bottom-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm shadow-premium-lg rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-primary-600 hover:text-white hover:shadow-primary-500/20"
          >
            <FiShoppingCart className="text-sm" />
          </button>
        </div>

        {/* Info */}
        <div className="p-4 flex flex-col flex-1">
          {product.category?.name && (
            <p className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-[0.15em] mb-1.5">{product.category.name}</p>
          )}
          <h3 className="text-sm font-medium text-ink leading-snug line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors duration-300 flex-1">
            {product.name}
          </h3>

          <div className="flex items-center space-x-1 mb-2.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <FiStar
                key={star}
                className={`text-[9px] ${star <= Math.round(product.rating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'}`}
              />
            ))}
            <span className="text-[10px] text-ink-tertiary ml-1">({product.soldCount || 0})</span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-base font-bold text-primary-600 tracking-tight">
              {price.toLocaleString('vi-VN')}₫
            </span>
            {hasDiscount && (
              <span className="text-[11px] text-ink-tertiary line-through">
                {product.price.toLocaleString('vi-VN')}₫
              </span>
            )}
          </div>

          {!hideStoreInfo && product.partner?.storeName && (
            <Link
              to={`/shop/${product.partner.id}`}
              onClick={(e) => e.stopPropagation()}
              className="group/store flex items-center justify-between mt-3 pt-3 border-t border-gray-100 -mx-4 -mb-4 px-4 py-2.5 rounded-b-[calc(1rem-0.375rem)] hover:bg-primary-50/50 transition-colors duration-200"
            >
              <div className="flex items-center space-x-1.5 min-w-0">
                <FiShoppingBag className="text-[10px] text-primary-500 flex-shrink-0" />
                <span className="text-[11px] font-medium text-ink-secondary truncate group-hover/store:text-primary-600 transition-colors">
                  {product.partner.storeName}
                </span>
              </div>
              <FiChevronRight className="text-[10px] text-gray-300 group-hover/store:text-primary-400 group-hover/store:translate-x-0.5 transition-all" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
