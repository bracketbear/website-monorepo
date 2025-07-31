import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useVisibilityObserver } from '@bracketbear/core';
import type {
  Application,
  ControlValues,
  AnimationManifest,
} from '@bracketbear/flateralus';

export interface UseAnimationStageOptions {
  /** Pre-configured application instance (or null during SSR) */
  application: Application | null;
  /** Whether to pause when not visible (defaults to true) */
  pauseWhenHidden?: boolean;
  /** Threshold for visibility detection (0-1, defaults to 0.1) */
  visibilityThreshold?: number;
  /** Root margin for visibility detection (defaults to '0px') */
  visibilityRootMargin?: string;
}

export interface UseAnimationStageReturn {
  /** Ref to attach to the container element */
  containerRef: RefObject<HTMLDivElement | null>;
  /** Current application instance */
  application: Application | null;
  /** Current control values (if animation is set) */
  controlValues: ControlValues;
  /** Animation manifest (if animation is set) */
  manifest: AnimationManifest | undefined;
  /** Whether the stage is initialized */
  isInitialized: boolean;
  /** Whether the stage is running */
  isRunning: boolean;
  /** Whether the stage is visible */
  isVisible: boolean;
}

/**
 * Hook for managing an animation stage with a pre-configured application
 */
export function useAnimationStage(
  options: UseAnimationStageOptions
): UseAnimationStageReturn {
  const {
    application,
    pauseWhenHidden = true,
    visibilityThreshold = 0.1,
    visibilityRootMargin = '0px',
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [controlValues, setControlValues] = useState<ControlValues>({});
  const [manifest, setManifest] = useState<AnimationManifest | undefined>(
    undefined
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Visibility observer for pausing animations when not visible
  const { ref: visibilityRef, isVisible } = useVisibilityObserver({
    threshold: visibilityThreshold,
    rootMargin: visibilityRootMargin,
    enabled: pauseWhenHidden,
  });

  /**
   * Initialize the application
   */
  const initializeStage = useCallback(async () => {
    if (!containerRef.current || !application) return;

    try {
      // Initialize application with container
      await application.init(containerRef.current);

      // Start the application only if it's properly initialized
      if (application.isInitialized()) {
        application.start();
      }

      // Update state
      setIsInitialized(application.isInitialized());
      setIsRunning(application.isRunning());

      // If application has an animation, get its control values and manifest
      const context = application.getContext();
      const animation = application.getAnimation();
      if (context && animation) {
        setControlValues(animation.getControlValues());
        setManifest(animation.getManifest());
      }
    } catch (error) {
      console.error('Failed to initialize animation stage:', error);
    }
  }, [application]);

  // Initialize the stage
  useEffect(() => {
    initializeStage();

    return () => {
      if (application) {
        application.destroy();
      }
    };
  }, [initializeStage]);

  // Handle visibility changes for animation pausing
  useEffect(() => {
    if (!application || !application.isInitialized()) return;

    if (pauseWhenHidden) {
      if (isVisible) {
        application.resume();
        setIsRunning(application.isRunning());
      } else {
        application.pause();
        setIsRunning(application.isRunning());
      }
    }
  }, [isVisible, pauseWhenHidden, application]);

  // Combine refs for visibility observer
  useEffect(() => {
    if (containerRef.current && typeof visibilityRef === 'function') {
      visibilityRef(containerRef.current);
    }
  }, [visibilityRef]);

  return {
    containerRef,
    application,
    controlValues,
    manifest,
    isInitialized,
    isRunning,
    isVisible,
  };
}
