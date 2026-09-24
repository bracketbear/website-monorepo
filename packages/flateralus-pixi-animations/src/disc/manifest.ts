import { createManifest } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';

export const MANIFEST = createManifest({
  id: 'disc',
  name: 'Disc (GLSL)',
  description:
    "A protoplanetary disc seen from above its pole. The gas is integrated on a log-polar grid with orbital advection, so the supersonic rotation is an exact shift and only the residual is transported; a planet in it raises a spiral wake because the gas answers its gravity at the Lindblad resonances, and a gap opens only when the planet passes the real thermal and viscous thresholds. Colour is the disc's temperature through a Planck curve. Press, drag and release to throw a seed; click to drop one on a circular orbit. Seeds eat what they cross and grow; feed one far enough and it clears an annulus.",
  controls: [
    {
      name: 'discMass',
      type: 'number',
      label: 'Disc Mass',
      min: 0.005,
      max: 0.05,
      step: 0.005,
      defaultValue: 0.02,
      debug: true,
    },
    {
      name: 'alpha',
      type: 'number',
      label: 'Viscosity α',
      min: 0.001,
      max: 0.01,
      step: 0.001,
      defaultValue: 0.003,
      debug: true,
    },
    {
      name: 'aspect',
      type: 'number',
      label: 'Aspect H/r',
      min: 0.03,
      max: 0.08,
      step: 0.005,
      defaultValue: 0.05,
      debug: true,
    },
    {
      name: 'accretionRate',
      type: 'number',
      label: 'Accretion Rate',
      min: 0.05,
      max: 2,
      step: 0.05,
      defaultValue: 0.5,
      debug: true,
    },
    {
      name: 'speed',
      type: 'number',
      label: 'Speed',
      min: 0.25,
      max: 2,
      step: 0.25,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'grain',
      type: 'number',
      label: 'Grain',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.35,
      debug: true,
    },
    {
      name: 'reseed',
      type: 'select',
      label: 'Reseed',
      options: [
        { value: 0, label: 'Collapse A' },
        { value: 1, label: 'Collapse B' },
        { value: 2, label: 'Collapse C' },
      ],
      defaultValue: 0,
      debug: true,
    },
  ],
} as const);

export type DiscControlValues = ManifestToControlValues<typeof MANIFEST>;
