# Talk Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `/talks/<slug>` route on the Bracket Bear website that plays the "Everything Is an Experience" deck with live Flateralus animations behind the type, keyboard navigation, a deep-linkable `?slide=` param, and a notes drawer.

**Architecture:** One Pixi application boots once per page and swaps animations as slides change, mirroring `AnimationLab.tsx`. Slides are React components in a typed array under `src/talks/`; the Astro route is static and passes only the slug to a `client:only` island, which looks the talk up on the client (island props must be serializable, and slides carry functions). Slide layouts scale with container-query units so the 1920×1080 storyboard numbers carry over as `px / 19.2 cqw`.

**Tech Stack:** Astro 7 (static output), React 19, `@bracketbear/flateralus-pixi` (`PixiApplication`, `PointerService`), `@bracketbear/flateralus` (`applyTheme`, `PAL`, `hx`), vitest + @testing-library/react (root `vitest.config.ts`, jsdom), Playwright borrowed from another checkout for the smoke run.

**Spec:** `docs/superpowers/specs/2026-09-15-talk-runner-design.md`

## Global Constraints

- Route is `noindex, nofollow`, skips `Layout.astro`, body background `#110a08`, exactly like `apps/bracketbear-website/src/pages/lab.astro`.
- Type and palette follow `apps/bracketbear-website/src/styles/lab.css`: Anton display, Plus Jakarta Sans body, JetBrains Mono labels, Archivo Black wordmark; `--orange #ff5f1f`, `--cream #fff3e3`, `--ink #110a08`, `--cyan #7df9ff`.
- Slide copy is copied verbatim from `docs/talks/everything-is-an-experience/build-slides.mjs` (the canvas source). Do not reword slides.
- Speaker notes are the `beats` strings from the same file.
- Animation ids must exist in `REGISTRY` (`apps/bracketbear-website/src/components/lab/registry.ts`).
- Keys: `→` `Space` `PageDown` next; `←` `PageUp` prev; `Home`/`End`; `N` notes; `F` fullscreen. Index clamps, no wrap.
- Commit only runner files and this plan. `docs/talks/` and the flateralus package changes on this branch belong to other work and stay uncommitted.
- Tests run from the repo root: `npx vitest run apps/bracketbear-website`. Baseline is 11 passing tests.

---

## File Structure

```
apps/bracketbear-website/src/
  talks/
    types.ts                      Slide, Talk
    talk-model.ts                 pure navigation + URL + clock helpers
    talk-model.test.ts
    everything-is-an-experience.tsx   the 14 slides, notes, animation refs
    index.ts                      TALKS array + findTalk(slug)
    talks.test.ts                 content invariants against REGISTRY
  components/talk/
    layouts.tsx                   SlideBig, SlideList, SlideBook, SlideWireframe, SlideQuote + u()
    TalkChrome.tsx                header (title, NN / total), footer (wordmark, FLATERALUS chip)
    TalkChrome.test.tsx
    TalkNotes.tsx                 drawer: notes + elapsed clock
    TalkStage.tsx                 wrapper + Pixi host + background per slide
    TalkRunner.tsx                boot Pixi, index state, keyboard, URL, drawer, swap animations
  pages/talks/[slug].astro        static route shell
  styles/talk.css                 .bb-talk tokens (copied from lab.css) + stage box
  scripts/talk-smoke.mjs          Playwright smoke against the dev server
```

---

### Task 1: Types and the pure talk model

**Files:**

- Create: `apps/bracketbear-website/src/talks/types.ts`
- Create: `apps/bracketbear-website/src/talks/talk-model.ts`
- Test: `apps/bracketbear-website/src/talks/talk-model.test.ts`

**Interfaces:**

- Produces:
  - `type Slide = { id: string; render: () => ReactNode; animation?: { id: string; controls?: Record<string, unknown> }; light?: boolean; notes?: string }`
  - `type Talk = { slug: string; title: string; slides: Slide[] }`
  - `clampIndex(i: number, count: number): number`
  - `next(i: number, count: number): number`, `prev(i: number, count: number): number`
  - `indexFromParam(param: string | null, slides: { id: string }[]): number`
  - `formatCounter(i: number, count: number): string` → `"02 / 14"`
  - `formatElapsed(ms: number): string` → `"3:07"`

- [ ] **Step 1: Write the types**

```ts
// apps/bracketbear-website/src/talks/types.ts
import type { ReactNode } from 'react';

/** A reference to a lab-registered animation, by id, plus optional controls. */
export interface SlideAnimation {
  id: string;
  controls?: Record<string, unknown>;
}

export interface Slide {
  /** Stable handle, used for `?slide=` and React keys. */
  id: string;
  /** The slide's foreground. Chrome (header/footer) is drawn by the runner. */
  render: () => ReactNode;
  animation?: SlideAnimation;
  /** Ink type on an orange stage (the two sunset slides). */
  light?: boolean;
  /** Speaker beat shown in the notes drawer. */
  notes?: string;
}

export interface Talk {
  slug: string;
  title: string;
  slides: Slide[];
}
```

- [ ] **Step 2: Write the failing tests**

```ts
// apps/bracketbear-website/src/talks/talk-model.test.ts
import { describe, it, expect } from 'vitest';
import {
  clampIndex,
  next,
  prev,
  indexFromParam,
  formatCounter,
  formatElapsed,
} from './talk-model';

const slides = [{ id: 'title' }, { id: 'ux' }, { id: 'thanks' }];

describe('talk-model', () => {
  it('clamps at both ends', () => {
    expect(clampIndex(-1, 3)).toBe(0);
    expect(clampIndex(3, 3)).toBe(2);
    expect(clampIndex(1, 3)).toBe(1);
  });

  it('next and prev do not wrap', () => {
    expect(next(2, 3)).toBe(2);
    expect(prev(0, 3)).toBe(0);
    expect(next(0, 3)).toBe(1);
    expect(prev(2, 3)).toBe(1);
  });

  it('resolves ?slide= to an index and falls back to 0', () => {
    expect(indexFromParam('ux', slides)).toBe(1);
    expect(indexFromParam('nope', slides)).toBe(0);
    expect(indexFromParam(null, slides)).toBe(0);
  });

  it('formats the counter with two-digit padding', () => {
    expect(formatCounter(0, 14)).toBe('01 / 14');
    expect(formatCounter(13, 14)).toBe('14 / 14');
  });

  it('formats elapsed milliseconds as m:ss', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(187_000)).toBe('3:07');
    expect(formatElapsed(600_000)).toBe('10:00');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run apps/bracketbear-website/src/talks/talk-model.test.ts`
Expected: FAIL, cannot resolve `./talk-model`.

- [ ] **Step 4: Write the model**

```ts
// apps/bracketbear-website/src/talks/talk-model.ts
/** Pure helpers for the runner. No DOM, no React, so they test in isolation. */

export function clampIndex(i: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.max(i, 0), count - 1);
}

export function next(i: number, count: number): number {
  return clampIndex(i + 1, count);
}

export function prev(i: number, count: number): number {
  return clampIndex(i - 1, count);
}

/** `?slide=<id>` → index. Unknown or missing ids land on the first slide. */
export function indexFromParam(
  param: string | null,
  slides: { id: string }[]
): number {
  if (!param) return 0;
  const i = slides.findIndex((s) => s.id === param);
  return i === -1 ? 0 : i;
}

export function formatCounter(i: number, count: number): string {
  return `${String(i + 1).padStart(2, '0')} / ${count}`;
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run apps/bracketbear-website/src/talks/talk-model.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/bracketbear-website/src/talks/types.ts apps/bracketbear-website/src/talks/talk-model.ts apps/bracketbear-website/src/talks/talk-model.test.ts docs/superpowers/plans/2026-09-15-talk-runner.md
git commit -m "feat(talks): slide types and the pure navigation model"
```

---

### Task 2: Slide layouts and chrome

**Files:**

- Create: `apps/bracketbear-website/src/components/talk/layouts.tsx`
- Create: `apps/bracketbear-website/src/components/talk/TalkChrome.tsx`
- Test: `apps/bracketbear-website/src/components/talk/TalkChrome.test.tsx`

**Interfaces:**

- Consumes: `formatCounter` from Task 1.
- Produces:
  - `u(px: number): string` → container-query width unit string (`px / 19.2` cqw).
  - `SlideBig({ head, sub, eyebrow, tag, light, mono, headSize })`
  - `SlideList({ head, items })`
  - `SlideBook({ head, credit, body })`
  - `SlideWireframe({ head })`
  - `SlideQuote({ text, quote, quoteCredit })`
  - `TalkChrome({ title, index, count, light, animationName })`

- [ ] **Step 1: Write the failing chrome test**

```tsx
// apps/bracketbear-website/src/components/talk/TalkChrome.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TalkChrome from './TalkChrome';

describe('TalkChrome', () => {
  it('shows the talk title, the counter, and the wordmark', () => {
    render(
      <TalkChrome
        title="EVERYTHING IS AN EXPERIENCE"
        index={1}
        count={14}
        light={false}
        animationName={null}
      />
    );
    expect(screen.getByText('EVERYTHING IS AN EXPERIENCE')).toBeInTheDocument();
    expect(screen.getByText('02 / 14')).toBeInTheDocument();
    expect(screen.getByText('[BB] BRACKET BEAR')).toBeInTheDocument();
  });

  it('shows the Flateralus chip only when a slide carries an animation', () => {
    const { rerender } = render(
      <TalkChrome
        title="T"
        index={0}
        count={2}
        light={false}
        animationName={null}
      />
    );
    expect(screen.queryByText(/FLATERALUS/)).not.toBeInTheDocument();
    rerender(
      <TalkChrome
        title="T"
        index={0}
        count={2}
        light={false}
        animationName="Logo Resolve"
      />
    );
    expect(screen.getByText('FLATERALUS · LOGO RESOLVE')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run apps/bracketbear-website/src/components/talk/TalkChrome.test.tsx`
Expected: FAIL, cannot resolve `./TalkChrome`.

- [ ] **Step 3: Write the layouts**

Every number is the storyboard's 1920-wide pixel value divided by 19.2, expressed in `cqw` so the slide scales with the stage. The stage sets `container-type: size` (Task 4).

```tsx
// apps/bracketbear-website/src/components/talk/layouts.tsx
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
        <div style={{ ...mono, fontSize: u(22), color: accent }}>{eyebrow}</div>
      )}
      <Headline text={head} size={size} light={light} />
      {sub && subIsMono && (
        <div style={{ ...mono, fontSize: u(26), color: accent }}>{sub}</div>
      )}
      {sub && !subIsMono && (
        <p
          style={{
            ...body,
            fontSize: u(40),
            lineHeight: 1.3,
            color: light ? INK : CREAM,
            maxWidth: u(1640),
          }}
        >
          {sub}
        </p>
      )}
      {tag && (
        <div style={{ ...mono, fontSize: u(20), color: light ? INK : CYAN }}>
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
      <div
        style={{
          width: u(420),
          height: u(600),
          background: CREAM,
          color: INK,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: `${u(44)} ${u(40)}`,
          boxSizing: 'border-box',
          boxShadow: `${u(24)} ${u(24)} 0 ${ORANGE}`,
        }}
      >
        <div style={{ ...display, fontSize: u(76), color: INK }}>
          DON'T MAKE ME THINK
        </div>
        <div style={{ ...mono, fontSize: u(16), color: INK, fontWeight: 500 }}>
          A COMMON SENSE APPROACH TO WEB USABILITY
        </div>
      </div>
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
}: {
  text: string;
  quote?: string;
  quoteCredit?: string;
}) {
  return (
    <div
      style={{
        ...fill,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: u(56),
        padding: `0 ${u(72)}`,
      }}
    >
      <p
        style={{
          ...body,
          fontSize: u(80),
          lineHeight: 1.14,
          maxWidth: u(1700),
          textWrap: 'pretty',
          color: CREAM,
        }}
      >
        {text}
      </p>
      {quote && (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: u(24),
            marginTop: u(24),
          }}
        >
          <div
            style={{
              ...body,
              fontSize: u(32),
              color: 'rgba(255, 243, 227, 0.6)',
            }}
          >
            {quote}
          </div>
          <div style={{ ...mono, fontSize: u(16), color: ORANGE }}>
            {quoteCredit}
          </div>
        </div>
      )}
    </div>
  );
}

export { display, mono, body, INK, CREAM, ORANGE, CYAN };
export type { ReactNode };
```

- [ ] **Step 4: Write the chrome**

```tsx
// apps/bracketbear-website/src/components/talk/TalkChrome.tsx
import { formatCounter } from '@/talks/talk-model';
import { u, mono, INK, CREAM, ORANGE } from './layouts';

interface Props {
  title: string;
  index: number;
  count: number;
  light: boolean;
  animationName: string | null;
}

/** Running header and footer. Same elements the storyboard canvas shows. */
export default function TalkChrome({
  title,
  index,
  count,
  light,
  animationName,
}: Props) {
  const muted = light ? 'rgba(17, 10, 8, 0.6)' : 'rgba(255, 243, 227, 0.55)';
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: u(56),
          left: u(72),
          right: u(72),
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        <div style={{ ...mono, fontSize: u(18), color: muted }}>{title}</div>
        <div style={{ ...mono, fontSize: u(18), color: muted }}>
          {formatCounter(index, count)}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: u(56),
          left: u(72),
          right: u(72),
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontFamily: "'Archivo Black', 'Helvetica Neue', sans-serif",
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            fontSize: u(18),
            color: light ? INK : CREAM,
          }}
        >
          [BB] BRACKET BEAR
        </div>
        {animationName && (
          <div
            style={{
              ...mono,
              fontSize: u(14),
              color: light ? CREAM : INK,
              background: light ? INK : ORANGE,
              padding: `${u(8)} ${u(14)} ${u(7)}`,
              clipPath:
                'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
            }}
          >
            FLATERALUS · {animationName.toUpperCase()}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run apps/bracketbear-website/src/components/talk/TalkChrome.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/bracketbear-website/src/components/talk/layouts.tsx apps/bracketbear-website/src/components/talk/TalkChrome.tsx apps/bracketbear-website/src/components/talk/TalkChrome.test.tsx
git commit -m "feat(talks): slide layouts in container units and the running chrome"
```

---

### Task 3: The talk content and its invariants

**Files:**

- Create: `apps/bracketbear-website/src/talks/everything-is-an-experience.tsx`
- Create: `apps/bracketbear-website/src/talks/index.ts`
- Test: `apps/bracketbear-website/src/talks/talks.test.ts`

**Interfaces:**

- Consumes: `Slide`, `Talk` (Task 1); `SlideBig`, `SlideList`, `SlideBook`, `SlideWireframe`, `SlideQuote` (Task 2); `REGISTRY` from `@/components/lab/registry`.
- Produces: `TALKS: Talk[]`, `findTalk(slug: string): Talk | undefined`, `EVERYTHING_IS_AN_EXPERIENCE: Talk`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/bracketbear-website/src/talks/talks.test.ts
import { describe, it, expect } from 'vitest';
import { TALKS, findTalk } from './index';
import { REGISTRY } from '@/components/lab/registry';

describe('talks', () => {
  it('registers the Fireside talk under its slug', () => {
    const talk = findTalk('everything-is-an-experience');
    expect(talk).toBeDefined();
    expect(talk?.slides).toHaveLength(14);
  });

  it('gives every slide a unique id', () => {
    for (const talk of TALKS) {
      const ids = talk.slides.map((s) => s.id);
      expect(new Set(ids).size, talk.slug).toBe(ids.length);
    }
  });

  it('only references animations the lab registry knows', () => {
    const known = new Set(REGISTRY.map((e) => e.id));
    for (const talk of TALKS) {
      for (const s of talk.slides) {
        if (s.animation) expect(known.has(s.animation.id), s.id).toBe(true);
      }
    }
  });

  it('puts an animation on exactly the five storyboard slides', () => {
    const talk = findTalk('everything-is-an-experience')!;
    const withAnim = talk.slides.filter((s) => s.animation).map((s) => s.id);
    expect(withAnim).toEqual([
      'title',
      'hospitality',
      'experiential',
      'touch-point',
      'thanks',
    ]);
  });

  it('gives every slide a speaker beat', () => {
    const talk = findTalk('everything-is-an-experience')!;
    for (const s of talk.slides)
      expect((s.notes ?? '').length, s.id).toBeGreaterThan(20);
  });

  it('returns undefined for an unknown slug', () => {
    expect(findTalk('nope')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run apps/bracketbear-website/src/talks/talks.test.ts`
Expected: FAIL, cannot resolve `./index`.

- [ ] **Step 3: Write the talk**

Copy is verbatim from `docs/talks/everything-is-an-experience/build-slides.mjs` at the time of writing. If that file changes, this file follows it.

```tsx
// apps/bracketbear-website/src/talks/everything-is-an-experience.tsx
import type { Talk } from './types';
import {
  SlideBig,
  SlideList,
  SlideBook,
  SlideWireframe,
  SlideQuote,
} from '@/components/talk/layouts';

export const EVERYTHING_IS_AN_EXPERIENCE: Talk = {
  slug: 'everything-is-an-experience',
  title: 'EVERYTHING IS AN EXPERIENCE',
  slides: [
    {
      id: 'title',
      animation: { id: 'logo-resolve' },
      render: () => (
        <SlideBig
          eyebrow="FIRESIDE · PORTLAND"
          head="EVERYTHING IS AN EXPERIENCE."
          sub="Harrison Callahan · Bracket Bear"
        />
      ),
      notes:
        'Title stays up while folks settle. Say hi, say what you do at Bracket Bear in one sentence, and that this talk is ten minutes.',
    },
    {
      id: 'ux',
      render: () => <SlideWireframe head="USER EXPERIENCE" />,
      notes:
        "Ask the room what they picture when they hear 'user experience.' Most of us picture this: a website, a wireframe, a Figma file. That's where I started too.",
    },
    {
      id: 'krug',
      render: () => (
        <SlideBook
          head="DON'T MAKE ME THINK."
          credit="Steve Krug · 2000"
          body="The book is about how a website feels to use."
        />
      ),
      notes:
        "Mention it and move on. Thought's fine, thinking is encouraged. The part of the book that stuck is the feeling: you shouldn't have to fight the thing in front of you.",
    },
    {
      id: 'hospitality',
      animation: { id: 'sun-arc' },
      light: true,
      render: () => (
        <SlideBig
          head="TEN YEARS IN HOSPITALITY."
          sub="SERVER, BARTENDER, FOH MANAGER"
          mono
          light
        />
      ),
      notes:
        "Hold this one. Name the places. One story from a shift. Nobody there said 'user experience' and everybody was doing it. What the guest saw versus what the kitchen saw.",
    },
    {
      id: 'beyond',
      render: () => (
        <SlideBig
          head="GO BEYOND EXPECTATION."
          sub="Like, to a ridiculous extreme."
        />
      ),
      notes:
        'Your words from the Will Guidara post, May 2024. Two equivalent services: the differentiator is how personal the experience is. One example of a small thing that got somebody to come back.',
    },
    {
      id: 'experiential',
      animation: { id: 'jelly-tank' },
      render: () => (
        <SlideBig
          head="THEN, EXPERIENTIAL TECHNOLOGY."
          sub="A combination of sensory inputs."
        />
      ),
      notes:
        "Hold this one too. On site, production hardware, the moment it all syncs. The experience isn't the screen. It's the room, the sound, the timing, the person standing next to you.",
    },
    {
      id: 'touch-point',
      animation: { id: 'portal-mark' },
      render: () => (
        <SlideBig
          head="EVERY TOUCH POINT IS PART OF THE EXPERIENCE."
          sub="The install. The client call. The invoice."
        />
      ),
      notes:
        "The turn. Same rule, everywhere. Somebody on the other end experiences every one of those. Krug's rule never said 'web pages' out loud.",
    },
    {
      id: 'business',
      render: () => (
        <SlideList
          head="A BUSINESS."
          items={['THE FIRST EMAIL', 'THE QUOTE', 'THE INVOICE']}
        />
      ),
      notes:
        "Bracket Bear. The tagline is 'Welcome to Bracket Bear' and the invoice got design time for the same reason the site did. Say what the invoice looks like and what it took.",
    },
    {
      id: 'place',
      render: () => (
        <SlideList
          head="A PLACE."
          items={['THE DOOR', 'THE SIGHTLINES', 'THE VOLUME']}
        />
      ),
      notes:
        'Both stories were about a room. The restaurant floor, the install site. A meetup venue is one too. Fireside has been looking for a room with a big LED wall for a reason.',
    },
    {
      id: 'person',
      render: () => (
        <SlideList
          head="A PERSON."
          items={['THE INTRO', 'THE REPLY TIME', 'THE FOLLOW-UP']}
        />
      ),
      notes:
        "How you show up at Fireside is an experience somebody else is having. I'm not saying I'm good at it. I'm saying I think about it.",
    },
    {
      id: 'bad-ux',
      render: () => (
        <SlideBig
          head="BAD USER EXPERIENCE IS STILL AN EXPERIENCE."
          sub="Nobody designed the wait, and everybody felt it."
        />
      ),
      notes:
        'The reframe. Back to the host stand: nobody designed the twenty-minute wait, and every guest felt it. Same with the invoice nobody proofread and the Slack message sent at 11pm. It gets felt either way.',
    },
    {
      id: 'habit',
      render: () => (
        <SlideQuote
          text="Ten years behind a bar taught me to stand where the guest stands. I still do it on every install, and I read every invoice the way the client will."
          quote='"Embrace this moment."'
          quoteCredit="TOOL · PARABOLA · 2001"
        />
      ),
      notes:
        'What you do about it. One real example of standing where the guest stands on an install, and one of reading your own invoice as the client. The Parabola line is there if you want to say it out loud.',
    },
    {
      id: 'impression',
      render: () => (
        <SlideBig
          head="LEAVE A GREAT IMPRESSION."
          sub="Pick one thing you hand to somebody else this week. Look at it from their side."
        />
      ),
      notes:
        "The ask. If you want the 'better than yesterday' line, say it here, out loud.",
    },
    {
      id: 'thanks',
      animation: { id: 'silhouette-flock' },
      light: true,
      render: () => (
        <SlideBig
          head="THANKS, FIRESIDE."
          sub="Let's make some cool stuff together. 🤘"
          tag="#bracketbear2026"
          light
        />
      ),
      notes:
        "Thank Terence and the Fireside crew out loud, by name. Then stop. Q&A if there's time.",
    },
  ],
};
```

```ts
// apps/bracketbear-website/src/talks/index.ts
import type { Talk } from './types';
import { EVERYTHING_IS_AN_EXPERIENCE } from './everything-is-an-experience';

export const TALKS: Talk[] = [EVERYTHING_IS_AN_EXPERIENCE];

export function findTalk(slug: string): Talk | undefined {
  return TALKS.find((t) => t.slug === slug);
}

export type { Talk, Slide } from './types';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run apps/bracketbear-website/src/talks/talks.test.ts`
Expected: PASS, 6 tests. (Importing `REGISTRY` pulls the animation factories; that already works in `registry.test.ts`.)

- [ ] **Step 5: Commit**

```bash
git add apps/bracketbear-website/src/talks/everything-is-an-experience.tsx apps/bracketbear-website/src/talks/index.ts apps/bracketbear-website/src/talks/talks.test.ts
git commit -m "feat(talks): the Fireside deck as slide components with speaker beats"
```

---

### Task 4: Stage, notes drawer, runner, route

**Files:**

- Create: `apps/bracketbear-website/src/styles/talk.css`
- Create: `apps/bracketbear-website/src/components/talk/TalkStage.tsx`
- Create: `apps/bracketbear-website/src/components/talk/TalkNotes.tsx`
- Create: `apps/bracketbear-website/src/components/talk/TalkRunner.tsx`
- Create: `apps/bracketbear-website/src/pages/talks/[slug].astro`

**Interfaces:**

- Consumes: everything above; `PixiApplication`, `PointerService`, `PixiAnimation` from `@bracketbear/flateralus-pixi`; `applyTheme`, `PAL`, `hx`, `AnimationManifest` from `@bracketbear/flateralus`; `REGISTRY` from `@/components/lab/registry`.
- Produces: the page at `/talks/everything-is-an-experience`.

- [ ] **Step 1: Write the stylesheet**

The tokens are the `.bb-lab` block from `lab.css`, rescoped. The stage is a letterboxed 16:9 box that is also a size container so `cqw` units resolve against its width.

```css
/* apps/bracketbear-website/src/styles/talk.css */
@import '@fontsource/anton/400.css';
@import '@fontsource/archivo-black/400.css';
@import '@fontsource/jetbrains-mono/400.css';
@import '@fontsource/jetbrains-mono/500.css';
@import '@fontsource/jetbrains-mono/700.css';
@import '@fontsource/plus-jakarta-sans/400.css';
@import '@fontsource/plus-jakarta-sans/600.css';
@import '@fontsource/plus-jakarta-sans/700.css';

/* ============================================================
   talk.css — Talk runner shell. Scoped under .bb-talk.
   ============================================================ */

.bb-talk {
  --orange: #ff5f1f;
  --cream: #fff3e3;
  --ink: #110a08;
  --cyan: #7df9ff;
  --mono: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace;
  --body: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;

  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ink);
  color: var(--cream);
  font-family: var(--body);
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
}

/* Letterboxed 16:9 stage. cqw units in the slide layouts resolve here. */
.bb-talk-stage {
  position: relative;
  width: min(100vw, calc(100vh * 16 / 9));
  height: min(100vh, calc(100vw * 9 / 16));
  container-type: size;
  overflow: hidden;
  cursor: crosshair;
}

.bb-talk-fade {
  transition: opacity 0.2s ease;
}

.bb-talk-notes {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  background: rgba(17, 10, 8, 0.94);
  border-top: 1px solid rgba(255, 243, 227, 0.14);
  padding: 1rem 1.5rem 1.25rem;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1.5rem;
  align-items: start;
  font-size: 1.05rem;
  line-height: 1.5;
  color: var(--cream);
}

.bb-talk-notes .clock {
  font-family: var(--mono);
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--orange);
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 2: Write the stage**

```tsx
// apps/bracketbear-website/src/components/talk/TalkStage.tsx
import type { ReactNode, RefObject } from 'react';
import { PAL, hx } from '@bracketbear/flateralus';

interface Props {
  stageRef: RefObject<HTMLDivElement | null>;
  hostRef: RefObject<HTMLDivElement | null>;
  light: boolean;
  fading: boolean;
  children: ReactNode;
}

/** The sunset ground the lab paints under hero-section animations. */
function background(light: boolean): string {
  if (!light) return hx(PAL.ink);
  return `radial-gradient(ellipse 90% 70% at 50% 30%, ${hx(PAL.sun)} 0%, ${hx(PAL.bright)} 32%, ${hx(PAL.orange)} 62%, ${hx(PAL.orange)} 100%)`;
}

/**
 * Letterboxed 16:9 box. Pointer input listens on the stage wrapper because
 * BaseApplication sets pointer-events: none on the canvas it appends.
 */
export default function TalkStage({
  stageRef,
  hostRef,
  light,
  fading,
  children,
}: Props) {
  return (
    <div ref={stageRef} className="bb-talk-stage">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: background(light),
        }}
      />
      <div
        ref={hostRef}
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
      />
      <div
        className="bb-talk-fade"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          opacity: fading ? 0 : 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write the notes drawer**

```tsx
// apps/bracketbear-website/src/components/talk/TalkNotes.tsx
import { useEffect, useState } from 'react';
import { formatElapsed } from '@/talks/talk-model';

interface Props {
  notes: string | undefined;
  /** Epoch ms when the talk started, or null before the first advance. */
  startedAt: number | null;
}

/** Bottom drawer: the slide's beat plus an elapsed clock. Toggled with N. */
export default function TalkNotes({ notes, startedAt }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return (
    <div
      className="bb-talk-notes"
      role="complementary"
      aria-label="Speaker notes"
    >
      <div>{notes ?? '—'}</div>
      <div className="clock">
        {startedAt === null ? '0:00' : formatElapsed(now - startedAt)}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write the runner**

Boot, pointer, resize, and watchdog are lifted from `AnimationLab.tsx`. The parts that differ are the index state and the slide-change effect.

```tsx
// apps/bracketbear-website/src/components/talk/TalkRunner.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PixiApplication,
  PointerService,
  type PixiAnimation,
} from '@bracketbear/flateralus-pixi';
import { applyTheme, type AnimationManifest } from '@bracketbear/flateralus';
import { REGISTRY } from '@/components/lab/registry';
import { findTalk } from '@/talks';
import { indexFromParam, next, prev, clampIndex } from '@/talks/talk-model';
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
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PixiApplication | null>(null);
  const pointerRef = useRef<PointerService>(new PointerService());
  const animRef = useRef<PixiAnimation<AnimationManifest> | null>(null);
  const mountedIdRef = useRef<string | null>(null);

  const slide = slides[index];

  /**
   * Swap the stage animation to match the slide. Same id keeps running;
   * a different id rebuilds; none clears the stage. setAnimation destroys
   * whatever was mounted, so this doubles as teardown.
   */
  const syncAnimation = useCallback(
    (force = false) => {
      const app = appRef.current;
      if (!app) return;
      const want = slides[index]?.animation ?? null;
      if (!force && (want?.id ?? null) === mountedIdRef.current) return;

      pointerRef.current.clearClicks();
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
    },
    [slides, index]
  );

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

  // Slide change: sync the animation once the stage is up.
  useEffect(() => {
    if (ready) syncAnimation();
  }, [ready, syncAnimation]);

  // Mirror the slide into the URL. replaceState so the back button stays clean.
  useEffect(() => {
    if (!slide) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get(SLIDE_PARAM) === slide.id) return;
    url.searchParams.set(SLIDE_PARAM, slide.id);
    window.history.replaceState(null, '', url);
  }, [slide]);

  // Debounced remount on resize: animations bake layout at init.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !ready) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => syncAnimation(true), RESIZE_DEBOUNCE_MS);
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

  /** Crossfade the foreground, then move. The animation cuts on its own. */
  const go = useCallback(
    (target: number) => {
      const clamped = clampIndex(target, count);
      if (clamped === index) return;
      setStartedAt((t) => t ?? Date.now());
      setFading(true);
      setTimeout(() => {
        setIndex(clamped);
        setFading(false);
      }, FADE_MS);
    },
    [count, index]
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
      {notesOpen && <TalkNotes notes={slide.notes} startedAt={startedAt} />}
    </div>
  );
}
```

- [ ] **Step 5: Write the route**

```astro
---
// apps/bracketbear-website/src/pages/talks/[slug].astro
// A talk is a full-viewport presentation surface, so it deliberately skips
// Layout.astro: no site nav, no footer, no pointer effects competing with
// the stage cursor. Same shape as lab.astro.
import TalkRunner from '@/components/talk/TalkRunner';
import { TALKS } from '@/talks';
import '@/styles/talk.css';

export function getStaticPaths() {
  return TALKS.map((t) => ({
    params: { slug: t.slug },
    props: { title: t.title },
  }));
}

const { slug } = Astro.params;
const { title } = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>{title} — Bracket Bear</title>
    <style>
      html,
      body {
        margin: 0;
        padding: 0;
        height: 100%;
        background: #110a08;
      }
    </style>
  </head>
  <body>
    <TalkRunner client:only="react" slug={slug} />
  </body>
</html>
```

- [ ] **Step 6: Type-check and run the suite**

Run: `npm run type-check --workspace=@bracketbear/bracketbear-website`
Expected: no errors. (If `textWrap` is rejected on `CSSProperties`, cast that one property: `textWrap: 'balance' as CSSProperties['textWrap']`.)

Run: `npx vitest run apps/bracketbear-website`
Expected: PASS, 24 tests (11 baseline + 5 + 2 + 6).

- [ ] **Step 7: Open it in the running dev server**

The dev server on 4321 picks the new route up. Open `http://localhost:4321/talks/everything-is-an-experience` in Chrome. Check: the Logo Resolve animation runs behind the title, `→` advances and the URL gains `?slide=ux`, `N` opens the drawer, `F` goes fullscreen, slide 04 shows the orange sky with ink type.

- [ ] **Step 8: Commit**

```bash
git add apps/bracketbear-website/src/styles/talk.css apps/bracketbear-website/src/components/talk/TalkStage.tsx apps/bracketbear-website/src/components/talk/TalkNotes.tsx apps/bracketbear-website/src/components/talk/TalkRunner.tsx "apps/bracketbear-website/src/pages/talks/[slug].astro"
git commit -m "feat(talks): /talks/<slug> plays a deck with live Flateralus animations"
```

---

### Task 5: Playwright smoke and spec status

**Files:**

- Create: `apps/bracketbear-website/scripts/talk-smoke.mjs`
- Modify: `docs/superpowers/specs/2026-09-15-talk-runner-design.md:3` (status line)

**Interfaces:**

- Consumes: the route from Task 4, a dev server on 4321.

- [ ] **Step 1: Write the smoke script**

Playwright is not a dependency of this repo. The script loads it from a sibling checkout named by `PLAYWRIGHT_NODE_MODULES`, the same way the lab's GPU probe does.

```js
// apps/bracketbear-website/scripts/talk-smoke.mjs
// Smoke: the talk route mounts a canvas, the arrow key advances, the URL
// follows. Run with a dev server on 4321:
//   PLAYWRIGHT_NODE_MODULES=~/Projects/federato-front-end/node_modules/ \
//     node apps/bracketbear-website/scripts/talk-smoke.mjs
import { createRequire } from 'node:module';

const from = process.env.PLAYWRIGHT_NODE_MODULES;
if (!from) {
  console.error(
    'set PLAYWRIGHT_NODE_MODULES to a node_modules/ that has playwright'
  );
  process.exit(2);
}
const require = createRequire(from.endsWith('/') ? from : `${from}/`);
const { chromium } = require('playwright');

const url = 'http://localhost:4321/talks/everything-is-an-experience';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const failures = [];
const check = (ok, msg) => (ok ? console.log('ok  ', msg) : failures.push(msg));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForSelector('canvas', { timeout: 20000 }).catch(() => null);
check((await page.locator('canvas').count()) > 0, 'a canvas mounts');
check(await page.getByText('01 / 14').isVisible(), 'counter reads 01 / 14');

await page.keyboard.press('ArrowRight');
await page.waitForTimeout(400);
check(
  await page.getByText('02 / 14').isVisible(),
  'ArrowRight advances to 02 / 14'
);
check(page.url().includes('slide=ux'), 'URL carries ?slide=ux');

await page.keyboard.press('n');
await page.waitForTimeout(100);
check(
  (await page.locator('.bb-talk-notes').count()) === 1,
  'N opens the notes drawer'
);

await page.keyboard.press('End');
await page.waitForTimeout(400);
check(
  await page.getByText('14 / 14').isVisible(),
  'End lands on the last slide'
);
check(page.url().includes('slide=thanks'), 'URL carries ?slide=thanks');

await browser.close();
if (failures.length) {
  for (const f of failures) console.error('FAIL', f);
  process.exit(1);
}
```

- [ ] **Step 2: Run it**

Run:

```bash
PLAYWRIGHT_NODE_MODULES=/Users/harrisoncallahan/Projects/federato-front-end/node_modules/ node apps/bracketbear-website/scripts/talk-smoke.mjs
```

Expected: seven `ok` lines, exit 0.

- [ ] **Step 3: Update the spec status**

Change line 3 of `docs/superpowers/specs/2026-09-15-talk-runner-design.md` from `**Status:** draft, awaiting review` to `**Status:** implemented (branch talk-runner, 2026-09-15)`.

- [ ] **Step 4: Commit**

```bash
git add apps/bracketbear-website/scripts/talk-smoke.mjs docs/superpowers/specs/2026-09-15-talk-runner-design.md
git commit -m "test(talks): playwright smoke for the runner; spec marked implemented"
```

---

## Self-review

**Spec coverage.** D1 route beside the lab, noindex, no Layout: Task 4 step 5. D2 one Pixi app, swap by id, same id keeps running, none clears, resize remount: Task 4 step 4 `syncAnimation`. D3 typed slide array, animation as reference, island gets only the slug: Tasks 1, 3, 4. D4 keys and `?slide=`: Task 4 step 4 key handler + URL effect; clamp no-wrap: Task 1. D5 notes drawer with elapsed clock starting on first advance: Task 4 `go()` sets `startedAt`, `TalkNotes`. D6 200 ms foreground crossfade, animations cut: `FADE_MS` and `.bb-talk-fade`. Error handling (missing id → chip says `MISSING · id`, create throws → chip shows the message, boot fails → slides still render): Task 4. Testing section: Tasks 1, 2, 3 unit tests; Task 5 smoke; manual projector check is Task 4 step 7.

**Open question 1 (shared quiet animation on 08–10):** resolved as "stay bare," per the spec's default.
**Open question 2 (elapsed clock):** kept; it is one `setInterval`.

**Placeholders.** None.

**Type consistency.** `Slide.render: () => ReactNode` (Task 1) is what Task 3 supplies and Task 4 calls. `formatCounter(index, count)` (Task 1) is what `TalkChrome` (Task 2) calls with `index` 0-based. `findTalk` (Task 3) returns `Talk | undefined`; `TalkRunner` (Task 4) handles undefined. `SlideBig` props `mono` and `light` (Task 2) match Task 3 usage.
