import { memo } from 'react';
import { Slider, TextInput } from '@bracketbear/core/react';
import type { NumberControl as NumberControlType } from '@bracketbear/flateralus';
import BaseControlWrapper from './BaseControlWrapper';

interface NumberControlProps {
  control: NumberControlType;
  value: number | undefined;
  onControlChange: (key: string, value: number) => void;
}

/**
 * Number Control Component
 *
 * Renders a slider and number input for numeric animation parameters
 */
const NumberControl = memo<NumberControlProps>(
  ({ control, value, onControlChange }) => {
    // Provide default value if undefined
    const defaultValue = control.defaultValue ?? 0;
    const currentValue = value ?? defaultValue;

    return (
      <BaseControlWrapper
        label={control.label}
        description={control.description}
      >
        <Slider
          key={`slider-${control.name}`}
          value={currentValue}
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
          value={currentValue}
          onChange={(e) =>
            onControlChange(control.name, Number(e.target.value))
          }
          className="w-20 overflow-x-auto text-right"
          size="sm"
        />
      </BaseControlWrapper>
    );
  }
);

NumberControl.displayName = 'NumberControl';

export default NumberControl;
