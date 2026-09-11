import type { PixiAnimation } from '@bracketbear/flateralus-pixi';
import type { AnimationManifest } from '@bracketbear/flateralus';
import {
  createHalftoneTideAnimation,
  createHeatHazeAnimation,
  createRdVatAnimation,
  createSignalAlignmentAnimation,
  createSilhouetteFlockAnimation,
} from '@bracketbear/flateralus-pixi-animations';
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
export const REGISTRY: LabEntry[] = [
  {
    id: 'silhouette-flock',
    section: 'hero',
    name: 'Silhouette Flock',
    tag: 'gen',
    blurb:
      'Swifts crossing the sunset, DKC-silhouette style: scythe-winged boids that burst-flap then glide, never slowing down. Fully ambient; the cursor reads as a hawk and scatters them; click to release more.',
    create: (initialControls) =>
      createSilhouetteFlockAnimation(
        initialControls as never
      ) as unknown as PixiAnimation<AnimationManifest>,
  },
  {
    id: 'heat-haze',
    section: 'hero',
    name: 'Heat Haze',
    tag: 'glsl shader',
    blurb:
      'The hero headline pushed through a thermal distortion field — fbm noise advected upward bends the letterforms like air over hot asphalt. The cursor is a heat source: type warps and color-shifts near it, snaps crisp when you leave. Click for a heat flash across the whole block.',
    create: (initialControls) =>
      createHeatHazeAnimation(
        initialControls as never
      ) as unknown as PixiAnimation<AnimationManifest>,
  },
  {
    id: 'rd-vat',
    section: 'hero',
    name: 'RD Vat',
    tag: 'glsl sim',
    blurb:
      'The mark dropped into a Gray-Scott reaction–diffusion vat — two chemicals feed and kill each other per pixel in a live feedback buffer, so the seed erodes, blooms, and regrows with real persistent state. Cursor stirs the chemistry; click drops a fresh blob.',
    create: (initialControls) =>
      createRdVatAnimation(
        initialControls as never
      ) as unknown as PixiAnimation<AnimationManifest>,
  },
  {
    id: 'signal-alignment',
    section: 'intro',
    name: 'Signal Alignment',
    tag: 'flow',
    blurb:
      'A flow field of ink dashes: noise on one side of the threshold, ordered lanes on the other. The cursor stirs the field.',
    create: (initialControls) =>
      createSignalAlignmentAnimation(
        initialControls as never
      ) as unknown as PixiAnimation<AnimationManifest>,
  },
  {
    id: 'halftone-tide',
    section: 'intro',
    name: 'Halftone Tide',
    tag: 'gen',
    blurb:
      'The site’s halftone pattern, alive: dot radii breathe in slow traveling waves. The cursor inflates the field; clicks drop ripples.',
    create: (initialControls) =>
      createHalftoneTideAnimation(
        initialControls as never
      ) as unknown as PixiAnimation<AnimationManifest>,
  },
];
