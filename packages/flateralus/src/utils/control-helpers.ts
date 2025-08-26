import type {
  NumberControl,
  BooleanControl,
  ColorControl,
  SelectControl,
  GroupControl,
  Control,
} from '../types';

/**
 * Base options that are common to all control types
 */
interface BaseControlOptions {
  label?: string;
  description?: string;
  debug?: boolean;
  resetsAnimation?: boolean;
}

type BaseControlHelper<
  TOptions extends BaseControlOptions,
  TControl extends Control,
> = (name: string, options: TOptions) => TControl;

/**
 * Helper function to create a number control
 */
export const slider: BaseControlHelper<
  BaseControlOptions & {
    min?: number;
    max?: number;
    step?: number;
    defaultValue: number;
  },
  NumberControl
> = (
  name: string,
  options: BaseControlOptions & {
    min?: number;
    max?: number;
    step?: number;
    defaultValue: number;
  }
) => {
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
};

/**
 * Helper function to create a boolean control
 */
export const toggle: BaseControlHelper<
  BaseControlOptions & {
    defaultValue: boolean;
  },
  BooleanControl
> = (
  name: string,
  options: BaseControlOptions & {
    defaultValue: boolean;
  }
) => {
  return {
    name,
    type: 'boolean',
    label: options.label ?? name,
    description: options.description,
    defaultValue: options.defaultValue,
    debug: options.debug ?? false,
    resetsAnimation: options.resetsAnimation ?? false,
  };
};

/**
 * Helper function to create a color control
 */
export const color: BaseControlHelper<
  BaseControlOptions & {
    defaultValue: string | number; // Changed from string to string | number
  },
  ColorControl
> = (
  name: string,
  options: BaseControlOptions & {
    defaultValue: string | number; // Changed from string to string | number
  }
) => {
  return {
    name,
    type: 'color',
    label: options.label ?? name,
    description: options.description,
    defaultValue: options.defaultValue,
    debug: options.debug ?? false,
    resetsAnimation: options.resetsAnimation ?? false,
  };
};

/**
 * Helper function to create a select control
 */
export const select: BaseControlHelper<
  BaseControlOptions & {
    options: Array<{ value: string; label: string }> | string[];
    defaultValue: string;
  },
  SelectControl
> = (
  name: string,
  options: BaseControlOptions & {
    options: Array<{ value: string; label: string }> | string[];
    defaultValue: string;
  }
) => {
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
};

/**
 * Helper function to create a group control
 */
export function group(
  name: string,
  options: BaseControlOptions & {
    value: 'number' | 'boolean' | 'color' | 'select';
    items: Array<{
      name: string;
      type: 'number' | 'boolean' | 'color' | 'select';
      label?: string;
      defaultValue: string | number | boolean;
      min?: number;
      max?: number;
      step?: number;
      options?: Array<{ value: string; label: string }> | string[];
    }>;
    defaultValue?: Array<{
      type: string;
      value: string | number | boolean;
      metadata?: Record<string, unknown>;
    }>;
    minItems?: number;
    maxItems?: number;
    static?: boolean;
  }
): GroupControl {
  const items = options.items.map((item) => {
    const baseItem: {
      name: string;
      type: 'number' | 'boolean' | 'color' | 'select';
      defaultValue: string | number | boolean;
      label?: string;
      min?: number;
      max?: number;
      step?: number;
      options?: Array<{ value: string; label: string }>;
    } = {
      name: item.name,
      type: item.type,
      defaultValue: item.defaultValue,
    };

    // Only add label if explicitly provided
    if (item.label !== undefined) {
      baseItem.label = item.label;
    }

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
  });

  return {
    name,
    type: 'group',
    value: options.value,
    label: options.label ?? name,
    description: options.description,
    items: items as any, // Type assertion needed due to complex discriminated union
    defaultValue: options.defaultValue ?? [],
    minItems: options.minItems,
    maxItems: options.maxItems,
    static: options.static ?? false,
    debug: options.debug ?? false,
    resetsAnimation: options.resetsAnimation ?? false,
  };
}
