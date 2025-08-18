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
      // For group controls, we need to validate against the items definition
      if (control.items && control.items.length > 0) {
        // Create a discriminated union schema based on the control's items
        const itemSchemas = control.items.map((item) => {
          // Handle both homogeneous and mixed group structures
          if ('controlType' in item) {
            // Mixed group item
            switch (item.controlType) {
              case 'number':
                return z.object({
                  type: z.literal('number'),
                  value: z.number(),
                  metadata: z.record(z.any()).optional(),
                });
              case 'boolean':
                return z.object({
                  type: z.literal('boolean'),
                  value: z.boolean(),
                  metadata: z.record(z.any()).optional(),
                });
              case 'color':
                return z.object({
                  type: z.literal('color'),
                  value: z.string(),
                  metadata: z.record(z.any()).optional(),
                });
              case 'select':
                return z.object({
                  type: z.literal('select'),
                  value: z.string(),
                  metadata: z.record(z.any()).optional(),
                });
              default:
                return z.object({
                  type: z.string(),
                  value: z.union([z.string(), z.number(), z.boolean()]),
                  metadata: z.record(z.any()).optional(),
                });
            }
          } else {
            // Homogeneous group item (has type property)
            switch (item.type) {
              case 'number': {
                const baseSchema = z.object({
                  type: z.literal('number'),
                  value: z.number(),
                  metadata: z.record(z.any()).optional(),
                });
                let finalSchema: ZodTypeAny = baseSchema;
                if (typeof item.min === 'number') {
                  finalSchema = baseSchema.refine(
                    (data) => data.value >= item.min!,
                    {
                      message: `Value must be >= ${item.min}`,
                    }
                  );
                }
                if (typeof item.max === 'number') {
                  finalSchema = baseSchema.refine(
                    (data) => data.value <= item.max!,
                    {
                      message: `Value must be <= ${item.max}`,
                    }
                  );
                }
                return finalSchema;
              }
              case 'boolean':
                return z.object({
                  type: z.literal('boolean'),
                  value: z.boolean(),
                  metadata: z.record(z.any()).optional(),
                });
              case 'color':
                return z.object({
                  type: z.literal('color'),
                  value: z.string(),
                  metadata: z.record(z.any()).optional(),
                });
              case 'select': {
                const options = item.options || [];
                return z.object({
                  type: z.literal('select'),
                  value: z
                    .string()
                    .refine((val) => options.some((opt) => opt.value === val), {
                      message: `Value must be one of: ${options.map((o) => o.value).join(', ')}`,
                    }),
                  metadata: z.record(z.any()).optional(),
                });
              }
              default:
                return z.object({
                  type: z.string(),
                  value: z.union([z.string(), z.number(), z.boolean()]),
                  metadata: z.record(z.any()).optional(),
                });
            }
          }
        });

        let arraySchema = z.array(
          z.union(itemSchemas as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]])
        );

        // Apply minItems and maxItems constraints
        if (typeof control.minItems === 'number') {
          arraySchema = arraySchema.min(control.minItems);
        }
        if (typeof control.maxItems === 'number') {
          arraySchema = arraySchema.max(control.maxItems);
        }

        return arraySchema;
      } else {
        // Fallback for groups without defined items (mixed groups)
        let arraySchema = z.array(
          z.object({
            type: z.string(),
            value: z.union([z.string(), z.number(), z.boolean()]),
            metadata: z.record(z.any()).optional(),
          })
        );

        // Apply minItems and maxItems constraints
        if (typeof control.minItems === 'number') {
          arraySchema = arraySchema.min(control.minItems);
        }
        if (typeof control.maxItems === 'number') {
          arraySchema = arraySchema.max(control.maxItems);
        }

        return arraySchema;
      }
    }
    default:
      return z.any();
  }
}
