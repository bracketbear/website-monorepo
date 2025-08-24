import type { z } from 'zod';
import type { ControlSchema } from '../schemas';

type Control = z.infer<typeof ControlSchema>;

/**
 * Stage control types that affect the entire animation stage
 * These are just regular controls that the stage passes to the debug menu
 */
export type StageControl = Control;

/**
 * Stage control values that can be configured
 */
export interface StageControlValues {
  // Background controls
  backgroundColor?: string;
  backgroundAlpha?: number;

  // Stage dimensions
  stageWidth?: number;
  stageHeight?: number;

  // Grid controls
  enableGrid?: boolean;
  gridColor?: string;
  gridOpacity?: number;
  gridSize?: number;

  // Shadow controls
  enableShadows?: boolean;
  shadowColor?: string;
  shadowOpacity?: number;
}

/**
 * Stage controls manifest for the debug UI
 */
export interface StageControlsManifest {
  id: string;
  name: string;
  description: string;
  controls: readonly Control[];
}

/**
 * Type for extracting stage control value types from a manifest
 */
export type ManifestToStageControlValues<
  TManifest extends StageControlsManifest,
> = {
  [TControl in TManifest['controls'][number] as TControl['name']]: TControl extends {
    type: 'number';
  }
    ? number
    : TControl extends { type: 'boolean' }
      ? boolean
      : TControl extends { type: 'color' }
        ? string
        : TControl extends { type: 'select' }
          ? string
          : never;
};
