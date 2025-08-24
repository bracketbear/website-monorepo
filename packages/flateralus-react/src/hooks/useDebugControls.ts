import { useState, useMemo, useCallback, useEffect } from 'react';
import type {
  ControlValues,
  AnimationManifest,
  Application,
  StageControlValues,
  StageControlsManifest,
} from '@bracketbear/flateralus';
import { getRandomControlValues } from '@bracketbear/flateralus';
import { useControls } from './useControls';

export interface UseDebugControlsOptions {
  /** Whether to show debug controls */
  showDebugControls?: boolean;
  /** Whether to show download button */
  showDownloadButton?: boolean;
  /** The application instance */
  application: Application;
  /** Callback when controls are reset */
  onReset?: () => void;
  /** Callback when randomization is triggered from external source */
  onRandomize?: () => void;
  /** Initial stage control values */
  stageControls?: Partial<StageControlValues>;
  /** Callback when stage controls change */
  onStageControlsChange?: (values: StageControlValues) => void;
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
    onRandomize?: () => void;
    stageControls?: {
      manifest: StageControlsManifest;
      controlValues: Record<string, any>;
    } | null;
    onStageControlsChange?: (values: Record<string, any>) => void;
    randomizeStageControls: () => void;
    randomizeAllControls: () => void;
  };
}

/**
 * Hook for managing debug controls state and interactions
 */
export function useDebugControls({
  showDebugControls = false,
  showDownloadButton = true,
  application,
  onReset,
  onRandomize,
  stageControls,
  onStageControlsChange,
}: UseDebugControlsOptions): UseDebugControlsReturn {
  // State to force refresh of stage controls
  const [stageControlsVersion, setStageControlsVersion] = useState(0);

  // Get the animation from the application
  const animation = application.getAnimation?.() || null;

  // Get manifest and control values directly from the animation
  const animationManifest = animation?.getManifest();
  const initialControlValues = animation?.getControlValues() || {};

  // Get stage controls manifest and values from the application
  const stageControlsManifest =
    application.getStageControlsManifest?.() || null;
  const currentStageControls = application.getStageControlValues?.() || {};

  // Function to randomize stage controls
  const randomizeStageControls = useCallback(() => {
    if (stageControlsManifest && application.updateStageControls) {
      const randomStageValues: Record<string, any> = {};

      stageControlsManifest.controls.forEach((control: any) => {
        switch (control.type) {
          case 'number':
            const min = (control as any).min || 0;
            const max = (control as any).max || 1;
            randomStageValues[control.name] = Math.random() * (max - min) + min;
            break;
          case 'boolean':
            randomStageValues[control.name] = Math.random() < 0.5;
            break;
          case 'color':
            const randomHex =
              '#' +
              Math.floor(Math.random() * 16777215)
                .toString(16)
                .padStart(6, '0');
            randomStageValues[control.name] = randomHex;
            break;
          case 'select':
            if (
              (control as any).options &&
              Array.isArray((control as any).options)
            ) {
              const randomIndex = Math.floor(
                Math.random() * (control as any).options.length
              );
              randomStageValues[control.name] = (control as any).options[
                randomIndex
              ].value;
            }
            break;
          default:
            randomStageValues[control.name] = (control as any).defaultValue;
        }
      });

      application.updateStageControls(randomStageValues);
      // Force refresh of stage controls in the UI
      setStageControlsVersion((prev) => prev + 1);
    }
  }, [stageControlsManifest, application]);

  // Function to randomize both animation controls and stage controls
  const randomizeAllControls = useCallback(() => {
    // Randomize animation controls if available
    if (animationManifest && animation) {
      const randomValues = getRandomControlValues(animationManifest);
      animation.updateControls(randomValues);
      // Force a refresh of the control values
      setStageControlsVersion((prev) => prev + 1);
    }

    // Randomize stage controls
    randomizeStageControls();

    // Call the external onRandomize callback
    onRandomize?.();
  }, [animationManifest, animation, randomizeStageControls, onRandomize]);

  // Poll for animation control value changes to keep debug controls in sync
  useEffect(() => {
    if (!animation || !showDebugControls) return;

    const interval = setInterval(() => {
      const currentValues = animation.getControlValues();
      if (currentValues && Object.keys(currentValues).length > 0) {
        // Force a refresh to sync with current animation state
        setStageControlsVersion((prev) => prev + 1);
      }
    }, 100); // Poll every 100ms

    return () => clearInterval(interval);
  }, [animation, showDebugControls]);

  // Combine animation and stage controls
  const combinedManifest = useMemo(() => {
    if (!animationManifest) return undefined;

    // Only include animation controls - stage controls are handled separately
    return {
      ...animationManifest,
      controls: [...animationManifest.controls],
    };
  }, [animationManifest]);

  // Combine initial control values
  const combinedInitialValues = useMemo(() => {
    // Only include animation control values - stage controls are handled separately
    return {
      ...initialControlValues,
    };
  }, [initialControlValues]);

  const { controlValues, handleControlsChange, showResetToast } = useControls({
    animation,
    manifest: combinedManifest,
    initialControlValues: combinedInitialValues,
    onReset,
  });

  // Separate stage controls for the accordion
  const stageControlsForAccordion = useMemo(() => {
    if (!stageControlsManifest) return null;

    // Get stage control values directly from the application
    const stageControlValues: Record<string, any> = {};

    stageControlsManifest.controls.forEach((control: any) => {
      const value =
        stageControls?.[control.name as keyof StageControlValues] ??
        currentStageControls?.[control.name as keyof StageControlValues] ??
        (control as any).defaultValue;

      if (value !== undefined) {
        stageControlValues[control.name] = value;
      }
    });

    return {
      manifest: stageControlsManifest,
      controlValues: stageControlValues,
    };
  }, [
    stageControlsManifest,
    stageControls,
    currentStageControls,
    stageControlsVersion,
  ]);

  // Handle stage control changes separately
  const handleCombinedControlsChange = async (
    newValues: Partial<ControlValues>
  ) => {
    // All changes are now animation controls since stage controls are separate
    await handleControlsChange(newValues);
  };

  const isVisible =
    showDebugControls && (!!animation || !!stageControlsManifest);

  const debugControlsProps = useMemo(
    () => ({
      manifest: combinedManifest,
      controlValues,
      onControlsChange: handleCombinedControlsChange,
      isVisible,
      animationRef: { current: animation },
      showDownloadButton,
      onRandomize,
      stageControls: stageControlsForAccordion,
      onStageControlsChange: (values: Record<string, any>) => {
        if (application.updateStageControls) {
          application.updateStageControls(values);
          onStageControlsChange?.(application.getStageControlValues());
          // Force refresh of stage controls in the UI
          setStageControlsVersion((prev) => prev + 1);
        }
      },
      // Expose the randomize function so it can be called from external buttons
      randomizeStageControls,
      randomizeAllControls,
    }),
    [
      combinedManifest,
      controlValues,
      handleCombinedControlsChange,
      isVisible,
      animation,
      showDownloadButton,
      onRandomize,
      stageControlsForAccordion,
      application,
      onStageControlsChange,
      randomizeStageControls,
      randomizeAllControls,
    ]
  );

  return {
    controlValues,
    handleControlsChange: handleCombinedControlsChange,
    showResetToast,
    isVisible,
    debugControlsProps,
  };
}
