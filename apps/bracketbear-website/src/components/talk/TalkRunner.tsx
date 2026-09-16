import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PixiApplication,
  PointerService,
  type PixiAnimation,
} from '@bracketbear/flateralus-pixi';
import {
  PAL,
  applyTheme,
  type AnimationManifest,
} from '@bracketbear/flateralus';
import { REGISTRY } from '../lab/registry';
import { findTalk } from '../../talks';
import { indexFromParam, next, prev, clampIndex } from '../../talks/talk-model';
import TalkStage from './TalkStage';
import TalkChrome from './TalkChrome';
import TalkNotes from './TalkNotes';

const RESIZE_DEBOUNCE_MS = 250;
const WATCHDOG_INTERVAL_MS = 1500;
const FADE_MS = 200;
const SLIDE_PARAM = 'slide';

interface Props {
  slug: string;
}

/**
 * Plays one talk. The island receives only the slug: slides carry render
 * functions, which cannot cross the Astro island boundary as props.
 */
export default function TalkRunner({ slug }: Props) {
  const talk = findTalk(slug);
  const slides = talk?.slides ?? [];
  const count = slides.length;

  const [index, setIndex] = useState(() =>
    indexFromParam(
      new URLSearchParams(window.location.search).get(SLIDE_PARAM),
      slides
    )
  );
  const [ready, setReady] = useState(false);
  const [fading, setFading] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [textHidden, setTextHidden] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PixiApplication | null>(null);
  const pointerRef = useRef<PointerService>(new PointerService());
  const animRef = useRef<PixiAnimation<AnimationManifest> | null>(null);
  const mountedIdRef = useRef<string | null>(null);
  const slidesRef = useRef(slides);
  slidesRef.current = slides;
  const indexRef = useRef(index);
  indexRef.current = index;

  const slide = slides[index];

  /**
   * Swap the stage animation to match a slide. Same id keeps running;
   * a different id rebuilds; none clears the stage. setAnimation destroys
   * whatever was mounted, so this doubles as teardown. Reads slides through
   * a ref so its identity never changes and no effect re-subscribes on it.
   */
  const syncAnimation = useCallback((target: number, force = false) => {
    const app = appRef.current;
    if (!app) return;
    const want = slidesRef.current[target]?.animation ?? null;
    if (!force && (want?.id ?? null) === mountedIdRef.current) return;

    pointerRef.current.clearClicks();
    // Every slide starts from the brand theme; a slide may override roles.
    applyTheme('sunset');
    if (want?.palette) Object.assign(PAL, want.palette);
    if (!want) {
      app.setAnimation(null);
      animRef.current = null;
      mountedIdRef.current = null;
      setError(null);
      return;
    }
    const entry = REGISTRY.find((e) => e.id === want.id);
    if (!entry) {
      console.error('talk: unknown animation', want.id);
      app.setAnimation(null);
      animRef.current = null;
      mountedIdRef.current = null;
      setError(`MISSING · ${want.id}`);
      return;
    }
    try {
      const animation = entry.create(want.controls);
      animation.setPointerService(pointerRef.current);
      app.setAnimation(animation);
      animRef.current = animation;
      mountedIdRef.current = want.id;
      setError(null);
    } catch (e) {
      console.error(want.id, e);
      animRef.current = null;
      mountedIdRef.current = null;
      setError(`${want.id}: ${(e as Error).message}`);
    }
  }, []);

  // Boot gate: wait for the host element and a talk with slides.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || count === 0) return;

    let cancelled = false;
    const app = new PixiApplication({
      config: { autoResize: true, backgroundAlpha: 0, antialias: true },
    });

    void (async () => {
      try {
        await app.init(host);
      } catch (e) {
        console.error('talk boot', e);
        if (!cancelled)
          setError(`Stage failed to boot: ${(e as Error).message}`);
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
  }, [count]);

  // Pointer input listens on the stage wrapper.
  useEffect(() => {
    const stage = stageRef.current;
    const pointer = pointerRef.current;
    if (stage) pointer.attach(stage);
    return () => pointer.detach();
  }, [ready]);

  // First mount once the stage is up. Later slides mount from go().
  useEffect(() => {
    if (ready) syncAnimation(indexRef.current);
  }, [ready, syncAnimation]);

  // Mirror the slide into the URL. replaceState so the back button stays clean.
  useEffect(() => {
    if (!slide) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get(SLIDE_PARAM) === slide.id) return;
    url.searchParams.set(SLIDE_PARAM, slide.id);
    window.history.replaceState(null, '', url);
  }, [slide]);

  // Debounced remount on a real resize: animations bake layout at init.
  // Subscribed once per boot. A fresh ResizeObserver fires on observe(),
  // so the first callback is recorded, not acted on.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !ready) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let last: { w: number; h: number } | null = null;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r) return;
      const size = { w: Math.round(r.width), h: Math.round(r.height) };
      if (last === null) {
        last = size;
        return;
      }
      if (size.w === last.w && size.h === last.h) return;
      last = size;
      clearTimeout(timer);
      timer = setTimeout(
        () => syncAnimation(indexRef.current, true),
        RESIZE_DEBOUNCE_MS
      );
    });
    ro.observe(stage);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [ready, syncAnimation]);

  // Watchdog: revive the ticker if an animation error stalls it.
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

  /**
   * Fade the foreground out, swap the animation while nothing is on top
   * of it (the shader compile hitch lands here, unseen), then move.
   */
  const go = useCallback(
    (target: number) => {
      const clamped = clampIndex(target, count);
      if (clamped === index) return;
      setStartedAt((t) => t ?? Date.now());
      setFading(true);
      requestAnimationFrame(() => syncAnimation(clamped));
      setTimeout(() => {
        setIndex(clamped);
        setFading(false);
      }, FADE_MS);
    },
    [count, index, syncAnimation]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'PageDown':
          e.preventDefault();
          go(next(index, count));
          break;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          go(prev(index, count));
          break;
        case 'Home':
          e.preventDefault();
          go(0);
          break;
        case 'End':
          e.preventDefault();
          go(count - 1);
          break;
        case 'n':
        case 'N':
          setNotesOpen((v) => !v);
          break;
        case 't':
        case 'T':
          setTextHidden((v) => !v);
          break;
        case 'f':
        case 'F':
          if (document.fullscreenElement) void document.exitFullscreen();
          else void document.documentElement.requestFullscreen();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index, count]);

  if (!talk || !slide) {
    return (
      <div className="bb-talk">
        <div style={{ fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>
          No talk at /talks/{slug}
        </div>
      </div>
    );
  }

  const entry = slide.animation
    ? REGISTRY.find((e) => e.id === slide.animation!.id)
    : null;
  const light = slide.light ?? false;

  return (
    <div className="bb-talk">
      <TalkStage
        stageRef={stageRef}
        hostRef={hostRef}
        light={light}
        fading={fading}
        textHidden={textHidden}
        cover={slide.animation?.cover ?? 1}
      >
        {slide.render()}
        <TalkChrome
          title={talk.title}
          index={index}
          count={count}
          light={light}
          animationName={error ?? entry?.name ?? null}
        />
      </TalkStage>
      <button
        type="button"
        className="bb-talk-toggle"
        aria-pressed={textHidden}
        onClick={() => setTextHidden((v) => !v)}
      >
        {textHidden ? 'SHOW TEXT' : 'HIDE TEXT'}
      </button>
      {notesOpen && <TalkNotes notes={slide.notes} startedAt={startedAt} />}
    </div>
  );
}
