import { createManifest } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';

export const MANIFEST = createManifest({
  id: 'sandbox',
  name: 'Sandbox (GLSL)',
  description:
    'A box of sand under a low sun. The sand is a height field integrated on the GPU and it keeps every grain: what the finger pushes aside piles up as a berm and slumps to the angle of repose, what the bucket stamps stands while it is damp and crumbles as it dries, and the wind carries sand in hops so ripples grow on their own at the wavelength the hop length says. The light is measured off that one surface — cast shadows are marched across it toward the sun, the ball throws a real shadow, and turned sand is dark because it is damp. Drag to plow; click to stamp a castle, or shove the ball. Dig far enough and you reach the bottom of the box.',
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
      name: 'wind',
      type: 'number',
      label: 'Wind',
      min: 0,
      max: 3,
      step: 0.1,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'hop',
      type: 'number',
      label: 'Hop Length',
      min: 4,
      max: 14,
      step: 1,
      defaultValue: 7,
      debug: true,
    },
    {
      name: 'repose',
      type: 'number',
      label: 'Repose Angle',
      min: 20,
      max: 45,
      step: 1,
      defaultValue: 33,
      debug: true,
    },
    {
      name: 'dry',
      type: 'number',
      label: 'Drying Time',
      min: 5,
      max: 120,
      step: 5,
      defaultValue: 40,
      debug: true,
    },
    {
      name: 'sun',
      type: 'number',
      label: 'Sun Elevation',
      min: 4,
      max: 80,
      step: 1,
      defaultValue: 18,
      debug: true,
    },
    {
      name: 'dig',
      type: 'number',
      label: 'Dig Depth',
      min: 0.3,
      max: 3,
      step: 0.1,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'ball',
      type: 'select',
      label: 'Beach Ball',
      options: [
        { value: 1, label: 'In The Box' },
        { value: 0, label: 'Put Away' },
      ],
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'tint',
      type: 'select',
      label: 'Light',
      options: [
        { value: 0, label: 'Golden Hour' },
        { value: 1, label: 'Overcast' },
        { value: 2, label: 'Blue Hour' },
      ],
      defaultValue: 0,
      debug: true,
    },
  ],
} as const);

export type SandboxControlValues = ManifestToControlValues<typeof MANIFEST>;
