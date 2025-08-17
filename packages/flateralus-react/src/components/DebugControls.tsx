import { useState, useEffect, useCallback, memo } from 'react';
import clsx from 'clsx';
import type {
  Animation,
  AnimationManifest,
  ControlValues,
  Control,
  NumberControl as NumberControlType,
  BooleanControl as BooleanControlType,
  ColorControl as ColorControlType,
  SelectControl as SelectControlType,
  GroupControl as GroupControlType,
} from '@bracketbear/flateralus';
import { getManifestDefaultControlValues } from '@bracketbear/flateralus';
import { Button } from '@bracketbear/core/react';
import {
  NumberControl,
  BooleanControl,
  ColorControl,
  SelectControl,
  GroupControl,
} from './controls';
import {
  GearIcon,
  DiceIcon,
  DownloadIcon,
  ResetIcon,
} from '@bracketbear/core/assets';
import { getRandomControlValues } from '@bracketbear/flateralus';
import type { DeepReadonly } from '@bracketbear/core';

interface DebugControlsProps {
  manifest: AnimationManifest;
  controlValues: ControlValues;
  onControlsChange: (values: Partial<ControlValues>) => void;
  isVisible?: boolean;
  animationRef?: React.RefObject<Animation | null>;
  showDownloadButton?: boolean;
  className?: string;
}

/**
 * Debug Controls Component
 *
 * Provides a dynamic UI for adjusting animation parameters in real-time
 * based on the animation's manifest and control schema
 */
const DebugControls = memo<DebugControlsProps>(
  ({
    manifest,
    controlValues,
    onControlsChange,
    isVisible = false,
    animationRef,
    showDownloadButton = false,
    className,
  }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isPanelVisible, setIsPanelVisible] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState<
      Record<string, boolean>
    >({});
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastTimeout, setToastTimeout] = useState<NodeJS.Timeout | null>(
      null
    );

    // Handle panel mount/unmount for animation
    useEffect(() => {
      if (isExpanded) {
        setIsPanelVisible(true);
      } else {
        const timeout = setTimeout(() => setIsPanelVisible(false), 250);
        return () => clearTimeout(timeout);
      }
    }, [isExpanded]);

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
      const completeValues = { ...defaultValues, ...controlValues };

      // Create a clean object with only the control values
      const settingsToDownload = {
        manifestId: manifest.id,
        controlValues: completeValues,
      };

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
    }, [manifest, controlValues]);

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
        showToast('Controls randomized!');
      }
    }, [manifest, animationRef, onControlsChange]);

    const resetToDefaults = () => {
      if (animationRef?.current) {
        animationRef.current.reset();
        const updatedValues = animationRef.current.getControlValues();
        onControlsChange(updatedValues);
        showToast('Animation reset');
      }
    };

    const renderControl = (control: DeepReadonly<Control>) => {
      const value = controlValues[control.name];

      // Skip controls that shouldn't be shown in debug
      if (!control.debug) return null;

      if (control.type === 'group') {
        const groupValue = Array.isArray(controlValues[control.name])
          ? (controlValues[control.name] as unknown[])
          : [];
        const minItems = control.minItems ?? 0;
        const maxItems = control.maxItems ?? Infinity;
        const isStatic = !!control.static;
        const isCollapsed = collapsedGroups[control.name] ?? false;
        const toggleCollapse = () =>
          setCollapsedGroups((prev) => ({
            ...prev,
            [control.name]: !isCollapsed,
          }));
        type GroupItem = (typeof groupValue)[number];
        const GroupControlTyped = GroupControl as unknown as React.FC<
          React.ComponentProps<typeof GroupControl<GroupItem>>
        >;
        return (
          <GroupControlTyped
            key={control.name}
            control={control as GroupControlType}
            value={groupValue as GroupItem[]}
            onChange={(newValue: GroupItem[]) =>
              onControlsChange({ [control.name]: newValue })
            }
            minItems={minItems}
            maxItems={maxItems}
            isStatic={isStatic}
            isCollapsed={isCollapsed}
            toggleCollapse={toggleCollapse}
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
    };

    if (!isVisible) return null;

    return (
      <div
        className={clsx('flex w-full max-w-160 flex-col items-end', className)}
      >
        {/* Gear toggle button */}
        <Button
          variant="secondary"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mb-2"
          size="sm"
        >
          <img
            src={GearIcon.src}
            alt="Gear Icon"
            className="h-4 w-4 fill-white"
          />
        </Button>

        {/* Debug panel */}
        {isPanelVisible && (
          <div
            className={`rounded-xl border border-neutral-700 bg-neutral-900/95 p-4 text-white shadow-2xl shadow-black/60 backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isExpanded ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-4 scale-95 opacity-0'}`}
            style={{ willChange: 'opacity, transform' }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white/90">
                  {manifest.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={randomizeSettings}
                  size="icon"
                  aria-label="Randomize"
                >
                  <img src={DiceIcon.src} alt="Randomize" className="h-4 w-4" />
                </Button>
                {showDownloadButton && (
                  <Button
                    variant="secondary"
                    onClick={downloadSettings}
                    size="icon"
                    aria-label="Download"
                  >
                    <img
                      src={DownloadIcon.src}
                      alt="Download"
                      className="h-4 w-4"
                    />
                  </Button>
                )}
                <Button
                  variant="warning"
                  onClick={resetToDefaults}
                  size="icon"
                  aria-label="Reset"
                >
                  <img src={ResetIcon.src} alt="Reset" className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="mb-3 text-xs text-white/50">
              {manifest.description}
            </div>
            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {manifest.controls.map(renderControl)}
            </div>
          </div>
        )}
        {toastMessage && (
          <div className="animate-toast-in card fixed bottom-8 left-1/2 z-30 -translate-x-1/2 px-6 py-3 text-lg font-bold shadow-xl">
            {toastMessage}
          </div>
        )}
      </div>
    );
  }
);

DebugControls.displayName = 'DebugControls';

export default DebugControls;
