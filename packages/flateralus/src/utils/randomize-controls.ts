import type {
  AnimationManifest,
  SelectControl,
  ControlValues,
  GroupControl,
  AnyControlValue,
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

/**
 * Generate a random group value for a group control.
 */
function randomizeGroup(control: GroupControl): AnyControlValue[] {
  const min = typeof control.minItems === 'number' ? control.minItems : 1;
  const max = typeof control.maxItems === 'number' ? control.maxItems : min + 2;
  const count = randomInRange(min, max);

  const items: AnyControlValue[] = [];

  for (let i = 0; i < count; i++) {
    let controlValue: AnyControlValue;

    if (control.value === 'mixed') {
      // Mixed groups - randomly choose control type for each item
      const controlTypes = ['color', 'number', 'boolean', 'select'] as const;
      const randomType =
        controlTypes[Math.floor(Math.random() * controlTypes.length)];

      switch (randomType) {
        case 'color':
          controlValue = {
            type: 'color',
            value: randomColor(),
            metadata: { alpha: Math.random() },
          };
          break;
        case 'number':
          controlValue = {
            type: 'number',
            value: Math.floor(Math.random() * 100),
            metadata: { min: 0, max: 100 },
          };
          break;
        case 'boolean':
          controlValue = {
            type: 'boolean',
            value: Math.random() < 0.5,
            metadata: { description: `Item ${i}` },
          };
          break;
        case 'select':
          controlValue = {
            type: 'select',
            value: `option${Math.floor(Math.random() * 3) + 1}`,
            metadata: { options: ['option1', 'option2', 'option3'] },
          };
          break;
      }
    } else {
      // Homogeneous groups - use the control's value type
      switch (control.value) {
        case 'color':
          controlValue = {
            type: 'color',
            value: randomColor(),
            metadata: { alpha: Math.random() },
          };
          break;
        case 'number':
          controlValue = {
            type: 'number',
            value: Math.floor(Math.random() * 100),
            metadata: { min: 0, max: 100 },
          };
          break;
        case 'boolean':
          controlValue = {
            type: 'boolean',
            value: Math.random() < 0.5,
            metadata: { description: `Item ${i}` },
          };
          break;
        case 'select':
          const firstItem = control.items[0];
          if (
            firstItem &&
            firstItem.type === 'select' &&
            'options' in firstItem
          ) {
            controlValue = {
              type: 'select',
              value: randomSelect(firstItem.options),
              metadata: {
                options: Array.isArray(firstItem.options)
                  ? firstItem.options.map((opt) =>
                      typeof opt === 'string' ? opt : opt.value
                    )
                  : firstItem.options,
              },
            };
          } else {
            controlValue = {
              type: 'select',
              value: 'option1',
              metadata: { options: ['option1', 'option2', 'option3'] },
            };
          }
          break;
        default:
          controlValue = {
            type: 'number',
            value: Math.floor(Math.random() * 100),
            metadata: { min: 0, max: 100 },
          };
      }
    }

    items.push(controlValue);
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
        values[control.name] = randomizeGroup(control) as any;
        break;
      default:
        values[control.name] = control.defaultValue;
    }
  }
  return values;
}
