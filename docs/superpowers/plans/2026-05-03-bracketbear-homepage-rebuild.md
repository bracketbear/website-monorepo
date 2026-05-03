# Bracket Bear Homepage Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the live Bracket Bear homepage with the new content + structure defined in `docs/superpowers/specs/2026-05-03-bracketbear-website-content-design.md`, using the static draft at `apps/bracketbear-website/public/draft/index.html` as the visual source of truth.

**Architecture:** The homepage gets a dedicated CSS stylesheet (extracted verbatim from the draft, scoped via a `.bb-home` wrapper to avoid leaking into other pages) and a rebuilt `index.astro` whose HTML mirrors the draft. The CMS schema for `bracketbearIndexPage` is replaced wholesale to match the new content shape. Site-wide Tailwind tokens, fonts, and other pages are NOT modified — the homepage acts as a design vanguard.

**Tech Stack:** Astro 5 content collections, Zod schemas via `@bracketbear/astro-content`, Pixi.js v7 (already bundled via `@bracketbear/flateralus-pixi-animations`), `@fontsource` packages for new typefaces, vanilla DOM JS for cursor + ticker behavior (lifted from the draft).

**Spec reference:** `docs/superpowers/specs/2026-05-03-bracketbear-website-content-design.md` — all final copy lives there. Class names referenced here (`.hero__eyebrow`, `.offer`, `.value`, `.manifesto__lines`, `.cta__grid`, etc.) are the draft's classes.

**Key constraint:** The homepage CSS must not leak. Prefix every selector in the extracted draft CSS with `.bb-home` so the orange body, custom cursor, and other overrides do not affect /about, /services, /contact.

**Open items (from the spec, not solved by this plan):**

- §8.5 Hyperquake one-liner — Harrison to provide. Plan uses placeholder text until then.
- §8.3 AI-agent demo video — future swap. Plan ships text + mailto CTA per spec.

**Execution note:** This plan has six phases. Phase 1 (Foundation) and Phase 2 (Schema) are blocking for everything else. Phases 3 (Content), 4 (Page rebuild), 5 (Footer), 6 (QA) follow in order. Recommend committing after each completed task.

---

## File Map

**Files created:**

- `apps/bracketbear-website/src/styles/bb-home.css` — extracted draft CSS, prefixed with `.bb-home` scope
- `apps/bracketbear-website/src/scripts/bb-home.client.ts` — extracted draft JS (cursor, ticker, absorb effect, stage canvas init)
- `apps/bracketbear-website/src/components/home/StatusTicker.astro` — sub-component for the top status bar
- `apps/bracketbear-website/src/components/home/Hero.astro` — sub-component for the hero
- `apps/bracketbear-website/src/components/home/Intro.astro` — intro / approach section
- `apps/bracketbear-website/src/components/home/Offerings.astro` — three offerings + platform-layers sub-strip
- `apps/bracketbear-website/src/components/home/Receipts.astro` — pull quote + demo block + operator credit + Hyperquake
- `apps/bracketbear-website/src/components/home/ThreeCs.astro` — three commitments
- `apps/bracketbear-website/src/components/home/Manifesto.astro` — "Bracket Bear is itself an experience" beat
- `apps/bracketbear-website/src/components/home/ClosingCTA.astro` — closing CTA + welcome bookend

**Files modified:**

- `packages/astro-content/src/collections.ts:126-158` — replace the `bracketbearIndexPage` schema
- `apps/cms/content/sites/bracketbear/index-page.json` — replace contents with new copy
- `apps/bracketbear-website/src/pages/index.astro` — rewrite to use new components
- `apps/bracketbear-website/src/layouts/HomeLayout.astro` — add optional `homeBodyClass` prop and wrap content with `.bb-home`
- `apps/bracketbear-website/package.json` — add `@fontsource/anton`, `@fontsource/archivo-black`, `@fontsource/plus-jakarta-sans`, `@fontsource/jetbrains-mono`
- `apps/bracketbear-website/src/config/navigation.ts` — geography + tagline updates if footer copy lives here (discovery task in Phase 5)

**Files NOT modified (intentional):**

- `packages/bear-ui-tailwind/**` — global tokens stay as-is. The homepage uses its own CSS scope; other pages keep current design.
- `packages/core/src/astro/components/Footer.astro` — shared across sites; updates happen via the per-site config, not the shared component.
- `apps/bracketbear-website/src/components/HeroSection.tsx` — replaced by the new `Hero.astro` on the homepage. Keep the file for now in case other pages use it; remove only if grep confirms zero other usages.

---

## Phase 1: Foundation (CSS scope, fonts, JS)

This phase ships the visual+behavioral foundation. After Phase 1, no UI changes yet — we just have the assets ready to wire in.

### Task 1.1: Add font packages

**Files:**

- Modify: `apps/bracketbear-website/package.json`

- [ ] **Step 1: Add font packages via bun**

Run from repo root:

```bash
cd /Users/harrisoncallahan/Projects/bracketbear/apps/bracketbear-website
bun add @fontsource/anton @fontsource/archivo-black @fontsource/plus-jakarta-sans @fontsource/jetbrains-mono
```

- [ ] **Step 2: Verify packages installed**

Run: `cd apps/bracketbear-website && cat package.json | grep -E "anton|archivo|plus-jakarta|jetbrains"`
Expected: four lines confirming each `@fontsource/*` dependency.

- [ ] **Step 3: Commit**

```bash
git add apps/bracketbear-website/package.json bun.lockb
git commit -m "feat(homepage): add Anton/Archivo Black/Plus Jakarta Sans/JetBrains Mono fonts"
```

### Task 1.2: Extract draft CSS into a scoped homepage stylesheet

The draft at `apps/bracketbear-website/public/draft/index.html` has its CSS inline in a `<style>` block (lines 20–~1380). We extract it verbatim, prefix every selector with `.bb-home`, and import it from the homepage only. Body-level rules become `.bb-home` rules; html-level rules become `:root .bb-home` rules where reasonable.

**Files:**

- Create: `apps/bracketbear-website/src/styles/bb-home.css`

- [ ] **Step 1: Create the scoped CSS file**

Open `apps/bracketbear-website/public/draft/index.html`, copy everything between `<style>` (line 20) and `</style>` (around line 1380), and paste into `apps/bracketbear-website/src/styles/bb-home.css`.

- [ ] **Step 2: Add the `:root` custom-properties block at the top, unscoped**

The custom properties (`--orange`, `--ink`, etc.) need to be available throughout the cascade. Wrap them in a `.bb-home` selector instead of `:root`. Replace:

```css
:root {
  --orange: #ff5f1f;
  /* ... all the custom props ... */
}
```

with:

```css
.bb-home {
  --orange: #ff5f1f;
  /* ... all the custom props ... */
}
```

- [ ] **Step 3: Replace `html`-level rules with `.bb-home` rules**

The draft has:

```css
html {
  background: var(--orange);
  color: var(--ink);
  font-family: var(--body);
  /* ... */
}
```

Replace with:

```css
.bb-home {
  background: var(--orange);
  color: var(--ink);
  font-family: var(--body);
  /* ... */
}
```

- [ ] **Step 4: Replace `body`-level rules with `.bb-home` rules**

The draft has:

```css
body {
  position: relative;
  min-height: 100vh;
  overflow-x: clip;
  cursor: none;
  background: /* ... */;
}
```

These body styles should apply only when `.bb-home` is the wrapper. Replace `body {` with `.bb-home {`. Merge with the `.bb-home` block from Step 3 if both exist.

For `body::before` and `body::after` (the grain + vignette overlays), replace `body::before` with `.bb-home::before` and `body::after` with `.bb-home::after`.

- [ ] **Step 5: Replace `* {` with `.bb-home * {`**

The draft has:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
```

Replace with:

```css
.bb-home,
.bb-home * {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
```

This stops the universal reset from leaking to other pages.

- [ ] **Step 6: Find and fix any other unscoped selectors**

Run: `grep -nE "^[a-z]+ ?\{|^@media" apps/bracketbear-website/src/styles/bb-home.css`

Look for any element-only selectors (e.g., `a {`, `button {`, `img {`, `::selection`) and prefix them with `.bb-home `. Example:

- `a { color: inherit; ... }` → `.bb-home a { color: inherit; ... }`
- `::selection { ... }` → `.bb-home ::selection { ... }`
- `@media (hover: none) { body { cursor: auto; } }` → `@media (hover: none) { .bb-home { cursor: auto; } }`

Class-only selectors (e.g., `.hero`, `.offer`, `.btn`) do NOT need `.bb-home` prefix because they're already namespaced enough that they won't conflict with the rest of the site (no other page uses these classes). Verify with: `grep -rE "class=\"(hero|offer|btn--primary|manifesto__lines)" apps/bracketbear-website/src --include="*.astro" --include="*.tsx"`. If there are no hits outside the homepage, leave them unprefixed.

- [ ] **Step 7: Verify no leakage by inspecting the file**

Read the file end-to-end. Confirm:

1. No top-level `:root`, `html`, `body`, or `*` selectors remain.
2. No top-level element selectors (e.g., `a {`, `button {`) remain unscoped.
3. All custom-property declarations are inside `.bb-home`.

- [ ] **Step 8: Commit**

```bash
git add apps/bracketbear-website/src/styles/bb-home.css
git commit -m "feat(homepage): add scoped homepage stylesheet extracted from draft"
```

### Task 1.3: Extract draft JS into a homepage client script

The draft has a `<script>` block starting at line 1904 in `apps/bracketbear-website/public/draft/index.html`. It implements: custom cursor (blob + pixel hand), absorb effect on buttons, ticker animation timing, status bar, font picker (this last one we may drop — see step 4), and the pixi stage canvas (the orange-tinted heartbeat in the hero).

**Files:**

- Create: `apps/bracketbear-website/src/scripts/bb-home.client.ts`

- [ ] **Step 1: Read the script block and copy it**

```bash
sed -n '1904,$p' apps/bracketbear-website/public/draft/index.html | head -1000
```

Use Read tool to view the rest of the script.

- [ ] **Step 2: Create the TS file with the script content**

Paste into `apps/bracketbear-website/src/scripts/bb-home.client.ts`. Strip the `<script>` and `</script>` tags. If the original is plain JS, leave it as JS-style — TypeScript will accept it. Add a single line at the top:

```ts
// Homepage client behavior — cursor, ticker, absorb buttons, pixi stage.
// Lifted verbatim from public/draft/index.html. Do not edit here without
// re-syncing the draft.
```

- [ ] **Step 3: Adjust pixi import**

The draft loads pixi via `<script src="https://cdn.jsdelivr.net/npm/pixi.js@7.4.2/...">`, exposing it as a global `PIXI`. The live site bundles pixi via `@bracketbear/flateralus-pixi-animations`. Choose the simplest path:

Replace any reference to a global `PIXI.Application` (or similar) with an import:

```ts
import * as PIXI from 'pixi.js';
import * as filters from 'pixi-filters';
```

Verify pixi.js and pixi-filters are installed:

```bash
cd apps/bracketbear-website && bun pm ls pixi.js pixi-filters
```

If either is missing, install: `bun add pixi.js@^7 pixi-filters@^5`.

- [ ] **Step 4: Drop the font-picker behavior if present**

The draft includes a font-picker UI for development (lines around 1809–1900 in the HTML). It's a dev tool, not part of the production homepage. If the script has font-picker code, delete those functions. The page's `<aside class="picker" id="picker">` element won't render in the new index.astro, so picker JS is dead code.

- [ ] **Step 5: Commit**

```bash
git add apps/bracketbear-website/src/scripts/bb-home.client.ts
git commit -m "feat(homepage): extract draft JS for cursor/ticker/stage into client script"
```

---

## Phase 2: CMS schema migration

After this phase: the schema matches the new content shape. The build will FAIL until the content document is migrated in Phase 3 — this is intentional (TDD-style).

### Task 2.1: Replace the `bracketbearIndexPage` schema

**Files:**

- Modify: `packages/astro-content/src/collections.ts:126-158`

- [ ] **Step 1: Read the current schema for context**

```bash
sed -n '126,158p' packages/astro-content/src/collections.ts
```

- [ ] **Step 2: Replace the schema with the new shape**

Use Edit tool. Replace the existing `bracketbearIndexPage:` block with:

```ts
  bracketbearIndexPage: {
    base: join(contentPath, 'sites/bracketbear'),
    schema: makePageSchema({
      statusTicker: z.object({
        beats: z.array(z.string()),
      }),
      hero: z.object({
        kicker: z.string(),
        eyebrow: z.string(),
        punchLine1: z.string(),
        punchLine2: z.string(),
        lede: z.string(),
        ctaPrimary: z.object({
          label: z.string(),
          href: z.string(),
        }),
        ctaGhost: z.object({
          label: z.string(),
          href: z.string(),
        }),
      }),
      intro: z.object({
        aside: z.string(),
        leadBlock: z.string(),
        closingLine: z.string(),
      }),
      offerings: z.object({
        eyebrow: z.string(),
        title: z.string(),
        meta: z.string(),
        items: z.array(
          z.object({
            number: z.string(),
            title: z.string(),
            body: z.string(),
            tag: z.string(),
          })
        ),
        platformLayers: z.object({
          eyebrow: z.string(),
          items: z.array(
            z.object({
              title: z.string(),
              body: z.string(),
            })
          ),
        }),
      }),
      receipts: z.object({
        eyebrow: z.string(),
        title: z.string(),
        meta: z.string(),
        pullQuoteStamp: z.string(),
        pullQuoteBody: z.string(),
        demoBody: z.string(),
        demoCtaLabel: z.string(),
        demoCtaHref: z.string(),
        operatorCredit: z.object({
          eyebrow: z.string(),
          body: z.string(),
        }),
        hyperquake: z.object({
          eyebrow: z.string(),
          body: z.string(),
        }),
      }),
      commitments: z.object({
        eyebrow: z.string(),
        title: z.string(),
        meta: z.string(),
        items: z.array(
          z.object({
            tag: z.string(),
            title: z.string(),
            body: z.string(),
          })
        ),
      }),
      manifesto: z.object({
        banner: z.string(),
        lines: z.array(z.string()),
      }),
      closingCta: z.object({
        eyebrow: z.string(),
        title: z.string(),
        body: z.string(),
        contactLines: z.array(z.string()),
        ctaLabel: z.string(),
        ctaHref: z.string(),
        bookendLine1: z.string(),
        bookendLine2: z.string(),
      }),
    }),
    pattern: 'index-page.json',
  },
```

- [ ] **Step 3: Verify the build fails on the existing content**

```bash
cd /Users/harrisoncallahan/Projects/bracketbear/apps/bracketbear-website
bun run build 2>&1 | head -40
```

Expected: a Zod validation error about missing fields (`statusTicker`, `offerings`, `receipts`, etc.) in `index-page.json`. This confirms the schema is enforced.

- [ ] **Step 4: Commit**

```bash
git add packages/astro-content/src/collections.ts
git commit -m "feat(cms): replace bracketbearIndexPage schema for new homepage structure"
```

---

## Phase 3: Content document migration

After this phase: the build passes. Page still renders the old layout, but with new content fields available to it.

### Task 3.1: Replace `index-page.json` with new content

**Files:**

- Modify: `apps/cms/content/sites/bracketbear/index-page.json`

- [ ] **Step 1: Replace the file contents**

Use Write tool. Final content (lifts every line from the spec verbatim):

```json
{
  "title": "Bracket Bear — The Experiential Software Platform Experts",
  "subtitle": "We build the platforms behind experiential work.",
  "metaDescription": "Bracket Bear is the experiential software platform experts. We rebuild the content modeling, integrations, and workflows behind experiential agencies into one platform that actually behaves.",
  "canonicalUrl": "https://bracketbear.com/",
  "ogImage": "bracketbear-hero.jpg",
  "noIndex": false,
  "statusTicker": {
    "beats": [
      "Now booking — summer '26",
      "Platform consultancy + software studio",
      "Welcome to Bracket Bear",
      "Pittsburgh × Portland"
    ]
  },
  "hero": {
    "kicker": "BRACKET BEAR, EST. 2024",
    "eyebrow": "Welcome to",
    "punchLine1": "BRACKET BEAR.",
    "punchLine2": "We are the\nexperiential\nsoftware platform\nexperts.",
    "lede": "Most experiential agencies spend more on integrations and CMS surgery than on the work clients hired them for. We rebuild that layer — **content modeling, integrations, workflows** — as one platform that actually behaves.",
    "ctaPrimary": {
      "label": "Show us your stack",
      "href": "#contact"
    },
    "ctaGhost": {
      "label": "How we work →",
      "href": "#approach"
    }
  },
  "intro": {
    "aside": "Before the deck.",
    "leadBlock": "Too many tools that don't talk to each other. Too much custom integration. Too much budget gone before the real work even starts. That's the **platform tax** most experiential agencies are paying. We come in, look at how work actually moves through your stack, find what's quietly working against you, and rebuild it as one platform — content, integrations, workflows, connected. Leaner, faster, dramatically cheaper to maintain.",
    "closingLine": "We're operators by background — hospitality, physical-space experience — so every system has to earn its place. We polish every rock we touch, from the platform architecture to the invoices we put our name on. **Welcome to Bracket Bear. We build systems for the people building experiences.**"
  },
  "offerings": {
    "eyebrow": "WHAT WE DO",
    "title": "We come in, fix it, stay close.",
    "meta": "Observe. Identify. Streamline.\nDon't disappear.",
    "items": [
      {
        "number": "001",
        "title": "We show you what's fighting you.",
        "body": "We come in, walk your stack, and write up where it's costing you the most. Specific systems, specific dollars, specific moves to make. You get a real read on your platform — the kind that's hard to do from the inside.",
        "tag": "Audit\n/ 1–2 weeks"
      },
      {
        "number": "002",
        "title": "We rebuild it as one platform.",
        "body": "Content modeling, integrations, workflows — the stuff currently held together by five tools and a cron job — collapsed into one platform that actually behaves. Leaner, faster, dramatically cheaper to maintain. Same work, less drag.",
        "tag": "Rebuild\n/ project"
      },
      {
        "number": "003",
        "title": "We stay on the team.",
        "body": "Once the platform is healthy, the job is keeping it that way — extending it, integrating new tools as they come up, shipping new experiential builds on top of it. We join your standup, learn your repo, and stay close. Specialists in real-time graphics, TouchDesigner, and the integrations nobody else wants to touch.",
        "tag": "Embed\n/ retainer"
      }
    ],
    "platformLayers": {
      "eyebrow": "WHAT'S INSIDE THE PLATFORM",
      "items": [
        {
          "title": "Content model + CMS",
          "body": "How agencies actually create and version their work. Sanity, Payload, custom — whatever fits."
        },
        {
          "title": "Integrations + workflows",
          "body": "The middle layer that decides whether things ship or sit. APIs, queues, automations, the boring stuff that makes the rest possible."
        },
        {
          "title": "Real-time + experiential apps",
          "body": "TouchDesigner, kiosk software, native installs. The runtime layer where audiences actually interact."
        }
      ]
    }
  },
  "receipts": {
    "eyebrow": "RECEIPTS",
    "title": "Built before. Shipping now.",
    "meta": "Past tense / present tense.\nBoth ours.",
    "pullQuoteStamp": "If you can't",
    "pullQuoteBody": "generate a CMS with a custom content model and a TouchDesigner app with a single command to an AI agent — we should talk.",
    "demoBody": "Our tooling can. Custom-model CMS and a paired TouchDesigner app, from one prompt to a running project. It's the platform thesis taken to its end — new builds start at the speed of asking.",
    "demoCtaLabel": "See it live →",
    "demoCtaHref": "mailto:hello@bracketbear.com?subject=Demo%20request",
    "operatorCredit": {
      "eyebrow": "WHERE THIS COMES FROM",
      "body": "Our folks have built systems across **Downstream**, **Deeplocal**, and other award-winning experiential agencies — the kind of installations and tools where \"almost working\" doesn't count. That scar tissue comes with us."
    },
    "hyperquake": {
      "eyebrow": "WHO WE'RE BUILDING WITH",
      "body": "We're currently building alongside **Hyperquake** — extending their experiential runtime into the agency-side tooling layer. _(One-liner pending Harrison's confirmation; placeholder per spec §8.5.)_"
    }
  },
  "commitments": {
    "eyebrow": "COMMITMENTS",
    "title": "Three things we keep showing up for.",
    "meta": "Community.\nCollaboration.\nContinuous improvement.",
    "items": [
      {
        "tag": "C / 01",
        "title": "Lifting up the people coming after us.",
        "body": "Somebody made room for us when we needed it. We make room for who's next — apprentices, junior engineers, agency folks learning the platform layer for the first time. That's how we got here. That's how the work keeps getting better."
      },
      {
        "tag": "C / 02",
        "title": "Ride with our partners, not for them.",
        "body": "When an agency hands us work, we don't show up like a vendor running a checklist. We ride with the partner — share credit, share the messy parts, stay close enough that the work feels co-owned. Because it is."
      },
      {
        "tag": "C / 03",
        "title": "Question our own work first.",
        "body": "We're harder on our own systems than anyone else is. The platform we use to run Bracket Bear gets the same scrutiny we put on a client's — invoices, repos, docs, the way we run a meeting. The day that stops, the work stops getting better."
      }
    ]
  },
  "manifesto": {
    "banner": "BRACKET BEAR IS ITSELF AN EXPERIENCE.",
    "lines": [
      "The platform we ship.",
      "The invoice we send.",
      "The repo we hand off.",
      "The way we run a meeting.",
      "All of it built to one standard."
    ]
  },
  "closingCta": {
    "eyebrow": "START",
    "title": "Show us where the work is getting stuck.",
    "body": "Email us, write us a note, send a Loom — whatever's easiest. We'll come look.",
    "contactLines": [
      "◆ <a href=\"mailto:hello@bracketbear.com\">hello@bracketbear.com</a>",
      "◆ Pittsburgh × Portland",
      "◆ Booking summer '26"
    ],
    "ctaLabel": "Open the door",
    "ctaHref": "mailto:hello@bracketbear.com",
    "bookendLine1": "Welcome to Bracket Bear.",
    "bookendLine2": "We're happy you're here."
  }
}
```

- [ ] **Step 2: Verify the build passes**

```bash
cd /Users/harrisoncallahan/Projects/bracketbear/apps/bracketbear-website
bun run build 2>&1 | tail -30
```

Expected: build succeeds. (The page will still render the OLD layout because index.astro hasn't been rebuilt yet — it'll likely throw at runtime because `pageData.hero.tagline` no longer exists. That's acceptable; we move to Phase 4 next.)

- [ ] **Step 3: Commit**

```bash
git add apps/cms/content/sites/bracketbear/index-page.json
git commit -m "feat(cms): migrate homepage content to new schema"
```

---

## Phase 4: Page rebuild

This is the largest phase. Each task creates one section component and ends with a working `bun run dev` check.

### Task 4.1: Add `homeBodyClass` support to HomeLayout

The homepage needs a `.bb-home` wrapper class for CSS scoping. We add the wrapper as an opt-in prop on HomeLayout so other pages aren't affected.

**Files:**

- Modify: `apps/bracketbear-website/src/layouts/HomeLayout.astro`

- [ ] **Step 1: Read current state**

```bash
cat apps/bracketbear-website/src/layouts/HomeLayout.astro
```

- [ ] **Step 2: Apply the wrapper**

Replace the contents of HomeLayout.astro with:

```astro
---
import { LayeredLayout, NavBar } from '@bracketbear/core';
import { navigationConfig } from '@/config/navigation';
import '@/styles/global.css';

interface Props {
  title?: string;
  hideContactForm?: boolean;
  hideFooter?: boolean;
  hideNavigation?: boolean;
  breadcrumbs?: any;
  metaDescription?: string;
  currentPage?: string;
  homeBodyClass?: string;
}

const {
  title,
  hideContactForm,
  hideFooter,
  hideNavigation,
  breadcrumbs,
  metaDescription,
  currentPage,
  homeBodyClass,
} = Astro.props;
---

<LayeredLayout
  title={title}
  hideContactForm={hideContactForm}
  hideFooter={hideFooter}
  hideNavigation={true}
  navigation={{
    ...navigationConfig,
    currentPage,
  }}
  breadcrumbs={breadcrumbs}
  metaDescription={metaDescription}
  class="bg-background text-foreground"
>
  {
    !hideNavigation && (
      <NavBar
        config={{
          ...navigationConfig,
          currentPage,
        }}
        variant="glass"
      />
    )
  }

  <div class={`min-h-screen ${homeBodyClass ?? ''}`}>
    <slot />
  </div>
</LayeredLayout>
```

The two adjustments: pass `hideNavigation` through, and apply optional `homeBodyClass`. The homepage will pass `homeBodyClass="bb-home"` and likely `hideNavigation={true}` (the homepage has its own nav per the draft) and `hideContactForm={true}` and `hideFooter={true}` (the homepage has its own footer + closing CTA).

- [ ] **Step 3: Commit**

```bash
git add apps/bracketbear-website/src/layouts/HomeLayout.astro
git commit -m "feat(homepage): add optional homeBodyClass + hideNavigation passthrough"
```

### Task 4.2: Build the StatusTicker component

**Files:**

- Create: `apps/bracketbear-website/src/components/home/StatusTicker.astro`

- [ ] **Step 1: Create the component**

```astro
---
interface Props {
  beats: string[];
}
const { beats } = Astro.props;
// Duplicate beats for the seamless scroll the draft uses
const ticker = [...beats, ...beats];
---

<div class="status" aria-hidden="true">
  <div class="status__row container">
    <span class="status__live">News Feed</span>
    <div class="ticker">
      <div class="ticker__track">
        {ticker.map((beat) => <span>{beat}</span>)}
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add apps/bracketbear-website/src/components/home/StatusTicker.astro
git commit -m "feat(homepage): add StatusTicker component"
```

### Task 4.3: Build the Hero component

The hero uses the draft's `.hero`, `.hero__inner`, `.hero__kicker`, `.hero__title`, `.hero__eyebrow.highlight`, `.hero__punch`, `.hero__lede`, `.hero__cta` structure plus a stage canvas. The two-deck headline uses `.hero__eyebrow` for "Welcome to" and `.hero__punch` for "BRACKET BEAR." with a smaller second deck for the positioning line.

**Files:**

- Create: `apps/bracketbear-website/src/components/home/Hero.astro`

- [ ] **Step 1: Read the draft's hero markup for reference**

```bash
sed -n '1499,1552p' apps/bracketbear-website/public/draft/index.html
```

- [ ] **Step 2: Create the component**

```astro
---
import { marked } from 'marked';

interface Props {
  kicker: string;
  eyebrow: string;
  punchLine1: string;
  punchLine2: string; // newline-separated lines
  lede: string; // markdown allowed for **bold**
  ctaPrimary: { label: string; href: string };
  ctaGhost: { label: string; href: string };
}

const { kicker, eyebrow, punchLine1, punchLine2, lede, ctaPrimary, ctaGhost } =
  Astro.props;

const punchLine2Lines = punchLine2.split('\n');
const ledeHtml = marked.parseInline(lede);
---

<section class="hero">
  <div class="hero__inner container">
    <div>
      <div class="hero__kicker reveal">
        <span class="label">{kicker}</span>
      </div>

      <h1 class="head hero__title reveal reveal--up-1">
        <span class="hero__eyebrow highlight">{eyebrow}</span>
        <span class="hero__punch">{punchLine1}</span>
        <span class="hero__punch hero__punch--sub">
          {
            punchLine2Lines.map((line, i) => (
              <>
                {line}
                {i < punchLine2Lines.length - 1 && <br />}
              </>
            ))
          }
        </span>
      </h1>

      <p class="hero__lede reveal reveal--up-2" set:html={ledeHtml} />

      <div class="hero__cta reveal reveal--up-3">
        <a href={ctaPrimary.href} class="btn btn--primary" data-hot>
          <span>{ctaPrimary.label}</span>
        </a>
        <a href={ctaGhost.href} class="btn btn--ghost" data-hot>
          <span>{ctaGhost.label}</span>
        </a>
      </div>
    </div>

    <div class="stage reveal reveal--up-2" aria-hidden="true">
      <div class="stage__field"><canvas id="stage"></canvas></div>
      <div class="stage__crosshair stage__crosshair--tl">
        <span>SIG / 01</span>
        BB·STAGE
      </div>
      <div class="stage__crosshair stage__crosshair--tr">
        <span>0xFF5F1F</span>
        ORANGE / SIGNAL
      </div>
      <div class="stage__crosshair stage__crosshair--bl">
        FEED · LIVE<br />
        <span id="stageHr">SIGNAL · NOMINAL</span>
      </div>
      <div class="stage__crosshair stage__crosshair--br">
        <span>PORTAL · MASKED</span>
        FLATERALUS / PIXI
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Add a CSS rule for `.hero__punch--sub` in `bb-home.css`**

The two-deck headline needs the second deck rendered smaller. After the existing `.hero__punch { ... }` block, add:

```css
.bb-home .hero__punch--sub {
  font-size: 0.42em; /* ~37% of the main punch, per spec hierarchy */
  line-height: 0.95;
  display: block;
  margin-top: 0.6em;
  letter-spacing: -0.005em;
}
```

(Adjust to taste during the QA pass — Harrison may tweak.)

- [ ] **Step 4: Commit**

```bash
git add apps/bracketbear-website/src/components/home/Hero.astro apps/bracketbear-website/src/styles/bb-home.css
git commit -m "feat(homepage): add Hero component with two-deck headline"
```

### Task 4.4: Build the Intro component

**Files:**

- Create: `apps/bracketbear-website/src/components/home/Intro.astro`

- [ ] **Step 1: Create the component**

```astro
---
import { marked } from 'marked';

interface Props {
  aside: string;
  leadBlock: string;
  closingLine: string;
}

const { aside, leadBlock, closingLine } = Astro.props;

// Both leadBlock and closingLine support inline markdown for **bold**
const leadBlockHtml = marked.parseInline(leadBlock);
const closingLineHtml = marked.parseInline(closingLine);
---

<section class="intro" id="approach">
  <div class="intro__grid container">
    <aside class="marg reveal">
      <p>{aside}</p>
    </aside>

    <div>
      <p class="intro__quote reveal reveal--up-1" set:html={leadBlockHtml} />
      <p class="intro__sig reveal reveal--up-2" set:html={closingLineHtml} />
    </div>
  </div>
</section>
```

- [ ] **Step 2: Commit**

```bash
git add apps/bracketbear-website/src/components/home/Intro.astro
git commit -m "feat(homepage): add Intro component"
```

### Task 4.5: Build the Offerings component

Three offering cards plus a sub-strip beneath them for platform layers. The sub-strip uses new classes (`.layers`, `.layer`) defined inline below.

**Files:**

- Create: `apps/bracketbear-website/src/components/home/Offerings.astro`
- Modify: `apps/bracketbear-website/src/styles/bb-home.css`

- [ ] **Step 1: Create the component**

```astro
---
import { marked } from 'marked';

interface OfferingItem {
  number: string;
  title: string;
  body: string;
  tag: string; // newline-separated lines
}

interface PlatformLayer {
  title: string;
  body: string;
}

interface Props {
  eyebrow: string;
  title: string;
  meta: string; // newline-separated lines
  items: OfferingItem[];
  platformLayers: {
    eyebrow: string;
    items: PlatformLayer[];
  };
}

const { eyebrow, title, meta, items, platformLayers } = Astro.props;
const metaLines = meta.split('\n');
---

<section class="sec sec--orange" id="work">
  <div class="container">
    <header class="sec__head reveal">
      <div>
        <p class="sec__num">{eyebrow}</p>
        <h2 class="sec__title">{title}</h2>
      </div>
      <div class="sec__meta">
        {
          metaLines.map((line, i) => (
            <>
              {line}
              {i < metaLines.length - 1 && <br />}
            </>
          ))
        }
      </div>
    </header>
  </div>

  <div class="container">
    <div class="offers" role="list">
      {
        items.map((item) => {
          const tagLines = item.tag.split('\n');
          const bodyHtml = marked.parseInline(item.body);
          return (
            <article class="offer reveal" role="listitem" data-hot>
              <span class="offer__num">{item.number}</span>
              <h3 class="offer__title">{item.title}</h3>
              <p class="offer__body" set:html={bodyHtml} />
              <span class="offer__tag">
                {tagLines.map((line, i) => (
                  <>
                    {line}
                    {i < tagLines.length - 1 && <br />}
                  </>
                ))}
              </span>
              <span class="offer__arrow">↗</span>
            </article>
          );
        })
      }
    </div>
  </div>

  <div class="container">
    <div class="layers" role="list">
      <p class="label layers__eyebrow">{platformLayers.eyebrow}</p>
      <div class="layers__grid">
        {
          platformLayers.items.map((layer) => (
            <div class="layer" role="listitem">
              <h4 class="layer__title">{layer.title}</h4>
              <p class="layer__body">{layer.body}</p>
            </div>
          ))
        }
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add layer styles to `bb-home.css`**

Append to the file (the `.bb-home` namespace is implicit because all class selectors are page-scoped):

```css
.bb-home .layers {
  margin-top: 4rem;
  padding-block: 2.5rem;
  border-top: 1px solid color-mix(in srgb, var(--ink) 25%, transparent);
}
.bb-home .layers__eyebrow {
  margin-bottom: 1.6rem;
}
.bb-home .layers__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}
@media (max-width: 900px) {
  .bb-home .layers__grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}
.bb-home .layer__title {
  font-family: var(--display);
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: -0.005em;
  font-size: 1.4rem;
  line-height: 1;
  margin-bottom: 0.6rem;
  color: var(--ink);
}
.bb-home .layer__body {
  font-size: 0.95rem;
  line-height: 1.45;
  color: var(--ink-soft);
  max-width: 32ch;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/bracketbear-website/src/components/home/Offerings.astro apps/bracketbear-website/src/styles/bb-home.css
git commit -m "feat(homepage): add Offerings component with platform-layers sub-strip"
```

### Task 4.6: Build the Receipts component

A new section. Pull quote (uses `.head` global class + `.highlight` stamp), demo block, operator credit, Hyperquake. We add minimal new styles for the receipts layout.

**Files:**

- Create: `apps/bracketbear-website/src/components/home/Receipts.astro`
- Modify: `apps/bracketbear-website/src/styles/bb-home.css`

- [ ] **Step 1: Create the component**

```astro
---
import { marked } from 'marked';

interface Props {
  eyebrow: string;
  title: string;
  meta: string;
  pullQuoteStamp: string;
  pullQuoteBody: string;
  demoBody: string;
  demoCtaLabel: string;
  demoCtaHref: string;
  operatorCredit: { eyebrow: string; body: string };
  hyperquake: { eyebrow: string; body: string };
}

const {
  eyebrow,
  title,
  meta,
  pullQuoteStamp,
  pullQuoteBody,
  demoBody,
  demoCtaLabel,
  demoCtaHref,
  operatorCredit,
  hyperquake,
} = Astro.props;

const metaLines = meta.split('\n');
const operatorBodyHtml = marked.parseInline(operatorCredit.body);
const hyperquakeBodyHtml = marked.parseInline(hyperquake.body);
---

<section class="sec sec--receipts" id="receipts">
  <div class="container">
    <header class="sec__head reveal">
      <div>
        <p class="sec__num">{eyebrow}</p>
        <h2 class="sec__title">{title}</h2>
      </div>
      <div class="sec__meta">
        {
          metaLines.map((line, i) => (
            <>
              {line}
              {i < metaLines.length - 1 && <br />}
            </>
          ))
        }
      </div>
    </header>

    <div class="receipts__quote reveal reveal--up-1">
      <p class="head receipts__pull">
        <span class="highlight">{pullQuoteStamp}</span>
        {pullQuoteBody}
      </p>
    </div>

    <div class="receipts__demo reveal reveal--up-2">
      <p class="receipts__demo-body">{demoBody}</p>
      <a href={demoCtaHref} class="btn btn--primary" data-hot>
        <span>{demoCtaLabel}</span>
      </a>
    </div>

    <div class="receipts__credit-grid">
      <div class="receipts__credit reveal">
        <p class="label">{operatorCredit.eyebrow}</p>
        <p class="receipts__credit-body" set:html={operatorBodyHtml} />
      </div>

      <div class="receipts__credit reveal reveal--up-1">
        <p class="label">{hyperquake.eyebrow}</p>
        <p class="receipts__credit-body" set:html={hyperquakeBodyHtml} />
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add receipts styles to `bb-home.css`**

Append:

```css
.bb-home .sec--receipts {
  padding-block: 5rem 6rem;
  background: var(--orange);
  position: relative;
}
.bb-home .receipts__quote {
  margin-top: 3rem;
  margin-bottom: 3rem;
}
.bb-home .receipts__pull {
  font-size: clamp(2rem, 4.5vw, 3.5rem);
  line-height: 1.05;
  letter-spacing: -0.005em;
  max-width: 28ch;
}
.bb-home .receipts__demo {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2rem;
  align-items: center;
  padding-block: 2rem;
  border-top: 1px solid color-mix(in srgb, var(--ink) 25%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--ink) 25%, transparent);
  margin-bottom: 3rem;
}
.bb-home .receipts__demo-body {
  font-size: 1.1rem;
  line-height: 1.45;
  max-width: 56ch;
}
@media (max-width: 700px) {
  .bb-home .receipts__demo {
    grid-template-columns: 1fr;
  }
}
.bb-home .receipts__credit-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
}
@media (max-width: 700px) {
  .bb-home .receipts__credit-grid {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
}
.bb-home .receipts__credit p.label {
  margin-bottom: 1rem;
}
.bb-home .receipts__credit-body {
  font-size: 1rem;
  line-height: 1.55;
  color: var(--ink-soft);
}
.bb-home .receipts__credit-body strong {
  color: var(--ink);
  font-weight: 800;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/bracketbear-website/src/components/home/Receipts.astro apps/bracketbear-website/src/styles/bb-home.css
git commit -m "feat(homepage): add Receipts component (pull quote, demo, credits)"
```

### Task 4.7: Build the ThreeCs component

Three commitment cards. Same `.value` card pattern as the existing draft, just three items instead of four. Drop the 2x2 grid in favor of a 3-up.

**Files:**

- Create: `apps/bracketbear-website/src/components/home/ThreeCs.astro`
- Modify: `apps/bracketbear-website/src/styles/bb-home.css`

- [ ] **Step 1: Create the component**

```astro
---
interface CommitmentItem {
  tag: string;
  title: string;
  body: string;
}

interface Props {
  eyebrow: string;
  title: string;
  meta: string;
  items: CommitmentItem[];
}

const { eyebrow, title, meta, items } = Astro.props;
const metaLines = meta.split('\n');
---

<section class="sec sec--bright" id="values">
  <div class="container">
    <header class="sec__head reveal">
      <div>
        <p class="sec__num">{eyebrow}</p>
        <h2 class="sec__title">{title}</h2>
      </div>
      <div class="sec__meta">
        {
          metaLines.map((line, i) => (
            <>
              {line}
              {i < metaLines.length - 1 && <br />}
            </>
          ))
        }
      </div>
    </header>

    <div class="values values--three">
      {
        items.map((item, i) => (
          <article class={`value reveal ${i % 2 === 1 ? 'reveal--up-1' : ''}`}>
            <p class="value__tag">{item.tag}</p>
            <h3 class="value__title">{item.title}</h3>
            <p class="value__body">{item.body}</p>
          </article>
        ))
      }
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add the 3-up grid override**

Append to `bb-home.css`:

```css
.bb-home .values--three {
  grid-template-columns: repeat(3, 1fr);
}
@media (max-width: 900px) {
  .bb-home .values--three {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/bracketbear-website/src/components/home/ThreeCs.astro apps/bracketbear-website/src/styles/bb-home.css
git commit -m "feat(homepage): add ThreeCs commitments component"
```

### Task 4.8: Build the Manifesto component

Per spec §10: drop the strike-through pattern. Use the banner label + `.manifesto__lines` display treatment.

**Files:**

- Create: `apps/bracketbear-website/src/components/home/Manifesto.astro`

- [ ] **Step 1: Create the component**

```astro
---
interface Props {
  banner: string;
  lines: string[];
}

const { banner, lines } = Astro.props;
---

<section class="manifesto" id="about" data-cursor-light>
  <div class="manifesto__decor" aria-hidden="true">
    <svg viewBox="0 0 400.89 249.73" preserveAspectRatio="xMaxYMid meet">
      <use href="#bb-logo"></use>
    </svg>
  </div>
  <div class="manifesto__inner reveal container">
    <p
      class="label"
      style="color: var(--orange-bright); margin-bottom: 2.5rem; font-weight: 700;"
    >
      {banner}
    </p>
    <div class="manifesto__lines">
      {lines.map((line) => <p>{line}</p>)}
    </div>
  </div>
</section>
```

Note: the `<use href="#bb-logo" />` references the inline SVG symbol in the page body; the symbol declaration is added in `index.astro` (Task 4.10).

- [ ] **Step 2: Commit**

```bash
git add apps/bracketbear-website/src/components/home/Manifesto.astro
git commit -m "feat(homepage): add Manifesto component"
```

### Task 4.9: Build the ClosingCTA component

Two-column existing draft layout, plus the new welcome bookend below.

**Files:**

- Create: `apps/bracketbear-website/src/components/home/ClosingCTA.astro`
- Modify: `apps/bracketbear-website/src/styles/bb-home.css`

- [ ] **Step 1: Create the component**

```astro
---
import { marked } from 'marked';

interface Props {
  eyebrow: string;
  title: string;
  body: string;
  contactLines: string[];
  ctaLabel: string;
  ctaHref: string;
  bookendLine1: string;
  bookendLine2: string;
}

const {
  eyebrow,
  title,
  body,
  contactLines,
  ctaLabel,
  ctaHref,
  bookendLine1,
  bookendLine2,
} = Astro.props;
---

<section class="cta" id="contact">
  <div class="cta__grid container">
    <div class="reveal">
      <p class="sec__num" style="margin-bottom: 2rem;">{eyebrow}</p>
      <h2 class="cta__title">{title}</h2>
    </div>
    <div class="cta__contact reveal reveal--up-1">
      <p>{body}</p>
      <p style="margin-top: 1.5rem;">
        {
          contactLines.map((line, i) => (
            <Fragment>
              <Fragment set:html={line} />
              {i < contactLines.length - 1 && <br />}
            </Fragment>
          ))
        }
      </p>
      <p style="margin-top: 2rem;">
        <a href={ctaHref} class="btn btn--primary" data-hot>
          <span>{ctaLabel}</span>
        </a>
      </p>
    </div>
  </div>

  <div class="cta__bookend reveal reveal--up-2 container">
    <p class="head cta__bookend-line">{bookendLine1}</p>
    <p class="head cta__bookend-line cta__bookend-line--sub">{bookendLine2}</p>
  </div>
</section>
```

- [ ] **Step 2: Add bookend styles**

Append to `bb-home.css`:

```css
.bb-home .cta__bookend {
  margin-top: 6rem;
  padding-block: 5rem;
  text-align: center;
  border-top: 1px solid color-mix(in srgb, var(--ink) 25%, transparent);
}
.bb-home .cta__bookend-line {
  font-size: clamp(2rem, 5vw, 4.2rem);
  line-height: 1;
  letter-spacing: -0.005em;
}
.bb-home .cta__bookend-line--sub {
  font-size: clamp(1.2rem, 2.4vw, 1.8rem);
  margin-top: 0.6em;
  color: var(--ink-soft);
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/bracketbear-website/src/components/home/ClosingCTA.astro apps/bracketbear-website/src/styles/bb-home.css
git commit -m "feat(homepage): add ClosingCTA component with welcome bookend"
```

### Task 4.10: Rewrite `index.astro`

Wire all components together. Mirror the draft's body structure: SVG logo symbol, cursor placeholders, nav, status bar, hero, intro, offerings, receipts, three Cs, manifesto, closing CTA.

**Files:**

- Modify: `apps/bracketbear-website/src/pages/index.astro`

- [ ] **Step 1: Replace the file contents**

```astro
---
import HomeLayout from '@/layouts/HomeLayout.astro';
import StatusTicker from '@/components/home/StatusTicker.astro';
import Hero from '@/components/home/Hero.astro';
import Intro from '@/components/home/Intro.astro';
import Offerings from '@/components/home/Offerings.astro';
import Receipts from '@/components/home/Receipts.astro';
import ThreeCs from '@/components/home/ThreeCs.astro';
import Manifesto from '@/components/home/Manifesto.astro';
import ClosingCTA from '@/components/home/ClosingCTA.astro';
import { getCollection } from 'astro:content';
import '@/styles/bb-home.css';

const indexPageData = await getCollection('bracketbearIndexPage');
const pageData = indexPageData[0]?.data;

if (!pageData) {
  throw new Error('Homepage content not found');
}
---

<HomeLayout
  title={pageData.title}
  metaDescription={pageData.metaDescription || pageData.subtitle}
  currentPage="home"
  hideContactForm={true}
  hideFooter={true}
  hideNavigation={true}
  homeBodyClass="bb-home"
>
  <!-- Bracket Bear logo as reusable symbol -->
  <svg width="0" height="0" style="position: absolute" aria-hidden="true">
    <symbol id="bb-logo" viewBox="0 0 400.89 249.73">
      <path
        fill="currentColor"
        d="m69.98,172.24v-94.76c0-4.14,3.36-7.5,7.5-7.5h15.14c1.66,0,3-1.34,3-3V3C95.62,1.34,94.28,0,92.62,0H15C6.72,0,0,6.72,0,15v219.73c0,8.28,6.72,15,15,15h77.62c1.66,0,3-1.34,3-3v-63.99c0-1.66-1.34-3-3-3h-15.14c-4.14,0-7.5-3.36-7.5-7.5Z"
      ></path>
      <path
        fill="currentColor"
        fill-rule="evenodd"
        d="m174.98,117.27c12.14,16.38,20.1,28.95,19.83,56.54-.73,66.7-62.49,74.8-77.35,75.78-1.73.11-3.19-1.26-3.19-2.99v-84.29c0-1.66-1.34-3-3-3h-19.68c-1.66,0-3-1.34-3-3v-64.05c0-1.66,1.34-3,3-3h19.68c1.66,0,3-1.34,3-3V3.05c0-1.72,1.44-3.08,3.16-3,12.12.59,55.68,6.48,69.61,59.96,7.61,29.23-3.42,50.36-12.06,57.26"
      ></path>
      <path
        fill="currentColor"
        d="m323.41,179.74h-15.14c-1.66,0-3,1.34-3,3v63.99c0,1.66,1.34,3,3,3h77.62c8.28,0,15-6.72,15-15V15C400.89,6.72,394.18,0,385.89,0h-77.62c-1.66,0-3,1.34-3,3v63.99c0,1.66,1.34,3,3,3h15.14c4.14,0,7.5,3.36,7.5,7.5v94.76c0,4.14-3.36,7.5-7.5,7.5Z"
      ></path>
      <path
        fill="currentColor"
        fill-rule="evenodd"
        d="m225.92,117.28c-8.64-6.9-19.67-28.03-12.06-57.26C227.79,6.53,271.35.64,283.47.05c1.72-.08,3.16,1.28,3.16,3v83.21c0,1.66,1.34,3,3,3h19.68c1.66,0,3,1.34,3,3v64.05c0,1.66-1.34,3-3,3h-19.68c-1.66,0-3,1.34-3,3v84.29c0,1.73-1.46,3.11-3.19,2.99-14.86-.98-76.62-9.08-77.35-75.78-.27-27.6,7.69-40.17,19.83-56.54"
      ></path>
    </symbol>
  </svg>

  <!-- Cursor placeholders (driven by bb-home.client.ts) -->
  <div class="cursor" id="cursor" aria-hidden="true"></div>
  <div class="cursor-hand" id="cursorHand" aria-hidden="true">
    <div class="cursor-hand__inner">
      <!-- pixel-hand SVG copied from draft -->
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 13 14"
        shape-rendering="crispEdges"
      >
        <!-- (paste the white + black <rect> elements verbatim from draft lines 1422–1454) -->
      </svg>
    </div>
  </div>

  <!-- Homepage-specific nav (matches draft) -->
  <nav class="nav" aria-label="Primary">
    <div class="nav__inner container">
      <a href="#" class="wordmark" data-hot>
        <span class="wordmark__mark" aria-hidden="true">
          <svg><use href="#bb-logo"></use></svg>
        </span>
        <span>BRACKET&nbsp;BEAR</span>
      </a>
      <div class="nav__links">
        <a href="#work" data-hot>Work</a>
        <a href="#approach" data-hot>Approach</a>
        <a href="#values" data-hot>Values</a>
        <a href="#about" data-hot>About</a>
      </div>
      <a href="#contact" class="pill" data-hot>
        <span class="pill__dot" aria-hidden="true"></span>
        <span>Start a project</span>
      </a>
    </div>
  </nav>

  <StatusTicker beats={pageData.statusTicker.beats} />

  <Hero
    kicker={pageData.hero.kicker}
    eyebrow={pageData.hero.eyebrow}
    punchLine1={pageData.hero.punchLine1}
    punchLine2={pageData.hero.punchLine2}
    lede={pageData.hero.lede}
    ctaPrimary={pageData.hero.ctaPrimary}
    ctaGhost={pageData.hero.ctaGhost}
  />

  <Intro
    aside={pageData.intro.aside}
    leadBlock={pageData.intro.leadBlock}
    closingLine={pageData.intro.closingLine}
  />

  <Offerings
    eyebrow={pageData.offerings.eyebrow}
    title={pageData.offerings.title}
    meta={pageData.offerings.meta}
    items={pageData.offerings.items}
    platformLayers={pageData.offerings.platformLayers}
  />

  <Receipts {...pageData.receipts} />

  <ThreeCs
    eyebrow={pageData.commitments.eyebrow}
    title={pageData.commitments.title}
    meta={pageData.commitments.meta}
    items={pageData.commitments.items}
  />

  <Manifesto
    banner={pageData.manifesto.banner}
    lines={pageData.manifesto.lines}
  />

  <ClosingCTA {...pageData.closingCta} />
</HomeLayout>

<script>
  import '@/scripts/bb-home.client';
</script>
```

- [ ] **Step 2: Paste the pixel-hand SVG content**

Replace the comment `<!-- (paste the white + black <rect> elements verbatim from draft lines 1422–1454) -->` with the actual SVG `<rect>` elements from `apps/bracketbear-website/public/draft/index.html` lines 1422–1454.

- [ ] **Step 3: Run dev server and check homepage**

```bash
cd apps/bracketbear-website && bun run dev
```

Expected:

- Page loads at http://localhost:4321/ (or whatever port).
- All sections render in order.
- Custom cursor appears, pixi stage canvas appears in hero, ticker scrolls, absorb effect on buttons works.
- Other pages (/about, /services, /contact) load normally without homepage CSS leaking.

- [ ] **Step 4: Commit**

```bash
git add apps/bracketbear-website/src/pages/index.astro
git commit -m "feat(homepage): rewrite index.astro using new section components"
```

---

## Phase 5: Footer + nav config update

The shared Footer.astro at `packages/core/src/astro/components/Footer.astro` reads from a navigation/site config object. The bracketbear-specific footer copy (currently "Pittsburgh, PA," wordmark sub-line) lives somewhere in the bracketbear app config. We discover where, then update.

**NOTE:** The homepage hides the shared footer (Task 4.10 sets `hideFooter={true}`). This phase is for the OTHER pages (/about, /services, /contact) that still use the shared Footer. Even though the homepage doesn't show it, the footer lines need to be correct for the rest of the site.

### Task 5.1: Locate the bracketbear footer copy source

**Files:**

- Discovery only — no edits in this step.

- [ ] **Step 1: Search for "Pittsburgh, PA" across the bracketbear app**

```bash
grep -rn "Pittsburgh" apps/bracketbear-website/src/ packages/core/src/ 2>/dev/null
```

- [ ] **Step 2: Search for the footer wordmark tagline**

```bash
grep -rn "Studio for software with a pulse\|hospitality\|Built by people" apps/bracketbear-website/src/ packages/core/src/ 2>/dev/null
```

- [ ] **Step 3: Search the navigation config**

```bash
cat apps/bracketbear-website/src/config/navigation.ts
```

- [ ] **Step 4: Note the file paths and line numbers found**

Record where each piece of footer copy lives (likely `apps/bracketbear-website/src/config/navigation.ts` or a related siteConfig file). If the copy is hardcoded inside `packages/core/src/astro/components/Footer.astro`, the right move is to make it config-driven, not edit core.

### Task 5.2: Update the geography line

**Files:**

- Modify: discovered file (likely `apps/bracketbear-website/src/config/navigation.ts`)

- [ ] **Step 1: Edit the geography string**

Find `Pittsburgh, PA` (or `Pittsburgh,&nbsp;PA` etc.) and replace with `Pittsburgh × Portland`.

- [ ] **Step 2: Verify on /about or /contact**

Run `bun run dev`, visit /about or /contact, scroll to footer. Confirm "Pittsburgh × Portland" appears.

- [ ] **Step 3: Commit**

```bash
git add <file-discovered-in-Task-5.1>
git commit -m "feat(footer): update geography to Pittsburgh × Portland"
```

### Task 5.3: Update the wordmark tagline

**Files:**

- Modify: discovered file (same area as Task 5.2 most likely)

- [ ] **Step 1: Edit the tagline**

Find the existing tagline (`Studio for software with a pulse. Built by people who've shipped the hard stuff.` or similar) and replace with:

> Built like systems engineers. Used like the people we build for.

- [ ] **Step 2: Verify on /about or /contact**

Confirm the new tagline shows up under the footer wordmark.

- [ ] **Step 3: Commit**

```bash
git add <file-discovered-in-Task-5.1>
git commit -m "feat(footer): update wordmark tagline"
```

---

## Phase 6: QA pass

After this phase: the homepage is verified end-to-end, ready to merge.

### Task 6.1: Build the site

- [ ] **Step 1: Production build**

```bash
cd /Users/harrisoncallahan/Projects/bracketbear/apps/bracketbear-website
bun run build 2>&1 | tee /tmp/bb-build.log
```

Expected: build succeeds with no Zod errors and no TS errors.

- [ ] **Step 2: Preview**

```bash
bun run preview
```

Visit http://localhost:4321/ in a browser.

### Task 6.2: Visual checks (golden path)

Run through the following checklist with the live preview open. Any failures → file a follow-up task and document with a note in this plan, do not merge.

- [ ] **Hero**
  - Status ticker scrolls smoothly with the four beats from the spec (§4 in spec).
  - Two-deck headline: "Welcome to" stamp on first line, "BRACKET BEAR." underneath, "We are the experiential software platform experts." in the second deck (smaller).
  - Lede paragraph displays with bold on `content modeling, integrations, workflows`.
  - Both CTAs render: "Show us your stack" (primary) and "How we work →" (ghost).
  - Pixi stage canvas appears on the right with the four crosshair labels.
  - Custom blob cursor follows the mouse; pixel hand appears over interactive elements.

- [ ] **Intro**
  - Margin aside reads "Before the deck."
  - Lead block reads with the LinkedIn-cadence opener and bold on `platform tax`.
  - Closing line bolds the welcome bookend.

- [ ] **Offerings**
  - Three cards: 001 Audit / 002 Rebuild / 003 Run with you, with the spec's titles and bodies.
  - Sub-strip beneath the cards: "WHAT'S INSIDE THE PLATFORM" eyebrow + three layers (Content model + CMS / Integrations + workflows / Real-time + experiential apps).

- [ ] **Receipts**
  - Eyebrow `RECEIPTS`, title "Built before. Shipping now."
  - Pull quote with `If you can't` stamped, rest of LinkedIn line continues.
  - Demo block: "Our tooling can…" + `See it live →` button (linked to mailto:hello@bracketbear.com?subject=Demo%20request).
  - Operator credit eyebrow `WHERE THIS COMES FROM` with Downstream + Deeplocal bolded.
  - Hyperquake block eyebrow `WHO WE'RE BUILDING WITH` with placeholder body (note the italic placeholder marker — Harrison to confirm before publish).

- [ ] **Three Cs**
  - Title "Three things we keep showing up for." + meta listing the three Cs.
  - Three cards: C / 01 Community, C / 02 Collaboration, C / 03 Continuous improvement, all matching spec copy.

- [ ] **Manifesto**
  - Banner: `BRACKET BEAR IS ITSELF AN EXPERIENCE.`
  - Five lines stacked. No strikethroughs. Confirm the bb-logo decor renders behind the lines.

- [ ] **Closing CTA**
  - Eyebrow `START`, title "Show us where the work is getting stuck."
  - Right column: body, three contact lines (with `Pittsburgh × Portland`), `Open the door` button.
  - Welcome bookend below: "Welcome to Bracket Bear." + "We're happy you're here." in display type.

### Task 6.3: Responsive check

- [ ] **Step 1: Mobile view (375px)**

Resize browser to 375px width or use DevTools mobile emulation. Confirm:

- Hero stacks vertically (text above stage).
- Offerings cards stack to one column.
- Platform-layers strip stacks to one column.
- Receipts credit grid stacks.
- Three Cs cards stack.
- Closing CTA stacks.
- Status ticker remains scrollable.

- [ ] **Step 2: Tablet view (768px)**

Confirm sensible mid-breakpoint layout — should mostly look like desktop with slight scaling.

### Task 6.4: Cross-page CSS leak check

- [ ] **Step 1: Visit /about, /services, /contact in the preview**

Confirm:

- No orange page background.
- Default cursor (not the custom blob).
- No grain overlay.
- Existing site design intact.

If anything from `bb-home.css` is leaking, return to Task 1.2 step 6 and re-prefix.

### Task 6.5: Final commit + open items doc

- [ ] **Step 1: Confirm git status is clean**

```bash
git -C /Users/harrisoncallahan/Projects/bracketbear status
```

Should show `nothing to commit, working tree clean` (assuming all per-task commits were made).

- [ ] **Step 2: Update spec open items**

In `docs/superpowers/specs/2026-05-03-bracketbear-website-content-design.md` §14, mark progress on open items:

- Hyperquake one-liner: still pending Harrison.
- AI-agent demo video: still pending recording.

(Both remain non-blocking for ship-readiness — page works without them. Merge can proceed.)

---

## Self-review notes

Spec coverage check:

- §4 Status ticker → Task 4.2 (StatusTicker component) + Task 3.1 (content)
- §5 Hero → Task 4.3 (Hero component) + Task 3.1 (content)
- §6 Intro → Task 4.4 (Intro component) + Task 3.1 (content)
- §7 Offerings + sub-strip → Task 4.5 (Offerings component, includes platform-layers strip) + Task 3.1 (content)
- §8 Receipts → Task 4.6 (Receipts component including pull quote, demo, operator credit, Hyperquake) + Task 3.1 (content)
- §9 Three Cs → Task 4.7 (ThreeCs component) + Task 3.1 (content)
- §10 Manifesto → Task 4.8 (Manifesto component) + Task 3.1 (content)
- §11 Closing CTA + welcome bookend → Task 4.9 (ClosingCTA component) + Task 3.1 (content)
- §12 Footer → Phase 5 (Tasks 5.1, 5.2, 5.3)
- §13 Welcome continuations → All four locations covered: status ticker (Task 4.2), hero (Task 4.3 second-deck headline), intro close (Task 4.4 closingLine), closing CTA (Task 4.9 bookendLine1+2)
- §14 Open items → Task 6.5 step 2 confirms still pending; placeholder text in 3.1

All spec sections have at least one implementing task.
