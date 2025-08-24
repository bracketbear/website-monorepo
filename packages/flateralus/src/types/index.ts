import type { DeepReadonly, ObjectKeys, ObjectValues } from '@bracketbear/core';
import { z } from 'zod';
import type {
  BooleanControlSchema,
  ColorControlSchema,
  ControlSchema,
  NumberControlSchema,
  SelectControlSchema,
  GroupControlSchema,
} from '../schemas';
import type {
  StageControlsManifest,
  StageControlValues,
} from './stage-controls';

// Export stage control types
export type {
  StageControl,
  StageControlValues,
  StageControlsManifest,
  ManifestToStageControlValues,
} from './stage-controls';

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

// New hybrid approach types
export interface ControlValue<T = any> {
  type: string;
  value: T;
  metadata?: Record<string, any>;
}

export interface ColorControlValue extends ControlValue<string> {
  type: 'color';
  value: string;
  metadata?: {
    alpha?: number;
    brightness?: number;
  };
}

export interface NumberControlValue extends ControlValue<number> {
  type: 'number';
  value: number;
  metadata?: {
    min?: number;
    max?: number;
    step?: number;
  };
}

export interface BooleanControlValue extends ControlValue<boolean> {
  type: 'boolean';
  value: boolean;
  metadata?: {
    description?: string;
  };
}

export interface SelectControlValue extends ControlValue<string> {
  type: 'select';
  value: string;
  metadata?: {
    options?: string[];
  };
}

export type AnyControlValue =
  | ColorControlValue
  | NumberControlValue
  | BooleanControlValue
  | SelectControlValue;

// Updated control value types to use discriminated objects for groups
export type ControlValueTypes =
  | string
  | number
  | boolean
  | readonly AnyControlValue[];

export type AnimationControlValueTypes =
  | string
  | number
  | boolean
  | readonly AnyControlValue[];

export type ControlValues = Record<string, ControlValueTypes>;

type ControlTypeToValueTypeMap = {
  number: number;
  boolean: boolean;
  color: string;
  select: string;
  group: AnyControlValue[];
};

export interface HasControlType extends HasType<ControlType> {}

export interface HasControls {
  controls: ReadonlyArray<Control>;
}

export type ControlValueType<C extends HasControlType> =
  C['type'] extends keyof ControlTypeToValueTypeMap
    ? ControlTypeToValueTypeMap[C['type']]
    : never;

/**
 * Utility type to extract control value types from a manifest
 * Maps control names to their inferred types based on the control type
 */
export type ManifestToControlValues<TManifest extends AnimationManifest> = {
  [TControl in TManifest['controls'][number] as TControl['name']]: ControlValueType<TControl>;
};

/**
 * Animation interface that any animation must implement
 */
export interface Animation<
  TControlValues extends Record<string, any> = Record<string, any>,
  TContext = unknown,
> {
  /** Get the animation manifest with control definitions */
  getManifest(): AnimationManifest;

  /** Get current control values */
  getControlValues(): TControlValues;

  /** Update control values */
  updateControls(values: Partial<TControlValues>): void;

  /** Set callback for when controls are updated */
  setOnControlsUpdated(callback?: (values: TControlValues) => void): void;

  /** Initialize the animation with a rendering context */
  init(context: TContext): void;

  /** Update the animation (called each frame) */
  update(): void;

  /** Reset the animation to default or specified control values */
  reset(controls?: Partial<TControlValues>): void;

  /** Clean up the animation */
  destroy(): void;
}

export type AnimationControlValues<TAnimation extends Animation> = ReturnType<
  TAnimation['getControlValues']
>;

export type AnimationFactory<TAnimation extends Animation> = (
  controls?: Partial<AnimationControlValues<TAnimation>>
) => TAnimation;

/**
 * Application interface that any animation application must implement
 */
export interface Application<TAnimation extends Animation = Animation> {
  /** Get the rendering context */
  getContext(): TAnimation extends Animation<any, infer TContext>
    ? TContext
    : unknown;

  /** Get the canvas element (if applicable) */
  getCanvas(): HTMLCanvasElement | null;

  /** Initialize the application with a container */
  init(container: HTMLElement | HTMLCanvasElement): Promise<void>;

  /** Get the current animation */
  getAnimation(): TAnimation | null;

  /** Set the animation to be rendered */
  setAnimation(animation: TAnimation | null): void;

  /** Start the application */
  start(): void;

  /** Stop the application */
  stop(): void;

  /** Pause the application */
  pause(): void;

  /** Resume the application */
  resume(): void;

  /** Check if the application is running */
  isRunning(): boolean;

  /** Check if the application is initialized */
  isInitialized(): boolean;

  /** Destroy the application and clean up resources */
  destroy(): void;

  /** Get stage controls manifest */
  getStageControlsManifest(): StageControlsManifest;

  /** Get current stage control values */
  getStageControlValues(): StageControlValues;

  /** Update stage control values */
  updateStageControls(values: Partial<StageControlValues>): void;
}

export type ApplicationFactory<TApplication extends Application> = (
  options?: any
) => TApplication;

export type DefaultableControl =
  | NumberControl
  | BooleanControl
  | ColorControl
  | SelectControl
  | GroupControl;
