import z from 'zod';

/**
 * Base control schema for all controls
 */
export const BaseControlSchema = z.object({
  name: z.string(),
  type: z.enum(['number', 'boolean', 'color', 'select']),
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
 * Union of all control schemas
 */
export const ControlSchema = z.discriminatedUnion('type', [
  NumberControlSchema,
  BooleanControlSchema,
  ColorControlSchema,
  SelectControlSchema,
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
