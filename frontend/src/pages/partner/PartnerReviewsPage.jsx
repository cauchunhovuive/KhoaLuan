import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiStar, FiMessageSquare, FiSend, FiChevronDown, FiBarChart2 } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const PartnerReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [replyText, setReplyText] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);

  const fetchReviews = async () => {
    try {
      const { data } = await api.get(`/reviews/partner?page=${page}&limit=10`);
      setReviews(data.data.reviews);
      setStats(data.data.stats);
      setTotalPages(data.data.pagination.totalPages);
    } catch (err) {
      toast.error('Không thể tải đánh giá');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, [page]);

  const handleReply = async (reviewId) => {
    if (!replyText[reviewId]?.trim()) {
      toast.error('Vui lòng nhập nội dung phản hồi');
      return;
    }
    try {
      await api.put(`/reviews/${reviewId}/reply`, { reply: replyText[reviewId] });
      toast.success('Đã phản hồi đánh giá');
      setReplyingTo(null);
      setReplyText((prev) => { const next = { ...prev }; delete next[reviewId]; return next; });
      fetchReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Phản hồi thất bại');
    }
  };

  if (loading) return <LoadingSpinner size="skeleton" />;

  const ratingColors = {
    1: 'bg-red-500', 2: 'bg-orange-500', 3: 'bg-yellow-500', 4: 'bg-lime-500', 5: 'bg-green-500',
  };

  return (
    <div className="space-y-6 stagger-fade">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-ink">Đánh giá sản phẩm</h2>
        <p className="text-sm text-ink-secondary mt-0.5">Xem và phản hồi đánh giá từ khách hàng</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-premium-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <FiStar className="text-lg text-amber-600" />
              </div>
              <span className="text-2xl font-bold text-ink">{stats.averageRating.toFixed(1)}</span>
            </div>
            <p className="text-sm text-ink-secondary">Đánh giá trung bình</p>
            <div className="mt-2 flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <FiStar
                  key={star}
                  className={`text-sm ${star <= Math.round(stats.averageRating) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'}`}
                />
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-premium-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <FiMessageSquare className="text-lg text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-ink">{stats.totalReviews}</span>
            </div>
            <p className="text-sm text-ink-secondary">Tổng số đánh giá</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-premium-sm">
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center mb-2">
              <FiBarChart2 className="text-lg text-violet-600" />
            </div>
            <p className="text-sm text-ink-secondary">Phân bố đánh giá</p>
            <div className="mt-2 space-y-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.ratingDistribution[star] || 0;
                const pct = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                return (
                  <div key={star} className="flex items-center space-x-2 text-xs">
                    <span className="w-6 text-ink-tertiary">{star}★</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${ratingColors[star]}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 text-right text-ink-tertiary">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-3">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-2xl border border-gray-100 shadow-premium-sm overflow-hidden">
              <div className="p-5">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary-700">{review.user?.name?.[0] || '?'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-ink">{review.user?.name || 'Người dùng'}</p>
                        <div className="flex items-center space-x-1 mt-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <FiStar
                              key={star}
                              className={`text-xs ${star <= review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'}`}
                            />
                          ))}
                          <span className="text-xs text-ink-tertiary ml-2">
                            {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>
                      <Link
                        to={`/products/${review.product?.slug}`}
                        className="text-xs text-ink-tertiary hover:text-primary-600 transition-colors truncate max-w-[200px] text-right"
                      >
                        {review.product?.name}
                      </Link>
                    </div>

                    {review.comment && (
                      <p className="text-sm text-ink-secondary mt-3 bg-surface-secondary rounded-xl px-4 py-3">
                        {review.comment}
                      </p>
                    )}

                    {/* Seller Reply */}
                    {review.reply ? (
                      <div className="mt-3 pl-4 border-l-2 border-emerald-200">
                        <p className="text-xs font-medium text-emerald-700 mb-1">Phản hồi của bạn:</p>
                        <p className="text-sm text-ink-secondary">{review.reply}</p>
                      </div>
                    ) : (
                      replyingTo === review.id ? (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={replyText[review.id] || ''}
                            onChange={(e) => setReplyText({ ...replyText, [review.id]: e.target.value })}
                            className="input-field text-sm"
                            rows={2}
                            placeholder="Nhập phản hồi của bạn..."
                          />
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleReply(review.id)}
                              className="inline-flex items-center space-x-1.5 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all"
                            >
                              <FiSend className="text-xs" />
                              <span>Gửi phản hồi</span>
                            </button>
                            <button
                              onClick={() => { setReplyingTo(null); setReplyText({}); }}
                              className="px-4 py-2 text-sm text-ink-secondary hover:bg-surface-secondary rounded-xl transition-colors"
                            >
                              Huỷ
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReplyingTo(review.id)}
                          className="mt-3 inline-flex items-center space-x-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                        >
                          <FiMessageSquare className="text-xs" />
                          <span>Phản hồi</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center text-gray-400 shadow-premium-sm">
            <FiStar className="mx-auto text-3xl mb-3" />
            <p className="text-sm font-medium">Chưa có đánh giá nào</p>
            <p className="text-xs mt-1">Khi khách hàng đánh giá sản phẩm, họ sẽ xuất hiện ở đây</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                p === page ? 'bg-emerald-600 text-white' : 'text-ink-secondary hover:bg-surface-secondary'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PartnerReviewsPage;
