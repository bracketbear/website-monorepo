import type { SelectControl as SelectControlType } from '@bracketbear/flateralus';
import { BaseControlWrapper } from './BaseControlWrapper';

interface SelectControlProps {
  control: SelectControlType;
  value: string;
  onControlChange: (key: string, value: string) => void;
}

/**
 * Select Control Component
 *
 * Renders a dropdown select for animation parameters with predefined options
 */
export function SelectControl({
  control,
  value,
  onControlChange,
}: SelectControlProps) {
  return (
    <BaseControlWrapper
      label={control.label}
      name={control.name}
      description={control.description}
    >
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
    </BaseControlWrapper>
  );
}
