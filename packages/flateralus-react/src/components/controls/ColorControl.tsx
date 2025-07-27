import { memo } from 'react';
import type { ColorControl as ColorControlType } from '@bracketbear/flateralus';
import BaseControlWrapper from './BaseControlWrapper';

interface ColorControlProps {
  control: ColorControlType;
  value: string | undefined;
  onControlChange: (key: string, value: string) => void;
}

/**
 * Color Control Component
 *
 * Renders a color picker and text input for color animation parameters
 */
const ColorControl = memo<ColorControlProps>(
  ({ control, value, onControlChange }) => {
    // Provide default value if undefined
    const defaultValue = control.defaultValue ?? '#000000';
    const currentValue = value ?? defaultValue;

    return (
      <BaseControlWrapper
        label={control.label}
        description={control.description}
      >
        <input
          type="color"
          value={currentValue}
          onChange={(e) => onControlChange(control.name, e.target.value)}
          className="h-8 w-12 rounded border border-white/20"
        />
        <input
          type="text"
          value={currentValue}
          onChange={(e) => onControlChange(control.name, e.target.value)}
          className="flex-1 rounded bg-white/10 px-2 py-1 text-xs text-white"
          placeholder="#000000"
        />
      </BaseControlWrapper>
    );
  }
);

ColorControl.displayName = 'ColorControl';

export default ColorControl;
