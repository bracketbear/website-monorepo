import { useState, useCallback } from 'react';
import clsx from 'clsx';
import type {
  Control,
  ControlValues,
  NumberControl as NumberControlType,
  BooleanControl as BooleanControlType,
  ColorControl as ColorControlType,
  SelectControl as SelectControlType,
} from '@bracketbear/flateralus';
import {
  NumberControl,
  BooleanControl,
  ColorControl,
  SelectControl,
} from './controls';
// Using inline SVG instead of imported icon

interface StageControlsAccordionProps {
  /** Stage controls manifest */
  manifest: {
    id: string;
    name: string;
    description: string;
    controls: readonly Control[];
  };
  /** Current control values */
  controlValues: ControlValues;
  /** Callback when controls change */
  onControlsChange: (values: Partial<ControlValues>) => void;
  /** Whether the accordion is expanded by default */
  defaultExpanded?: boolean;
}

/**
 * Stage Controls Accordion Component
 *
 * Displays stage-level controls (background, grid, effects) in a collapsible accordion
 * at the top of the debug controls panel.
 */
export default function StageControlsAccordion({
  manifest,
  controlValues,
  onControlsChange,
  defaultExpanded = false,
}: StageControlsAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleControlChange = useCallback(
    (key: string, value: number | boolean | string) => {
      onControlsChange({ [key]: value });
    },
    [onControlsChange]
  );

  const renderControl = (control: Control) => {
    const value = controlValues[control.name];
    if (value === undefined) return null;

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

  // Group controls by category
  const controlsByCategory = manifest.controls.reduce((acc, control) => {
    const category = (control as any).category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(control);
    return acc;
  }, {} as Record<string, Control[]>);

  const categoryLabels: Record<string, string> = {
    background: 'Background',
    grid: 'Grid',
    layout: 'Layout',
    effects: 'Effects',
    other: 'Other',
  };

  return (
    <div className="mb-4 rounded-lg border border-neutral-600 bg-neutral-800/50">
      {/* Accordion Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-3 text-left text-sm font-medium text-white/90 hover:bg-neutral-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>🎨</span>
          <span>{manifest.name}</span>
        </div>
        <svg
          className={clsx(
            'h-4 w-4 text-white/60 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="border-t border-neutral-600 bg-neutral-800/30 p-3">
          <div className="mb-2 text-xs text-white/60">
            {manifest.description}
          </div>
          
          {/* Render controls by category */}
          {Object.entries(controlsByCategory).map(([category, controls]) => (
            <div key={category} className="mb-3 last:mb-0">
              <h4 className="mb-2 text-xs font-medium text-white/70 uppercase tracking-wide">
                {categoryLabels[category] || category}
              </h4>
              <div className="space-y-2">
                {controls.map(renderControl)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
