import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiShoppingCart, FiStar, FiMinus, FiPlus, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
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
      // Fetch reviews
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
  if (!product) return <div className="text-center py-16">Không tìm thấy sản phẩm</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-primary-600">Trang chủ</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-primary-600">Sản phẩm</Link>
        <span>/</span>
        <span className="text-gray-900">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Images */}
        <div>
          <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-4">
            {product.images?.[currentImage] ? (
              <img src={product.images[currentImage]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-6xl">
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
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${idx === currentImage ? 'border-primary-600' : 'border-gray-200'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="text-sm text-primary-600 font-medium mb-2">{product.category?.name}</p>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>

          <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center space-x-1">
              <FiStar className="text-yellow-400" />
              <span className="font-medium">{product.rating?.toFixed(1)}</span>
              <span className="text-gray-500">({product.reviewCount || 0} đánh giá)</span>
            </div>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">{product.soldCount || 0} đã bán</span>
          </div>

          {product.description && (
            <p className="text-gray-600 mb-6 leading-relaxed">{product.description}</p>
          )}

          {/* Price */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="flex items-baseline space-x-3">
              <span className="text-3xl font-bold text-primary-600">
                {price.toLocaleString('vi-VN')}₫
              </span>
              {hasDiscount && (
                <span className="text-lg text-gray-400 line-through">
                  {product.price.toLocaleString('vi-VN')}₫
                </span>
              )}
              {hasDiscount && (
                <span className="bg-red-100 text-red-600 text-sm px-2 py-0.5 rounded-full">
                  -{Math.round((1 - product.discountPrice / product.price) * 100)}%
                </span>
              )}
            </div>
          </div>

          {/* Quantity & Add to cart */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-2 hover:bg-gray-50"><FiMinus /></button>
              <span className="px-4 py-2 font-medium min-w-[40px] text-center">{quantity}</span>
              <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} className="px-3 py-2 hover:bg-gray-50"><FiPlus /></button>
            </div>
            <span className="text-sm text-gray-500">Còn {product.stock} sản phẩm</span>
          </div>

          <button onClick={handleAddToCart} disabled={product.stock === 0}
            className="btn-primary w-full py-3 text-lg flex items-center justify-center space-x-2">
            <FiShoppingCart />
            <span>{product.stock === 0 ? 'Hết hàng' : 'Thêm vào giỏ hàng'}</span>
          </button>

          {isAuthenticated && (
            <Link to="/checkout" onClick={() => dispatch(addToCart({ productId: product.id, quantity }))}
              className="block text-center mt-3 py-3 border-2 border-primary-600 text-primary-600 rounded-lg font-medium hover:bg-primary-50 transition-colors">
              Mua ngay
            </Link>
          )}
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-16">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Đánh giá sản phẩm</h2>
        {reviews.length === 0 ? (
          <p className="text-gray-500">Chưa có đánh giá nào</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="card p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-medium">{review.user?.name?.[0]}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{review.user?.name}</p>
                    <div className="flex items-center space-x-1">
                      {[1,2,3,4,5].map((star) => (
                        <FiStar key={star} className={`text-sm ${star <= review.rating ? 'text-yellow-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                {review.comment && <p className="text-gray-600 text-sm">{review.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ProductDetailPage;
