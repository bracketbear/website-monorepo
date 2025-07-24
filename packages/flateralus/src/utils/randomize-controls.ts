import type {
  AnimationManifest,
  BooleanControl,
  ColorControl,
  DefaultableControl,
  ControlValues,
  GroupControl,
  NumberControl,
  SelectControl,
} from '../types';

/**
 * Generate a random number within a range and step.
 */
function randomInRange(min: number, max: number, step: number = 1): number {
  min = typeof min === 'number' ? min : 0;
  max = typeof max === 'number' ? max : 1;
  step = typeof step === 'number' ? step : 1;
  const steps = Math.floor((max - min) / step);
  return min + Math.round(Math.random() * steps) * step;
}

/**
 * Generate a random hex color string.
 */
function randomColor(): string {
  const hex = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0');
  return `#${hex}`;
}

/**
 * Type guard for select option object.
 */
function isSelectOptionObject(
  option: unknown
): option is { value: string; label: string } {
  return (
    typeof option === 'object' &&
    option !== null &&
    'value' in option &&
    'label' in option
  );
}

/**
 * Randomly select a value from a select control's options.
 */
function randomSelect(options: SelectControl['options']): string {
  // Convert readonly to mutable for indexing
  const arr = Array.isArray(options) ? Array.from(options) : [];
  if (arr.length === 0) return '';
  const idx = Math.floor(Math.random() * arr.length);
  const first = arr[0];
  if (typeof first === 'string') {
    return arr[idx] as unknown as string;
  } else if (isSelectOptionObject(arr[idx])) {
    return (arr[idx] as unknown as { value: string }).value;
  }
  return '';
}

// Type guards for sub-controls in group controls
function isNumberControl(sub: unknown): sub is NumberControl {
  return (
    typeof sub === 'object' &&
    sub !== null &&
    (sub as any).type === 'number' &&
    'name' in sub &&
    'min' in sub &&
    'max' in sub
  );
}
function isBooleanControl(sub: unknown): sub is BooleanControl {
  return (
    typeof sub === 'object' &&
    sub !== null &&
    (sub as any).type === 'boolean' &&
    'name' in sub
  );
}
function isColorControl(sub: unknown): sub is ColorControl {
  return (
    typeof sub === 'object' &&
    sub !== null &&
    (sub as any).type === 'color' &&
    'name' in sub
  );
}
function isSelectControl(sub: unknown): sub is SelectControl {
  return (
    typeof sub === 'object' &&
    sub !== null &&
    (sub as any).type === 'select' &&
    'name' in sub &&
    'options' in sub
  );
}
function isDefaultableControl(sub: unknown): sub is DefaultableControl {
  return (
    typeof sub === 'object' &&
    sub !== null &&
    'name' in sub &&
    'defaultValue' in sub
  );
}

/**
 * Generate a random group value for a group control.
 */
function randomizeGroup(control: GroupControl): Record<string, unknown>[] {
  const min = typeof control.minItems === 'number' ? control.minItems : 1;
  const max = typeof control.maxItems === 'number' ? control.maxItems : min + 2;
  const count = randomInRange(min, max);
  // Convert readonly to mutable for iteration
  const itemsArr = Array.isArray(control.items)
    ? Array.from(control.items)
    : [];
  const items: Record<string, unknown>[] = [];
  for (let i = 0; i < count; i++) {
    const item: Record<string, unknown> = {};
    for (const sub of itemsArr) {
      // Use type assertions to avoid 'never' errors, as we have type guards above
      if (isNumberControl(sub)) {
        item[(sub as { name: string }).name] = randomInRange(
          (sub as { min: number }).min,
          (sub as { max: number }).max,
          (sub as { step?: number }).step ?? 1
        );
      } else if (isBooleanControl(sub)) {
        item[(sub as { name: string }).name] = Math.random() < 0.5;
      } else if (isColorControl(sub)) {
        item[(sub as { name: string }).name] = randomColor();
      } else if (isSelectControl(sub)) {
        item[(sub as { name: string }).name] = randomSelect(
          (sub as { options: SelectControl['options'] }).options
        );
      } else if (isDefaultableControl(sub)) {
        // Fallback for other control types
        item[(sub as { name: string }).name] = (
          sub as { defaultValue: unknown }
        ).defaultValue;
      }
    }
    items.push(item);
  }
  return items;
}

/**
 * Generate a random valid control values object for a given manifest.
 */
export function getRandomControlValues(
  manifest: AnimationManifest
): ControlValues {
  const values: ControlValues = {};
  // Convert readonly to mutable for iteration
  const controlsArr = Array.isArray(manifest.controls)
    ? Array.from(manifest.controls)
    : [];
  for (const control of controlsArr) {
    switch (control.type) {
      case 'number':
        values[control.name] = randomInRange(
          control.min,
          control.max,
          control.step ?? 1
        );
        break;
      case 'boolean':
        values[control.name] = Math.random() < 0.5;
        break;
      case 'color':
        values[control.name] = randomColor();
        break;
      case 'select':
        values[control.name] = randomSelect(control.options);
        break;
      case 'group':
        values[control.name] = randomizeGroup(control);
        break;
      default:
        values[control.name] = control.defaultValue;
    }
  }
  return values;
}
