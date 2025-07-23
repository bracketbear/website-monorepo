import { memo } from 'react';
import { Slider, TextInput } from '@bracketbear/core/react';
import type { NumberControl as NumberControlType } from '@bracketbear/flateralus';

interface NumberControlProps {
  control: NumberControlType;
  value: number;
  onControlChange: (key: string, value: number) => void;
}

/**
 * Number Control Component
 *
 * Renders a slider and number input for numeric animation parameters
 */
const NumberControl = memo<NumberControlProps>(
  ({ control, value, onControlChange }) => {
    return (
      <div className="flex flex-col gap-0.5 py-2">
        <div className="flex items-center gap-2">
          <label className="w-32 shrink-0 text-xs text-white/70">
            {control.label}
          </label>
          <Slider
            key={`slider-${control.name}`}
            value={value}
            min={control.min ?? 0}
            max={control.max ?? 100}
            step={control.step ?? 1}
            onChange={(v) => onControlChange(control.name, v)}
            className="mx-2"
          />
          <TextInput
            key={`input-${control.name}`}
            type="number"
            min={control.min}
            max={control.max}
            step={control.step}
            value={value}
            onChange={(e) =>
              onControlChange(control.name, Number(e.target.value))
            }
            className="w-20 overflow-x-auto text-right"
            size="sm"
          />
        </div>
        {control.description && (
          <div className="mt-0.5 ml-0.5 text-[11px] leading-tight text-white/40">
            {control.description}
          </div>
        )}
      </div>
    );
  }
);

NumberControl.displayName = 'NumberControl';

export default NumberControl;
