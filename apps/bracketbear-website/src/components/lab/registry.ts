import type { PixiAnimation } from '@bracketbear/flateralus-pixi';
import type { AnimationManifest } from '@bracketbear/flateralus';
import type { SectionKey } from './sections';

/**
 * One browsable animation. The tag and blurb live here rather than in a
 * lookup table beside the UI: they are metadata about the animation, not
 * state belonging to the Lab.
 */
export interface LabEntry {
  id: string;
  section: SectionKey;
  name: string;
  blurb: string;
  tag: string;
  /** Factory. Omitting initialControls builds the manifest defaults. */
  create: (
    initialControls?: Record<string, unknown>
  ) => PixiAnimation<AnimationManifest>;
}

/**
 * Ordered registry. The nav groups by section but preserves this order
 * inside each group, so nothing depends on module load order.
 */
export const REGISTRY: LabEntry[] = [];
