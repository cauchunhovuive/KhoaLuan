import React, { useState, useRef, useEffect, useCallback } from 'react';

/* ─── LazyImage ───
 * Lazily loads an image with a blur-up placeholder effect.
 * Uses IntersectionObserver to defer loading until near viewport.
 * Shows a skeleton placeholder while loading, then fades in the image
 * with a subtle blur-to-clear transition.
 *
 * Props:
 *   src        - Image URL
 *   alt        - Alt text
 *   className  - Additional classes for the img element
 *   wrapperClassName - Classes for the outer wrapper div
 *   threshold  - IntersectionObserver threshold (default: 0)
 *   rootMargin - How early to trigger loading (default: '200px')
 *   aspectRatio - Aspect ratio placeholder (default: '1/1')
 *   onLoad     - Callback when image loads
 */
const LazyImage = ({
  src,
  alt = '',
  className = '',
  wrapperClassName = '',
  threshold = 0,
  rootMargin = '200px',
  aspectRatio = '1 / 1',
  onLoad,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const wrapperRef = useRef(null);

  // Observe when element enters viewport to start loading
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    onLoad?.();
  }, [onLoad]);

  // If no src, show placeholder
  if (!src) {
    return (
      <div className={`bg-surface-secondary ${wrapperClassName}`} style={{ aspectRatio }}>
        <div className="w-full h-full flex items-center justify-center text-gray-300">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={`relative overflow-hidden ${wrapperClassName}`}
      style={aspectRatio && aspectRatio !== 'auto' ? { aspectRatio } : undefined}
    >
      {/* Skeleton placeholder (shown before image loads) */}
      {!loaded && (
        <div className="absolute inset-0 skeleton-bg animate-pulse-soft" />
      )}

      {/* Image rendered only when in view to save bandwidth */}
      {inView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={handleLoad}
          className={`
            w-full h-full object-cover transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]
            ${loaded
              ? 'opacity-100 blur-0 scale-100'
              : 'opacity-0 blur-md scale-105'
            }
            ${className}
          `}
        />
      )}

      {/* Loading spinner */}
      {inView && !loaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default LazyImage;
