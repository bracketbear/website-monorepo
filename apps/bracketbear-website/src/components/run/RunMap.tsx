import { useEffect, useRef } from 'react';
import { PixiApplication, PointerService } from '@bracketbear/flateralus-pixi';
import { applyTheme } from '@bracketbear/flateralus';
import { REGISTRY } from '../lab/registry';
import { SizeGate } from './size-gate';

const ID = 'route-trace';
const RESIZE_DEBOUNCE_MS = 250;

/**
 * The run page's map: the route-trace animation from the lab registry,
 * mounted over the server-rendered still. The still stays in the HTML (it
 * is there before hydration and without JavaScript); once the canvas has
 * drawn a frame this marks the `.run__map` box `data-live` and the CSS
 * fades the still out. Traces once and holds; a click replays. Reduced
 * motion is the animation's own concern: it starts finished.
 *
 * The frame is computed when the animation is built, so a resize rebuilds
 * it, debounced, the way the talk runner does.
 */
export default function RunMap() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    const entry = REGISTRY.find((e) => e.id === ID);
    if (!host || !entry) return;
    // Astro wraps a client:only island in <astro-island>, so the map box is
    // an ancestor rather than the parent.
    const box = host.closest('.run__map');

    let cancelled = false;
    const app = new PixiApplication({
      config: { autoResize: true, backgroundAlpha: 0, antialias: true },
    });
    const pointer = new PointerService();

    const mount = (): void => {
      pointer.clearClicks();
      const animation = entry.create({
        route: 'kc-segd-2026',
        loop: false,
        fit: 'contain',
        scrim: false,
      });
      animation.setPointerService(pointer);
      app.setAnimation(animation);
    };

    // observe() reports the current size at once; the gate swallows that
    // opening notification so only a real resize rebuilds the frame.
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
        // The still is already showing; a failed boot costs nothing visible.
        console.error('run map boot', e);
        return;
      }
      if (cancelled) {
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
          if (cancelled) return;
          box?.setAttribute('data-live', '');
          ro.observe(host);
        })
      );
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      ro.disconnect();
      pointer.detach();
      box?.removeAttribute('data-live');
      app.destroy();
    };
  }, []);

  return <div className="run__stage" ref={hostRef} aria-hidden="true" />;
}
