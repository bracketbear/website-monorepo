import { createManifest } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';

export const MANIFEST = createManifest({
  id: 'four-way-stop',
  name: 'Four-Way Stop',
  description:
    'A Pittsburgh corner at night in the rain, no light, a cop in the middle. Two streams of cars want the same crossing. Every car follows the Intelligent Driver Model, so braking waves run backward up a queue and jams appear from nothing; drivers at the line take gaps by a critical gap that shrinks the longer they wait, so a driver who has waited long enough forces one, and the crossing car brakes, and that wave runs back up the other queue. Wet asphalt is a mirror: every light you see is reflected by mirroring its own geometry through the road. Hover an approach to hold it, click it to wave it through, click the box to clear it. Leave, and the four-way-stop rule runs the corner on its own — the Pittsburgh left included.',
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
      name: 'demand',
      type: 'number',
      label: 'Traffic',
      min: 0.05,
      max: 0.5,
      step: 0.01,
      defaultValue: 0.2,
      debug: true,
    },
    {
      name: 'patience',
      type: 'number',
      label: 'Patience',
      min: 2,
      max: 30,
      step: 1,
      defaultValue: 8,
      debug: true,
    },
    {
      name: 'headway',
      type: 'number',
      label: 'Headway',
      min: 0.6,
      max: 2,
      step: 0.1,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'bus',
      type: 'boolean',
      label: 'Buses',
      defaultValue: true,
      debug: true,
    },
    {
      name: 'bikes',
      type: 'boolean',
      label: 'Cyclists',
      defaultValue: true,
      debug: true,
    },
    {
      name: 'farSide',
      type: 'number',
      label: 'Far Side',
      min: 0,
      max: 2,
      step: 0.1,
      defaultValue: 1,
      debug: true,
    },
    {
      name: 'rain',
      type: 'number',
      label: 'Rain',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.7,
      debug: true,
    },
    {
      name: 'tint',
      type: 'select',
      label: 'Light',
      options: [
        { value: 0, label: 'Night' },
        { value: 1, label: 'Sodium' },
        { value: 2, label: 'Dawn' },
      ],
      defaultValue: 0,
      debug: true,
    },
  ],
} as const);

export type FourWayStopControlValues = ManifestToControlValues<typeof MANIFEST>;

export interface Tint {
  sky: number;
  skyLow: number;
  asphalt: number;
  wetSheen: number;
  curb: number;
  paint: number;
  lamp: number;
  headlight: number;
  tail: number;
  window: number;
  /** Multiplies every additive light, so a dawn sky can dim them. */
  lightGain: number;
}

/**
 * Check every one of these with the corner running. The lights are added
 * on top of the asphalt, so the asphalt has to sit dark enough that a
 * headlight cone and its reflection have somewhere to climb.
 */
export const TINTS: Tint[] = [
  {
    sky: 0x0a0d18,
    skyLow: 0x1b1a2c,
    asphalt: 0x14161d,
    wetSheen: 0x2a2f44,
    curb: 0x2c2c33,
    paint: 0x9a9585,
    lamp: 0xffc26b,
    headlight: 0xfff3d6,
    tail: 0xff2a1e,
    window: 0xffd08a,
    lightGain: 1,
  },
  {
    sky: 0x1a0f06,
    skyLow: 0x3a2008,
    asphalt: 0x1c150e,
    wetSheen: 0x4a3216,
    curb: 0x3a2e20,
    paint: 0xa89468,
    lamp: 0xff9a2a,
    headlight: 0xffe2b0,
    tail: 0xff3a1e,
    window: 0xffb060,
    lightGain: 0.9,
  },
  {
    sky: 0x2b3450,
    skyLow: 0x8a6a78,
    asphalt: 0x2a2d36,
    wetSheen: 0x5a5f78,
    curb: 0x4a4a52,
    paint: 0xc8c2b0,
    lamp: 0xffd08a,
    headlight: 0xfff6e6,
    tail: 0xff3a2a,
    window: 0xffe0a0,
    lightGain: 0.55,
  },
];
