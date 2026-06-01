import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FiZap, FiClock, FiShoppingBag, FiChevronRight, FiTag, FiTrendingUp,
  FiArrowRight, FiShield,
} from 'react-icons/fi';
import api from '../services/api';
import LazyImage from '../components/common/LazyImage';

/* ─── Countdown Hook ─── */
const useCountdown = (targetDate) => {
  const calcRemaining = useCallback(() => {
    const diff = targetDate ? new Date(targetDate).getTime() - Date.now() : -1;
    if (diff <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      total: diff,
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  }, [targetDate]);

  const [remaining, setRemaining] = useState(calcRemaining);

  useEffect(() => {
    const timer = setInterval(() => {
      const r = calcRemaining();
      setRemaining(r);
      if (r.total <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [calcRemaining]);

  return remaining;
};

/* ─── Countdown Unit ─── */
const CountdownUnit = ({ value, label }) => (
  <div className="flex flex-col items-center">
    <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center">
      <span className="text-2xl md:text-3xl font-bold text-white tabular-nums tracking-tight">
        {String(value).padStart(2, '0')}
      </span>
    </div>
    <span className="text-[9px] text-white/50 uppercase tracking-[0.15em] font-medium mt-1.5">{label}</span>
  </div>
);

/* ─── Flash Sale Card ─── */
const FlashSaleCard = ({ product, salePrice }) => {
  const price = product?.discountPrice || product?.price || 0;
  const discountPct = price > 0 ? Math.round((1 - salePrice / price) * 100) : 0;

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group card-double-bezel"
    >
      <div className="card-inner p-0 overflow-hidden rounded-[calc(1.25rem-0.375rem)]">
        {/* Image */}
        <div className="relative aspect-[4/3] bg-surface-secondary overflow-hidden">
          {product.images?.[0] ? (
            <LazyImage
              src={product.images[0]}
              alt={product.name}
              wrapperClassName="w-full h-full"
              className="object-cover group-hover:scale-105 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <FiShoppingBag className="text-3xl" />
            </div>
          )}
          {discountPct > 0 && (
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center px-2.5 py-1 bg-gradient-to-br from-red-500 to-red-600 text-white text-[10px] font-bold rounded-lg shadow-lg shadow-red-500/20">
                <FiZap className="mr-1 text-[9px]" />
                -{discountPct}%
              </span>
            </div>
          )}
          {/* Flash badge */}
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center px-2 py-0.5 bg-amber-400/90 backdrop-blur-sm text-[9px] font-bold text-amber-900 rounded-lg shadow-sm">
              <FiClock className="mr-1 text-[7px]" />
              FLASH
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-[0.15em] mb-1.5">
            {product.category?.name || 'Sản phẩm'}
          </p>
          <h3 className="text-sm font-medium text-ink leading-snug line-clamp-2 mb-3 group-hover:text-primary-600 transition-colors duration-300">
            {product.name}
          </h3>

          {/* Price */}
          <div className="flex items-baseline space-x-2">
            <span className="text-lg font-bold text-red-600 tracking-tight">
              {salePrice.toLocaleString('vi-VN')}₫
            </span>
            <span className="text-xs text-ink-tertiary line-through">
              {price.toLocaleString('vi-VN')}₫
            </span>
          </div>

          {/* Progress bar */}
          {product.stock > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-ink-tertiary mb-1.5">
                <span className="flex items-center space-x-1">
                  <FiShoppingBag className="text-[8px]" />
                  <span>Đã bán {product.soldCount || 0}</span>
                </span>
                <span>Còn {product.stock}</span>
              </div>                  <div className="w-full h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${(() => {
                          const total = product.stock + (product.soldCount || 0);
                          return total > 0 ? Math.min(100, ((product.soldCount || 0) / total) * 100) : 0;
                        })()}%`,
                      }}
                    />
                  </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

/* ─── Skeleton ─── */
const SkeletonGrid = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
      <div key={i} className="card-double-bezel">
        <div className="card-inner p-0 overflow-hidden rounded-[calc(1.25rem-0.375rem)]">
          <div className="aspect-[4/3] skeleton-bg" />
          <div className="p-4 space-y-3">
            <div className="h-3 w-16 skeleton-bg rounded" />
            <div className="h-4 w-full skeleton-bg rounded" />
            <div className="h-5 w-24 skeleton-bg rounded" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

/* ═══════════════════════════════════════════
   FLASH SALE PAGE
   ═══════════════════════════════════════════ */

const FlashSalePage = () => {
  const [flashSales, setFlashSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSaleIndex, setActiveSaleIndex] = useState(0);

  useEffect(() => {
    const fetchFlashSales = async () => {
      try {
        const { data } = await api.get('/flash-sales');
        const sales = data.data || [];
        setFlashSales(sales);
        // Auto-select the first active sale
        if (sales.length > 0) setActiveSaleIndex(0);
      } catch (err) {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchFlashSales();
  }, []);

  const currentSale = flashSales[activeSaleIndex];
  const countdown = useCountdown(currentSale?.endTime || '2020-01-01');

  // Sales with time info
  const upcomingSales = flashSales.filter(
    (s) => new Date(s.startTime) > new Date()
  );
  const activeSales = flashSales.filter(
    (s) => new Date(s.startTime) <= new Date() && new Date(s.endTime) >= new Date()
  );
  const endedSales = flashSales.filter(
    (s) => new Date(s.endTime) < new Date()
  );

  return (
    <div className="overflow-hidden">
      {/* ═══════════════ HERO SECTION ═══════════════ */}
      <div className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-900 via-red-800 to-amber-900">
          <div className="absolute -top-40 -right-32 w-96 h-96 rounded-full bg-red-500/20 blur-[100px] animate-breathe" />
          <div className="absolute -bottom-48 -left-32 w-[500px] h-[500px] rounded-full bg-amber-500/15 blur-[120px] animate-breathe" style={{ animationDelay: '2s' }} />
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: '40px 40px',
            }} />
          </div>
        </div>

        <div className="relative z-10 section-container py-16 md:py-24">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">
            {/* Left: Text */}
            <div className="max-w-xl">
              <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-amber-200 text-[10px] font-semibold uppercase tracking-[0.15em] mb-5">
                <FiZap className="mr-1.5 text-amber-300" />
                Flash Sale
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-4">
                {currentSale?.title || 'Siêu Sale Giới Hạn'}
              </h1>
              {currentSale?.description && (
                <p className="text-red-100/70 text-sm md:text-base leading-relaxed max-w-lg mb-6">
                  {currentSale.description}
                </p>
              )}
              {/* Sale switcher */}
              {flashSales.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {flashSales.map((sale, idx) => {
                    const isActive = idx === activeSaleIndex;
                    const isLive = new Date(sale.startTime) <= new Date() && new Date(sale.endTime) >= new Date();
                    return (
                      <button
                        key={sale.id}
                        onClick={() => setActiveSaleIndex(idx)}
                        className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 active:scale-[0.97] ${
                          isActive
                            ? 'bg-white text-red-700 shadow-premium-md'
                            : 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/10'
                        }`}
                      >
                        {isLive && (
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block mr-1.5 animate-pulse-soft" />
                        )}
                        {sale.title}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Countdown */}
            {currentSale && countdown.total > 0 && (
              <div className="flex flex-col items-center lg:items-end">
                <p className="text-[10px] text-red-200/70 uppercase tracking-[0.15em] font-semibold mb-3 flex items-center space-x-1.5">
                  <FiClock className="text-sm" />
                  <span>Kết thúc trong</span>
                </p>
                <div className="flex items-center space-x-2.5">
                  {countdown.days > 0 && (
                    <CountdownUnit value={countdown.days} label="Ngày" />
                  )}
                  <CountdownUnit value={countdown.hours} label="Giờ" />
                  <span className="text-white/20 text-2xl font-thin mt-[-1.5rem]">:</span>
                  <CountdownUnit value={countdown.minutes} label="Phút" />
                  <span className="text-white/20 text-2xl font-thin mt-[-1.5rem]">:</span>
                  <CountdownUnit value={countdown.seconds} label="Giây" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════ PRODUCTS SECTION ═══════════════ */}
      <div className="section-container py-12 md:py-16">
        {loading ? (
          <SkeletonGrid />
        ) : currentSale?.products?.length > 0 ? (
          <>
            {/* Sale info bar */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-2xl flex items-center justify-center">
                  <FiTag className="text-lg text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-ink">Sản phẩm Flash Sale</h2>
                  <p className="text-xs text-ink-tertiary">
                    {currentSale.products.length} sản phẩm đang giảm giá sốc
                  </p>
                </div>
              </div>
              <Link
                to="/products"
                className="group inline-flex items-center space-x-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
              >
                <span>Xem tất cả</span>
                <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 stagger-fade">
              {currentSale.products.map((item) => (
                <FlashSaleCard
                  key={item.product?.id || item.id}
                  product={item.product}
                  salePrice={item.salePrice}
                />
              ))}
            </div>
          </>
        ) : (
          /* ── Empty / No Active Sales ── */
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-surface-secondary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-premium-sm">
              <FiZap className="text-3xl text-gray-300" />
            </div>
            <h2 className="text-xl font-bold text-ink mb-2">Chưa có Flash Sale nào</h2>
            <p className="text-ink-tertiary text-sm mb-8 max-w-md mx-auto">
              Hiện tại chưa có chương trình Flash Sale nào đang diễn ra. Hãy quay lại sau nhé!
            </p>
            <Link
              to="/products"
              className="group relative overflow-hidden inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-semibold hover:bg-primary-700 active:scale-[0.97] transition-all duration-200 shadow-premium-md"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <FiShoppingBag />
              <span>Khám phá sản phẩm</span>
              <FiChevronRight className="group-hover:translate-x-1 transition-transform" />
            </Link>

            {/* Upcoming sales preview */}
            {upcomingSales.length > 0 && (
              <div className="mt-12 max-w-lg mx-auto">
                <h3 className="text-sm font-semibold text-ink mb-4 flex items-center justify-center space-x-2">
                  <FiClock className="text-primary-600" />
                  <span>Sắp diễn ra</span>
                </h3>
                <div className="space-y-3">
                  {upcomingSales.map((sale) => {
                    const startsIn = new Date(sale.startTime) - new Date();
                    const daysLeft = Math.floor(startsIn / (1000 * 60 * 60 * 24));
                    return (
                      <div
                        key={sale.id}
                        className="card-double-bezel animate-in"
                      >
                        <div className="card-inner flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                              <FiClock className="text-amber-600 text-sm" />
                            </div>
                            <div className="text-left">
                              <p className="font-semibold text-ink text-sm">{sale.title}</p>
                              <p className="text-xs text-ink-tertiary">
                                Bắt đầu sau {daysLeft > 0 ? `${daysLeft} ngày` : `${Math.floor(startsIn / 3600000)} giờ`}
                              </p>
                            </div>
                          </div>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-medium">
                            Sắp diễn ra
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════ TRUST BADGES ═══════════════ */}
      <div className="section-container pb-20">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-xs text-ink-tertiary">
          {[
            { icon: FiZap, label: 'Giảm đến 50%' },
            { icon: FiClock, label: 'Thời gian có hạn' },
            { icon: FiShoppingBag, label: 'Số lượng giới hạn' },
            { icon: FiShield, label: 'Cam kết chính hãng' },
          ].map((badge, i) => (
            <div key={i} className="flex items-center space-x-2">
              <badge.icon className="text-red-500" />
              <span>{badge.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FlashSalePage;
