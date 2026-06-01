import { useState, useRef, useEffect } from 'react';

/* ─── LazySection ───
 * Defer rendering of children until the element is near the viewport.
 * Uses IntersectionObserver with rootMargin to trigger early.
 *
 * Props:
 *   children      - Content to render when visible
 *   placeholder   - Optional placeholder (default: minimal skeleton)
 *   rootMargin    - How early to trigger (default: '200px')
 *   className     - Optional wrapper class
 *   once          - If true, renders permanently after first intersection (default: true)
 */
const LazySection = ({
  children,
  placeholder,
  rootMargin = '200px',
  className = '',
  once = true,
}) => {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If IntersectionObserver is not supported, load immediately
    if (typeof IntersectionObserver === 'undefined') {
      setLoaded(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoaded(true);
          if (once) observer.unobserve(el);
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, once]);

  return (
    <div ref={ref} className={className}>
      {loaded ? (
        children
      ) : (
        placeholder || (
          <div className="w-full min-h-[100px] flex items-center justify-center">
            <div className="flex flex-col items-center space-y-2 py-8">
              <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              <span className="text-[10px] text-ink-tertiary">Đang tải...</span>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default LazySection;
