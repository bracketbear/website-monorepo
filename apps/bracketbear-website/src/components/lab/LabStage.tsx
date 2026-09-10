import type { RefObject } from 'react';
import { PAL, hx } from '@bracketbear/flateralus';
import { isDarkSection, sectionBackground } from './sections';
import type { LabEntry } from './registry';

const MONO = "'JetBrains Mono', ui-monospace, monospace";

interface Props {
  wrapRef: RefObject<HTMLDivElement | null>;
  hostRef: RefObject<HTMLDivElement | null>;
  entry: LabEntry | null;
  inContext: boolean;
  contextDim: number;
  showChrome: boolean;
  error: string | null;
}

const chromeBase: React.CSSProperties = {
  position: 'absolute',
  fontFamily: MONO,
  fontSize: '0.6rem',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
};

export default function LabStage({
  wrapRef,
  hostRef,
  entry,
  inContext,
  contextDim,
  showChrome,
  error,
}: Props) {
  const section = entry?.section ?? 'hero';

  // "In context" dims the animation so the copy on top stays readable.
  // Statement and toys run full strength: they are the content.
  const dimmed =
    inContext && section !== 'statement' && section !== 'toys' ? contextDim : 1;

  const chromeColor = isDarkSection(section)
    ? `${hx(PAL.cream)}99`
    : `${hx(PAL.ink)}99`;

  return (
    <div
      ref={wrapRef}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        minWidth: 0,
        cursor: 'crosshair',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: sectionBackground(section),
        }}
      />
      <div
        ref={hostRef}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          opacity: dimmed,
          transition: 'opacity 0.3s ease',
        }}
      />

      {showChrome && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 3,
            pointerEvents: 'none',
            color: chromeColor,
          }}
        >
          <span style={{ ...chromeBase, top: '0.9rem', left: '1rem' }}>
            BB·LAB / {entry ? entry.id.toUpperCase() : '—'}
          </span>
          <span style={{ ...chromeBase, top: '0.9rem', right: '1rem' }}>
            Flateralus / PIXI v8
          </span>
          <span style={{ ...chromeBase, bottom: '0.9rem', left: '1rem' }}>
            Click + move the cursor — most of these bite back
          </span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            inset: 'auto 1rem 1rem 1rem',
            zIndex: 4,
            fontFamily: MONO,
            fontSize: '0.66rem',
            letterSpacing: '0.06em',
            lineHeight: 1.5,
            background: '#110a08',
            color: '#ffc24a',
            border: '1px solid #d8420c',
            padding: '0.7rem 0.9rem',
            whiteSpace: 'pre-wrap',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
