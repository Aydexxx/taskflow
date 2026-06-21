import { useEffect, useRef, useState } from 'react';

/** True when the user has asked the OS to minimize non-essential motion. */
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * Reveal-on-scroll: returns a ref and a `shown` flag that flips to true the
 * first time the element scrolls into view, then stops observing (reveal once).
 *
 * Degrades gracefully: if the user prefers reduced motion, or the browser lacks
 * IntersectionObserver, the element is shown immediately with no animation.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(rootMargin = '0px 0px -10% 0px'): {
  ref: React.RefObject<T>;
  shown: boolean;
} {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown) return undefined;
    const node = ref.current;
    if (!node) return undefined;

    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin, threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [shown, rootMargin]);

  return { ref, shown };
}
