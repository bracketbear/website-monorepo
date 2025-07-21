import { useState, useEffect } from 'react';
import type {
  AnimationManifest,
  ControlValues,
  Control,
} from './animations/types';
import { ReactButton } from '@bracketbear/core';

// Gear icon component
const GearIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.2579 9.77251 19.9887C9.5799 19.7195 9.31074 19.5149 8.99999 19.4C8.69843 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.17999 19.73L7.11999 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.70499 20.3766C5.44216 20.3766 5.18191 20.2448 4.93911 20.2241C4.69631 20.1235 4.47574 19.976 4.28999 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.28999 16.96L4.34999 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.67999 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.16999 14.08H2.99999C2.46955 14.08 1.96085 13.8693 1.58578 13.4942C1.21071 13.1191 0.999999 12.6104 0.999999 12.08C0.999999 11.5496 1.21071 11.0409 1.58578 10.6658C1.96085 10.2907 2.46955 10.08 2.99999 10.08H3.08999C3.42099 10.0723 3.74206 9.96512 4.01128 9.77251C4.2805 9.5799 4.48505 9.31074 4.59999 9C4.73312 8.69843 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.26999 7.17999L4.20999 7.11999C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.70499C3.62343 5.44216 3.67523 5.18191 3.77588 4.93911C3.87653 4.69631 4.02405 4.47574 4.20999 4.28999C4.39574 4.10405 4.61631 3.95653 4.85911 3.85588C5.10191 3.75523 5.36216 3.70343 5.62499 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.03999 4.28999L7.09999 4.34999C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61843 4.81312 8.91999 4.67999C9.2158 4.55324 9.468 4.34276 9.64669 4.07447C9.82537 3.80618 9.92069 3.49179 9.91999 3.16999V2.99999C9.91999 2.46955 10.1307 1.96085 10.5058 1.58578C10.8809 1.21071 11.3896 0.999999 11.92 0.999999C12.4504 0.999999 12.9591 1.21071 13.3342 1.58578C13.7093 1.96085 13.92 2.46955 13.92 2.99999V3.08999C13.9277 3.42099 14.0349 3.74206 14.2275 4.01128C14.4201 4.2805 14.6893 4.48505 15 4.59999C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.26999L16.88 4.20999C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.20999C19.896 4.39574 20.0435 4.61631 20.1441 4.85911C20.2448 5.10191 20.2966 5.36216 20.2966 5.62499C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.03999L19.65 7.09999C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61843 19.32 8.91999C19.4468 9.2158 19.6572 9.468 19.9255 9.64669C20.1938 9.82537 20.5082 9.92069 20.83 9.91999H21C21.5304 9.91999 22.0391 10.1307 22.4142 10.5058C22.7893 10.8809 23 11.3896 23 11.92C23 12.4504 22.7893 12.9591 22.4142 13.3342C22.0391 13.7093 21.5304 13.92 21 13.92H20.91C20.579 13.9277 20.2579 14.0349 19.9887 14.2275C19.7195 14.4201 19.5149 14.6893 19.4 15Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface DebugControlsProps {
  manifest: AnimationManifest;
  controlValues: ControlValues;
  onControlsChange: (values: Partial<ControlValues>) => void;
  isVisible?: boolean;
}

/**
 * Debug Controls Component
 *
 * Provides a dynamic UI for adjusting animation parameters in real-time
 * based on the animation's manifest and control schema
 */
export default function DebugControls({
  manifest,
  controlValues,
  onControlsChange,
  isVisible = false,
}: DebugControlsProps) {
  const [localValues, setLocalValues] = useState<ControlValues>(controlValues);
  const [isExpanded, setIsExpanded] = useState(false);

  // Update local values when props change
  useEffect(() => {
    setLocalValues(controlValues);
  }, [controlValues]);

  const handleControlChange = (
    key: string,
    value: number | boolean | string
  ) => {
    const newValues = { ...localValues, [key]: value };
    setLocalValues(newValues);
    onControlsChange({ [key]: value });
  };

  const resetToDefaults = () => {
    const defaultValues: ControlValues = {};
    manifest.controls.forEach((control) => {
      defaultValues[control.name] = control.defaultValue;
    });
    setLocalValues(defaultValues);
    onControlsChange(defaultValues);
  };

  const renderControl = (control: Control) => {
    const value = localValues[control.name];

    // Skip controls that shouldn't be shown in debug
    if (!control.debug) return null;

    switch (control.type) {
      case 'number':
        return renderNumberControl(control, value as number);
      case 'boolean':
        return renderBooleanControl(control, value as boolean);
      case 'color':
        return renderColorControl(control, value as string);
      case 'select':
        return renderSelectControl(control, value as string);
      default:
        return null;
    }
  };

  const renderNumberControl = (
    control: Control & { type: 'number' },
    value: number
  ) => (
    <div key={control.name} className="space-y-2">
      <label className="block text-xs text-white/60">
        {control.label}: {value}
        {control.description && (
          <span className="ml-2 text-white/40">({control.description})</span>
        )}
      </label>
      <div className="space-y-1">
        <input
          type="range"
          min={control.min}
          max={control.max}
          step={control.step}
          value={value}
          onChange={(e) =>
            handleControlChange(control.name, Number(e.target.value))
          }
          className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/20"
        />
        <input
          type="number"
          min={control.min}
          max={control.max}
          step={control.step}
          value={value}
          onChange={(e) =>
            handleControlChange(control.name, Number(e.target.value))
          }
          className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white"
        />
      </div>
    </div>
  );

  const renderBooleanControl = (
    control: Control & { type: 'boolean' },
    value: boolean
  ) => (
    <div key={control.name} className="flex items-center justify-between">
      <label className="text-xs text-white/60">
        {control.label}
        {control.description && (
          <span className="ml-2 text-white/40">({control.description})</span>
        )}
      </label>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => handleControlChange(control.name, e.target.checked)}
        className="rounded bg-white/10"
      />
    </div>
  );

  const renderColorControl = (
    control: Control & { type: 'color' },
    value: string
  ) => (
    <div key={control.name}>
      <label className="mb-1 block text-xs text-white/60">
        {control.label}
        {control.description && (
          <span className="ml-2 text-white/40">({control.description})</span>
        )}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => handleControlChange(control.name, e.target.value)}
          className="h-8 w-12 rounded border border-white/20"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => handleControlChange(control.name, e.target.value)}
          className="flex-1 rounded bg-white/10 px-2 py-1 text-xs text-white"
          placeholder="#000000"
        />
      </div>
    </div>
  );

  const renderSelectControl = (
    control: Control & { type: 'select' },
    value: string
  ) => (
    <div key={control.name}>
      <label className="mb-1 block text-xs text-white/60">
        {control.label}
        {control.description && (
          <span className="ml-2 text-white/40">({control.description})</span>
        )}
      </label>
      <select
        value={value}
        onChange={(e) => handleControlChange(control.name, e.target.value)}
        className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white"
      >
        {control.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  if (!isVisible) return null;

  return (
    <div className="absolute top-4 right-4 z-50">
      {/* Gear toggle button */}
      <ReactButton
        variant="gear"
        onClick={() => setIsExpanded(!isExpanded)}
        className="mb-2"
      >
        <GearIcon />
      </ReactButton>

      {/* Debug panel */}
      {isExpanded && (
        <div className="min-w-80 rounded-lg border border-white/20 bg-black/90 p-4 text-white shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">{manifest.name}</h3>
              <p className="text-xs text-white/60">{manifest.description}</p>
            </div>
            <button
              onClick={resetToDefaults}
              className="rounded bg-red-600 px-2 py-1 text-sm transition-colors hover:bg-red-700"
            >
              Reset
            </button>
          </div>

          <div className="max-h-96 space-y-4 overflow-y-auto">
            {manifest.controls.map(renderControl)}
          </div>
        </div>
      )}
    </div>
  );
}
