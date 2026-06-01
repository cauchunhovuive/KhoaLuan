import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FiTag, FiCopy, FiCheck, FiClock, FiZap, FiShoppingBag,
  FiChevronRight, FiPercent, FiDollarSign, FiBookmark,
  FiBookmark as FiBookmarkFilled, FiStar,
  FiX, FiRefreshCw,
} from 'react-icons/fi';
import api from '../services/api';
import toast from 'react-hot-toast';

/* ─── Copy to clipboard hook ─── */
const useCopy = () => {
  const [copiedId, setCopiedId] = useState(null);

  const copy = useCallback(async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success(`Đã sao chép mã "${text}"`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedId(id);
      toast.success(`Đã sao chép mã "${text}"`);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }, []);

  return { copiedId, copy };
};

/* ─── Coupon Card ─── */
const CouponCard = ({ coupon, onSave, onUnsave, isSaved, copiedId, copy }) => {
  const now = new Date();
  const expiresAt = coupon.expiresAt ? new Date(coupon.expiresAt) : null;
  const isExpiringSoon = expiresAt && (expiresAt - now) < 3 * 24 * 60 * 60 * 1000;
  const isExpired = expiresAt && expiresAt < now;
  const daysLeft = expiresAt ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="group card-double-bezel hover:ring-1 hover:ring-primary-200/50 transition-all duration-300">
      <div className="card-inner">
        <div className="flex items-start gap-4">
          {/* Coupon visual badge */}
          <div className="relative shrink-0">
            <div className={`w-16 h-20 rounded-2xl flex flex-col items-center justify-center shadow-premium-sm ${
              coupon.type === 'PERCENTAGE'
                ? 'bg-gradient-to-br from-primary-500 to-primary-600'
                : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
            }`}>
              {coupon.type === 'PERCENTAGE' ? (
                <FiPercent className="text-white text-lg mb-0.5" />
              ) : (
                <FiDollarSign className="text-white text-lg mb-0.5" />
              )}
              <span className="text-white text-[10px] font-bold leading-tight text-center px-1">
                {coupon.type === 'PERCENTAGE' ? `${coupon.value}%` : `${(coupon.value / 1000).toFixed(0)}K`}
              </span>
            </div>
            {/* Expiring soon indicator */}
            {isExpiringSoon && !isExpired && (
              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-premium-sm">
                <FiZap className="text-white text-[8px]" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {/* Code */}
                <div className="flex items-center space-x-2 mb-1">
                  <code className="px-2.5 py-0.5 bg-surface-secondary rounded-lg text-sm font-bold font-mono text-ink tracking-wider">
                    {coupon.code}
                  </code>
                  <button
                    onClick={() => copy(coupon.code, coupon.id)}
                    className={`p-1.5 rounded-lg transition-all duration-200 active:scale-[0.9] ${
                      copiedId === coupon.id
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'hover:bg-surface-secondary text-ink-tertiary hover:text-ink'
                    }`}
                    title="Sao chép mã"
                  >
                    {copiedId === coupon.id ? <FiCheck size={13} /> : <FiCopy size={13} />}
                  </button>
                </div>
                <h3 className="text-sm font-medium text-ink line-clamp-1">
                  {coupon.description || (
                    coupon.type === 'PERCENTAGE'
                      ? `Giảm ${coupon.value}%${coupon.maxDiscount ? ` (tối đa ${coupon.maxDiscount.toLocaleString('vi-VN')}₫)` : ''}`
                      : `Giảm ${coupon.value.toLocaleString('vi-VN')}₫`
                  )}
                </h3>
              </div>
            </div>

            {/* Store name */}
            <p className="text-[11px] text-ink-tertiary mt-1.5 flex items-center space-x-1">
              <FiShoppingBag className="text-[9px]" />
              <span>{coupon.storeName}</span>
            </p>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-ink-tertiary">
              {coupon.minOrderValue > 0 && (
                <span>Đơn tối thiểu {coupon.minOrderValue.toLocaleString('vi-VN')}₫</span>
              )}
              {daysLeft !== null && !isExpired && (
                <span className={`flex items-center space-x-0.5 ${isExpiringSoon ? 'text-red-500 font-medium' : ''}`}>
                  <FiClock className="text-[9px]" />
                  <span>{daysLeft === 0 ? 'Hết hạn hôm nay' : `Còn ${daysLeft} ngày`}</span>
                </span>
              )}
              {isExpired && (
                <span className="text-red-400 flex items-center space-x-0.5">
                  <FiX className="text-[9px]" />
                  <span>Đã hết hạn</span>
                </span>
              )}
              {coupon.remainingUses !== null && coupon.remainingUses > 0 && (
                <span>Còn {coupon.remainingUses} lượt</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => copy(coupon.code, coupon.id)}
                className="group/btn relative overflow-hidden flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-primary-600 text-white rounded-xl text-xs font-semibold hover:bg-primary-700 active:scale-[0.97] transition-all duration-200 shadow-premium-sm"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                <FiCopy className="text-[11px]" />
                <span>Sao chép mã</span>
              </button>
              {isSaved ? (
                <button
                  onClick={() => onUnsave(coupon.id)}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-xs font-medium border border-gray-200 text-ink-secondary hover:bg-surface-secondary active:scale-[0.97] transition-all duration-200"
                >
                  <FiCheck className="mr-1 text-emerald-500" size={12} />
                  Đã lưu
                </button>
              ) : (
                <button
                  onClick={() => onSave(coupon.id)}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-xs font-medium border border-gray-200 text-ink-secondary hover:bg-surface-secondary active:scale-[0.97] transition-all duration-200"
                >
                  <FiBookmark className="mr-1" size={12} />
                  Lưu
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Skeleton (list items) ─── */
const CouponSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="card-double-bezel">
        <div className="card-inner">
          <div className="flex items-start gap-4">
            <div className="w-16 h-20 skeleton-bg rounded-2xl shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-5 w-28 skeleton-bg rounded-lg" />
              <div className="h-3 w-44 skeleton-bg rounded-md" />
              <div className="h-3 w-32 skeleton-bg rounded-md" />
              <div className="h-8 w-full skeleton-bg rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

/* ─── Hero Skeleton (shows during initial load) ─── */
const HeroSkeleton = () => (
  <div className="relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-800 to-indigo-900">
      <div className="absolute -top-40 -right-32 w-96 h-96 rounded-full bg-primary-500/20 blur-[100px]" />
      <div className="absolute -bottom-48 -left-32 w-[500px] h-[500px] rounded-full bg-indigo-500/15 blur-[120px]" />
    </div>
    <div className="relative z-10 section-container py-16 md:py-20">
      <div className="max-w-2xl">
        <div className="w-28 h-6 rounded-full skeleton-bg-subtle mb-5" />
        <div className="h-10 md:h-12 w-72 skeleton-bg-subtle rounded-lg mb-2" />
        <div className="h-10 md:h-12 w-48 skeleton-bg-subtle rounded-lg mb-4" />
        <div className="h-4 w-96 skeleton-bg-subtle rounded-md mb-1" />
        <div className="h-4 w-64 skeleton-bg-subtle rounded-md mb-8" />
        <div className="flex flex-wrap gap-3">
          <div className="w-36 h-9 rounded-full skeleton-bg-subtle" />
          <div className="w-36 h-9 rounded-full skeleton-bg-subtle" />
        </div>
      </div>
    </div>
  </div>
);

/* ─── Full-page skeleton for initial load ─── */
const FullPageSkeleton = () => (
  <>
    <HeroSkeleton />
    <div className="section-container py-8">
      <div className="w-fit flex items-center space-x-1 mb-6 bg-surface-secondary rounded-xl p-1 border border-gray-100">
        <div className="w-28 h-9 skeleton-bg rounded-lg" />
        <div className="w-24 h-9 skeleton-bg rounded-lg" />
      </div>
      <div className="flex items-center flex-wrap gap-2 mb-6">
        <div className="w-8 h-7 skeleton-bg rounded-xl" />
        <div className="w-20 h-7 skeleton-bg rounded-xl" />
        <div className="w-24 h-7 skeleton-bg rounded-xl" />
        <div className="w-28 h-7 skeleton-bg rounded-xl" />
      </div>
      <CouponSkeleton />
    </div>
  </>
);

/* ═══════════════════════════════════════════
   COUPONS PAGE
   ═══════════════════════════════════════════ */

const CouponsPage = () => {
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [savedCouponIds, setSavedCouponIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [savedCoupons, setSavedCoupons] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const { copiedId, copy } = useCopy();

  const fetchAvailableCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter) params.type = typeFilter;
      const { data } = await api.get('/coupons/available', { params });
      setAvailableCoupons(data.data?.coupons || []);
    } catch (err) {
      // silent
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  const fetchSavedCoupons = useCallback(async () => {
    setSavedLoading(true);
    try {
      const { data } = await api.get('/coupons/saved');
      const saved = data.data || [];
      setSavedCoupons(saved);
      setSavedCouponIds(new Set(saved.map(c => c.id)));
    } catch (err) {
      // silent
    } finally {
      setSavedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailableCoupons();
    fetchSavedCoupons();
  }, [fetchAvailableCoupons, fetchSavedCoupons]);

  const handleSave = async (couponId) => {
    try {
      await api.post(`/coupons/saved/${couponId}`);
      setSavedCouponIds(prev => new Set([...prev, couponId]));
      toast.success('Đã lưu mã giảm giá!');
      fetchSavedCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lưu thất bại');
    }
  };

  const handleUnsave = async (couponId) => {
    try {
      await api.delete(`/coupons/saved/${couponId}`);
      setSavedCouponIds(prev => {
        const next = new Set(prev);
        next.delete(couponId);
        return next;
      });
      toast.success('Đã xoá khỏi danh sách');
      fetchSavedCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xoá thất bại');
    }
  };

  // Full-page skeleton during initial load
  if (loading) {
    return <FullPageSkeleton />;
  }

  return (
    <div className="overflow-hidden">
      {/* ═══════════════ HERO ═══════════════ */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-800 to-indigo-900">
          <div className="absolute -top-40 -right-32 w-96 h-96 rounded-full bg-primary-500/20 blur-[100px] animate-breathe" />
          <div className="absolute -bottom-48 -left-32 w-[500px] h-[500px] rounded-full bg-indigo-500/15 blur-[120px] animate-breathe" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 section-container py-16 md:py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-white/80 text-[10px] font-semibold uppercase tracking-[0.15em] mb-5">
              <FiTag className="mr-1.5 text-primary-300" />
              Kho ưu đãi
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white leading-[1.05] tracking-tight mb-4">
              Mã giảm giá{' '}
              <span className="text-primary-300">hấp dẫn</span>
            </h1>
            <p className="text-primary-100/70 text-sm md:text-base leading-relaxed max-w-lg">
              Khám phá và lưu lại những mã giảm giá tốt nhất dành cho bạn.
              Sao chép mã và áp dụng khi thanh toán để nhận ưu đãi.
            </p>

            {/* Stats pills */}
            <div className="flex flex-wrap gap-3 mt-8">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
                <FiTag className="text-primary-300 text-sm" />
                <span className="text-white text-xs font-medium">{availableCoupons.length} mã khả dụng</span>
              </div>
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
                <FiBookmarkFilled className="text-primary-300 text-sm" />
                <span className="text-white text-xs font-medium">{savedCouponIds.size} mã đã lưu</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ TABS & FILTERS ═══════════════ */}
      <div className="section-container py-8">
        {/* Tabs */}
        <div className="flex items-center space-x-1 mb-6 bg-surface-secondary rounded-xl p-1 border border-gray-100 w-fit">
          <button
            onClick={() => setActiveTab('available')}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'available'
                ? 'bg-white text-primary-600 shadow-premium-sm ring-1 ring-gray-200'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <FiTag className="text-sm" />
            <span>Tất cả mã</span>
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'saved'
                ? 'bg-white text-primary-600 shadow-premium-sm ring-1 ring-gray-200'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <FiBookmarkFilled className="text-sm" />
            <span>Đã lưu</span>
            {savedCouponIds.size > 0 && (
              <span className="text-[10px] bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded-full font-semibold">
                {savedCouponIds.size}
              </span>
            )}
          </button>
        </div>

        {/* Type filter */}
        {activeTab === 'available' && (
          <div className="flex items-center flex-wrap gap-2 mb-6">
            <span className="text-xs font-medium text-ink-tertiary mr-1">Lọc:</span>
            <button
              onClick={() => setTypeFilter('')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 active:scale-[0.97] ${
                !typeFilter
                  ? 'bg-primary-600 text-white shadow-premium-sm'
                  : 'bg-surface-secondary text-ink-secondary hover:bg-surface-tertiary border border-gray-200'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setTypeFilter('PERCENTAGE')}
              className={`inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 active:scale-[0.97] ${
                typeFilter === 'PERCENTAGE'
                  ? 'bg-primary-600 text-white shadow-premium-sm'
                  : 'bg-surface-secondary text-ink-secondary hover:bg-surface-tertiary border border-gray-200'
              }`}
            >
              <FiPercent className="text-[10px]" />
              <span>Phần trăm</span>
            </button>
            <button
              onClick={() => setTypeFilter('FIXED')}
              className={`inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 active:scale-[0.97] ${
                typeFilter === 'FIXED'
                  ? 'bg-primary-600 text-white shadow-premium-sm'
                  : 'bg-surface-secondary text-ink-secondary hover:bg-surface-tertiary border border-gray-200'
              }`}
            >
              <FiDollarSign className="text-[10px]" />
              <span>Số tiền cố định</span>
            </button>
          </div>
        )}

        {/* ═══════════════ AVAILABLE TAB ═══════════════ */}
        {activeTab === 'available' && (
          <>
            {availableCoupons.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-ink-tertiary">
                    <span className="font-semibold text-ink">{availableCoupons.length}</span> mã giảm giá đang chờ bạn
                  </p>
                  <button
                    onClick={fetchAvailableCoupons}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-1"
                  >
                    <FiRefreshCw className="text-[10px]" />
                    <span>Làm mới</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-fade">
                  {availableCoupons.map((coupon) => (
                    <CouponCard
                      key={coupon.id}
                      coupon={coupon}
                      onSave={handleSave}
                      onUnsave={handleUnsave}
                      isSaved={savedCouponIds.has(coupon.id)}
                      copiedId={copiedId}
                      copy={copy}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-surface-secondary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-premium-sm">
                  <FiTag className="text-3xl text-gray-300" />
                </div>
                <h2 className="text-xl font-bold text-ink mb-2">Hiện chưa có mã giảm giá</h2>
                <p className="text-ink-tertiary text-sm mb-8 max-w-md mx-auto">
                  Hiện tại chưa có mã giảm giá nào khả dụng. Hãy quay lại sau nhé!
                </p>
                <Link to="/products" className="btn-primary inline-flex items-center space-x-2">
                  <FiShoppingBag />
                  <span>Khám phá sản phẩm</span>
                </Link>
              </div>
            )}
          </>
        )}

        {/* ═══════════════ SAVED TAB ═══════════════ */}
        {activeTab === 'saved' && (
          <>
            {savedLoading ? (
              <CouponSkeleton />
            ) : savedCoupons.length > 0 ? (
              <div className="space-y-4 stagger-fade">
                <p className="text-sm text-ink-tertiary mb-4">
                  <span className="font-semibold text-ink">{savedCoupons.length}</span> mã giảm giá đã lưu
                </p>
                {savedCoupons.map((coupon) => (
                  <div key={coupon.id} className="group card-double-bezel hover:ring-1 hover:ring-emerald-200/50 transition-all duration-300">
                    <div className="card-inner">
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-16 rounded-2xl flex flex-col items-center justify-center shadow-premium-sm shrink-0 ${
                          coupon.type === 'PERCENTAGE'
                            ? 'bg-gradient-to-br from-primary-500 to-primary-600'
                            : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                        }`}>
                          {coupon.type === 'PERCENTAGE' ? (
                            <FiPercent className="text-white text-lg mb-0.5" />
                          ) : (
                            <FiDollarSign className="text-white text-lg mb-0.5" />
                          )}
                          <span className="text-white text-[10px] font-bold">
                            {coupon.type === 'PERCENTAGE' ? `${coupon.value}%` : `${(coupon.value / 1000).toFixed(0)}K`}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <code className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold font-mono tracking-wider">
                              {coupon.code}
                            </code>
                            <button
                              onClick={() => copy(coupon.code, coupon.id)}
                              className={`p-1.5 rounded-lg transition-all duration-200 active:scale-[0.9] ${
                                copiedId === coupon.id
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'hover:bg-surface-secondary text-ink-tertiary hover:text-ink'
                              }`}
                            >
                              {copiedId === coupon.id ? <FiCheck size={13} /> : <FiCopy size={13} />}
                            </button>
                          </div>
                          <p className="text-sm text-ink-secondary line-clamp-1">{coupon.description}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-ink-tertiary">
                            <span className="flex items-center space-x-1">
                              <FiShoppingBag className="text-[9px]" />
                              <span>{coupon.storeName}</span>
                            </span>
                            {coupon.minOrderValue > 0 && (
                              <span>Đơn tối thiểu {coupon.minOrderValue.toLocaleString('vi-VN')}₫</span>
                            )}
                            {coupon.expiresAt && (
                              <span className="flex items-center space-x-0.5">
                                <FiClock className="text-[9px]" />
                                <span>Hết hạn: {new Date(coupon.expiresAt).toLocaleDateString('vi-VN')}</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-100">
                            <button
                              onClick={() => copy(coupon.code, coupon.id)}
                              className="group/btn relative overflow-hidden inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 active:scale-[0.97] transition-all duration-200 shadow-premium-sm"
                            >
                              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                              <FiCopy className="text-[11px]" />
                              <span>Sao chép mã</span>
                            </button>
                            <button
                              onClick={() => handleUnsave(coupon.id)}
                              className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-xs font-medium border border-gray-200 text-red-500 hover:bg-red-50 active:scale-[0.97] transition-all duration-200"
                            >
                              <FiX className="mr-1" size={12} />
                              Xoá
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-surface-secondary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-premium-sm">
                  <FiBookmark className="text-3xl text-gray-300" />
                </div>
                <h2 className="text-xl font-bold text-ink mb-2">Chưa lưu mã nào</h2>
                <p className="text-ink-tertiary text-sm mb-8 max-w-md mx-auto">
                  Hãy lưu những mã giảm giá bạn quan tâm để dễ dàng sử dụng sau này
                </p>
                <button
                  onClick={() => setActiveTab('available')}
                  className="btn-primary inline-flex items-center space-x-2"
                >
                  <FiTag />
                  <span>Khám phá mã giảm giá</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* ═══════════════ TIPS ═══════════════ */}
        <div className="mt-12 p-6 rounded-2xl bg-gradient-to-br from-primary-50 to-indigo-50 border border-primary-100/50">
          <h3 className="font-semibold text-ink mb-4 flex items-center space-x-2">
            <FiStar className="text-primary-600" />
            <span>Mẹo sử dụng mã giảm giá</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {[
              { icon: FiCopy, title: 'Sao chép mã', desc: 'Nhấn "Sao chép mã" để lưu mã vào clipboard, sau đó dán vào ô mã giảm giá khi thanh toán.' },
              { icon: FiBookmark, title: 'Lưu lại để dùng sau', desc: 'Nhấn "Lưu" để bookmark mã giảm giá bạn quan tâm, dễ dàng tìm lại khi cần.' },
              { icon: FiClock, title: 'Chú ý hạn sử dụng', desc: 'Mỗi mã đều có thời hạn và điều kiện áp dụng riêng. Hãy kiểm tra kỹ trước khi sử dụng.' },
            ].map((tip, idx) => (
              <div key={idx} className="flex items-start space-x-3">
                <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-premium-sm">
                  <tip.icon className="text-primary-600 text-sm" />
                </div>
                <div>
                  <p className="font-medium text-ink text-sm">{tip.title}</p>
                  <p className="text-xs text-ink-tertiary mt-0.5">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CouponsPage;
