import { describe, it, expect } from 'vitest';
import { PixiApplication } from './pixi-application';
import { PixiAnimation } from './pixi-animation';
import { createManifest } from '@bracketbear/flateralus';

const MANIFEST = createManifest({
  id: 'cap-test',
  name: 'Cap',
  description: 'Frame cap test animation',
  controls: [],
});

class Capped extends PixiAnimation<typeof MANIFEST> {
  readonly maxFPS = 60;
  constructor() {
    super(MANIFEST);
  }
  onInit() {}
  onUpdate() {}
}

class Uncapped extends PixiAnimation<typeof MANIFEST> {
  constructor() {
    super(MANIFEST);
  }
  onInit() {}
  onUpdate() {}
}

/** A PIXI app stub with only the ticker surface the render loop touches. */
function fakePixiApp() {
  return {
    stage: { addChild() {}, removeChild() {} },
    ticker: {
      maxFPS: 0,
      add() {},
      remove() {},
      start() {},
      stop() {},
    },
  };
}

/** Reach the private PIXI handle without booting WebGL. */
function withFakeApp(app: PixiApplication) {
  const fake = fakePixiApp();
  (app as unknown as { pixiApp: unknown }).pixiApp = fake;
  (app as unknown as { context: unknown }).context = fake;
  return fake;
}

describe('PixiApplication frame cap', () => {
  it('applies the animation maxFPS to the ticker when the animation is set', () => {
    const app = new PixiApplication();
    const fake = withFakeApp(app);
    app.setAnimation(new Capped());
    expect(fake.ticker.maxFPS).toBe(60);
  });

  it('lifts the cap again for an animation that declares none', () => {
    const app = new PixiApplication();
    const fake = withFakeApp(app);
    app.setAnimation(new Capped());
    app.setAnimation(new Uncapped());
    expect(fake.ticker.maxFPS).toBe(0);
  });

  it('applies the cap when the render loop starts after the animation was set', () => {
    const app = new PixiApplication();
    const fake = withFakeApp(app);
    // Animation set while there is no ticker to cap yet.
    (app as unknown as { pixiApp: unknown }).pixiApp = null;
    app.setAnimation(new Capped());
    (app as unknown as { pixiApp: unknown }).pixiApp = fake;
    (app as unknown as { startRenderLoop: () => void }).startRenderLoop();
    expect(fake.ticker.maxFPS).toBe(60);
  });
});
