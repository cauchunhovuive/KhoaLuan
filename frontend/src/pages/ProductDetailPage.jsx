import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiShoppingCart, FiStar, FiMinus, FiPlus, FiSend, FiCheckCircle, FiShoppingBag, FiChevronRight } from 'react-icons/fi';
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
  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    dispatch(clearCurrentProduct());
    dispatch(fetchProductBySlug(slug));
    return () => dispatch(clearCurrentProduct());
  }, [dispatch, slug]);

  const fetchReviews = useCallback(() => {
    if (!product) return;
    api.get(`/reviews/product/${product.id}`).then(({ data }) => {
      if (data.success) {
        setReviews(data.data.reviews || []);
        setReviewStats(data.data.stats || {});
      }
    }).catch(() => {});
  }, [product]);

  useEffect(() => {
    if (product) {
      setCurrentImage(0);
      setQuantity(1);
      fetchReviews();
    }
  }, [product, fetchReviews]);

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

          {/* Shop Info */}
          {product.partner?.storeName && (
            <Link
              to={`/products?partner=${product.partner.id}`}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-primary-50/80 to-white border border-primary-100 rounded-2xl hover:shadow-premium-sm hover:border-primary-200 transition-all duration-200 group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-primary-200">
                  {product.partner.avatar ? (
                    <img src={product.partner.avatar} alt={product.partner.storeName} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <FiShoppingBag className="text-lg text-primary-600" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-ink-tertiary uppercase tracking-wider">Cửa hàng</p>
                  <p className="font-semibold text-ink group-hover:text-primary-600 transition-colors">
                    {product.partner.storeName}
                  </p>
                  {product.partner.storeDescription && (
                    <p className="text-xs text-ink-tertiary mt-0.5 line-clamp-1">{product.partner.storeDescription}</p>
                  )}
                </div>
              </div>
              <FiChevronRight className="text-primary-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
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
          <span className="text-sm text-ink-tertiary">({reviewStats.totalReviews || reviews.length})</span>
        </div>

        {/* Review stats summary */}
        {reviewStats.totalReviews > 0 && (
          <div className="card p-6 mb-8 flex items-center space-x-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-ink">{reviewStats.averageRating?.toFixed(1) || '0.0'}</div>
              <div className="flex items-center space-x-0.5 mt-1 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FiStar key={star} className={`text-sm ${star <= Math.round(reviewStats.averageRating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                ))}
              </div>
              <p className="text-xs text-ink-tertiary mt-1">{reviewStats.totalReviews} đánh giá</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviewStats.ratingDistribution?.[star] || 0;
                const pct = reviewStats.totalReviews > 0 ? (count / reviewStats.totalReviews) * 100 : 0;
                return (
                  <div key={star} className="flex items-center space-x-2 text-xs">
                    <span className="w-8 text-right text-ink-secondary">{star} ★</span>
                    <div className="flex-1 h-2 bg-surface-tertiary rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-ink-tertiary">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Review submission form */}
        {isAuthenticated && (
          <div className="card p-6 mb-8">
            <h3 className="font-semibold text-ink mb-4">Viết đánh giá của bạn</h3>
            <div className="flex items-center space-x-1 mb-4">
              <p className="text-sm text-ink-secondary mr-3">Chất lượng:</p>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setNewRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5 transition-transform hover:scale-110 active:scale-90"
                >
                  <FiStar
                    className={`text-xl transition-all duration-150 ${
                      star <= (hoverRating || newRating)
                        ? 'text-yellow-500 fill-yellow-500 drop-shadow-sm'
                        : 'text-gray-300 hover:text-yellow-400'
                    }`}
                  />
                </button>
              ))}
              {newRating > 0 && (
                <span className="ml-2 text-sm font-medium text-ink">
                  {['', 'Tệ', 'Không hài lòng', 'Bình thường', 'Hài lòng', 'Tuyệt vời'][newRating]}
                </span>
              )}
            </div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
              rows={3}
              className="w-full px-4 py-3 bg-surface-secondary border border-gray-200 rounded-xl text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200 resize-none"
            />
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-ink-tertiary">
                <FiCheckCircle className="inline mr-1 text-emerald-500" />
                Bạn cần đã mua và nhận được hàng để đánh giá
              </p>
              <button
                onClick={async () => {
                  if (newRating === 0) {
                    toast.error('Vui lòng chọn số sao đánh giá');
                    return;
                  }
                  if (!newComment.trim()) {
                    toast.error('Vui lòng nhập nội dung đánh giá');
                    return;
                  }
                  setSubmittingReview(true);
                  try {
                    await api.post('/reviews', {
                      productId: product.id,
                      rating: newRating,
                      comment: newComment.trim(),
                    });
                    toast.success('Đánh giá thành công!');
                    setNewRating(0);
                    setNewComment('');
                    fetchReviews();
                  } catch (err) {
                    toast.error(err.response?.data?.message || 'Gửi đánh giá thất bại');
                  } finally {
                    setSubmittingReview(false);
                  }
                }}
                disabled={submittingReview}
                className="btn-primary inline-flex items-center space-x-2 py-2.5"
              >
                <FiSend size={14} />
                <span>{submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Review list */}
        {reviews.length === 0 ? (
          <div className="text-center py-12 bg-surface-secondary rounded-2xl">
            <FiStar className="mx-auto text-3xl text-gray-300 mb-3" />
            <p className="text-ink-secondary">Chưa có đánh giá nào.</p>
            {!isAuthenticated && (
              <Link to="/login" className="text-primary-600 text-sm font-medium hover:underline mt-2 inline-block">
                Đăng nhập để đánh giá sản phẩm
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((review) => (
              <div key={review.id} className="card p-5 hover:border-gray-200 transition-all">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center ring-1 ring-primary-100 flex-shrink-0">
                    <span className="text-primary-600 font-bold text-sm">{review.user?.name?.[0] || '?'}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-ink text-sm">{review.user?.name}</p>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <div className="flex items-center space-x-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <FiStar key={star} className={`text-xs ${star <= review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'}`} />
                        ))}
                      </div>
                      <span className="text-[10px] text-ink-tertiary">
                        {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>
                </div>
                {review.comment && <p className="text-ink-secondary text-sm leading-relaxed">{review.comment}</p>}
                {review.reply && (
                  <div className="mt-3 pt-3 border-t border-gray-100 pl-4">
                    <p className="text-xs font-semibold text-emerald-600 mb-1">Phản hồi từ shop:</p>
                    <p className="text-sm text-ink-secondary">{review.reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ProductDetailPage;
