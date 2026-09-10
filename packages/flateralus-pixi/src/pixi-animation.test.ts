import { describe, it, expect, vi } from 'vitest';
import * as PIXI from 'pixi.js';
import { PixiAnimation } from './pixi-animation';
import { PointerService } from './pointer-service';
import { createManifest } from '@bracketbear/flateralus';

const MANIFEST = createManifest({
  id: 'test-anim',
  name: 'Test',
  description: 'Test animation',
  controls: [
    {
      name: 'speed',
      type: 'number',
      label: 'Speed',
      min: 0,
      max: 1,
      step: 0.1,
      defaultValue: 0.5,
    },
  ],
});

class TestAnimation extends PixiAnimation<typeof MANIFEST> {
  constructor() {
    super(MANIFEST);
  }
  onInit() {
    this.getRoot().addChild(new PIXI.Container());
  }
  onUpdate() {}
}

function fakeApp() {
  const stage = new PIXI.Container();
  return {
    stage,
    screen: { width: 800, height: 600 },
  } as unknown as PIXI.Application;
}

describe('PixiAnimation root container', () => {
  it('adds its root to the stage on init', () => {
    const app = fakeApp();
    const a = new TestAnimation();
    a.init(app);
    expect(app.stage.children).toContain(a['root']);
    expect(a['root'].children).toHaveLength(1);
  });

  it('removes and destroys the root on destroy', () => {
    const app = fakeApp();
    const a = new TestAnimation();
    a.init(app);
    const root = a['root'];
    const spy = vi.spyOn(root, 'destroy');
    a.destroy();
    expect(app.stage.children).not.toContain(root);
    expect(spy).toHaveBeenCalledWith({ children: true });
  });

  it('survives mount, unmount, and remount', () => {
    const app = fakeApp();
    const a = new TestAnimation();
    a.init(app);
    a.destroy();
    const b = new TestAnimation();
    b.init(app);
    expect(app.stage.children).toHaveLength(1);
    expect(app.stage.children).toContain(b['root']);
  });

  it('gives a destroyed animation a fresh root so it can remount', () => {
    const app = fakeApp();
    const a = new TestAnimation();
    a.init(app);
    const first = a['root'];
    a.destroy();
    a.init(app);
    expect(a['root']).not.toBe(first);
    expect(app.stage.children).toContain(a['root']);
  });

  it('re-attaches a fresh root when an animation resets itself', () => {
    // particle-wave resets by calling onDestroy() then onInit() without a
    // second init(), so the replacement root must find its way back.
    const app = fakeApp();
    const a = new TestAnimation();
    a.init(app);
    a.onDestroy();
    a.onInit();
    expect(app.stage.children).toContain(a['root']);
    expect(app.stage.children).toHaveLength(1);
  });

  it('exposes an attached pointer service', () => {
    const a = new TestAnimation();
    const svc = new PointerService();
    a.setPointerService(svc);
    expect(a['pointer']).toBe(svc);
  });

  it('has no dpr override by default', () => {
    expect(new TestAnimation().dpr).toBeUndefined();
  });
});
