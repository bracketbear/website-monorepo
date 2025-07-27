import { useMemo } from 'react';
import type {
  ControlValues,
  AnimationManifest,
  Application,
} from '@bracketbear/flateralus';
import { useControls } from './useControls';

export interface UseDebugControlsOptions {
  /** Whether to show debug controls */
  showDebugControls?: boolean;
  /** Whether to show the download button */
  showDownloadButton?: boolean;
  /** Application instance */
  application: Application;
  /** Animation manifest */
  manifest: AnimationManifest | undefined;
  /** Initial control values */
  initialControlValues: ControlValues;
  /** Callback when controls are reset */
  onReset?: () => void;
}

export interface UseDebugControlsReturn {
  /** Current control values */
  controlValues: ControlValues;
  /** Handle control changes */
  handleControlsChange: (newValues: Partial<ControlValues>) => Promise<void>;
  /** Whether to show reset toast */
  showResetToast: boolean;
  /** Whether debug controls should be visible */
  isVisible: boolean;
  /** Props to pass to DebugControls component */
  debugControlsProps: {
    manifest: AnimationManifest | undefined;
    controlValues: ControlValues;
    onControlsChange: (newValues: Partial<ControlValues>) => Promise<void>;
    isVisible: boolean;
    animationRef: { current: any };
    showDownloadButton: boolean;
  };
}

/**
 * Hook for managing debug controls state and interactions
 */
export function useDebugControls(
  options: UseDebugControlsOptions
): UseDebugControlsReturn {
  const {
    showDebugControls = false,
    showDownloadButton = true,
    application,
    manifest,
    initialControlValues,
    onReset,
  } = options;

  // Get the animation from the application
  const animation = (application as any).animation || null;

  const { controlValues, handleControlsChange, showResetToast } = useControls({
    animation,
    manifest,
    initialControlValues,
    onReset,
  });

  const isVisible = showDebugControls && !!animation && !!manifest;

  const debugControlsProps = useMemo(
    () => ({
      manifest,
      controlValues,
      onControlsChange: handleControlsChange,
      isVisible,
      animationRef: { current: animation },
      showDownloadButton,
    }),
    [
      manifest,
      controlValues,
      handleControlsChange,
      isVisible,
      animation,
      showDownloadButton,
    ]
  );

  return {
    controlValues,
    handleControlsChange,
    showResetToast,
    isVisible,
    debugControlsProps,
  };
}
