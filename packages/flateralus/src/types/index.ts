import type { DeepReadonly, ObjectKeys, ObjectValues } from '@bracketbear/core';
import { z } from 'zod';
import { type Application as PIXIApplication } from 'pixi.js';
import type {
  BooleanControlSchema,
  ColorControlSchema,
  ControlSchema,
  NumberControlSchema,
  SelectControlSchema,
  GroupControlSchema,
} from '../schemas';

export interface HasType<T extends string> {
  type: T;
}

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
  group: 'array',
} as const;
export const CONTROL_TYPES = Object.keys(
  CONTROL_TYPES_TO_VALUE_TYPE
) as ControlType[];

export type ControlType = ObjectKeys<typeof CONTROL_TYPES_TO_VALUE_TYPE>;

export type Control = z.infer<typeof ControlSchema>;

export type NumberControl = z.infer<typeof NumberControlSchema>;
export type BooleanControl = z.infer<typeof BooleanControlSchema>;
export type ColorControl = z.infer<typeof ColorControlSchema>;
export type SelectControl = z.infer<typeof SelectControlSchema>;
export type GroupControl = z.infer<typeof GroupControlSchema>; // Now supports minItems, maxItems, static

export interface AnimationManifest
  extends DeepReadonly<HasControls>,
    DeepReadonly<{
      id: string;
      name: string;
      description: string;
    }> {}

export type ControlValueTypes = string | number | boolean | readonly any[];

export type ControlValues = Record<string, ControlValueTypes>;

type ControlTypeToValueTypeMap = {
  number: number;
  boolean: boolean;
  color: string;
  select: string;
  group: Array<Record<string, ControlValueTypes>>;
};

export interface HasControlType extends HasType<ControlType> {}

export interface HasControls {
  controls: ReadonlyArray<Control>;
}

export type ControlValueType<C extends HasControlType> =
  C['type'] extends 'group'
    ? C extends {
        items: Array<{ name: string; type: keyof ControlTypeToValueTypeMap }>;
      }
      ? Array<{
          [K in C['items'][number] as K['name']]: ControlTypeToValueTypeMap[K['type']];
        }>
      : never
    : ControlTypeToValueTypeMap[C['type']];

// Entire manifest → { [name]: valueType }
export type ManifestControlValues<M extends HasControls> = {
  [C in M['controls'][number] as C['name']]: ControlValueType<C>;
};

/**
 * Utility type to extract control value types from a manifest
 * Maps control names to their inferred types based on the control type
 */
export type ManifestToControlValues<M extends AnimationManifest> = {
  [C in M['controls'][number] as C['name']]: ControlValueType<C>;
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
  init(app: PIXIApplication, width: number, height: number): void;

  /** Update the animation (called each frame) */
  update(width: number, height: number): void;

  /** Reset the animation to default or specified control values */
  reset(controls?: TControlValues): void;

  /** Clean up the animation */
  destroy(): void;
}

export type AnimationControlValues<TAnimation extends Animation> = ReturnType<
  TAnimation['getControlValues']
>;

export type AnimationFactory<TAnimation extends Animation> = (
  controls?: Partial<AnimationControlValues<TAnimation>>
) => TAnimation;

export type DefaultableControl =
  | NumberControl
  | BooleanControl
  | ColorControl
  | SelectControl;
