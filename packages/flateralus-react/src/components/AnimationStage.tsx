import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  Animation,
  ControlValues,
  AnimationManifest,
} from '@bracketbear/flateralus';
import { PixiApplication } from '@bracketbear/flateralus-pixi';
import DebugControls from './DebugControls';
import { clsx, useVisibilityObserver } from '@bracketbear/core';
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
  /** Whether to pause animation when not visible (defaults to true) */
  pauseWhenHidden?: boolean;
  /** Threshold for visibility detection (0-1, defaults to 0.1) */
  visibilityThreshold?: number;
  /** Root margin for visibility detection (defaults to '0px') */
  visibilityRootMargin?: string;
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
  pauseWhenHidden = true,
  visibilityThreshold = 0.1,
  visibilityRootMargin = '0px',
}: AnimationStageProps<TControlValues>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const applicationRef = useRef<PixiApplication | null>(null);
  const animationRef = useRef<Animation<TControlValues> | null>(null);
  const [controlValues, setControlValues] = useState<ControlValues>({});
  const [manifest, setManifest] = useState<AnimationManifest | undefined>(
    undefined
  );
  const [showResetToast, setShowResetToast] = useState(false);
  const [_textColorMode, setTextColorMode] = useState<'light' | 'dark'>('dark');
  const luminanceCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Visibility observer for pausing animations when not visible
  const { ref: visibilityRef, isVisible } = useVisibilityObserver({
    threshold: visibilityThreshold,
    rootMargin: visibilityRootMargin,
    enabled: pauseWhenHidden,
  });

  /**
   * Initialize the application and animation
   */
  const initApplication = useCallback(async () => {
    if (!containerRef.current || !animation) return;

    // Clean up existing application
    if (applicationRef.current) {
      applicationRef.current.destroy();
      applicationRef.current = null;
    }

    // Create new application
    const app = new PixiApplication({
      config: {
        autoResize: true,
        backgroundAlpha: 0,
        antialias: true,
      },
      pauseWhenHidden,
      enableLuminanceDetection,
    });

    // Initialize application with container
    await app.init(containerRef.current);

    // Create and set animation
    const animationInstance = animation(initialControls as any);
    app.setAnimation(animationInstance);

    // Start the application
    app.start();

    // Store references
    applicationRef.current = app;
    animationRef.current = animationInstance;

    // Update state
    setControlValues(animationInstance.getControlValues());
    setManifest(animationInstance.getManifest());
  }, [animation, initialControls, pauseWhenHidden, enableLuminanceDetection]);

  /**
   * Check background luminance and update text color mode
   */
  const checkLuminanceAndUpdateTextColor = useCallback(() => {
    if (!enableLuminanceDetection || !applicationRef.current) return;

    try {
      const luminance = averageLuminanceFromPixi(
        applicationRef.current.getPixiApp(),
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
    initApplication();

    return () => {
      if (applicationRef.current) {
        applicationRef.current.destroy();
      }
    };
  }, [initApplication]);

  // Effect to handle visibility changes for animation pausing
  useEffect(() => {
    if (!applicationRef.current) return;

    if (pauseWhenHidden) {
      if (isVisible) {
        applicationRef.current.resume();
        console.log('AnimationStage: Animation resumed (visible)');
      } else {
        applicationRef.current.pause();
        console.log('AnimationStage: Animation paused (hidden)');
      }
    }
  }, [isVisible, pauseWhenHidden]);

  return (
    <div ref={visibilityRef} className={clsx('relative', className)}>
      <div
        ref={containerRef}
        className="absolute inset-0 z-10"
        style={{ background: 'transparent' }}
      />
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
