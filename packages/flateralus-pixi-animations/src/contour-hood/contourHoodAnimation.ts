import * as PIXI from 'pixi.js';
import { createManifest } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import {
  contourControls,
  createContourField,
  fmtElev,
} from '../shared/contour-factory';
import type { ContourField } from '../shared/contour-factory';

const MANIFEST = createManifest({
  id: 'contour-hood',
  name: 'Contour Hood',
  description:
    'Mt Hood’s actual topography, contoured from real elevation data baked into the build. Lines plot on from the valley floor, an elevation sweep climbs to the summit, and the cursor tilts the whole stack like a 2.5D hologram. Click to send a pulse up the mountain.',
  controls: contourControls({
    levels: 28,
    colorMode: 'ramp',
    markerLabel: 'Summit Marker',
  }),
} as const);

export type ContourHoodControlValues = ManifestToControlValues<typeof MANIFEST>;

export class ContourHoodAnimation extends PixiAnimation<typeof MANIFEST> {
  private readonly field: ContourField = createContourField({
    terrainId: 'hood',
    markerPos: (t) => t.peak,
    markerTitle: 'MT HOOD',
    markerSub: (t) => `${fmtElev(t.max)}\n45.374°N  121.696°W`,
  });

  constructor(initialControls?: Partial<ContourHoodControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(app: PIXI.Application, controls: ContourHoodControlValues): void {
    this.field.build(
      this.getRoot(),
      app.screen.width,
      app.screen.height,
      controls
    );
  }

  onUpdate(
    app: PIXI.Application,
    controls: ContourHoodControlValues,
    deltaTime: number
  ): void {
    const dt = Math.min(0.05, deltaTime);
    this.field.update(
      controls,
      app.screen.width,
      app.screen.height,
      dt,
      this.pointer
    );
  }

  onDestroy(): void {
    this.field.dispose();
    super.onDestroy();
  }
}

export function createContourHoodAnimation(
  initialControls?: Partial<ContourHoodControlValues>
): ContourHoodAnimation {
  return new ContourHoodAnimation(initialControls);
}
