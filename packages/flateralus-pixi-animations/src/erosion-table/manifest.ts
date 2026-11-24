import { createManifest } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';

export const MANIFEST = createManifest({
  id: 'erosion-table',
  name: 'Erosion Table (GLSL)',
  description:
    'Mt Hood, baked from real elevation, left out in the rain. Water is routed by the virtual-pipe shallow-water scheme in a GPU ping-pong buffer, so every stream finds its own way down the actual surface. The drainage network is measured, not drawn: flow picks up sediment wherever its capacity — slope times speed — exceeds what it is already carrying, and drops it wherever capacity collapses, so valleys deepen, divides sharpen and fans spread at the mouths on their own. The terrain routes the water and the water rewrites the terrain, with nothing else in the loop. Snow collects above the line and melts back into the streams; rain falls as drifting storm cells, heaviest on the high ground, because mountains make their own weather. The shading reads the same field: what the water has cut shows as bare rock, what it has laid down shows as pale sediment. Drag to rain on it. Click for a downpour. Switch the brush to push the land up under your cursor.',
  controls: [
    {
      name: 'mode',
      type: 'select',
      label: 'Mode',
      options: [
        { value: 1, label: 'Interactive' },
        { value: 0, label: 'Ambient' },
      ],
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'land',
      type: 'select',
      label: 'Ground',
      options: [
        { value: 0, label: 'Mt Hood' },
        { value: 1, label: 'Pittsburgh' },
      ],
      defaultValue: 0,
      debug: true,
    },
    {
      name: 'brush',
      type: 'select',
      label: 'Brush',
      options: [
        { value: 0, label: 'Rain' },
        { value: 1, label: 'Uplift' },
      ],
      defaultValue: 0,
      debug: true,
    },
    {
      name: 'relief',
      type: 'number',
      label: 'Relief',
      // Mt Hood's true relief over the baked crop is 0.187 world units. This
      // is the height of the range, not a display multiplier: raising it
      // genuinely steepens every slope the erosion sees.
      min: 0.08,
      max: 0.45,
      step: 0.005,
      defaultValue: 0.22,
      debug: true,
    },
    {
      name: 'flow',
      type: 'number',
      label: 'Flow Speed',
      // Tuned acceleration in world units/s^2, not real gravity. Steady flow
      // speed works out as STEP * flow * slope / (1 - friction).
      min: 5,
      max: 60,
      step: 1,
      defaultValue: 20,
      debug: true,
    },
    {
      name: 'rain',
      type: 'number',
      label: 'Rainfall',
      min: 0,
      max: 10,
      step: 0.1,
      defaultValue: 2.5,
      debug: true,
    },
    {
      name: 'erode',
      type: 'number',
      label: 'Erosion Rate',
      // Above about 4 the deepest channel passes the full relief inside a
      // minute and the table digs itself a shaft instead of a valley.
      min: 0,
      max: 4,
      step: 0.05,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'deposit',
      type: 'number',
      label: 'Deposition',
      min: 0,
      max: 3,
      step: 0.05,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'creep',
      type: 'number',
      label: 'Hillslope Creep',
      // In units of 1e-4 diffusion Courant. Diffusion spreads as
      // sqrt(2 * creep * steps), so 0.6 here reaches about one cell over the
      // 7200 steps that carve a valley — enough to stop a one-cell slot
      // canyon, little enough to leave the mountain alone. Past about 3 it
      // outruns the water and starts sanding the valleys shut.
      min: 0,
      max: 5,
      step: 0.1,
      defaultValue: 0.6,
      debug: true,
    },
    {
      name: 'uplift',
      type: 'number',
      label: 'Uplift',
      min: 0,
      max: 10,
      step: 0.1,
      defaultValue: 3,
      debug: true,
    },
    {
      name: 'snowline',
      type: 'number',
      label: 'Snow Line',
      min: 0.2,
      max: 1.1,
      step: 0.01,
      defaultValue: 0.62,
      debug: true,
    },
    {
      name: 'exag',
      type: 'number',
      label: 'Vertical Exaggeration',
      // Display only. The simulation always uses the true relief above.
      min: 1,
      max: 6,
      step: 0.1,
      defaultValue: 2.6,
      debug: true,
    },
    {
      name: 'streams',
      type: 'number',
      label: 'Stream Glow',
      min: 0,
      max: 2.5,
      step: 0.05,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'contours',
      type: 'number',
      label: 'Contours',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.35,
      debug: true,
    },
    {
      name: 'tint',
      type: 'select',
      label: 'Color',
      options: [
        { value: 0, label: 'Cascade' },
        { value: 1, label: 'Ochre' },
        { value: 2, label: 'Slate' },
        { value: 3, label: 'Night' },
      ],
      defaultValue: 0,
      debug: true,
    },
  ],
} as const);

export type ErosionTableControlValues = ManifestToControlValues<
  typeof MANIFEST
>;
