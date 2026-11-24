import { describe, it, expect } from 'vitest';
import * as PIXI from 'pixi.js';
import { PointerService } from '@bracketbear/flateralus-pixi';
import { createRouteTraceAnimation } from './routeTraceAnimation';

function fakeApp(w = 1200, h = 1200) {
  return {
    stage: new PIXI.Container(),
    screen: { width: w, height: h },
  } as unknown as PIXI.Application;
}

const rootOf = (a: object) => (a as unknown as { root: PIXI.Container }).root;

describe('route-trace animation', () => {
  it('builds its layers, runs a few frames, and consumes every click', () => {
    const a = createRouteTraceAnimation();
    const svc = new PointerService();
    a.setPointerService(svc);
    const app = fakeApp();
    a.init(app);
    const controls = a.getControlValues();
    // scrim + the world (the city and route, under the camera) + the pin
    expect(rootOf(a).children.length).toBe(3);
    svc.clicks.push({ x: 600, y: 600 }, { x: 10, y: 10 });
    for (let i = 0; i < 900; i++) a.onUpdate(app, controls, 1 / 60);
    expect(svc.clicks).toHaveLength(0);
    a.onDestroy();
  });

  it('draws no scrim when told not to', () => {
    const a = createRouteTraceAnimation({ scrim: false });
    const app = fakeApp(900, 1100);
    a.init(app);
    expect(rootOf(a).children.length).toBe(2);
    a.onDestroy();
  });
});
