# Bracket Bear Site v3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the v2 Bracket Bear site on `disc` with the v3 site: a front page, `/platforms`, `/td-brackets`, `/community`, `/talks`, `/about` and `/contact`, in one visual system built from the holding page and Portal Mark.

**Architecture:** Every v3 page is its own document under a new `SiteLayout.astro`, the way `run.astro` and the holding page are built, with its own nav, footer and `site.css`. It does not use `LayeredLayout` from `@bracketbear/core`. Page copy lives in typed TypeScript modules under `src/content/site/`, one per page, copied verbatim from the copy doc. A vitest suite lints every module against the brand rules. The Keystatic page collections for the old pages are retired from the website. `/lab`, `/run` and `/talks/[slug]` keep their own full-viewport documents and are not restyled.

**Tech Stack:** Astro 7 (static output), React 19 islands, Pixi through `@bracketbear/flateralus-pixi`, vitest with jsdom, Netlify Forms, and Netlify redirects in `netlify.toml`.

**Spec:** `docs/superpowers/specs/2026-11-22-bracketbear-site-v3-design.md`. Copy: `docs/superpowers/specs/2026-11-22-bracketbear-site-v3-copy.md`. Executors read both. **Every visible string comes from the copy doc, word for word.** Copy is never written in a task.

## Global Constraints

- The nav, in this order: Platforms · TD Brackets · Lab · Community · About · Contact (spec §5). `/talks` and `/run` are linked from `/community` and are not in the nav.
- `/services` redirects to `/` with a 301 (spec §5).
- Never state or imply a headcount: no team photos, and no "our team" or "our engineers" (spec §4).
- Copy rules (`docs/brand/BRAND.md`, stop-slop): zero em dashes in copy, zero emoji, at most one exclamation point per page, American spelling.
- `[PLACEHOLDER` strings may exist in copy modules during the build-out. None may reach a production deploy (spec §9). They are tracked in `~/Projects/work-notes/projects/bracketbear-website.md`.
- Palette and faces from the holding page: `--orange: #ff5f1f`, `--cream: #fff3e3` and `--ink: #110a08`. Archivo Black for the wordmark and headlines, Plus Jakarta Sans for body text, and JetBrains Mono for labels.
- Hyperquake screenshots show no client or exhibit data (spec §6). Bridge and Gumband ship without images until their provenance is confirmed, so the image fields stay optional and empty.
- TD Brackets app videos and repo links are optional fields. An app renders without them (spec §7: links only once a repo is public).
- Commit per task with the repo's prefix style, e.g. `feat(site-v3): ...`. lint-staged runs prettier and eslint on commit.

## Review Focus

1. **An unknown URL** such as `/work` or `/servcies` should return the site's 404 page with a 404 status. Today `netlify.toml`'s `/*` → `/index.html` 200 catch-all serves the front page instead. Pinned in Task 9.
2. **`/services` and `/services/`** should both 301 to `/` from Netlify, not through a client-side refresh. Pinned in Task 9.
3. **A visitor whose contact form fails to submit**, whether from a network error or a blocked script, should still see hello@bracketbear.com on the page and in the error message, so they never lose a lead. Netlify only records fields that appear in the hidden detection form. Pinned in Task 8.
4. **A browser without WebGL, or with `prefers-reduced-motion`,** should still show the front page hero copy and buttons on the ink ground. A failed Portal Mark boot must not leave a blank or broken hero. Pinned in Task 2, and verified by hand in Task 3.
5. **A 360 px wide phone** should reach all six nav items without horizontal scroll. Verified by hand in Task 2.

---

## File Structure

```
apps/bracketbear-website/
  netlify.toml                         modify: /services 301, drop SPA catch-all, keep /run/* and /draft/* rules (Task 9)
  src/config/navigation.ts             modify: the six v3 items (Task 2)
  src/config/navigation.test.ts        create (Task 2)
  src/content/site/types.ts            create: shared copy types (Task 1)
  src/content/site/shared.ts           create: contact email, footer, close block (Task 1)
  src/content/site/{home,platforms,td-brackets,community,about,contact}.ts
                                       create: one per page (Tasks 3–8)
  src/content/site/copy-rules.ts       create: lint functions (Task 1)
  src/content/site/copy-rules.test.ts  create: lints every module under src/content/site (Task 1)
  src/layouts/SiteLayout.astro         create: document, meta, nav, footer (Task 2)
  src/components/site/SiteNav.astro    create (Task 2)
  src/components/site/SiteFooter.astro create (Task 2)
  src/components/site/CloseBlock.astro create: the "Come say hello." block (Task 2)
  src/components/site/PortalStage.tsx  create: from holding's HoldingStage.tsx (Task 2)
  src/components/site/portal-boot.ts   create: boot/fallback state, testable (Task 2)
  src/components/site/portal-boot.test.ts create (Task 2)
  src/styles/site.css                  create: from holding's holding.css (Task 2)
  src/pages/index.astro                replace (Task 3)
  src/pages/{platforms,td-brackets,community,about,contact}.astro  create or replace (Tasks 4–8)
  src/pages/talks/index.astro          create (Task 7)
  src/pages/404.astro                  create (Task 9)
  src/components/contact/contact-schema.ts       create (Task 8)
  src/components/contact/contact-schema.test.ts  create (Task 8)
  src/components/ContactForm.tsx       rewrite (Task 8)
  src/netlify-config.test.ts           create (Task 9)
  scripts/check-launch.mjs             create: fails on [PLACEHOLDER in dist (Task 9)
  delete (Task 9): src/pages/services.astro, src/components/home/*, src/scripts/bb-home.client.ts,
         src/styles/bb-home.css, src/layouts/HomeLayout.astro, src/components/HeroSection.tsx,
         src/components/Section.astro, the bracketbear page collections in src/content.config.ts
```

`src/layouts/Layout.astro` is deleted in Task 9 if nothing imports it by then.

---

### Task 1: Copy modules' shared types and the copy lint

**Files:**

- Create: `apps/bracketbear-website/src/content/site/types.ts`, `shared.ts`, `copy-rules.ts`, `copy-rules.test.ts`

**Interfaces:**

- Produces:
  - `types.ts`:
    - `type Link = { label: string; href: string }`
    - `type Meta = { title: string; description: string }`
    - `type Section = { label?: string; headline: string; body?: string | string[]; links?: Link[] }`
    - every page module exports `meta: Meta` and its sections as named consts
  - `shared.ts`:
    - `CONTACT_EMAIL = 'hello@bracketbear.com'`
    - `MAILTO = 'mailto:hello@bracketbear.com'`
    - `close: { headline: 'Come say hello.'; button: Link }`
    - `footer: { line: 'Rooted in Pittsburgh, based in Portland. Now booking.' }`
    - `bookend: 'Welcome to Bracket Bear. We\'re happy you\'re here.'`
    - all values come from the copy doc's front page §5 and the "Bookend and footer" section
  - `copy-rules.ts`:
    - `collectStrings(value: unknown): string[]` walks any object, array or string
    - `findViolations(strings: string[]): { rule: string; text: string }[]`
    - the rules:
      - `em-dash` (`—`)
      - `emoji` (`\p{Extended_Pictographic}`)
      - `british`, from the word list in `~/.claude/CLAUDE.md`: behaviour, colour, organise, centre, cancelled, labelled, licence, plus the stems `-our` in favour, honour and colour
      - `headcount`, matching `our team|our engineers|team of`
    - `countPlaceholders(strings: string[]): number`, which counts `[PLACEHOLDER`

- [ ] **Step 1: Write the failing tests** in `copy-rules.test.ts`
  - Unit tests:
    - `findViolations(['Built at Downstream — 2020'])` returns one `em-dash`.
    - `findViolations(['the colour of'])` returns one `british`.
    - `findViolations(['our team of four'])` returns `headcount`.
    - `findViolations(['TouchDesigner apps you can test'])` returns `[]`.
    - `collectStrings({a: ['x', {b: 'y'}], n: 3})` deep-equals `['x', 'y']`.
  - Module sweep: `const modules = import.meta.glob('./*.ts', { eager: true })`, excluding `types.ts`, `copy-rules.ts` and any `*.test.ts`. For each module, `expect(findViolations(collectStrings(mod))).toEqual([])`.
  - Placeholder ceiling: `countPlaceholders` across all modules is `<= 8`. That's the five `/td-brackets` gaps, the `/about` photo, and the Instagram handle and its URL. Name the test `placeholders do not grow past the ones tracked in the project notes`.
- [ ] **Step 2: Run the tests and confirm they fail.** Run `npx vitest run apps/bracketbear-website/src/content/site`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement `types.ts`, `shared.ts` and `copy-rules.ts`** with the signatures above.
- [ ] **Step 4: Run the tests and confirm they pass.** Run the same command. Expected: PASS. The sweep covers `shared.ts` only for now.
- [ ] **Step 5: Commit.** `feat(site-v3): copy modules' shared types, and a lint for every page's copy`

### Task 2: Site shell (layout, nav, footer, Portal Mark stage, site.css)

**Files:**

- Create:
  - `src/layouts/SiteLayout.astro`
  - `src/components/site/{SiteNav.astro,SiteFooter.astro,CloseBlock.astro,PortalStage.tsx,portal-boot.ts,portal-boot.test.ts}`
  - `src/styles/site.css`
  - `src/config/navigation.test.ts`
- Modify: `src/config/navigation.ts`
- Source to bring over: `git show holding:apps/bracketbear-website/src/components/holding/HoldingStage.tsx` and `git show holding:apps/bracketbear-website/src/styles/holding.css`

**Interfaces:**

- Consumes: `shared.ts` (Task 1)
- Produces:
  - `navItems: NavItem[]` (6 items) in `navigation.ts`
  - `<SiteLayout meta={Meta} path="/platforms" bodyClass?: string>`. It sets the title, description, canonical URL `https://bracketbear.com${path}`, Open Graph tags, `theme-color #110a08` and favicon, then renders the nav, a `<main>` slot, and the footer. The nav marks `aria-current="page"` when `href === path`.
  - `<CloseBlock />` renders `shared.close`.
  - `<PortalStage client:only="react" />` behaves like `HoldingStage`, but it renders into `.portal__stage`.
  - `portal-boot.ts` exports `bootState(opts: { reducedMotion: boolean; webgl: boolean }): 'animate' | 'still' | 'none'`:
    - reduced motion: `'still'`
    - no WebGL: `'none'`
    - otherwise: `'animate'`
  - With `'none'`, PortalStage never constructs `PixiApplication`.

- [ ] **Step 1: Write the failing tests**
  - `navigation.test.ts`: `navItems.map(i => i.href)` deep-equals `['/platforms','/td-brackets','/lab','/community','/about','/contact']`. The names are `['Platforms','TD Brackets','Lab','Community','About','Contact']`.
  - `portal-boot.test.ts`: the three `bootState` cases above, plus `bootState({ reducedMotion: true, webgl: false })` returns `'none'`.
- [ ] **Step 2: Run the tests and confirm they fail.** Run `npx vitest run apps/bracketbear-website/src/config apps/bracketbear-website/src/components/site`. Expected: FAIL.
- [ ] **Step 3: Update `navigation.ts`** to the six items.
- [ ] **Step 4: Implement `portal-boot.ts`**, and `PortalStage.tsx` from `HoldingStage.tsx`, keeping the comments that explain:
  - the two-frame fade-in
  - the debounced rebuild on resize
  - the quiet failed boot

  `PortalStage` computes `bootState` from `matchMedia('(prefers-reduced-motion: reduce)')` and a WebGL context probe on a throwaway canvas. With `'still'`, it renders one frame and doesn't call `app.start()`, the way the lab's reduced-motion path holds a still frame.

- [ ] **Step 5: Implement `site.css`** from `holding.css`:
  - Keep the palette, faces and `--rail`, scoped under `.bb-site`.
  - Add styles for the nav, sections, the label (mono, uppercase, letter-spaced, orange), headline (Archivo Black), lede, link rows and buttons. Model the buttons on `.holding__run`'s underline and focus treatment, plus one filled orange button for the primary call to action.
  - The body scrolls; drop the holding page's `overflow: hidden`.
  - Below 640 px, the nav wraps to two rows of three, so all six items fit at 360 px without horizontal scroll and without a menu toggle.
  - Respect `prefers-reduced-motion`.
- [ ] **Step 6: Implement `SiteLayout.astro`, `SiteNav.astro`, `SiteFooter.astro` and `CloseBlock.astro`.**
  - SiteNav: the Bracket Bear mark SVG (the four paths from the holding page) and the wordmark, linking to `/`, then `navItems`.
  - SiteFooter: `shared.footer.line`, the email as a `mailto:` link, LinkedIn (`https://linkedin.com/company/bracketbear`), and GitHub (`https://github.com/bracketbear`). Instagram is added when its placeholder is filled.
- [ ] **Step 7: Run the tests and confirm they pass.** Run `npx vitest run apps/bracketbear-website`. Expected: PASS.
- [ ] **Step 8: Check the build.** Run `npm run build -w @bracketbear/bracketbear-website`. Expected: it exits 0. No page uses the layout yet; this confirms the files compile.
- [ ] **Step 9: Commit.** `feat(site-v3): site shell; layout, six-item nav, footer, and Portal Mark from the holding page`

### Task 3: Front page

**Files:**

- Create: `src/content/site/home.ts`
- Replace: `src/pages/index.astro`

**Interfaces:**

- Consumes: SiteLayout, PortalStage, CloseBlock, `shared`
- Produces: `home.ts` exports:
  - `meta`
  - `ticker: string[]` (five beats)
  - `hero: { eyebrow; headline; lede; button: Link }`
  - `doors: [Section, Section]` (Platforms → `/platforms`, TD Brackets → `/td-brackets`)
  - `both: Section`
  - `community: Section` (link to `/community`)
  - `contact: { headline; body; button: Link }`

  All of it is copied from the copy doc's "Front page" sections 1 to 5, Ticker and Meta.

- [ ] **Step 1: Write `home.ts`** from the copy doc.
- [ ] **Step 2: Run the copy lint.** Run `npx vitest run apps/bracketbear-website/src/content/site`. Expected: PASS. A failure means the module text drifted from the copy doc; fix the module, not the rule.
- [ ] **Step 3: Replace `index.astro`.**
  - `SiteLayout` with `path="/"`.
  - The hero over `<PortalStage client:only="react" />`, filling the first viewport. Copy sits bottom-left as on the holding page, with `pointer-events` passing through to the stage except on links.
  - The ticker as a single marquee row. It's static when reduced motion is set.
  - Two doors side by side above 900 px, stacked below.
  - The package section, the community strip, the contact block, then the bookend line before the footer.
  - The hero renders as plain HTML, so the copy is in the page before any script runs.
- [ ] **Step 4: Verify in a browser.**
  - Run `npm run dev -w @bracketbear/bracketbear-website` and open `/`.
  - Check every string against the copy doc.
  - With DevTools set to "Emulate CSS prefers-reduced-motion: reduce", the hero shows a still Portal Mark frame.
  - With WebGL disabled (`chrome://flags` → "WebGL Developer Extensions" off, or by stubbing `getContext` to return `null` in the console before load), the hero copy and button sit on the ink ground with no console error other than the logged boot message.
- [ ] **Step 5: Commit.** `feat(site-v3): front page; Portal Mark hero, two doors, the package, community, contact`

### Task 4: `/platforms`

**Files:**

- Create: `src/content/site/platforms.ts`, `src/pages/platforms.astro`

**Interfaces:**

- Produces: `platforms.ts` exports:
  - `meta`
  - `header: Section`
  - `parts: Section[]` (CMS, agent, receivers)
  - `history: { headline: string; platforms: { name; company; role; years; body; image?: { src; alt } }[] }`, in the order Bridge, Gumband, Hyperquake's Experience Platform
  - `offer: Section`

  All of it comes from the copy doc's `/platforms` section.

- [ ] **Step 1: Write `platforms.ts`.** The `image` fields stay absent: provenance is unconfirmed, and spec §6 says to ship those platforms without images.
- [ ] **Step 2: Add a test** in `copy-rules.test.ts`, `platforms are told in order`: the `history.platforms` names deep-equal `['Bridge', 'Gumband', "Hyperquake's Experience Platform"]`, and no `body` contains `client` (spec §6: Downstream and Deeplocal are never called clients). Run it, and expect PASS.
- [ ] **Step 3: Implement `platforms.astro`.** Each platform renders as a row: name, then company, role and years in mono, then the body. The image renders only when present.
- [ ] **Step 4: Verify.** In the dev server, `/platforms` matches the copy doc, and the nav marks Platforms as the current page.
- [ ] **Step 5: Commit.** `feat(site-v3): /platforms`

### Task 5: `/td-brackets`

**Files:**

- Create: `src/content/site/td-brackets.ts`, `src/pages/td-brackets.astro`

**Interfaces:**

- Produces: `td-brackets.ts` exports:
  - `meta`
  - `header: Section`, linking to `https://github.com/bracketbear/td-brackets`
  - `features: Section[]` (four)
  - `quickstart: { headline; commands: string[] }`, with `['tdb new demo', 'cd demo', 'tdb td smoke']`
  - `apps: { name; body; video?: string; repo?: string }[]`
  - `hire: Section`

- [ ] **Step 1: Write `td-brackets.ts`.** The five `[PLACEHOLDER: …]` strings are copied as they appear, so the lint's ceiling counts them.
- [ ] **Step 2: Run the copy lint.** Expected: PASS, with five placeholders so far.
- [ ] **Step 3: Implement `td-brackets.astro`.**
  - The quickstart is a `<pre><code>` block, one command per line, with no prompt characters.
  - An app renders `<video autoplay muted loop playsinline>` only when `video` is set, and a "View on GitHub" link only when `repo` is set.
  - A placeholder string renders in the dev build as written. Task 9's launch check is what keeps it out of production.
- [ ] **Step 4: Verify** against the copy doc in the dev server.
- [ ] **Step 5: Commit.** `feat(site-v3): /td-brackets`

### Task 6: `/about`

**Files:**

- Create: `src/content/site/about.ts`
- Replace: `src/pages/about.astro`

**Interfaces:**

- Produces: `about.ts` exports:
  - `meta`
  - `header: Section`
  - `founder: { body: string[]; photo: string }`, where `photo` is the `[PLACEHOLDER]` string for now
  - `howWeWork: { intro: string; items: Section[] }` (platform work, TouchDesigner work, both)
  - `portfolio: Link` to the personal portfolio URL already used by `apps/portfolio`. Read it from `apps/portfolio/astro.config.*` `site`.

- [ ] **Step 1: Write `about.ts`** from the copy doc's `/about` section.
- [ ] **Step 2: Run the copy lint.** Expected: PASS.
- [ ] **Step 3: Replace `about.astro`** with SiteLayout. The photo slot renders a cream-outlined empty box with the alt text, until the photo exists. It is not a stock image.
- [ ] **Step 4: Verify** in the dev server.
- [ ] **Step 5: Commit.** `feat(site-v3): /about`

### Task 7: `/community` and `/talks`

**Files:**

- Create: `src/content/site/community.ts`, `src/pages/community.astro`, `src/pages/talks/index.astro`

**Interfaces:**

- Consumes: `TALKS` from `src/talks/index.ts` (`slug` and `title`)
- Produces: `community.ts` exports:
  - `meta`
  - `header: Section`
  - `run: Section` (link `/run`)
  - `talks: Section` (link `/talks`)
  - `openSource: Section` (GitHub and `/td-brackets`)
  - `lab: Section` (link `/lab`)
  - `instagram: { body: string; link: Link }`, both placeholders

- [ ] **Step 1: Write `community.ts`.**
- [ ] **Step 2: Run the copy lint.** Expected: PASS, with eight placeholders now in total.
- [ ] **Step 3: Implement `community.astro`.**
- [ ] **Step 4: Implement `talks/index.astro`.**
  - SiteLayout with `path="/talks"`.
  - The talk section from `community.ts` as the header.
  - Then one link per entry in `TALKS` to `/talks/${slug}`. The talk titles are stored in uppercase, so show them in title case through CSS `text-transform` rather than changing `TALKS`.
- [ ] **Step 5: Verify.**
  - `/community` links to `/run`, `/talks` and `/lab`, and all three resolve.
  - `/talks` lists Everything Is an Experience.
- [ ] **Step 6: Commit.** `feat(site-v3): /community and a /talks index`

### Task 8: `/contact` and the form

**Files:**

- Create:
  - `src/content/site/contact.ts`
  - `src/components/contact/contact-schema.ts`
  - `src/components/contact/contact-schema.test.ts`
- Rewrite: `src/components/ContactForm.tsx`
- Replace: `src/pages/contact.astro`

**Interfaces:**

- Produces:
  - `contact.ts` exports:
    - `meta`
    - `header: Section`
    - `form: { fields: { name; email; company; need; opens; message; messageHint }; needOptions: { value: NeedValue; label: string }[]; button: 'Send'; sent: string; failed: string }`
    - `other: { email: Link; linkedin: Link; line: string }`
  - `contact-schema.ts` exports:
    - `NEED_VALUES = ['platform', 'platform-piece', 'td-app', 'app-and-platform', 'other'] as const`
    - `type NeedValue`
    - `contactSchema` (zod):
      - `name` min 2
      - `email` is an email
      - `company` optional
      - `need` from the enum
      - `opens` optional
      - `message` min 10
    - `FIELD_NAMES = ['name','email','company','need','opens','message'] as const`
    - `toFormBody(values): URLSearchParams`, which includes `form-name=contact` and every key in `FIELD_NAMES`

- [ ] **Step 1: Write the failing tests** in `contact-schema.test.ts`:
  - A valid payload with no `company` and no `opens` parses.
  - `need: 'augment-team'` fails.
  - `message: 'hi'` fails.
  - `toFormBody(valid).get('form-name') === 'contact'`, and its keys (minus `form-name`) deep-equal `FIELD_NAMES`.
  - `contact.ts`'s `needOptions` values deep-equal `NEED_VALUES`, and its labels equal the copy doc's five options.
  - `form.failed` contains `hello@bracketbear.com` (Review Focus 3).
- [ ] **Step 2: Run the tests and confirm they fail.** Run `npx vitest run apps/bracketbear-website/src/components/contact`. Expected: FAIL.
- [ ] **Step 3: Implement `contact-schema.ts` and `contact.ts`.**
- [ ] **Step 4: Run the tests and confirm they pass.**
- [ ] **Step 5: Rewrite `ContactForm.tsx`.**
  - Use `ValidatedForm`, `Field`, `TextInput`, `TextareaInput`, `Select` and `Button` from `@bracketbear/bear-ui-react`, as now.
  - The hidden Netlify detection form renders exactly `FIELD_NAMES`, so it can't drift from the submission.
  - Labels and messages come from `contact.ts`.
  - On a failed `fetch`, show `form.failed`.
  - Delete every conditional field and `refine` from the old form.
- [ ] **Step 6: Replace `contact.astro`.**
  - SiteLayout.
  - The header, then the form as `client:load`, then the other ways to reach us as plain links in the HTML, so they're visible with JavaScript off.
- [ ] **Step 7: Verify.**
  - Run `npm run build -w @bracketbear/bracketbear-website`.
  - `grep -o 'name="[a-z]*"' dist/contact/index.html | sort -u` lists the six field names and nothing from the old form.
  - In the dev server, an invalid submit shows inline errors.
- [ ] **Step 8: Commit.** `feat(site-v3): /contact; one short form routed by offer`

### Task 9: Redirects, 404, retire v2, launch check

**Files:**

- Modify: `apps/bracketbear-website/netlify.toml`, `src/content.config.ts`, `package.json` (script `check:launch`)
- Create: `src/pages/404.astro`, `src/netlify-config.test.ts`, `scripts/check-launch.mjs`
- Delete:
  - `src/pages/services.astro`
  - `src/components/home/`
  - `src/scripts/bb-home.client.ts`
  - `src/styles/bb-home.css`
  - `src/layouts/HomeLayout.astro`
  - `src/components/HeroSection.tsx`
  - `src/components/Section.astro`
  - `src/layouts/Layout.astro`, if `grep -r "layouts/Layout" src` finds nothing

**Interfaces:**

- `check-launch.mjs` reads `dist/**/*.html` and exits 1, listing the file and string, when any file contains `[PLACEHOLDER`. Otherwise it exits 0 and prints `no placeholders`.

- [ ] **Step 1: Write the failing test** `netlify-config.test.ts`. It reads `netlify.toml` as text with `fs` and parses the `[[redirects]]` blocks with a small regex, with no new dependency. Assert that:
  - A rule `from = "/services"` to `/` with `status = 301` exists, and so does a rule for `/services/`.
  - No rule has `from = "/*"` (Review Focus 1: Astro's static `404.html` is then served by Netlify).
  - The `/run/*` and `/draft/*` rules from the `holding` branch are present.
- [ ] **Step 2: Run the test and confirm it fails.** Run `npx vitest run apps/bracketbear-website/src/netlify-config.test.ts`. Expected: FAIL.
- [ ] **Step 3: Edit `netlify.toml`.**
  - Bring over the two rules from `git diff disc holding -- apps/bracketbear-website/netlify.toml`.
  - Add the two `/services` 301s above every other redirect.
  - Delete the `/*` catch-all.
- [ ] **Step 4: Run the test and confirm it passes.**
- [ ] **Step 5: Create `404.astro`** with SiteLayout, `path="/404"` and meta title `Not found | Bracket Bear`.
  - Body: the headline `This page isn't here.` and a link `Back to the front page` → `/`.
  - These two strings aren't in the copy doc. Add them to the copy doc under a new `## 404` section in the same commit, so the copy doc stays the source.
- [ ] **Step 6: Retire v2.**
  - Delete the files listed above.
  - Remove the `bracketbearIndexPage`, `bracketbearAboutPage`, `bracketbearContactPage`, `bracketbearContactMethods` and `bracketbearServicesPage` collections from `src/content.config.ts`, keeping any collection the portfolio or the lab still reads (`grep -r getCollection src`).
  - Leave `apps/cms` and its content files alone. Retiring the Keystatic schemas is a separate change.
- [ ] **Step 7: Add the launch check.**
  - Add `"check:launch": "node scripts/check-launch.mjs"` to `apps/bracketbear-website/package.json`.
  - Run `npm run build -w @bracketbear/bracketbear-website && npm run check:launch -w @bracketbear/bracketbear-website`.
  - Expected: exit 1, listing eight placeholders in `td-brackets`, `about` and `community`. That's correct until the notes' placeholders are filled. Do not add the check to `check:ci`.
- [ ] **Step 8: Run the whole suite.** Run `npm run check:ci`. Expected: PASS: format, lint, types, tests and build.
- [ ] **Step 9: Verify.**
  - `npx netlify dev` from `apps/bracketbear-website` (or `netlify serve`) serves `dist`.
  - `curl -sI localhost:8888/services` shows `301` to `/`.
  - `curl -sI localhost:8888/nope` shows `404`.
  - `curl -sI localhost:8888/run/og.png` shows `200`.
- [ ] **Step 10: Commit.** `feat(site-v3): /services redirect, a real 404, v2 pages retired, launch check for placeholders`

---

## Not in this plan

These come from the spec §10 launch list and are Harrison's to do. The site doesn't ship until they're done, but none of them is code on `disc`:

- making TD Brackets public, with its license, README and two showcase apps
- the Hyperquake agreement check
- image provenance for Bridge and Gumband
- capturing the app videos
- `bb-freelance-developer.json`
- moving production off `holding`

When a video or a public repo URL exists, it goes into `td-brackets.ts`. When a placeholder's fact arrives, it replaces the string, and the lint's ceiling drops to match.
