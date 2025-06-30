import { useCallback, useRef } from 'react';

interface UseIntersectionObserverOptions {
  root?: Element | null;
  threshold?: number;
  onIntersect?: () => void;
}

export function useIntersectionObserver({
  root = null,
  threshold = 0.1,
  onIntersect,
}: UseIntersectionObserverOptions = {}) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const lastItemRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        // Disconnect the old observer
        observerRef.current.disconnect();
      }

      if (node && onIntersect) {
        // Create new observer for the new last item
        observerRef.current = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                onIntersect();
              }
            });
          },
          {
            root,
            threshold,
          }
        );

        observerRef.current.observe(node);
      }
    },
    [root, threshold, onIntersect]
  );

  return { lastItemRef };
} 