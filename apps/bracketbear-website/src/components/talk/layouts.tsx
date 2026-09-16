import type { CSSProperties, ReactNode } from 'react';

const INK = '#110a08';
const CREAM = '#fff3e3';
const ORANGE = '#ff5f1f';
const CYAN = '#7df9ff';

/** Storyboard pixel (at 1920 wide) → container-query width unit. */
export function u(px: number): string {
  return `${(px / 19.2).toFixed(3)}cqw`;
}

const display: CSSProperties = {
  fontFamily: "'Anton', 'Impact', 'Helvetica Neue', sans-serif",
  fontWeight: 400,
  textTransform: 'uppercase',
  letterSpacing: '0.005em',
  lineHeight: 0.92,
  margin: 0,
  textWrap: 'balance',
};

const mono: CSSProperties = {
  fontFamily: "'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace",
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const body: CSSProperties = {
  fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  fontWeight: 400,
  margin: 0,
};

const fill: CSSProperties = { position: 'absolute', inset: 0 };

/** Lifts type off the animations. Dark halo under cream, light halo under ink. */
export const SHADOW_DARK =
  '0 2px 6px rgba(17, 10, 8, 0.55), 0 12px 40px rgba(17, 10, 8, 0.45)';
export const SHADOW_LIGHT =
  '0 2px 6px rgba(255, 210, 160, 0.55), 0 12px 40px rgba(255, 190, 120, 0.4)';
export const shadow = (light?: boolean): string =>
  light ? SHADOW_LIGHT : SHADOW_DARK;
/** For type over the busiest animations. */
export const SHADOW_HEAVY =
  '0 2px 8px rgba(17, 10, 8, 0.95), 0 10px 30px rgba(17, 10, 8, 0.9), 0 0 90px rgba(17, 10, 8, 0.85)';

function Headline({
  text,
  size,
  light,
}: {
  text: string;
  size: number;
  light?: boolean;
}) {
  return (
    <h1
      style={{
        ...display,
        fontSize: u(size),
        color: light ? INK : CREAM,
        maxWidth: u(1560),
        textShadow: shadow(light),
      }}
    >
      {text}
    </h1>
  );
}

/** Title, giant-type, and sunset slides: bottom-aligned headline with optional lines. */
export function SlideBig({
  head,
  sub,
  eyebrow,
  tag,
  light,
  mono: subIsMono,
  headSize,
}: {
  head: string;
  sub?: string;
  eyebrow?: string;
  tag?: string;
  light?: boolean;
  mono?: boolean;
  headSize?: number;
}) {
  const size =
    headSize ?? (head.length > 36 ? 170 : head.length > 30 ? 190 : 240);
  const accent = light ? INK : ORANGE;
  return (
    <div
      style={{
        ...fill,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        gap: u(40),
        padding: `0 ${u(72)} ${u(150)}`,
      }}
    >
      {eyebrow && (
        <div
          style={{
            ...mono,
            fontSize: u(22),
            color: accent,
            textShadow: shadow(light),
          }}
        >
          {eyebrow}
        </div>
      )}
      <Headline text={head} size={size} light={light} />
      {sub && subIsMono && (
        <div
          style={{
            ...mono,
            fontSize: u(26),
            color: accent,
            textShadow: shadow(light),
          }}
        >
          {sub}
        </div>
      )}
      {sub && !subIsMono && (
        <p
          style={{
            ...body,
            fontSize: u(40),
            lineHeight: 1.3,
            color: light ? INK : CREAM,
            maxWidth: u(1640),
            textShadow: shadow(light),
          }}
        >
          {sub}
        </p>
      )}
      {tag && (
        <div
          style={{
            ...mono,
            fontSize: u(20),
            color: light ? INK : CYAN,
            textShadow: shadow(light),
          }}
        >
          {tag}
        </div>
      )}
    </div>
  );
}

/** "A business." style: headline left, numbered items right. */
export function SlideList({ head, items }: { head: string; items: string[] }) {
  return (
    <div
      style={{
        ...fill,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        alignItems: 'center',
        gap: u(96),
        padding: `0 ${u(72)}`,
      }}
    >
      <Headline text={head} size={260} />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: u(28),
          justifySelf: 'end',
          alignItems: 'flex-start',
        }}
      >
        {items.map((t, i) => (
          <div
            key={t}
            style={{ display: 'flex', alignItems: 'center', gap: u(28) }}
          >
            <div style={{ ...mono, fontSize: u(20), color: ORANGE }}>
              0{i + 1}
            </div>
            <div
              style={{
                ...display,
                fontSize: u(96),
                color: CREAM,
                whiteSpace: 'nowrap',
                textShadow: SHADOW_DARK,
              }}
            >
              {t}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The Krug slide: smaller title, credit, one body line, a book cover. */
export function SlideBook({
  head,
  credit,
  body: bodyText,
}: {
  head: string;
  credit: string;
  body?: string;
}) {
  return (
    <div
      style={{
        ...fill,
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        alignItems: 'center',
        gap: u(96),
        padding: `0 ${u(72)}`,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: u(32) }}>
        <Headline text={head} size={150} />
        <div style={{ ...mono, fontSize: u(22), color: ORANGE }}>{credit}</div>
        {bodyText && (
          <p
            style={{
              ...body,
              fontSize: u(40),
              lineHeight: 1.3,
              color: CREAM,
              maxWidth: u(900),
            }}
          >
            {bodyText}
          </p>
        )}
      </div>
      <img
        src="/talks/dont-make-me-think.jpg"
        alt="Don't Make Me Think, Revisited by Steve Krug"
        style={{
          width: u(380),
          height: 'auto',
          display: 'block',
          boxShadow: `${u(24)} ${u(24)} 0 ${ORANGE}`,
        }}
      />
    </div>
  );
}

/** "User experience": headline left, a browser wireframe right. */
export function SlideWireframe({ head }: { head: string }) {
  const box = (color: string): CSSProperties => ({
    border: `${u(3)} solid ${color}`,
  });
  const muted = 'rgba(255, 243, 227, 0.42)';
  return (
    <div
      style={{
        ...fill,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        alignItems: 'center',
        padding: `0 ${u(72)}`,
      }}
    >
      <Headline text={head} size={180} />
      <div
        style={{
          width: u(760),
          height: u(520),
          ...box(CREAM),
          background: INK,
          display: 'flex',
          flexDirection: 'column',
          justifySelf: 'end',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: u(12),
            alignItems: 'center',
            height: u(56),
            padding: `0 ${u(20)}`,
            borderBottom: `${u(3)} solid ${CREAM}`,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: u(16),
                height: u(16),
                ...box(CREAM),
                borderRadius: '50%',
              }}
            />
          ))}
          <div
            style={{ flex: 1, height: u(22), marginLeft: u(12), ...box(muted) }}
          />
        </div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: u(24),
            padding: u(32),
          }}
        >
          <div style={{ height: u(150), ...box(ORANGE) }} />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: u(24),
              flex: 1,
            }}
          >
            <div style={box(muted)} />
            <div style={box(muted)} />
            <div style={box(muted)} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** A sentence in body type, with an optional lyric line and credit under it. */
export function SlideQuote({
  text,
  quote,
  quoteCredit,
  heavy,
  low,
}: {
  text: string;
  quote?: string;
  quoteCredit?: string;
  /** Heavier shadow for a busy animation underneath. */
  heavy?: boolean;
  /** Sit low on the slide instead of centered. */
  low?: boolean;
}) {
  const textShadow = heavy ? SHADOW_HEAVY : SHADOW_DARK;
  return (
    <div
      style={{
        ...fill,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: low ? 'flex-end' : 'center',
        gap: u(56),
        padding: `0 ${u(72)} ${low ? u(150) : 0}`,
      }}
    >
      <p
        style={{
          ...body,
          fontSize: u(80),
          lineHeight: 1.14,
          maxWidth: u(1700),
          textWrap: 'pretty',
          whiteSpace: 'pre-line',
          color: CREAM,
          textShadow,
        }}
      >
        {text}
      </p>
      {(quote || quoteCredit) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: u(24),
            marginTop: u(24),
          }}
        >
          {quote && (
            <div
              style={{
                ...body,
                fontSize: u(32),
                color: 'rgba(255, 243, 227, 0.6)',
              }}
            >
              {quote}
            </div>
          )}
          <div style={{ ...mono, fontSize: u(16), color: ORANGE, textShadow }}>
            {quoteCredit}
          </div>
        </div>
      )}
    </div>
  );
}

export { display, mono, body, INK, CREAM, ORANGE, CYAN };
export type { ReactNode };
