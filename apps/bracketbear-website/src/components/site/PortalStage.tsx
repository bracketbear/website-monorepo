import { useEffect, useRef } from 'react';
import { PixiApplication, PointerService } from '@bracketbear/flateralus-pixi';
import { applyTheme } from '@bracketbear/flateralus';
import { REGISTRY } from '../lab/registry';
import { SizeGate } from '../run/size-gate';
import { bootState } from './portal-boot';

const ID = 'portal-mark';
const RESIZE_DEBOUNCE_MS = 250;

/** True when the browser can hand out a WebGL context. Throwaway canvas. */
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
}

/**
 * The site's stage: Portal Mark from the lab registry, filling its box, with
 * the lab's defaults. A click sweeps the next world through the portal, which
 * is the animation's own behavior once it has a pointer service. Reduced
 * motion is the animation's concern too: it holds a still frame, so the
 * 'still' boot state mounts the same way as 'animate'. Without WebGL
 * ('none') nothing is constructed and the ink ground stays.
 *
 * Mounted the way the run page mounts its map. The island sets `data-live` on
 * the body once a frame has drawn, so the CSS can fade the stage in over the
 * ink ground rather than popping it. A resize rebuilds the animation,
 * debounced, because the mark's frame is computed at build time.
 */
export default function PortalStage() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    const entry = REGISTRY.find((e) => e.id === ID);
    if (!host || !entry) return;

    const state = bootState({
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)')
        .matches,
      webgl: hasWebGL(),
    });
    if (state === 'none') return;

    let canceled = false;
    const app = new PixiApplication({
      config: { autoResize: true, backgroundAlpha: 0, antialias: true },
    });
    const pointer = new PointerService();

    const mount = (): void => {
      pointer.clearClicks();
      const animation = entry.create();
      animation.setPointerService(pointer);
      app.setAnimation(animation);
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    const gate = new SizeGate();
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r || !gate.changed(r.width, r.height)) return;
      clearTimeout(timer);
      timer = setTimeout(mount, RESIZE_DEBOUNCE_MS);
    });

    void (async () => {
      try {
        await app.init(host);
      } catch (e) {
        // The ink ground and the copy are already there; a failed boot
        // leaves a quiet page, not a broken one.
        console.error('portal stage boot', e);
        return;
      }
      if (canceled) {
        app.destroy();
        return;
      }
      app.start();
      applyTheme('sunset');
      mount();
      pointer.attach(host);
      // Two frames: one for PIXI's first render, one for the browser to paint it.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (canceled) return;
          document.body.setAttribute('data-live', '');
          ro.observe(host);
        })
      );
    })();

    return () => {
      canceled = true;
      clearTimeout(timer);
      ro.disconnect();
      pointer.detach();
      document.body.removeAttribute('data-live');
      app.destroy();
    };
  }, []);

  return <div className="portal__stage" ref={hostRef} aria-hidden="true" />;
}
