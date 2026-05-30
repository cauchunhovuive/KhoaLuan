import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiShoppingCart, FiStar, FiMinus, FiPlus } from 'react-icons/fi';
import { fetchProductBySlug, clearCurrentProduct } from '../store/productSlice';
import { addToCart } from '../store/cartSlice';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const ProductDetailPage = () => {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const { currentProduct: product, loading } = useSelector((state) => state.products);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [quantity, setQuantity] = useState(1);
  const [currentImage, setCurrentImage] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ averageRating: 0, totalReviews: 0 });

  useEffect(() => {
    dispatch(clearCurrentProduct());
    dispatch(fetchProductBySlug(slug));
    return () => dispatch(clearCurrentProduct());
  }, [dispatch, slug]);

  useEffect(() => {
    if (product) {
      setCurrentImage(0);
      setQuantity(1);
      api.get(`/reviews/product/${product.id}`).then(({ data }) => {
        if (data.success) {
          setReviews(data.data.reviews || []);
          setReviewStats(data.data.stats || {});
        }
      }).catch(() => {});
    }
  }, [product]);

  const handleAddToCart = () => {
    if (!product) return;
    dispatch(addToCart({ productId: product.id, quantity }))
      .unwrap()
      .then(() => toast.success('Đã thêm vào giỏ hàng'))
      .catch((err) => toast.error(err));
  };

  const price = product?.discountPrice || product?.price || 0;
  const hasDiscount = product?.discountPrice && product.discountPrice < product.price;

  if (loading) return <LoadingSpinner />;
  if (!product) return <div className="section-container py-20 text-center text-ink-secondary">Không tìm thấy sản phẩm</div>;

  return (
    <div className="section-container py-8 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-ink-tertiary mb-8">
        <Link to="/" className="hover:text-primary-600 transition-colors">Trang chủ</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-primary-600 transition-colors">Sản phẩm</Link>
        <span>/</span>
        <span className="text-ink font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Images */}
        <div>
          <div className="aspect-square bg-surface-secondary rounded-2xl overflow-hidden mb-4 ring-1 ring-gray-100">
            {product.images?.[currentImage] ? (
              <img src={product.images[currentImage]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 text-6xl">
                <FiShoppingCart />
              </div>
            )}
          </div>
          {product.images?.length > 1 && (
            <div className="flex space-x-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImage(idx)}
                  className={`w-16 h-16 rounded-xl overflow-hidden ring-2 transition-all duration-200 ${idx === currentImage ? 'ring-primary-600 ring-offset-2' : 'ring-gray-200 hover:ring-gray-300'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div>
            {product.category?.name && (
              <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-2">{product.category.name}</p>
            )}
            <h1 className="text-2xl lg:text-3xl font-bold text-ink leading-tight">{product.name}</h1>
          </div>

          {/* Rating */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <FiStar className="text-yellow-500 fill-yellow-500" />
              <span className="font-semibold text-ink">{product.rating?.toFixed(1) || '0.0'}</span>
              <span className="text-ink-tertiary">({product.reviewCount || 0} đánh giá)</span>
            </div>
            <span className="text-gray-300">|</span>
            <span className="text-ink-secondary">{product.soldCount || 0} đã bán</span>
          </div>

          {product.description && (
            <p className="text-ink-secondary leading-relaxed">{product.description}</p>
          )}

          {/* Price */}
          <div className="bg-surface-secondary rounded-2xl p-6">
            <div className="flex items-baseline space-x-3">
              <span className="text-3xl font-bold text-primary-600">
                {price.toLocaleString('vi-VN')}₫
              </span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-ink-tertiary line-through">
                    {product.price.toLocaleString('vi-VN')}₫
                  </span>
                  <span className="bg-red-50 text-red-600 text-sm font-semibold px-2.5 py-0.5 rounded-lg border border-red-200">
                    -{Math.round((1 - product.discountPrice / product.price) * 100)}%
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Quantity */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3.5 py-2.5 hover:bg-surface-secondary transition-colors">
                <FiMinus size={14} />
              </button>
              <span className="px-5 py-2.5 font-medium min-w-[44px] text-center text-ink border-x border-gray-200">{quantity}</span>
              <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} className="px-3.5 py-2.5 hover:bg-surface-secondary transition-colors">
                <FiPlus size={14} />
              </button>
            </div>
            <span className="text-sm text-ink-tertiary">Còn {product.stock} sản phẩm</span>
          </div>

          {/* Add to cart */}
          <button onClick={handleAddToCart} disabled={product.stock === 0}
            className="btn-primary w-full py-3.5 text-base flex items-center justify-center space-x-2 group">
            <FiShoppingCart className="group-hover:scale-110 transition-transform" />
            <span>{product.stock === 0 ? 'Hết hàng' : 'Thêm vào giỏ hàng'}</span>
          </button>

          {isAuthenticated && (
            <Link to="/checkout" onClick={() => dispatch(addToCart({ productId: product.id, quantity }))}
              className="block text-center py-3.5 border-2 border-primary-600 text-primary-600 rounded-xl font-medium hover:bg-primary-50 active:scale-[0.98] transition-all duration-200">
              Mua ngay
            </Link>
          )}
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-16">
        <div className="flex items-center space-x-3 mb-8">
          <h2 className="text-xl font-bold text-ink">Đánh giá sản phẩm</h2>
          <span className="text-sm text-ink-tertiary">({reviews.length})</span>
        </div>
        {reviews.length === 0 ? (
          <div className="text-center py-12 bg-surface-secondary rounded-2xl">
            <FiStar className="mx-auto text-3xl text-gray-300 mb-3" />
            <p className="text-ink-secondary">Chưa có đánh giá nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((review) => (
              <div key={review.id} className="card p-5">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center ring-1 ring-primary-100">
                    <span className="text-primary-600 font-bold text-sm">{review.user?.name?.[0] || '?'}</span>
                  </div>
                  <div>
                    <p className="font-medium text-ink text-sm">{review.user?.name}</p>
                    <div className="flex items-center space-x-0.5 mt-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FiStar key={star} className={`text-xs ${star <= review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                {review.comment && <p className="text-ink-secondary text-sm leading-relaxed">{review.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ProductDetailPage;
