import { type ChangeEvent, type FC } from 'react';

export interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * A modern, minimal slider input styled for use in control panels.
 */
export const Slider: FC<SliderProps> = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  className = '',
  disabled = false,
}) => {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) =>
        onChange(Number(e.target.value))
      }
      disabled={disabled}
      className={`focus:ring-brand-blue/60 h-2 w-full cursor-pointer appearance-none rounded-lg bg-neutral-700/60 transition-all focus:ring-2 focus:outline-none disabled:opacity-50 ${className}`}
      style={{
        accentColor: 'var(--color-brand-blue, #3b82f6)', // fallback to Tailwind blue-500
      }}
    />
  );
};

export default Slider;
