import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PixiApplication,
  PointerService,
  type PixiAnimation,
} from '@bracketbear/flateralus-pixi';
import {
  applyTheme,
  getManifestDefaultControlValues,
  getRandomControlValues,
  type AnimationManifest,
  type ThemeId,
} from '@bracketbear/flateralus';
import { REGISTRY } from './registry';
import LabHeader from './LabHeader';
import LabNav from './LabNav';
import LabStage from './LabStage';
import LabInspector from './LabInspector';

/** Animations bake layout at init, so a resize rebuilds rather than reflows. */
const RESIZE_DEBOUNCE_MS = 250;
const WATCHDOG_INTERVAL_MS = 1500;
const CONTEXT_DIM = 0.45;

export default function AnimationLab() {
  const [activeId, setActiveId] = useState(REGISTRY[0]?.id ?? '');
  const [theme, setTheme] = useState<ThemeId>('sunset');
  const [inContext, setInContext] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [manifest, setManifest] = useState<AnimationManifest | null>(null);

  const hostRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PixiApplication | null>(null);
  const pointerRef = useRef<PointerService>(new PointerService());
  const animRef = useRef<PixiAnimation<AnimationManifest> | null>(null);
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;
  const valuesRef = useRef(values);
  valuesRef.current = values;

  /**
   * Build the active entry fresh. setAnimation destroys whatever was
   * mounted, so this doubles as teardown.
   */
  const mount = useCallback((initialControls?: Record<string, unknown>) => {
    const app = appRef.current;
    if (!app) return;
    const entry = REGISTRY.find((e) => e.id === activeIdRef.current);
    if (!entry) return;
    pointerRef.current.clearClicks();
    try {
      const animation = entry.create(initialControls);
      animation.setPointerService(pointerRef.current);
      app.setAnimation(animation);
      animRef.current = animation;
      setManifest(animation.getManifest());
      setValues(animation.getControlValues() as Record<string, unknown>);
      setError(null);
    } catch (e) {
      // Error isolation: surface it on the stage, do not let one broken
      // animation take the page down silently.
      console.error(entry.id, e);
      animRef.current = null;
      setError(`${entry.id}: ${(e as Error).message}`);
    }
  }, []);

  // Boot gate: wait for the host element and a non-empty registry.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || REGISTRY.length === 0) return;

    let cancelled = false;
    const app = new PixiApplication({
      config: { autoResize: true, backgroundAlpha: 0, antialias: true },
    });

    void (async () => {
      try {
        await app.init(host);
      } catch (e) {
        console.error('lab boot', e);
        if (!cancelled) setError(`Lab failed to boot: ${(e as Error).message}`);
        return;
      }
      if (cancelled) {
        app.destroy();
        return;
      }
      appRef.current = app;
      app.start();
      applyTheme('sunset');
      setReady(true);
    })();

    return () => {
      cancelled = true;
      appRef.current = null;
      app.destroy();
    };
  }, []);

  // Pointer input listens on the wrapper: BaseApplication sets
  // pointer-events: none on the canvas it appends.
  useEffect(() => {
    const wrap = wrapRef.current;
    const pointer = pointerRef.current;
    if (wrap) pointer.attach(wrap);
    return () => pointer.detach();
  }, [ready]);

  // Selecting a different animation starts from its own defaults.
  useEffect(() => {
    if (ready) mount();
  }, [activeId, ready, mount]);

  // A theme change rebuilds with the values already dialled in — many
  // pieces read the palette at build time, so recoloring needs a rebuild.
  const didMountTheme = useRef(false);
  useEffect(() => {
    if (!ready) return;
    if (!didMountTheme.current) {
      didMountTheme.current = true;
      return;
    }
    mount(valuesRef.current);
  }, [theme, ready, mount]);

  // Debounced remount on resize.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !ready) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => mount(valuesRef.current), RESIZE_DEBOUNCE_MS);
    });
    ro.observe(wrap);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [ready, mount]);

  // Watchdog: one thrown error inside an animation used to kill the RAF
  // chain for the whole page. Revive the ticker if it stops advancing.
  useEffect(() => {
    if (!ready) return;
    let last = -1;
    const id = setInterval(() => {
      const ticker = appRef.current?.getPixiApp()?.ticker;
      if (!ticker) return;
      if (ticker.lastTime === last && ticker.started) {
        try {
          ticker.stop();
          ticker.start();
        } catch (e) {
          console.error('ticker watchdog', e);
        }
      }
      last = ticker.lastTime;
    }, WATCHDOG_INTERVAL_MS);
    return () => clearInterval(id);
  }, [ready]);

  const handleTheme = useCallback((id: ThemeId) => {
    applyTheme(id);
    setTheme(id);
  }, []);

  /**
   * A control marked resetsAnimation rebuilds the scene; everything else
   * updates the running animation in place.
   */
  const handleControl = useCallback(
    (name: string, value: string | number | boolean) => {
      const next = { ...valuesRef.current, [name]: value };
      setValues(next);
      const control = manifest?.controls.find((c) => c.name === name);
      if (control?.resetsAnimation) {
        mount(next);
        return;
      }
      try {
        animRef.current?.updateControls({ [name]: value });
      } catch (e) {
        console.error(name, e);
        setError(`${name}: ${(e as Error).message}`);
      }
    },
    [manifest, mount]
  );

  const handleRandomize = useCallback(() => {
    if (!manifest) return;
    mount(getRandomControlValues(manifest) as Record<string, unknown>);
  }, [manifest, mount]);

  const handleReset = useCallback(() => {
    if (!manifest) return;
    mount(getManifestDefaultControlValues(manifest) as Record<string, unknown>);
  }, [manifest, mount]);

  const active = REGISTRY.find((e) => e.id === activeId) ?? null;

  return (
    <div className="bb-lab">
      <LabHeader
        ready={ready}
        count={REGISTRY.length}
        section={active?.section ?? 'hero'}
        theme={theme}
        onTheme={handleTheme}
        inContext={inContext}
        onView={setInContext}
        onRandomize={handleRandomize}
        onReset={handleReset}
      />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <LabNav activeId={activeId} onSelect={setActiveId} />
        <LabStage
          wrapRef={wrapRef}
          hostRef={hostRef}
          entry={active}
          inContext={inContext}
          contextDim={CONTEXT_DIM}
          showChrome={true}
          error={error}
        />
        {active && manifest && (
          <LabInspector
            entry={active}
            manifest={manifest}
            values={values}
            onChange={handleControl}
          />
        )}
      </div>
    </div>
  );
}
