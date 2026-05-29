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
    <Link to={`/products/${product.slug}`} className="card group overflow-hidden">
      {/* Image */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <FiShoppingCart className="text-4xl" />
          </div>
        )}

        {hasDiscount && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            -{Math.round((1 - product.discountPrice / product.price) * 100)}%
          </span>
        )}

        <button
          onClick={handleAddToCart}
          className="absolute bottom-2 right-2 bg-white shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-primary-600 hover:text-white"
        >
          <FiShoppingCart className="text-lg" />
        </button>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-xs text-gray-500 mb-1">{product.category?.name || ''}</p>
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors">
          {product.name}
        </h3>

        <div className="flex items-center space-x-1 mb-2">
          <FiStar className="text-yellow-400 text-xs" />
          <span className="text-xs text-gray-600">{product.rating?.toFixed(1) || '0.0'}</span>
          <span className="text-xs text-gray-400">({product.soldCount || 0} đã bán)</span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-lg font-bold text-primary-600">
            {price.toLocaleString('vi-VN')}₫
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">
              {product.price.toLocaleString('vi-VN')}₫
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
