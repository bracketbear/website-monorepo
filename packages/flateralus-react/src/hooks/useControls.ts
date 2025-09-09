import { useCallback, useState, useEffect, useRef } from 'react';
import type {
  ControlValues,
  AnimationManifest,
  Animation,
} from '@bracketbear/flateralus';

export interface UseControlsOptions<TControlValues extends ControlValues> {
  /** Animation instance */
  animation: Animation<TControlValues> | null;
  /** Animation manifest */
  manifest: AnimationManifest | undefined;
  /** Initial control values */
  initialControlValues: ControlValues;
  /** Callback when controls are reset */
  onReset?: () => void;
}

export interface UseControlsReturn {
  /** Current control values */
  controlValues: ControlValues;
  /** Handle control changes */
  handleControlsChange: (newValues: Partial<ControlValues>) => Promise<void>;
  /** Whether a reset is in progress */
  showResetToast: boolean;
}

/**
 * Hook for managing control values and changes
 */
export function useControls<
  TControlValues extends ControlValues = ControlValues,
>(options: UseControlsOptions<TControlValues>): UseControlsReturn {
  const { animation, manifest, initialControlValues, onReset } = options;

  const [controlValues, setControlValues] =
    useState<ControlValues>(initialControlValues);
  const [showResetToast, setShowResetToast] = useState(false);

  // Use a ref to track the current animation to avoid stale closures
  const animationRef = useRef(animation);
  animationRef.current = animation;

  // Sync local state with animation's current control values
  useEffect(() => {
    if (animation) {
      const currentValues = animation.getControlValues();
      if (currentValues && Object.keys(currentValues).length > 0) {
        setControlValues(currentValues);
      }
    }
  }, [animation]);

  // Set up a callback to sync with animation control updates
  useEffect(() => {
    if (!animation) return;

    // Set up the callback to sync local state with animation state
    const handleControlsUpdated = (updatedControls: ControlValues) => {
      setControlValues(updatedControls);
    };

    // Set the callback on the animation using the new method
    if (typeof animation.setOnControlsUpdated === 'function') {
      animation.setOnControlsUpdated(handleControlsUpdated);
    }

    // Fallback: manually sync control values periodically
    const interval = setInterval(() => {
      const currentValues = animation.getControlValues();
      if (currentValues && Object.keys(currentValues).length > 0) {
        setControlValues(currentValues);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      // Clean up callback if possible
      if (typeof animation.setOnControlsUpdated === 'function') {
        animation.setOnControlsUpdated(undefined);
      }
    };
  }, [animation]);

  /**
   * Handle control changes from debug panel
   */
  const handleControlsChange = useCallback(
    async (newValues: Partial<ControlValues>) => {
      if (!animationRef.current || !manifest) return;

      let shouldReset = false;

      // Check if any changed controls require a reset
      for (const key in newValues) {
        const control = manifest.controls.find((c) => c.name === key);
        if (control && control.resetsAnimation) {
          shouldReset = true;
          break;
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

        animationRef.current.reset(merged as any);
        setControlValues(merged);
        onReset?.();
      } else {
        // Update controls without reset
        const updatedValues = { ...controlValues };
        for (const key in newValues) {
          if (newValues[key] !== undefined) {
            updatedValues[key] = newValues[key] as any;
          }
        }

        setControlValues(updatedValues);
        animationRef.current.updateControls(newValues as any);
      }
    },
    [controlValues, manifest, onReset]
  );

  // Always return a valid object
  return {
    controlValues,
    handleControlsChange,
    showResetToast,
  };
}
