import type {
  NumberControl,
  BooleanControl,
  ColorControl,
  SelectControl,
  GroupControl,
} from '../types';

/**
 * Helper function to create a number control
 */
export function slider(
  name: string,
  options: {
    min?: number;
    max?: number;
    step?: number;
    defaultValue: number;
    label?: string;
    description?: string;
    debug?: boolean;
    resetsAnimation?: boolean;
  }
): NumberControl {
  return {
    name,
    type: 'number',
    label: options.label ?? name,
    description: options.description,
    min: options.min,
    max: options.max,
    step: options.step,
    defaultValue: options.defaultValue,
    debug: options.debug ?? false,
    resetsAnimation: options.resetsAnimation ?? false,
  };
}

/**
 * Helper function to create a boolean control
 */
export function toggle(
  name: string,
  options: {
    defaultValue: boolean;
    label?: string;
    description?: string;
    debug?: boolean;
    resetsAnimation?: boolean;
  }
): BooleanControl {
  return {
    name,
    type: 'boolean',
    label: options.label ?? name,
    description: options.description,
    defaultValue: options.defaultValue,
    debug: options.debug ?? false,
    resetsAnimation: options.resetsAnimation ?? false,
  };
}

/**
 * Helper function to create a color control
 */
export function color(
  name: string,
  options: {
    defaultValue: string;
    label?: string;
    description?: string;
    debug?: boolean;
    resetsAnimation?: boolean;
  }
): ColorControl {
  return {
    name,
    type: 'color',
    label: options.label ?? name,
    description: options.description,
    defaultValue: options.defaultValue,
    debug: options.debug ?? false,
    resetsAnimation: options.resetsAnimation ?? false,
  };
}

/**
 * Helper function to create a select control
 */
export function select(
  name: string,
  options: {
    options: Array<{ value: string; label: string }> | string[];
    defaultValue: string;
    label?: string;
    description?: string;
    debug?: boolean;
    resetsAnimation?: boolean;
  }
): SelectControl {
  let selectOptions: Array<{ value: string; label: string }>;

  if (
    Array.isArray(options.options) &&
    typeof options.options[0] === 'string'
  ) {
    selectOptions = (options.options as string[]).map((opt) => ({
      value: opt,
      label: opt,
    }));
  } else {
    selectOptions = options.options as Array<{ value: string; label: string }>;
  }

  return {
    name,
    type: 'select',
    label: options.label ?? name,
    description: options.description,
    options: selectOptions,
    defaultValue: options.defaultValue,
    debug: options.debug ?? false,
    resetsAnimation: options.resetsAnimation ?? false,
  };
}

/**
 * Helper function to create a group control
 */
export function group(
  name: string,
  options: {
    value: 'number' | 'boolean' | 'color' | 'select';
    items: Array<{
      name: string;
      type: 'number' | 'boolean' | 'color' | 'select';
      defaultValue: any;
      min?: number;
      max?: number;
      step?: number;
      options?: Array<{ value: string; label: string }> | string[];
    }>;
    defaultValue?: any[];
    minItems?: number;
    maxItems?: number;
    static?: boolean;
    label?: string;
    description?: string;
    debug?: boolean;
    resetsAnimation?: boolean;
  }
): GroupControl {
  // For now, return a basic group control structure
  // This is a simplified version that works with the current schema
  return {
    name,
    type: 'group',
    value: options.value,
    label: options.label ?? name,
    description: options.description,
    items: options.items.map((item) => {
      const baseItem = {
        name: item.name,
        type: item.type,
        label: item.name,
        defaultValue: item.defaultValue,
      };

      if (item.type === 'number') {
        return {
          ...baseItem,
          min: item.min,
          max: item.max,
          step: item.step,
        };
      }

      if (item.type === 'select') {
        const selectOptions =
          Array.isArray(item.options) && typeof item.options[0] === 'string'
            ? item.options.map((opt) => ({ value: opt, label: opt }))
            : (item.options as Array<{ value: string; label: string }>);
        return {
          ...baseItem,
          options: selectOptions,
        };
      }

      return baseItem;
    }) as any, // Type assertion to avoid complex type issues
    defaultValue: options.defaultValue ?? [],
    minItems: options.minItems,
    maxItems: options.maxItems,
    static: options.static ?? false,
    debug: options.debug ?? false,
    resetsAnimation: options.resetsAnimation ?? false,
  };
}
