import { useEffect, useState, type RefObject } from 'react';
import { hx, PAL, type AnimationManifest } from '@bracketbear/flateralus';
import type { PixiAnimation } from '@bracketbear/flateralus-pixi';

const MONO = "'JetBrains Mono', ui-monospace, monospace";

/** How often the readout polls. Fast enough to feel live, slow enough to be free. */
const POLL_MS = 250;

interface Props {
  animRef: RefObject<PixiAnimation<AnimationManifest> | null>;
}

interface Snapshot {
  fps: number;
  p50: number;
  p95: number;
  quality: number;
  mode: 'auto' | 'fixed';
  levers: Record<string, number>;
}

/** Integers as they are; anything fractional to two places. */
function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

const label: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: '0.62rem',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  fontWeight: 700,
  color: 'rgba(255,243,227,0.75)',
};

const row: React.CSSProperties = {
  ...label,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: '0.5rem',
  marginBottom: '0.3rem',
};

function btn(active: boolean): React.CSSProperties {
  return {
    ...label,
    fontSize: '0.58rem',
    padding: '0.28rem 0.5rem',
    cursor: 'pointer',
    border: `1px solid ${active ? hx(PAL.bright) : 'rgba(255,243,227,0.2)'}`,
    background: active ? hx(PAL.bright) : 'transparent',
    color: active ? hx(PAL.ink) : 'rgba(255,243,227,0.75)',
  };
}

/**
 * Frame statistics and the quality lever, for the animation currently on the
 * stage.
 *
 * This exists because cost was previously invisible: `iron-bloom` shipped a
 * draft that ran at one frame per sixteen seconds and that went unnoticed
 * through several rounds of material tuning. The number that would have said
 * so is the first one here.
 */
export default function LabPerf({ animRef }: Props) {
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    const read = () => {
      const a = animRef.current;
      if (!a?.getFrameStats) {
        setSnap(null);
        return;
      }
      const s = a.getFrameStats();
      setSnap({
        fps: s.fps,
        p50: s.p50,
        p95: s.p95,
        quality: a.getQuality?.() ?? 1,
        mode: a.getQualityMode?.() ?? 'auto',
        levers: a.getResolvedLevers?.() ?? {},
      });
    };
    read();
    const id = setInterval(read, POLL_MS);
    return () => clearInterval(id);
  }, [animRef]);

  if (!snap) return null;

  const setMode = (mode: 'auto' | 'fixed') => {
    animRef.current?.setQualityMode?.(mode, snap.quality);
    setSnap({ ...snap, mode });
  };

  const nudge = (d: number) => {
    const a = animRef.current;
    if (!a?.setQualityMode) return;
    const q = Math.min(1, Math.max(0, snap.quality + d));
    a.setQualityMode('fixed', q);
    setSnap({ ...snap, mode: 'fixed', quality: q });
  };

  // A scene whose typical frame is fine but whose worst frames are not is
  // still a scene worth turning down, so p95 is what gets the warning colour.
  const hot = snap.p95 > 20;

  return (
    <div
      style={{
        borderTop: '1px solid rgba(255,243,227,0.14)',
        paddingTop: '0.7rem',
        marginTop: '0.7rem',
      }}
    >
      <div style={{ ...label, marginBottom: '0.5rem' }}>Performance</div>

      <div style={row}>
        <span>FPS</span>
        <span style={{ color: hot ? hx(PAL.bright) : hx(PAL.cream) }}>
          {snap.fps.toFixed(0)}
        </span>
      </div>
      <div style={row}>
        <span>Frame p50 / p95</span>
        <span style={{ color: hot ? hx(PAL.bright) : hx(PAL.cream) }}>
          {snap.p50.toFixed(1)} / {snap.p95.toFixed(1)} ms
        </span>
      </div>
      <div style={row}>
        <span>Quality</span>
        <span style={{ color: hx(PAL.cream) }}>{snap.quality.toFixed(2)}</span>
      </div>

      {Object.entries(snap.levers).map(([k, v]) => (
        <div key={k} style={{ ...row, opacity: 0.8 }}>
          <span>&nbsp;&nbsp;{k}</span>
          <span style={{ color: hx(PAL.cream) }}>{fmt(v)}</span>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.5rem' }}>
        <button
          style={btn(snap.mode === 'auto')}
          onClick={() => setMode('auto')}
        >
          Auto
        </button>
        <button
          style={btn(snap.mode === 'fixed')}
          onClick={() => setMode('fixed')}
        >
          Pin
        </button>
        <button style={btn(false)} onClick={() => nudge(-0.05)}>
          –
        </button>
        <button style={btn(false)} onClick={() => nudge(0.05)}>
          +
        </button>
      </div>
      <div
        style={{
          ...label,
          fontSize: '0.5rem',
          letterSpacing: '0.1em',
          opacity: 0.5,
          marginTop: '0.4rem',
          textTransform: 'none',
        }}
      >
        Pin quality while tuning — automatic scaling moving the resolution
        underneath you makes look-dev impossible.
      </div>
    </div>
  );
}
