import type { ColorControl as ColorControlType } from '@bracketbear/flateralus';
import { BaseControlWrapper } from './BaseControlWrapper';

interface ColorControlProps {
  control: ColorControlType;
  value: string | number | undefined; // Accept both string and number
  onControlChange: (key: string, value: string | number) => void; // Output both types
}

/**
 * Color Control Component
 *
 * Renders a color picker and text input for color animation parameters
 * Handles both hex strings and numeric values for flexibility
 */
export function ColorControl({
  control,
  value,
  onControlChange,
}: ColorControlProps) {
  // Provide default value if undefined
  const defaultValue = control.defaultValue ?? '#000000';
  const currentValue = value ?? defaultValue;

  // Convert any value to hex string for color picker display
  const getHexValue = (val: string | number): string => {
    if (typeof val === 'string') {
      // Check if it's a valid hex color
      if (val.startsWith('#') && /^#[0-9A-Fa-f]{6}$/.test(val)) {
        return val;
      }
      // Check if it's a valid hex color without #
      if (/^[0-9A-Fa-f]{6}$/.test(val)) {
        return `#${val}`;
      }
      // If it's not a valid hex color, return a default
      return '#000000';
    } else {
      // Convert number to hex string
      return '#' + val.toString(16).padStart(6, '0');
    }
  };

  const hexValue = getHexValue(currentValue);

  const handleColorChange = (newValue: string) => {
    // Convert hex string from color picker to number for performance
    const numericValue = parseInt(newValue.replace('#', ''), 16);
    onControlChange(control.name, numericValue);
  };

  const handleTextChange = (newValue: string) => {
    // Handle multiple input formats
    let finalValue: string | number;

    if (newValue.startsWith('#')) {
      // Hex string input - keep as string for compatibility
      finalValue = newValue;
    } else if (newValue.startsWith('0x')) {
      // Hex number input - convert to number
      finalValue = parseInt(newValue, 16);
    } else {
      // Try to parse as decimal number
      const numericValue = parseInt(newValue, 10);
      if (!isNaN(numericValue)) {
        finalValue = numericValue;
      } else {
        // If not a valid number, keep as string
        finalValue = newValue;
      }
    }

    onControlChange(control.name, finalValue);
  };

  return (
    <BaseControlWrapper
      label={control.label}
      name={control.name}
      description={control.description}
    >
      <input
        type="color"
        value={hexValue}
        onChange={(e) => handleColorChange(e.target.value)}
        className="h-8 w-12 rounded border border-white/20"
      />
      <input
        type="text"
        value={hexValue}
        onChange={(e) => handleTextChange(e.target.value)}
        className="flex-1 rounded bg-white/10 px-2 py-1 text-xs text-white"
        placeholder="0x000000 or #000000"
      />
    </BaseControlWrapper>
  );
}
