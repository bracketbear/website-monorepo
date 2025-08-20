import z from 'zod';

/**
 * Base control schema for all controls
 */
export const BaseControlSchema = z.object({
  name: z.string(),
  type: z.enum(['number', 'boolean', 'color', 'select', 'group']),
  label: z.string().optional(),
  description: z.string().optional(),
  debug: z.boolean().default(false).optional(),
  resetsAnimation: z.boolean().default(false).optional(),
});

/**
 * Number control schema
 */
export const NumberControlSchema = BaseControlSchema.extend({
  type: z.literal('number'),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  defaultValue: z.number(),
});

/**
 * Boolean control schema
 */
export const BooleanControlSchema = BaseControlSchema.extend({
  type: z.literal('boolean'),
  defaultValue: z.boolean(),
});

/**
 * Color control schema
 */
export const ColorControlSchema = BaseControlSchema.extend({
  type: z.literal('color'),
  defaultValue: z.string(),
});

/**
 * Select control schema
 */
export const SelectControlSchema = BaseControlSchema.extend({
  type: z.literal('select'),
  options: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
    })
  ),
  defaultValue: z.string(),
});

/**
 * Homogeneous group control schema (existing functionality)
 */
export const HomogeneousGroupControlSchema = z.object({
  type: z.literal('group'),
  name: z.string(),
  label: z.string(),
  description: z.string().optional(),
  value: z.enum(['number', 'boolean', 'color', 'select']),
  items: z.array(
    z.discriminatedUnion('type', [
      NumberControlSchema,
      BooleanControlSchema,
      ColorControlSchema,
      SelectControlSchema,
    ])
  ),
  defaultValue: z.array(
    z.object({
      type: z.string(),
      value: z.union([z.string(), z.number(), z.boolean()]),
      metadata: z.record(z.any()).optional(),
    })
  ),
  minItems: z.number().optional(),
  maxItems: z.number().optional(),
  static: z.boolean().optional(),
  debug: z.boolean().optional(),
  resetsAnimation: z.boolean().optional(),
});

/**
 * Mixed group control schema for complex configurations
 */
export const MixedGroupControlSchema = z.object({
  type: z.literal('group'),
  name: z.string(),
  label: z.string(),
  description: z.string().optional(),
  value: z.literal('mixed'),
  items: z.array(
    z.object({
      name: z.string(),
      controlType: z.enum(['number', 'boolean', 'color', 'select']),
      defaultValue: z.union([z.string(), z.number(), z.boolean()]),
      metadata: z.record(z.any()).optional(),
    })
  ),
  defaultValue: z.array(
    z.object({
      type: z.string(),
      value: z.union([z.string(), z.number(), z.boolean()]),
      metadata: z.record(z.any()).optional(),
    })
  ),
  minItems: z.number().optional(),
  maxItems: z.number().optional(),
  static: z.boolean().optional(),
  debug: z.boolean().optional(),
  resetsAnimation: z.boolean().optional(),
});

/**
 * Group control schema with discriminated union
 */
export const GroupControlSchema = z.discriminatedUnion('value', [
  HomogeneousGroupControlSchema,
  MixedGroupControlSchema,
]);

/**
 * Factory function to create a homogeneous group control
 */
export function createGroupControl<
  T extends 'number' | 'boolean' | 'color' | 'select',
>(
  value: T,
  _config: Omit<z.infer<typeof HomogeneousGroupControlSchema>, 'type' | 'value'>
): z.ZodType<z.infer<typeof HomogeneousGroupControlSchema> & { value: T }> {
  // Filter items based on the value type
  const allowedItemSchemas =
    value === 'number'
      ? [NumberControlSchema]
      : value === 'boolean'
        ? [BooleanControlSchema]
        : value === 'color'
          ? [ColorControlSchema]
          : value === 'select'
            ? [SelectControlSchema]
            : [];

  return z.object({
    type: z.literal('group'),
    value: z.literal(value),
    name: z.string(),
    label: z.string(),
    description: z.string().optional(),
    items: z.array(
      z.discriminatedUnion(
        'type',
        allowedItemSchemas as [
          typeof NumberControlSchema,
          ...(typeof NumberControlSchema)[],
        ]
      )
    ),
    defaultValue: z.array(
      z.object({
        type: z.string(),
        value: z.union([z.string(), z.number(), z.boolean()]),
        metadata: z.record(z.any()).optional(),
      })
    ),
    minItems: z.number().optional(),
    maxItems: z.number().optional(),
    static: z.boolean().optional(),
    debug: z.boolean().optional(),
    resetsAnimation: z.boolean().optional(),
  }) as z.ZodType<z.infer<typeof HomogeneousGroupControlSchema> & { value: T }>;
}

/**
 * Type-safe group control schemas for each control type
 */
export const NumberGroupControlSchema = createGroupControl('number', {
  name: '',
  label: '',
  items: [],
  defaultValue: [],
});

export const BooleanGroupControlSchema = createGroupControl('boolean', {
  name: '',
  label: '',
  items: [],
  defaultValue: [],
});

export const ColorGroupControlSchema = createGroupControl('color', {
  name: '',
  label: '',
  items: [],
  defaultValue: [],
});

export const SelectGroupControlSchema = createGroupControl('select', {
  name: '',
  label: '',
  items: [],
  defaultValue: [],
});

/**
 * Union of all control schemas
 */
export const ControlSchema = z.union([
  NumberControlSchema,
  BooleanControlSchema,
  ColorControlSchema,
  SelectControlSchema,
  HomogeneousGroupControlSchema,
  MixedGroupControlSchema,
]);

/**
 * Animation manifest schema
 */
export const AnimationManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  controls: z.array(ControlSchema),
});

/**
 * Type exports for better type inference
 */
export type NumberControl = z.infer<typeof NumberControlSchema>;
export type BooleanControl = z.infer<typeof BooleanControlSchema>;
export type ColorControl = z.infer<typeof ColorControlSchema>;
export type SelectControl = z.infer<typeof SelectControlSchema>;
export type GroupControl = z.infer<typeof GroupControlSchema>;
export type Control = z.infer<typeof ControlSchema>;
export type AnimationManifest = z.infer<typeof AnimationManifestSchema>;

/**
 * Type for extracting the value type from a group control
 */
export type GroupControlValue<T extends GroupControl> = T['value'];

/**
 * Type for extracting the item type from a group control
 */
export type GroupControlItems<T extends GroupControl> = T['items'][number];
