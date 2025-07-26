import { useCallback, useEffect, useRef, useState } from 'react';

interface UseVisibilityObserverOptions {
  /** Root element for the intersection observer (defaults to viewport) */
  root?: Element | null;
  /** Threshold for when the element is considered visible (0-1) */
  threshold?: number;
  /** Root margin for the intersection observer */
  rootMargin?: string;
  /** Whether to enable the observer (defaults to true) */
  enabled?: boolean;
}

interface UseVisibilityObserverReturn {
  /** Ref to attach to the element you want to observe */
  ref: (node: HTMLElement | null) => void;
  /** Whether the element is currently visible */
  isVisible: boolean;
  /** Whether the observer is currently active */
  isObserving: boolean;
}

/**
 * Hook for observing element visibility using Intersection Observer
 *
 * @param options - Configuration options for the intersection observer
 * @returns Object containing ref, visibility state, and observer state
 */
export function useVisibilityObserver({
  root = null,
  threshold = 0.1,
  rootMargin = '0px',
  enabled = true,
}: UseVisibilityObserverOptions = {}): UseVisibilityObserverReturn {
  const [isVisible, setIsVisible] = useState(false);
  const [isObserving, setIsObserving] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  const ref = useCallback(
    (node: HTMLElement | null) => {
      // Clean up previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
        setIsObserving(false);
      }

      elementRef.current = node;

      if (node && enabled) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              setIsVisible(entry.isIntersecting);
            });
          },
          {
            root,
            threshold,
            rootMargin,
          }
        );

        observerRef.current.observe(node);
        setIsObserving(true);
      } else {
        setIsVisible(false);
        setIsObserving(false);
      }
    },
    [root, threshold, rootMargin, enabled]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { ref, isVisible, isObserving };
}
