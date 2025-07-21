import React, { memo } from 'react';
import { CheckboxInput } from '@bracketbear/core/react';
import type { Control } from '@bracketbear/flateralus';

interface BooleanControlProps {
  control: Control & { type: 'boolean' };
  value: boolean;
  onControlChange: (key: string, value: boolean) => void;
}

/**
 * Boolean Control Component
 *
 * Renders a checkbox for boolean animation parameters
 */
const BooleanControl = memo<BooleanControlProps>(
  ({ control, value, onControlChange }) => (
    <div className="flex flex-col gap-0.5 py-2">
      <div className="flex items-center gap-2">
        <label className="w-32 shrink-0 text-xs text-white/70">
          {control.label}
        </label>
        <CheckboxInput
          checked={value}
          onChange={(e) => onControlChange(control.name, e.target.checked)}
          className="ml-auto rounded bg-white/10"
          size="sm"
        />
      </div>
      {control.description && (
        <div className="mt-0.5 ml-0.5 text-[11px] leading-tight text-white/40">
          {control.description}
        </div>
      )}
    </div>
  )
);

BooleanControl.displayName = 'BooleanControl';

export default BooleanControl;
