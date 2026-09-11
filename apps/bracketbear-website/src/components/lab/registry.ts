import type { PixiAnimation } from '@bracketbear/flateralus-pixi';
import type { AnimationManifest } from '@bracketbear/flateralus';
import {
  createGooLampAnimation,
  createHalftoneTideAnimation,
  createKaleidoAnimation,
  createHeatHazeAnimation,
  createLedMatrixAnimation,
  createLogoResolveAnimation,
  createPortalMarkAnimation,
  createSchematicLensAnimation,
  createVisionaryEyeAnimation,
  createPixelSunriseAnimation,
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
    id: 'pixel-sunrise',
    section: 'hero',
    name: 'Pixel Sunrise',
    tag: '8-bit',
    blurb:
      'Ordered-dither sun rising over a pixel skyline of Pittsburgh or Portland. The whole scene steps on a low sim FPS locked to the pixel grid, so pixels never slide. Glitch scene: a cheery daytime city that flash-cuts to a neon night where the Bracket Bear logo hangs where the sun was.',
    create: (initialControls) =>
      createPixelSunriseAnimation(
        initialControls as never
      ) as unknown as PixiAnimation<AnimationManifest>,
  },
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
    id: 'portal-mark',
    section: 'hero',
    name: 'Portal Mark',
    tag: 'glsl shader',
    blurb:
      'The mark cut out of the stage as a window into fourteen worlds. The letterform cut stays anchored, but worlds with physical mass react at its edge. Clicking sweeps the next world through the portal as an expanding circle from the click point, and each world spills its own light onto the stage around the letterforms.',
    create: (initialControls) =>
      createPortalMarkAnimation(
        initialControls as never
      ) as unknown as PixiAnimation<AnimationManifest>,
  },
  {
    id: 'visionary-eye',
    section: 'hero',
    name: 'Visionary Eye',
    tag: 'glsl shader',
    blurb:
      'The third-eye mandala wrapped onto a raytraced spherical eye. Smooth pursuit of the cursor while you are over the stage; self-directed saccades and fixation micro-tremor when left alone. The pupil dilates with attention and the energy filaments carve real relief into the surface.',
    create: (initialControls) =>
      createVisionaryEyeAnimation(
        initialControls as never
      ) as unknown as PixiAnimation<AnimationManifest>,
  },
  {
    id: 'schematic-lens',
    section: 'hero',
    name: 'Schematic Lens',
    tag: 'glsl shader',
    blurb:
      'The cursor carries a molten glass lens. Outside it, the finished lockup; through it, the same scene refracted and magnified into a schematic pass — grid, hatching, edge-traced outline. Click fires an expanding pulse that sweeps the schematic across the full frame.',
    create: (initialControls) =>
      createSchematicLensAnimation(
        initialControls as never
      ) as unknown as PixiAnimation<AnimationManifest>,
  },
  {
    id: 'led-matrix',
    section: 'hero',
    name: 'LED Matrix',
    tag: 'glsl shader',
    blurb:
      'The mark shown on a simulated LED wall — a fixed dot grid where each diode samples the logo mask at its cell center, with live content playing through the lit region. The cursor reveals the unlit hardware grid; clicks send a signal pulse rippling through every diode.',
    create: (initialControls) =>
      createLedMatrixAnimation(
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
  {
    id: 'logo-resolve',
    section: 'about',
    name: 'Logo Resolve',
    tag: '8-bit',
    blurb:
      'The [BB] mark as a neon sign: pixels flicker on like a boot sequence, then hold with an additive glow while individual pixels glitch cyan and the sign buzzes. The cursor heats pixels through cyan to white-hot; click for a shockwave.',
    create: (initialControls) =>
      createLogoResolveAnimation(
        initialControls as never
      ) as unknown as PixiAnimation<AnimationManifest>,
  },
  {
    id: 'goo-lamp',
    section: 'toys',
    name: 'Goo Lamp',
    tag: 'glsl toy',
    blurb:
      'A metaball field — every pixel sums the inverse-square influence of a dozen orbiting blobs, so they merge, pinch, and split as they pass. Interactive: the cursor is a blob of its own; click to squeeze the whole field for a beat. Ambient: a ghost blob wanders the tank instead.',
    create: (initialControls) =>
      createGooLampAnimation(
        initialControls as never
      ) as unknown as PixiAnimation<AnimationManifest>,
  },
  {
    id: 'kaleido',
    section: 'toys',
    name: 'Kaleido',
    tag: 'glsl toy',
    blurb:
      'Domain-warped noise folded through an n-way mirror. Interactive: the cursor steers the rotation and its distance from center sets the warp depth; click kicks the zoom and shifts the pattern to a new region of the field. Ambient: it turns and breathes on its own.',
    create: (initialControls) =>
      createKaleidoAnimation(
        initialControls as never
      ) as unknown as PixiAnimation<AnimationManifest>,
  },
];
