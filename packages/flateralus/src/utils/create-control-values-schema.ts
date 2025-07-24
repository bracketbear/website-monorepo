import { z, ZodTypeAny } from 'zod';
import type { AnimationManifest, Control } from '../types';

// Utility type to strip readonly from all properties (shallow)
type Mutable<T> = { -readonly [P in keyof T]: T[P] };

/**
 * Given a manifest, generate a Zod object schema for validating its control values.
 * Handles all control types, including group controls recursively.
 */
export function createControlValuesSchema(manifest: AnimationManifest) {
  const shape: Record<string, ZodTypeAny> = {};

  for (const control of manifest.controls) {
    shape[control.name] = controlToZodSchema(control as Mutable<Control>);
  }

  return z.object(shape);
}

function controlToZodSchema(control: Mutable<Control>): ZodTypeAny {
  switch (control.type) {
    case 'number': {
      let schema = z.number();
      if (typeof control.min === 'number') schema = schema.min(control.min);
      if (typeof control.max === 'number') schema = schema.max(control.max);
      return schema;
    }
    case 'boolean':
      return z.boolean();
    case 'color':
      return z.string(); // Could add regex for color if needed
    case 'select': {
      // Now options is mutable
      const options = control.options;
      return z
        .string()
        .refine((val) => options.some((opt) => opt.value === val), {
          message: `Value must be one of: ${options.map((o) => o.value).join(', ')}`,
        });
    }
    case 'group': {
      // Each item in the group is itself a set of controls
      const itemShape: Record<string, ZodTypeAny> = {};
      for (const item of control.items as Mutable<Control[]>) {
        itemShape[item.name] = controlToZodSchema(item as Mutable<Control>);
      }
      let arrSchema = z.array(z.object(itemShape));
      if (typeof control.minItems === 'number')
        arrSchema = arrSchema.min(control.minItems);
      if (typeof control.maxItems === 'number')
        arrSchema = arrSchema.max(control.maxItems);
      return arrSchema;
    }
    default:
      return z.any();
  }
}
