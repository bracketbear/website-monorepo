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
  AnimationFactory,
  ControlValues,
  AnimationControlValues,
  AnimationManifest,
} from '@bracketbear/flateralus';
import DebugControls from './DebugControls';
import { clsx } from '@bracketbear/core';

const BACKGROUND_COLOR = 'transparent';

interface AnimationStageProps<
  TControlValues extends ControlValues = ControlValues,
> {
  /** Whether to show debug controls */
  showDebugControls?: boolean;
  /** Animation factory function */
  animation?: () => Animation<TControlValues>;
  /** Initial control values override - typed to match the animation's control values */
  initialValues?: Partial<TControlValues>;
  children?: ReactNode;
  className?: string;
}

/**
 * Animation Stage Component
 *
 * A stage that hosts an animation and displays its debug controls.
 */
export default function AnimationStage<
  TControlValues extends ControlValues = ControlValues,
>({
  showDebugControls = false,
  animation,
  initialValues = {},
  children,
  className,
}: AnimationStageProps<TControlValues>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const animationRef = useRef<Animation<TControlValues> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [controlValues, setControlValues] = useState<ControlValues>({});
  const [manifest, setManifest] = useState<AnimationManifest | undefined>(
    undefined
  );

  /**
   * Initialize the PixiJS application and animation
   */
  const initApp = async () => {
    if (!containerRef.current || !animation) return;

    // Clean up existing app
    if (appRef.current) {
      try {
        if (appRef.current.canvas && appRef.current.canvas.parentNode) {
          appRef.current.canvas.parentNode.removeChild(appRef.current.canvas);
        }
        appRef.current.destroy();
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
      setTimeout(() => initApp(), 100);
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

    // Create and initialize the animation
    animationRef.current = animation();
    if (animationRef.current) {
      animationRef.current.init(app, width, height);

      // Apply initial values if provided
      if (Object.keys(initialValues).length > 0) {
        animationRef.current.updateControls({
          ...initialValues,
          ...animationRef.current.getControlValues(),
        });
        setControlValues(animationRef.current.getControlValues());
      } else {
        setControlValues(animationRef.current.getControlValues());
      }

      // Set manifest after animation is initialized
      setManifest(animationRef.current.getManifest());

      // Animation loop
      app.ticker.add(() => {
        if (animationRef.current) {
          animationRef.current.update(width, height);
        }
      });
    }
  };

  /**
   * Handle control changes from debug panel
   */
  const handleControlsChange = useCallback(
    (newValues: Partial<TControlValues>) => {
      setControlValues((prev) => {
        const merged = { ...prev };
        for (const key in newValues) {
          if (newValues[key] !== undefined) {
            merged[key] = newValues[key] as string | number | boolean;
          }
        }
        return merged;
      });

      if (animationRef.current) {
        animationRef.current.updateControls(newValues);
      }
    },
    [animationRef]
  );

  useEffect(() => {
    const startApp = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await initApp();
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
            await initApp();
          }
        }, 250);
      });
      resizeObserverRef.current.observe(containerRef.current);
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }

      if (appRef.current) {
        try {
          appRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying PixiJS app:', error);
        }
      }

      // Clean up animation
      if (animationRef.current) {
        animationRef.current.destroy();
      }
    };
  }, [animation]);

  return (
    <div className={clsx('relative', className)}>
      <div
        ref={containerRef}
        className="absolute inset-0 z-10"
        style={{
          background: BACKGROUND_COLOR,
        }}
      ></div>
      <div className="relative z-20 h-full w-full">{children}</div>
      {showDebugControls && animationRef.current && manifest && (
        <DebugControls
          manifest={manifest}
          controlValues={controlValues}
          onControlsChange={handleControlsChange}
          isVisible={showDebugControls}
        />
      )}
    </div>
  );
}
