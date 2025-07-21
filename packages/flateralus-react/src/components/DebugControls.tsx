import React, { useState, useEffect, useCallback, memo } from 'react';
import type {
  AnimationManifest,
  ControlValues,
  Control,
} from '@bracketbear/flateralus';
import { Button } from '@bracketbear/core/react';
import {
  NumberControl,
  BooleanControl,
  ColorControl,
  SelectControl,
} from './controls';
import { GearIcon } from '@bracketbear/core/assets';

interface DebugControlsProps {
  manifest: AnimationManifest;
  controlValues: ControlValues;
  onControlsChange: (values: Partial<ControlValues>) => void;
  isVisible?: boolean;
}

/**
 * Debug Controls Component
 *
 * Provides a dynamic UI for adjusting animation parameters in real-time
 * based on the animation's manifest and control schema
 */
const DebugControls = memo<DebugControlsProps>(
  ({ manifest, controlValues, onControlsChange, isVisible = false }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isPanelVisible, setIsPanelVisible] = useState(false);

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

    const resetToDefaults = () => {
      const defaultValues: ControlValues = {};
      manifest.controls.forEach((control) => {
        defaultValues[control.name] = control.defaultValue;
      });
      onControlsChange(defaultValues);
    };

    const renderControl = (control: Control) => {
      const value = controlValues[control.name];

      // Skip controls that shouldn't be shown in debug
      if (!control.debug) return null;

      switch (control.type) {
        case 'number':
          return (
            <NumberControl
              key={control.name}
              control={control as Control & { type: 'number' }}
              value={value as number}
              onControlChange={handleControlChange}
            />
          );
        case 'boolean':
          return (
            <BooleanControl
              key={control.name}
              control={control as Control & { type: 'boolean' }}
              value={value as boolean}
              onControlChange={handleControlChange}
            />
          );
        case 'color':
          return (
            <ColorControl
              key={control.name}
              control={control as Control & { type: 'color' }}
              value={value as string}
              onControlChange={handleControlChange}
            />
          );
        case 'select':
          return (
            <SelectControl
              key={control.name}
              control={control as Control & { type: 'select' }}
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
      <div className="absolute top-4 right-4 z-50 flex w-full max-w-160 flex-col items-end">
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
              <Button variant="warning" onClick={resetToDefaults} size="sm">
                Reset
              </Button>
            </div>
            <div className="mb-3 text-xs text-white/50">
              {manifest.description}
            </div>
            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {manifest.controls.map(renderControl)}
              {/* Remove the test slider */}
            </div>
          </div>
        )}
      </div>
    );
  }
);

DebugControls.displayName = 'DebugControls';

export default DebugControls;
