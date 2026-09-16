import { describe, it, expect } from 'vitest';
import { BaseApplication } from './base-application';

/** Records the sizes it is asked to draw at. No real rendering context. */
class FakeApplication extends BaseApplication<{ tag: string }> {
  readonly resizes: Array<{ width: number; height: number }> = [];

  protected async createContext() {
    return { tag: 'fake' };
  }
  protected startRenderLoop(): void {}
  protected stopRenderLoop(): void {}
  protected handleResize(width: number, height: number): void {
    this.resizes.push({ width, height });
  }
  public getCanvas(): HTMLCanvasElement | null {
    return null;
  }
  public getStageControlsManifest() {
    return {
      id: 'fake-stage-controls',
      name: 'Fake',
      description: 'Stage controls the fake does not use',
      controls: [],
    };
  }
  protected onStageControlsChange(): void {}
}

/** A detached div reporting a box of the test's choosing. */
function container(width: number, height: number) {
  const el = document.createElement('div');
  setBox(el, width, height);
  return el;
}

function setBox(el: HTMLElement, width: number, height: number) {
  el.getBoundingClientRect = () =>
    ({ width, height, x: 0, y: 0, top: 0, left: 0 }) as DOMRect;
}

async function booted(width: number, height: number) {
  const host = container(width, height);
  const app = new FakeApplication({ config: { autoResize: false } });
  await app.init(host);
  return { app, host };
}

describe('BaseApplication.resizeToContainer', () => {
  it('resizes the surface to the container box on demand', async () => {
    const { app, host } = await booted(1920, 1080);
    setBox(host, 3456, 1944);

    app.resizeToContainer();

    expect(app.resizes).toEqual([{ width: 3456, height: 1944 }]);
  });

  it('is a no-op when the container box has not changed since boot', async () => {
    const { app } = await booted(1920, 1080);

    app.resizeToContainer();
    app.resizeToContainer();

    expect(app.resizes).toEqual([]);
  });

  it('ignores a container that has been laid out to nothing', async () => {
    const { app, host } = await booted(1920, 1080);
    setBox(host, 0, 0);

    app.resizeToContainer();

    expect(app.resizes).toEqual([]);
  });
});
