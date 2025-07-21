import type { ObjectKeys, ObjectValues } from '@bracketbear/core';
import { z } from 'zod';

// ============================================================================
// CONTROL SCHEMAS
// ============================================================================

export const VALUE_TYPES = {
  number: 'number',
  boolean: 'boolean',
  string: 'string',
} as const;
export type ValueType = ObjectValues<typeof VALUE_TYPES>;

export const CONTROL_TYPES_TO_VALUE_TYPE = {
  number: 'number',
  boolean: 'boolean',
  color: 'string',
  select: 'string',
} as const;
export const CONTROL_TYPES = Object.keys(
  CONTROL_TYPES_TO_VALUE_TYPE
) as ControlType[];

export type ControlType = ObjectKeys<typeof CONTROL_TYPES_TO_VALUE_TYPE>;

/**
 * Base control schema for all controls
 */
const BaseControlSchema = z.object({
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
const NumberControlSchema = BaseControlSchema.extend({
  type: z.literal('number'),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  defaultValue: z.number(),
});

/**
 * Boolean control schema
 */
const BooleanControlSchema = BaseControlSchema.extend({
  type: z.literal('boolean'),
  defaultValue: z.boolean(),
});

/**
 * Color control schema
 */
const ColorControlSchema = BaseControlSchema.extend({
  type: z.literal('color'),
  defaultValue: z.string(),
});

/**
 * Select control schema
 */
const SelectControlSchema = BaseControlSchema.extend({
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

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export type Control = z.infer<typeof ControlSchema>;
export type AnimationManifest = z.infer<typeof AnimationManifestSchema>;

export type ControlValueTypes = string | number | boolean;

export type ControlValues = Record<string, ControlValueTypes>;

// One control → its value type
// TODO: This is a hack to get the value type of a control
export type ControlValue<C extends Control> = C['type'] extends 'number'
  ? number
  : C['type'] extends 'boolean'
    ? boolean
    : /* color | select */ string;

// Entire manifest → { [name]: valueType }
export type ManifestControlValues<M extends { controls: readonly Control[] }> =
  {
    [C in M['controls'][number] as C['name']]: ControlValue<C>;
  };

/**
 * Utility type to extract control value types from a manifest
 * Maps control names to their inferred types based on the control type
 */
export type ManifestToControlValues<TManifest extends AnimationManifest> = {
  [K in TManifest['controls'][number] as K['name']]: K['type'] extends 'number'
    ? number
    : K['type'] extends 'boolean'
      ? boolean
      : K['type'] extends 'color' | 'select'
        ? string
        : never;
};

/**
 * Animation interface that any animation must implement
 */
export interface Animation<TControlValues extends ControlValues = {}> {
  /** Get the animation manifest with control definitions */
  getManifest(): AnimationManifest;

  /** Get current control values */
  getControlValues(): TControlValues;

  /** Update control values */
  updateControls(values: Partial<TControlValues>): void;

  /** Initialize the animation with a PIXI application */
  init(app: any, width: number, height: number): void;

  /** Update the animation (called each frame) */
  update(width: number, height: number): void;

  /** Clean up the animation */
  destroy(): void;
}

export type AnimationControlValues<TAnimation extends Animation> = ReturnType<
  TAnimation['getControlValues']
>;

export type AnimationFactory<TAnimation extends Animation> = (
  controls?: Partial<AnimationControlValues<TAnimation>>
) => TAnimation;
