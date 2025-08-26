import { useCallback, useEffect, useRef, useState } from 'react';
import { averageLuminanceFromPixi } from '@bracketbear/flateralus-animations';
import type { Application } from '@bracketbear/flateralus';

// WCAG 2.1 AA contrast ratio threshold for normal text
const CONTRAST_RATIO_THRESHOLD = 4.5;

export interface UseLuminanceDetectionOptions {
  /** Application instance */
  application: Application | null;
  /** Whether to enable luminance detection */
  enabled?: boolean;
  /** Container element to apply text color classes to */
  containerElement?: HTMLElement | null;
}

export interface UseLuminanceDetectionReturn {
  /** Current text color mode */
  textColorMode: 'light' | 'dark';
  /** Manually trigger luminance check */
  checkLuminance: () => void;
}

/**
 * Hook for detecting background luminance and adjusting text colors for accessibility
 */
export function useLuminanceDetection(
  options: UseLuminanceDetectionOptions
): UseLuminanceDetectionReturn {
  const { application, enabled = true, containerElement } = options;

  const [textColorMode, setTextColorMode] = useState<'light' | 'dark'>('dark');
  const luminanceCheckRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Check background luminance and update text color mode
   */
  const checkLuminance = useCallback(() => {
    if (!enabled || !application) return;

    try {
      // This is specific to PIXI applications - would need to be abstracted
      // for other rendering backends
      const pixiApp = (application as any).getPixiApp?.();
      if (!pixiApp) return;

      const luminance = averageLuminanceFromPixi(pixiApp, undefined);

      // Determine if we need light or dark text based on background luminance
      const lightTextContrast = (luminance + 0.05) / 0.05;
      const darkTextContrast = 1.05 / (luminance + 0.05);

      const newTextColorMode =
        lightTextContrast >= CONTRAST_RATIO_THRESHOLD
          ? 'light'
          : darkTextContrast >= CONTRAST_RATIO_THRESHOLD
            ? 'dark'
            : luminance > 0.5
              ? 'dark'
              : 'light'; // Fallback based on luminance

      setTextColorMode(newTextColorMode);

      // Apply text color mode by adding/removing CSS classes
      if (containerElement) {
        // Remove existing text color mode classes
        containerElement.classList.remove('text-mode-light', 'text-mode-dark');
        // Add the appropriate text color mode class
        containerElement.classList.add(`text-mode-${newTextColorMode}`);
      }
    } catch (error) {
      console.warn('Error checking luminance:', error);
    }
  }, [enabled, application, containerElement]);

  /**
   * Debounced luminance check
   */
  const debouncedLuminanceCheck = useCallback(() => {
    if (luminanceCheckRef.current) {
      clearTimeout(luminanceCheckRef.current);
    }
    luminanceCheckRef.current = setTimeout(checkLuminance, 100);
  }, [checkLuminance]);

  // Setup periodic luminance checking
  useEffect(() => {
    if (!enabled || !application) return;

    // Initial check
    checkLuminance();

    // You might want to set up a periodic check here
    // or integrate with the animation loop

    return () => {
      if (luminanceCheckRef.current) {
        clearTimeout(luminanceCheckRef.current);
      }
    };
  }, [enabled, application, checkLuminance]);

  return {
    textColorMode,
    checkLuminance: debouncedLuminanceCheck,
  };
}
