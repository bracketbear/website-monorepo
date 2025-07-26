import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as PIXI from 'pixi.js';
import type {
  Animation,
  ControlValues,
  AnimationManifest,
} from '@bracketbear/flateralus';
import DebugControls from './DebugControls';
import { clsx } from '@bracketbear/core';
import { averageLuminanceFromPixi } from '@bracketbear/flateralus-animations';

const BACKGROUND_COLOR = 'transparent';

// WCAG 2.1 AA contrast ratio threshold for normal text
const CONTRAST_RATIO_THRESHOLD = 4.5;

interface AnimationStageProps<
  TControlValues extends ControlValues = ControlValues,
> {
  /** Whether to show debug controls */
  showDebugControls?: boolean;
  /** Whether to show the download button in debug controls */
  showDownloadButton?: boolean;
  /** Animation factory function */
  animation?: (initialControls?: TControlValues) => Animation<TControlValues>;
  children?: ReactNode;
  className?: string;
  debugControlsClassName?: string;
  initialControls?: Partial<TControlValues>;
  /** Whether to enable automatic text color adjustment based on background luminance */
  enableLuminanceDetection?: boolean;
}

/**
 * Animation Stage Component
 *
 * A stage that hosts an animation and displays its debug controls.
 * Can automatically adjust text colors based on background luminance for accessibility.
 */
export default function AnimationStage<
  TControlValues extends ControlValues = ControlValues,
>({
  showDebugControls = false,
  showDownloadButton = true,
  animation,
  children,
  className,
  debugControlsClassName,
  initialControls,
  enableLuminanceDetection = true,
}: AnimationStageProps<TControlValues>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const animationRef = useRef<Animation<TControlValues> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [controlValues, setControlValues] = useState<ControlValues>({});
  const [manifest, setManifest] = useState<AnimationManifest | undefined>(
    undefined
  );
  const [showResetToast, setShowResetToast] = useState(false);
  const [_textColorMode, setTextColorMode] = useState<'light' | 'dark'>('dark');
  const luminanceCheckRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Check background luminance and update text color mode
   */
  const checkLuminanceAndUpdateTextColor = useCallback(() => {
    if (!enableLuminanceDetection || !appRef.current) return;

    try {
      const luminance = averageLuminanceFromPixi(
        appRef.current,
        undefined,
        false
      );

      // Determine if we need light or dark text based on background luminance
      // Using WCAG 2.1 AA contrast ratio of 4.5:1
      // For light text on dark background: (luminance + 0.05) / (0.05) >= 4.5
      // For dark text on light background: (1.05) / (luminance + 0.05) >= 4.5

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
      if (containerRef.current) {
        const root = containerRef.current;

        // Remove existing text color mode classes
        root.classList.remove('text-mode-light', 'text-mode-dark');

        // Add the appropriate text color mode class
        root.classList.add(`text-mode-${newTextColorMode}`);
      }

      console.log('luminance', luminance, 'text mode:', newTextColorMode);
    } catch (error) {
      console.warn('Error checking luminance:', error);
    }
  }, [enableLuminanceDetection]);

  /**
   * Debounced luminance check
   */
  const debouncedLuminanceCheck = useCallback(() => {
    if (luminanceCheckRef.current) {
      clearTimeout(luminanceCheckRef.current);
    }
    luminanceCheckRef.current = setTimeout(
      checkLuminanceAndUpdateTextColor,
      100
    );
  }, [checkLuminanceAndUpdateTextColor]);

  /**
   * Initialize the PixiJS application and animation
   */
  const initApp = async (initialControls?: Partial<TControlValues>) => {
    if (!containerRef.current || !animation) return;

    // Clean up existing app
    if (appRef.current) {
      try {
        if (appRef.current.canvas && appRef.current.canvas.parentNode) {
          appRef.current.canvas.parentNode.removeChild(appRef.current.canvas);
        }
        appRef.current.destroy(true, { children: true, texture: true });
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
      } catch (error) {
        console.warn('Error destroying PixiJS app:', error);
      }
      appRef.current = null;
    }

    // Get container dimensions
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const width = rect.width || window.innerWidth;
    const height = rect.height || window.innerHeight;

    if (width <= 0 || height <= 0) {
      console.warn('Container has invalid dimensions, retrying...');
      setTimeout(() => initApp(initialControls), 100);
      return;
    }

    // Create PIXI application
    const app = new PIXI.Application();

    await app.init({
      width,
      height,
      backgroundAlpha: 0, // Transparent background
      antialias: true,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
    });

    container.appendChild(app.canvas);
    appRef.current = app;

    // Set canvas styles
    app.canvas.style.position = 'absolute';
    app.canvas.style.top = '0';
    app.canvas.style.left = '0';
    app.canvas.style.width = '100%';
    app.canvas.style.height = '100%';
    app.canvas.style.pointerEvents = 'none'; // Let clicks pass through

    // Create and initialize the animation with initialControls if provided
    animationRef.current = animation(initialControls as any);
    if (animationRef.current) {
      animationRef.current.init(app);
      setControlValues(animationRef.current.getControlValues());

      // Set manifest after animation is initialized
      setManifest(animationRef.current.getManifest());

      // Animation loop with luminance detection
      app.ticker.add(() => {
        if (animationRef.current) {
          animationRef.current.update();
        }

        // Check luminance periodically (every 10 frames for performance)
        if (enableLuminanceDetection && app.ticker.lastTime % 10 === 0) {
          debouncedLuminanceCheck();
        }
      });
    }
    return;
  };

  /**
   * Handle control changes from debug panel
   */
  const handleControlsChange = useCallback(
    async (newValues: Partial<ControlValues>) => {
      let shouldReset = false;

      if (manifest) {
        for (const key in newValues) {
          const control = manifest.controls.find((c) => c.name === key);
          if (control && control.resetsAnimation) {
            shouldReset = true;
            break;
          }
        }
      }

      if (shouldReset) {
        setShowResetToast(true);
        setTimeout(() => setShowResetToast(false), 1500);
        // Merge new values with current state for reset
        const merged: ControlValues = { ...controlValues };

        for (const key in newValues) {
          if (newValues[key] !== undefined) {
            merged[key] = newValues[key] as any;
          }
        }

        if (animationRef.current) {
          (animationRef.current as any).reset(merged);
          setControlValues(merged);
        }
      } else {
        setControlValues((prev) => {
          const merged: ControlValues = { ...prev };
          for (const key in newValues) {
            if (newValues[key] !== undefined) {
              merged[key] = newValues[key] as any;
            }
          }
          return merged;
        });
        if (animationRef.current) {
          animationRef.current.updateControls(newValues as any);
        }
      }

      // Check luminance after control changes
      if (enableLuminanceDetection) {
        debouncedLuminanceCheck();
      }
    },
    [
      animationRef,
      manifest,
      controlValues,
      enableLuminanceDetection,
      debouncedLuminanceCheck,
    ]
  );

  useEffect(() => {
    const startApp = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await initApp(initialControls);
    };
    startApp();

    // Set up resize observer
    if (containerRef.current) {
      let currentWidth = 0;
      let currentHeight = 0;

      resizeObserverRef.current = new ResizeObserver(async () => {
        clearTimeout((resizeObserverRef.current as any).timeout);
        (resizeObserverRef.current as any).timeout = setTimeout(async () => {
          const newRect = containerRef.current?.getBoundingClientRect();
          if (
            newRect &&
            (Math.abs(newRect.width - currentWidth) > 50 ||
              Math.abs(newRect.height - currentHeight) > 50)
          ) {
            currentWidth = newRect.width;
            currentHeight = newRect.height;
            await initApp(initialControls);
          }
        }, 250);
      });
      resizeObserverRef.current.observe(containerRef.current);
    }

    return () => {
      if (luminanceCheckRef.current) {
        clearTimeout(luminanceCheckRef.current);
      }

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }

      if (appRef.current) {
        try {
          appRef.current.destroy(true, { children: true, texture: true });
        } catch (error) {
          console.warn('Error destroying PixiJS app:', error);
        }
      }

      // Clean up animation
      if (animationRef.current) {
        animationRef.current.destroy();
      }
    };
  }, [animation, enableLuminanceDetection]);

  return (
    <div className={clsx('relative', className)}>
      <div
        ref={containerRef}
        className="absolute inset-0 z-10"
        style={{
          background: BACKGROUND_COLOR,
        }}
      ></div>
      {children && (
        <div className="relative z-20 h-full w-full">{children}</div>
      )}
      {showDebugControls && animationRef.current && manifest && (
        <DebugControls
          manifest={manifest}
          controlValues={controlValues}
          onControlsChange={handleControlsChange}
          isVisible={showDebugControls}
          animationRef={animationRef}
          showDownloadButton={showDownloadButton}
          className={clsx(
            'absolute top-16 right-4 z-45',
            debugControlsClassName
          )}
        />
      )}
      {showResetToast && (
        <div className="animate-toast-in card fixed bottom-8 left-1/2 z-50 -translate-x-1/2 px-6 py-3 text-lg font-bold shadow-xl">
          Animation reset
        </div>
      )}
    </div>
  );
}
