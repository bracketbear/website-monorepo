import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import clsx from 'clsx';
import type {
  AnimationManifest,
  Control,
  ControlValues,
  GroupControl as GroupControlType,
  NumberControl as NumberControlType,
  BooleanControl as BooleanControlType,
  ColorControl as ColorControlType,
  SelectControl as SelectControlType,
  AnyControlValue,
  Animation,
} from '@bracketbear/flateralus';
import { getManifestDefaultControlValues } from '@bracketbear/flateralus';
import { Button, Accordion, Popover } from '@bracketbear/bear-ui-react';
import {
  NumberControl,
  BooleanControl,
  ColorControl,
  SelectControl,
  GroupControl,
} from './controls';
import { DiceIcon, DownloadIcon, ResetIcon } from './icons';
import { getRandomControlValues } from '@bracketbear/flateralus';
import type { DeepReadonly } from '@bracketbear/bear-ui';

interface DebugControlsProps {
  manifest: AnimationManifest;
  controlValues: ControlValues;
  onControlsChange: (values: Partial<ControlValues>) => void;
  isVisible?: boolean;
  animationRef?: React.RefObject<Animation | null>;
  showDownloadButton?: boolean;
  className?: string;
  /** Callback when randomization is triggered from external source */
  onRandomize?: () => void;
  /** Stage controls to display in accordion at the top */
  stageControls?: {
    manifest: {
      id: string;
      name: string;
      description: string;
      controls: readonly Control[];
    };
    controlValues: Record<string, any>;
  } | null;
  /** Callback when stage controls change */
  onStageControlsChange?: (values: Record<string, any>) => void;
  /** Function to randomize stage controls */
  randomizeStageControls?: () => void;
  /** Function to randomize both animation and stage controls */
  randomizeAllControls?: () => void;
}

/**
 * Debug Controls Component
 *
 * Provides a dynamic UI for adjusting animation parameters in real-time
 * based on the animation's manifest and control schema
 */
export const DebugControls = memo(function DebugControls({
  manifest,
  controlValues,
  onControlsChange,
  isVisible = false,
  animationRef,
  showDownloadButton = false,
  className,
  onRandomize,
  stageControls,
  onStageControlsChange,
  randomizeStageControls,
}: DebugControlsProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTimeout, setToastTimeout] = useState<NodeJS.Timeout | null>(null);
  const [localControlValues, setLocalControlValues] = useState(controlValues);

  // Hook into the animation's control update callback
  useEffect(() => {
    if (!animationRef?.current) return;

    const animation = animationRef.current;

    // Set up the callback to sync local state with animation state
    const handleControlsUpdated = (updatedControls: any) => {
      setLocalControlValues(updatedControls);
    };

    // Set the callback on the animation using the new method
    if (typeof animation.setOnControlsUpdated === 'function') {
      animation.setOnControlsUpdated(handleControlsUpdated);
    }

    // Fallback: manually sync control values periodically
    const interval = setInterval(() => {
      const currentValues = animation.getControlValues();
      if (currentValues && Object.keys(currentValues).length > 0) {
        setLocalControlValues(currentValues);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      // Clean up callback if possible
      if (typeof animation.setOnControlsUpdated === 'function') {
        animation.setOnControlsUpdated(undefined);
      }
    };
  }, [animationRef]);

  const handleControlChange = useCallback(
    (key: string, value: number | boolean | string) => {
      onControlsChange({ [key]: value });
    },
    [onControlsChange]
  );

  const downloadSettings = useCallback(() => {
    // Get default values to ensure we have all required controls
    const defaultValues = getManifestDefaultControlValues(manifest);

    // Merge current values with defaults to ensure completeness
    const completeValues = { ...defaultValues, ...localControlValues };

    // Create a clean object with animation control values
    const settingsToDownload: any = {
      manifestId: manifest.id,
      controlValues: completeValues,
    };

    // Include stage controls if they exist
    if (stageControls) {
      settingsToDownload.stageControls = {
        manifestId: stageControls.manifest.id,
        controlValues: stageControls.controlValues,
      };
    }

    // Create and download the JSON file
    const blob = new Blob([JSON.stringify(settingsToDownload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${manifest.id}-settings.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [manifest, localControlValues, stageControls]);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimeout) clearTimeout(toastTimeout);
    const timeout = setTimeout(() => setToastMessage(null), 1500);
    setToastTimeout(timeout);
  };

  const randomizeSettings = useCallback(() => {
    if (manifest) {
      const randomValues = getRandomControlValues(manifest);
      if (animationRef?.current) {
        animationRef.current.updateControls(randomValues);
      }
      onControlsChange(randomValues);

      // Also randomize stage controls if the function is available
      if (randomizeStageControls) {
        randomizeStageControls();
      }

      showToast('Controls randomized!');
      onRandomize?.();
    }
  }, [
    manifest,
    animationRef,
    onControlsChange,
    onRandomize,
    randomizeStageControls,
  ]);

  const resetToDefaults = () => {
    if (animationRef?.current) {
      animationRef.current.reset();
      const updatedValues = animationRef.current.getControlValues();
      onControlsChange(updatedValues);
      showToast('Animation reset');
    }
  };

  const renderControl = useCallback(
    (control: DeepReadonly<Control>) => {
      const value = localControlValues[control.name];

      // Skip controls that shouldn't be shown in debug
      if (!control.debug) return null;

      if (control.type === 'group') {
        // Use manifest default values if the control value is undefined or empty
        let groupValue = Array.isArray(value)
          ? (value as AnyControlValue[])
          : [];

        // If the group value is empty, use the manifest's default value
        if (
          groupValue.length === 0 &&
          control.defaultValue &&
          Array.isArray(control.defaultValue)
        ) {
          groupValue = control.defaultValue as AnyControlValue[];
        }

        const GroupControlTyped = GroupControl as React.FC<
          React.ComponentProps<typeof GroupControl>
        >;
        return (
          <GroupControlTyped
            key={control.name}
            control={control as GroupControlType}
            value={groupValue}
            onControlChange={(key: string, newValue: any) =>
              onControlsChange({ [control.name]: newValue })
            }
          />
        );
      }

      switch (control.type) {
        case 'number':
          return (
            <NumberControl
              key={control.name}
              control={control as NumberControlType}
              value={value as number}
              onControlChange={handleControlChange}
            />
          );
        case 'boolean':
          return (
            <BooleanControl
              key={control.name}
              control={control as BooleanControlType}
              value={value as boolean}
              onControlChange={handleControlChange}
            />
          );
        case 'color':
          return (
            <ColorControl
              key={control.name}
              control={control as ColorControlType}
              value={value as string}
              onControlChange={handleControlChange}
            />
          );
        case 'select':
          return (
            <SelectControl
              key={control.name}
              control={control as SelectControlType}
              value={value as string}
              onControlChange={handleControlChange}
            />
          );
        default:
          return null;
      }
    },
    [localControlValues, onControlsChange, handleControlChange]
  );

  if (!isVisible) return null;

  // Gear button trigger
  const gearTrigger = useMemo(
    () => (
      <Button variant="trippy" size="icon" aria-label="Open debug controls">
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="hover:animate-spin"
          style={{ animationDuration: '2s' }}
        >
          <path d="M24 13.616v-3.232c-1.651-.587-2.694-.752-3.219-2.019v-.001c-.527-1.271.1-2.134.847-3.707l-2.285-2.285c-1.561.742-2.433 1.375-3.707.847h-.001c-1.269-.526-1.435-1.576-2.019-3.219h-3.232c-.582 1.635-.749 2.692-2.019 3.219h-.001c-1.271.528-2.132-.098-3.707-.847l-2.285 2.285c.745 1.568 1.375 2.434.847 3.707-.527 1.271-1.584 1.438-3.219 2.02v3.232c1.632.58 2.692.749 3.219 2.019.53 1.282-.114 2.166-.847 3.707l2.285 2.286c1.562-.743 2.434-1.375 3.707-.847h.001c1.27.526 1.436 1.579 2.019 3.219h3.232c.582-1.636.75-2.69 2.027-3.222h.001c1.262-.524 2.12.101 3.698.851l2.285-2.286c-.744-1.563-1.375-2.433-.848-3.706.527-1.271 1.588-1.44 3.221-2.021zm-12 2.384c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4z" />
        </svg>
      </Button>
    ),
    []
  );

  return (
    <div className={clsx('flex w-full flex-col items-end', className)}>
      <Popover
        trigger={gearTrigger}
        placement="bottom-end"
        offset={2}
        showArrow={true}
      >
        <div className="max-h-[80vh] w-96 overflow-y-auto p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white/90">
                {manifest.name}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="trippy"
                onClick={randomizeSettings}
                size="icon"
                aria-label="Randomize"
                className="group p-1"
              >
                <DiceIcon
                  className="h-4 w-4 transition-transform duration-500 group-hover:rotate-[360deg] group-hover:animate-bounce"
                  style={{ transformOrigin: 'center' }}
                />
              </Button>

              {showDownloadButton && (
                <Button
                  variant="unstyled"
                  onClick={downloadSettings}
                  size="icon"
                  aria-label="Download"
                  className="bg-brand-green hover:bg-brand-green/90 group text-white"
                >
                  <DownloadIcon className="h-4 w-4 transition-transform duration-200 group-hover:animate-bounce" />
                </Button>
              )}

              <Button
                variant="unstyled"
                onClick={resetToDefaults}
                size="icon"
                aria-label="Reset"
                className="bg-brand-yellow hover:bg-brand-yellow/90 group text-black"
              >
                <ResetIcon
                  className="h-4 w-4 transition-transform duration-300 group-hover:rotate-[-360deg]"
                  style={{ animationDuration: '3s' }}
                />
              </Button>
            </div>
          </div>
          <div className="mb-3 text-xs text-white/50">
            {manifest.description}
          </div>

          {/* Stage Controls Accordion */}
          {stageControls && (
            <div className="mb-4">
              <Accordion
                items={[
                  {
                    id: 'stage-controls',
                    title: stageControls.manifest.name,
                    content: (
                      <div className="space-y-2">
                        {stageControls.manifest.controls.map((control) => {
                          const value =
                            stageControls.controlValues[control.name];
                          if (value === undefined) return null;

                          switch (control.type) {
                            case 'number':
                              return (
                                <NumberControl
                                  key={control.name}
                                  control={control as NumberControlType}
                                  value={value as number}
                                  onControlChange={(key, value) => {
                                    onStageControlsChange?.({
                                      [control.name]: value,
                                    });
                                  }}
                                />
                              );
                            case 'boolean':
                              return (
                                <BooleanControl
                                  key={control.name}
                                  control={control as BooleanControlType}
                                  value={value as boolean}
                                  onControlChange={(key, value) => {
                                    onStageControlsChange?.({
                                      [control.name]: value,
                                    });
                                  }}
                                />
                              );
                            case 'color':
                              return (
                                <ColorControl
                                  key={control.name}
                                  control={control as ColorControlType}
                                  value={value as string}
                                  onControlChange={(key, value) => {
                                    onStageControlsChange?.({
                                      [control.name]: value,
                                    });
                                  }}
                                />
                              );
                            case 'select':
                              return (
                                <SelectControl
                                  key={control.name}
                                  control={control as SelectControlType}
                                  value={value as string}
                                  onControlChange={(key, value) => {
                                    onStageControlsChange?.({
                                      [control.name]: value,
                                    });
                                  }}
                                />
                              );
                            default:
                              return null;
                          }
                        })}
                      </div>
                    ),
                    defaultOpen: true,
                  },
                ]}
                variant="bordered"
              />
            </div>
          )}

          {/* Animation Controls */}
          <div className="space-y-2">
            {useMemo(
              () => manifest.controls.map(renderControl),
              [manifest.controls, renderControl]
            )}
          </div>
        </div>
      </Popover>

      {toastMessage && (
        <div className="animate-toast-in card fixed bottom-8 left-1/2 z-30 -translate-x-1/2 px-6 py-3 text-lg font-bold shadow-xl">
          {toastMessage}
        </div>
      )}
    </div>
  );
});

DebugControls.displayName = 'DebugControls';
