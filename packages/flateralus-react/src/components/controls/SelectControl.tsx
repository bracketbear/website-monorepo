import React, { memo } from 'react';
import type { Control } from '@bracketbear/flateralus';

interface SelectControlProps {
  control: Control & { type: 'select' };
  value: string;
  onControlChange: (key: string, value: string) => void;
}

/**
 * Select Control Component
 *
 * Renders a dropdown select for animation parameters with predefined options
 */
const SelectControl = memo<SelectControlProps>(
  ({ control, value, onControlChange }) => (
    <div className="flex flex-col gap-0.5 py-2">
      <div className="flex items-center gap-2">
        <label className="w-32 shrink-0 text-xs text-white/70">
          {control.label}
        </label>
        <select
          value={value}
          onChange={(e) => onControlChange(control.name, e.target.value)}
          className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white"
        >
          {control.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {control.description && (
        <div className="mt-0.5 ml-0.5 text-[11px] leading-tight text-white/40">
          {control.description}
        </div>
      )}
    </div>
  )
);

SelectControl.displayName = 'SelectControl';

export default SelectControl;
