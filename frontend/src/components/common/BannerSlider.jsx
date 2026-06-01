import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiArrowRight } from 'react-icons/fi';
import api from '../../services/api';
import { preloadCriticalImages } from '../../utils/useImagePreloader';

const BannerSlider = () => {
  const [banners, setBanners] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/banners')
      .then(({ data }) => {
        const bannersData = data.data || [];
        setBanners(bannersData);
        setLoading(false);
        // Preload banner images immediately for hero above the fold
        const urls = bannersData.map((b) => b.imageUrl).filter(Boolean);
        if (urls.length > 0) {
          preloadCriticalImages(urls);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const goTo = useCallback((index) => {
    setCurrent(index);
  }, []);

  const goNext = useCallback(() => {
    setCurrent((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const goPrev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  // Auto-play
  const [isPaused, setIsPaused] = useState(false);
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;
    const interval = setInterval(goNext, 5000);
    return () => clearInterval(interval);
  }, [banners.length, isPaused, goNext]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="w-full h-[60vh] min-h-[400px] md:min-h-[500px] lg:min-h-[600px] bg-gray-900 shimmer-bg" />
    );
  }

  // Fallback hero when no banners
  if (banners.length === 0) {
    return (
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary-500/20 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary-400/10 blur-3xl" />
        </div>
        <div className="relative section-container py-24 md:py-36">
          <div className="max-w-3xl">
            <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-white/80 text-xs font-medium mb-6 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2 animate-pulse-soft" />
              Hệ thống gợi ý thông minh
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight mb-6 text-balance">
              Mua Sắm Thông Minh
              <span className="block text-primary-200 mt-2">Với Gợi Ý Cá Nhân Hóa</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-100/80 max-w-2xl mb-10 leading-relaxed">
              Hệ thống thông minh phân tích sở thích của bạn và gợi ý những sản phẩm phù hợp nhất.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/products" className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-primary-700 rounded-xl font-semibold hover:bg-primary-50 active:scale-[0.98] transition-all duration-200 shadow-premium-lg group">
                <span>Mua ngay</span>
                <FiArrowRight className="ml-2 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link to="/products?sort=sold" className="inline-flex items-center justify-center px-8 py-3.5 border-2 border-white/20 text-white rounded-xl font-medium hover:bg-white/10 active:scale-[0.98] transition-all duration-200">
                Bán chạy
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div
      className="relative w-full h-[60vh] min-h-[400px] md:min-h-[500px] lg:min-h-[600px] overflow-hidden bg-gray-900"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides */}
      <div className="absolute inset-0">
        {banners.map((banner, idx) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
              idx === current ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
            }`}
          >
            <img
              src={banner.imageUrl}
              alt={banner.title || 'Banner'}
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />

            {/* Overlay */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"
              style={banner.bgColor ? {
                background: `linear-gradient(to right, ${banner.bgColor}dd, ${banner.bgColor}88 60%, transparent)`,
              } : {}}
            />

            {/* Content */}
            <div className="relative h-full max-w-7xl mx-auto px-6 md:px-12 flex items-center">
              <div className="max-w-xl">
                {banner.subtitle && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/80 text-xs font-medium mb-5">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2 animate-pulse-soft" />
                    {banner.subtitle}
                  </div>
                )}

                {banner.title && (
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-[1.1] tracking-tight mb-6 text-balance">
                    {banner.title}
                  </h2>
                )}

                {banner.linkUrl ? (
                  <Link
                    to={banner.linkUrl}
                    className="group inline-flex items-center px-6 py-3 bg-white text-gray-900 rounded-full font-semibold text-sm hover:bg-white/90 active:scale-[0.97] transition-all duration-200"
                  >
                    <span>{banner.linkText || 'Xem thêm'}</span>
                    <span className="ml-2 w-6 h-6 rounded-full bg-gray-900/10 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                      <FiChevronRight className="text-xs" />
                    </span>
                  </Link>
                ) : (
                  <Link
                    to="/products"
                    className="group inline-flex items-center px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full font-semibold text-sm hover:bg-white/20 active:scale-[0.97] transition-all duration-200"
                  >
                    <span>Khám phá ngay</span>
                    <FiArrowRight className="ml-2 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation arrows */}
      {banners.length > 1 && (
        <>
          <button onClick={goPrev}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all duration-200 z-10"
            aria-label="Previous">
            <FiChevronLeft className="text-lg" />
          </button>
          <button onClick={goNext}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all duration-200 z-10"
            aria-label="Next">
            <FiChevronRight className="text-lg" />
          </button>
        </>
      )}

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-2.5 z-10">
          {banners.map((_, idx) => (
            <button key={idx} onClick={() => goTo(idx)}
              className={`transition-all duration-300 rounded-full ${
                idx === current
                  ? 'w-8 h-2.5 bg-white shadow-lg'
                  : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${idx + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerSlider;
