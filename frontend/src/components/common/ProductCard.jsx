import React from 'react';
import { Link } from 'react-router-dom';
import { FiShoppingCart, FiStar } from 'react-icons/fi';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { addToCart } from '../../store/cartSlice';

const ProductCard = ({ product }) => {
  const dispatch = useDispatch();

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(addToCart({ productId: product.id, quantity: 1 }))
      .unwrap()
      .then(() => toast.success('Đã thêm vào giỏ hàng'))
      .catch((err) => toast.error(err || 'Thêm thất bại'));
  };

  const price = product.discountPrice || product.price;
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;

  return (
    <Link to={`/products/${product.slug}`} className="group card-hover overflow-hidden flex flex-col">
      {/* Image */}
      <div className="relative aspect-square bg-surface-secondary overflow-hidden">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <FiShoppingCart className="text-4xl" />
          </div>
        )}

        {/* Discount badge */}
        {hasDiscount && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-sm">
            -{Math.round((1 - product.discountPrice / product.price) * 100)}%
          </span>
        )}

        {/* Quick add to cart */}
        <button
          onClick={handleAddToCart}
          className="absolute bottom-3 right-3 w-9 h-9 bg-white shadow-premium-md rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200 hover:bg-primary-600 hover:text-white"
        >
          <FiShoppingCart className="text-sm" />
        </button>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        {product.category?.name && (
          <p className="text-[11px] font-medium text-ink-tertiary uppercase tracking-wider mb-1.5">{product.category.name}</p>
        )}
        <h3 className="text-sm font-medium text-ink leading-snug line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors flex-1">
          {product.name}
        </h3>

        <div className="flex items-center space-x-1.5 mb-2.5">
          <FiStar className="text-yellow-500 text-[10px]" />
          <span className="text-xs text-ink-secondary font-medium">{product.rating?.toFixed(1) || '0.0'}</span>
          <span className="text-xs text-ink-tertiary">({product.soldCount || 0} đã bán)</span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-base font-bold text-primary-600">
            {price.toLocaleString('vi-VN')}₫
          </span>
          {hasDiscount && (
            <span className="text-xs text-ink-tertiary line-through">
              {product.price.toLocaleString('vi-VN')}₫
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
