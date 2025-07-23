import { memo } from 'react';
import type { ColorControl as ColorControlType } from '@bracketbear/flateralus';

interface ColorControlProps {
  control: ColorControlType;
  value: string;
  onControlChange: (key: string, value: string) => void;
}

/**
 * Color Control Component
 *
 * Renders a color picker and text input for color animation parameters
 */
const ColorControl = memo<ColorControlProps>(
  ({ control, value, onControlChange }) => (
    <div className="flex flex-col gap-0.5 py-2">
      <div className="flex items-center gap-2">
        <label className="w-32 shrink-0 text-xs text-white/70">
          {control.label}
        </label>
        <input
          type="color"
          value={value}
          onChange={(e) => onControlChange(control.name, e.target.value)}
          className="h-8 w-12 rounded border border-white/20"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onControlChange(control.name, e.target.value)}
          className="flex-1 rounded bg-white/10 px-2 py-1 text-xs text-white"
          placeholder="#000000"
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

ColorControl.displayName = 'ColorControl';

export default ColorControl;
