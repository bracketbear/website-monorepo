import { type ReactNode } from 'react';
import { clsx } from '@bracketbear/core';
import type { Application } from '@bracketbear/flateralus';
import {
  useAnimationStage,
  useDebugControls,
  useLuminanceDetection,
} from '../hooks/index';
import DebugControls from './DebugControls';

interface AnimationStageProps {
  /** Whether to show debug controls */
  showDebugControls?: boolean;
  /** Whether to show the download button in debug controls */
  showDownloadButton?: boolean;
  /** Pre-configured application instance (or null during SSR) */
  application: Application | null;
  children?: ReactNode;
  className?: string;
  debugControlsClassName?: string;
  /** Whether to enable automatic text color adjustment based on background luminance */
  enableLuminanceDetection?: boolean;
  /** Whether to pause animation when not visible (defaults to true) */
  pauseWhenHidden?: boolean;
  /** Threshold for visibility detection (0-1, defaults to 0.1) */
  visibilityThreshold?: number;
  /** Root margin for visibility detection (defaults to '0px') */
  visibilityRootMargin?: string;
  /** Layout classes for the main container (defaults to 'relative flex h-full w-full items-end') */
  layoutClassName?: string;
}

/**
 * Animation Stage Component
 *
 * A stage that hosts a pre-configured application and displays debug controls.
 * Can automatically adjust text colors based on background luminance for accessibility.
 * Completely framework-agnostic - works with any Application implementation.
 */
export default function AnimationStage({
  showDebugControls = false,
  showDownloadButton = true,
  application,
  children,
  className,
  debugControlsClassName,
  enableLuminanceDetection = true,
  pauseWhenHidden = true,
  visibilityThreshold = 0.1,
  visibilityRootMargin = '0px',
  layoutClassName = 'relative flex h-full w-full items-end',
}: AnimationStageProps) {
  // Main animation stage hook
  const {
    containerRef,
    controlValues: stageControlValues,
    manifest,
  } = useAnimationStage({
    application,
    pauseWhenHidden,
    visibilityThreshold,
    visibilityRootMargin,
  });

  // Debug controls hook - only call if application exists
  const { debugControlsProps, showResetToast } = useDebugControls({
    showDebugControls,
    showDownloadButton,
    application: application || ({} as Application), // Provide empty object if null
    manifest,
    initialControlValues: stageControlValues,
  });

  // Luminance detection hook - only call if application exists
  useLuminanceDetection({
    application: application || ({} as Application), // Provide empty object if null
    enabled: enableLuminanceDetection,
    containerElement: containerRef.current,
  });

  return (
    <div className={clsx(layoutClassName, className)}>
      <div
        ref={containerRef}
        className="absolute inset-0 z-10 h-full w-full"
        style={{ background: 'transparent' }}
      />
      {children && (
        <div className="relative z-20 h-full w-full">{children}</div>
      )}
      {debugControlsProps.isVisible && debugControlsProps.manifest && (
        <DebugControls
          {...debugControlsProps}
          manifest={debugControlsProps.manifest}
          className={clsx(
            'absolute top-4 right-4 z-50',
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
