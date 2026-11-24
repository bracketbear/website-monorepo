import { createManifest } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { ROUTES, ROUTE_IDS } from '../shared/routes';

export const MANIFEST = createManifest({
  id: 'route-trace',
  name: 'Route Trace',
  description:
    'A real run drawn on a real city. Downtown Kansas City from OpenStreetMap as the dot-matrix grid Night Traffic draws, and over it the Bracket Bear Run Club route from the Marriott Downtown to the Liberty Memorial and back, choreographed on a 125 BPM grid: a red pin drops on the lobby, the streets grow out from it, the camera follows the runner out to the turn and pulls back to the whole route. Click to run it again. Map data © OpenStreetMap contributors.',
  controls: [
    {
      name: 'route',
      type: 'select',
      label: 'Route',
      options: ROUTE_IDS.map((id) => ({ label: ROUTES[id].name, value: id })),
      defaultValue: ROUTE_IDS[0],
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'bpm',
      type: 'number',
      label: 'Tempo (BPM)',
      min: 80,
      max: 160,
      step: 1,
      defaultValue: 125,
      debug: true,
    },
    {
      name: 'hold',
      type: 'number',
      label: 'Hold (s)',
      min: 0,
      max: 10,
      step: 0.5,
      defaultValue: 3,
      debug: true,
    },
    {
      name: 'loop',
      type: 'boolean',
      label: 'Loop',
      defaultValue: true,
      debug: true,
    },
    {
      name: 'glow',
      type: 'boolean',
      label: 'Glow',
      defaultValue: true,
      debug: true,
    },
    {
      name: 'fit',
      type: 'select',
      label: 'Fit',
      options: [
        { label: 'Contain', value: 'contain' },
        { label: 'Cover', value: 'cover' },
      ],
      defaultValue: 'contain',
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'scrim',
      type: 'boolean',
      label: 'Scrim',
      defaultValue: true,
      debug: true,
      resetsAnimation: true,
    },
  ],
} as const);

export type RouteTraceControlValues = ManifestToControlValues<typeof MANIFEST>;
