import { type ReactNode } from 'react';
import { clsx } from '@bracketbear/core';
import type { Application, StageControlValues } from '@bracketbear/flateralus';
import {
  useAnimationStage,
  useDebugControls,
  useLuminanceDetection,
} from '../hooks/index';
import { DebugControls } from './DebugControls';
import { useCallback } from 'react';

/**
 * Usage Example:
 *
 * ```tsx
 * function MyAnimationComponent() {
 *   const [stageControls, setStageControls] = useState({
 *     backgroundColor: '#000000',
 *     backgroundAlpha: 0.5,
 *     enableGrid: true,
 *     gridColor: '#ffffff',
 *     gridOpacity: 0.2,
 *   });
 *
 *   const handleStageControlsChange = (newControls: StageControlValues) => {
 *     setStageControls(newControls);
 *   };
 *
 *   return (
 *     <AnimationStage
 *       application={application}
 *       showDebugControls={true}
 *       stageControls={stageControls}
 *       onStageControlsChange={handleStageControlsChange}
 *       className="h-96 w-full"
 *     />
 *   );
 * }
 * ```
 */

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
  /** Callback when randomization is triggered from external source */
  onRandomize?: () => void;
  /** Stage control values to show in debug menu */
  stageControls?: Partial<StageControlValues>;
  /** Callback when stage controls change */
  onStageControlsChange?: (values: StageControlValues) => void;
}

/**
 * Animation Stage Component
 *
 * A stage that hosts a pre-configured application and displays debug controls.
 * Can automatically adjust text colors based on background luminance for accessibility.
 * Completely framework-agnostic - works with any Application implementation.
 * Supports stage-level controls like background color, grid, and effects.
 */
export function AnimationStage({
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
  onRandomize,
  stageControls,
  onStageControlsChange,
}: AnimationStageProps) {
  // Main animation stage hook
  const { containerRef } = useAnimationStage({
    application,
    pauseWhenHidden,
    visibilityThreshold,
    visibilityRootMargin,
  });

  // Debug controls hook - now includes stage controls
  const { debugControlsProps, showResetToast } = useDebugControls({
    showDebugControls,
    showDownloadButton,
    application: application || ({} as Application), // Provide empty object if null
    onRandomize,
    stageControls, // Pass stage controls here
    onStageControlsChange, // Pass callback here
  });

  // Luminance detection hook - only call if application exists
  useLuminanceDetection({
    application: application || ({} as Application), // Provide empty object if null
    enabled: enableLuminanceDetection,
    containerElement: containerRef.current,
  });

  // Function to randomize all controls (both animation and stage)
  const handleRandomizeAll = useCallback(() => {
    if (debugControlsProps.randomizeAllControls) {
      debugControlsProps.randomizeAllControls();
    }
    onRandomize?.();
  }, [debugControlsProps.randomizeAllControls, onRandomize]);

  return (
    <div className={clsx(layoutClassName, className)}>
      <div
        ref={containerRef}
        className="absolute inset-0 z-0 h-full w-full"
        style={{ background: 'transparent' }}
      />
      {children && (
        <div className="relative z-10 h-full w-full">{children}</div>
      )}
      {debugControlsProps.isVisible && debugControlsProps.manifest && (
        <DebugControls
          {...debugControlsProps}
          manifest={debugControlsProps.manifest}
          onRandomize={handleRandomizeAll}
          className={clsx(
            'absolute top-0 right-0 z-30',
            debugControlsClassName
          )}
        />
      )}
      {showResetToast && (
        <div className="animate-toast-in card fixed bottom-8 left-1/2 z-30 -translate-x-1/2 px-6 py-3 text-lg font-bold shadow-xl">
          Animation reset
        </div>
      )}
    </div>
  );
}
