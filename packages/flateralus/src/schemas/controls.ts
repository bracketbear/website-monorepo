import z from 'zod';

/**
 * Base control schema for all controls
 */
export const BaseControlSchema = z.object({
  name: z.string(),
  type: z.enum(['number', 'boolean', 'color', 'select', 'group']),
  label: z.string(),
  description: z.string().optional(),
  debug: z.boolean().default(false),
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
 * Group (collection) control schema
 */
export const GroupControlSchema = BaseControlSchema.extend({
  type: z.literal('group'),
  items: z.array(
    z.discriminatedUnion('type', [
      NumberControlSchema,
      BooleanControlSchema,
      ColorControlSchema,
      SelectControlSchema,
    ])
  ),
  defaultValue: z.array(z.any()), // Will be typed more strictly in types
  minItems: z.number().optional(),
  maxItems: z.number().optional(),
  static: z.boolean().default(false).optional(),
});

/**
 * Union of all control schemas
 */
export const ControlSchema = z.discriminatedUnion('type', [
  NumberControlSchema,
  BooleanControlSchema,
  ColorControlSchema,
  SelectControlSchema,
  GroupControlSchema,
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
