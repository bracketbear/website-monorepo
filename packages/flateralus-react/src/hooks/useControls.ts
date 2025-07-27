import { useCallback, useState } from 'react';
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

  /**
   * Handle control changes from debug panel
   */
  const handleControlsChange = useCallback(
    async (newValues: Partial<ControlValues>) => {
      if (!animation || !manifest) return;

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

        animation.reset(merged as any);
        setControlValues(merged);
        onReset?.();
      } else {
        // Update controls without reset
        setControlValues((prev) => {
          const merged: ControlValues = { ...prev };
          for (const key in newValues) {
            if (newValues[key] !== undefined) {
              merged[key] = newValues[key] as any;
            }
          }
          return merged;
        });

        animation.updateControls(newValues as any);
      }
    },
    [animation, manifest, controlValues, onReset]
  );

  return {
    controlValues,
    handleControlsChange,
    showResetToast,
  };
}
