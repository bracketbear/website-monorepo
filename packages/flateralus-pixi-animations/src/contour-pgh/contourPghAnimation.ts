import * as PIXI from 'pixi.js';
import { createManifest } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import { contourControls, createContourField } from '../shared/contour-factory';
import type { ContourField } from '../shared/contour-factory';

const MANIFEST = createManifest({
  id: 'contour-pgh',
  name: 'Contour Pittsburgh',
  description:
    'Pittsburgh’s real terrain — the three-rivers confluence carved into the Allegheny Plateau, contoured from real elevation data baked into the build. The rivers read as the empty low ground; the sweep climbs from the water up the hills. Cursor tilts the stack; click pulses up from the rivers.',
  controls: contourControls({
    levels: 14,
    colorMode: 'pgh',
    markerLabel: 'Point Marker',
  }),
} as const);

export type ContourPghControlValues = ManifestToControlValues<typeof MANIFEST>;

export class ContourPghAnimation extends PixiAnimation<typeof MANIFEST> {
  private readonly field: ContourField = createContourField({
    terrainId: 'pgh',
    // The Point is not a peak, so it is pinned by hand: the grid coordinate
    // where the Allegheny and the Monongahela meet.
    markerPos: () => ({ x: 77.1, y: 78.4 }),
    markerTitle: 'THE POINT',
    markerSub: () => 'ALLEGHENY + MONONGAHELA = OHIO\n40.442°N  80.009°W',
  });

  constructor(initialControls?: Partial<ContourPghControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(app: PIXI.Application, controls: ContourPghControlValues): void {
    this.field.build(
      this.getRoot(),
      app.screen.width,
      app.screen.height,
      controls
    );
  }

  onUpdate(
    app: PIXI.Application,
    controls: ContourPghControlValues,
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

export function createContourPghAnimation(
  initialControls?: Partial<ContourPghControlValues>
): ContourPghAnimation {
  return new ContourPghAnimation(initialControls);
}
