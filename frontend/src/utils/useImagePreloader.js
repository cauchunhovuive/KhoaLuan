import { useEffect, useRef } from 'react';

/* ─── useImagePreloader ───
 * Preloads an array of image URLs by creating Image objects.
 * Call in components that display hero/banner images.
 *
 * Usage:
 *   useImagePreloader(bannerImages);
 *   // Images are preloaded immediately when component mounts
 */
const useImagePreloader = (imageUrls) => {
  const preloaded = useRef(false);

  useEffect(() => {
    if (preloaded.current || !imageUrls?.length) return;
    preloaded.current = true;

    // Use requestIdleCallback if available to avoid blocking interactions
    const schedulePreload = (cb) => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(cb, { timeout: 2000 });
      } else {
        setTimeout(cb, 100);
      }
    };

    schedulePreload(() => {
      imageUrls.forEach((url) => {
        if (!url || typeof url !== 'string') return;
        const img = new Image();
        img.src = url;
        // Set loading='eager' explicitly for priority
        img.fetchPriority = 'high';
      });
    });
  }, [imageUrls]);
};

/* ─── preloadImages (standalone, for use outside hooks) ─── */
const preloadImages = (urls, priority = 'high') => {
  if (typeof window === 'undefined' || !urls?.length) return;
  urls.forEach((url) => {
    if (!url || typeof url !== 'string') return;
    const img = new Image();
    img.fetchPriority = priority;
    img.src = url;
  });
};

/* ─── preloadCriticalImages ───
 * Preloads images immediately (synchronous-style, called at module level).
 * Use for above-the-fold hero images that must load ASAP.
 */
const preloadCriticalImages = (urls) => {
  if (typeof window === 'undefined' || !urls?.length) return;
  urls.forEach((url) => {
    if (!url || typeof url !== 'string') return;
    const img = new Image();
    img.fetchPriority = 'high';
    img.src = url;
  });
};

export { useImagePreloader, preloadImages, preloadCriticalImages };
