# Bracket Bear Website — Content Design

**Date:** 2026-05-03
**Scope:** Homepage content + voice. Aligned with the LinkedIn page positioning Harrison shared on 2026-05-03.
**Status:** Approved through brainstorming; awaiting Harrison's review of this spec before implementation planning.

---

## 1. Source of truth & boundaries

- **Visual + styling source of truth:** `apps/bracketbear-website/public/draft/index.html`. The CSS, type system, color palette, component treatments (highlight stamp, absorb buttons, two-deck headline, ticker, comic-panel offerings, manifesto display lines, etc.), and especially the **header (nav + status ticker)** are canonical. Harrison has tweaked styling and considers the draft the design system reference.
- **Live page entry point:** `apps/bracketbear-website/src/pages/index.astro`. Currently consumes content from the `bracketbearIndexPage` CMS collection. Implementation of this spec will require either updating the CMS schema + content document or restructuring the page to match the draft. That decision belongs to the implementation plan (next step), not to this content spec.
- **What this spec does:** finalizes the words and the section ordering. Specifies which existing draft elements each piece of content maps to.
- **What this spec does not do:** propose visual changes, redesign components, or specify implementation mechanics.

---

## 2. Positioning summary

- **Tagline:** _Welcome to Bracket Bear._ (Used as a bookend at top + bottom of the page; adaptable with continuations — see §13.)
- **Positioning line:** _We are the experiential software platform experts._
- **Thesis:** Most experiential agencies are fighting their own platforms. Disconnected tools, custom integrations, and CMS surgery eat the budget before the real work starts. Bracket Bear rebuilds that layer — content modeling, integrations, workflows — as one platform that actually behaves.
- **Posture:** Expert-led, not consultative-asking. We don't take a brief; we observe, identify, and streamline. Diagnostic muscle wrapped in hospitality.
- **Geography:** Rooted in Pittsburgh, based in Portland.
- **Audience priority:** Agency operations / studio leads (primary); creative tech directors / heads of engineering (secondary).
- **Voice constraints:** See `bracketbear-brand-direction.md` (Harrison's memory file). Avoid agency-speak, claims-of-virtue, contrarian "we don't… we DO" frames, and metaphors that overreach (e.g., "polished like a hotel"). Lift LinkedIn-copy phrasing where it lands.

---

## 3. Page structure (top to bottom)

| #   | Section                | Status                                                                         |
| --- | ---------------------- | ------------------------------------------------------------------------------ |
| 1   | Status ticker          | Beats updated                                                                  |
| 2   | Hero                   | Two-deck headline + new lede + new CTAs                                        |
| 3   | Intro / Approach       | Repurposed (drops magic-wand metaphor)                                         |
| 4   | Offerings              | Restructured around Audit / Rebuild / Run-with-you + platform-layers sub-strip |
| 5   | Receipts (proof)       | New section                                                                    |
| 6   | Three Cs (commitments) | Replaces RULE 01–04                                                            |
| 7   | Manifesto              | Restructured around "Bracket Bear is itself an experience"                     |
| 8   | Closing CTA            | Aligned with existing draft layout; new title; welcome bookend                 |
| 9   | Footer                 | Tagline + geography updated                                                    |

---

## 4. Status ticker

Replaces the existing ticker beats. Rotation order:

> ◆ Now booking — summer '26
> ◆ Platform consultancy + software studio
> ◆ Welcome to Bracket Bear
> ◆ Pittsburgh × Portland

(Existing draft duplicates the beat list inside `.ticker__track` for seamless scroll. Apply the same here.)

---

## 5. Hero

Maps to existing `.hero` section in the draft. Structure uses the existing `.hero__eyebrow` (highlight-stamp) + `.hero__punch` two-deck pattern.

**Kicker (`.hero__kicker > .label`):**

> BRACKET BEAR, EST. 2024

**Two-deck headline (`.hero__title`):**

- **Eyebrow lozenge** (`.hero__eyebrow.highlight` — orange-bright text on ink stamp):
  > Welcome to
- **Punch line 1** (`.hero__punch`, large Anton):
  > BRACKET BEAR.
- **Punch line 2** (smaller Anton, second deck — same `.hero__punch` treatment, possibly with a `.hero__punch--sub` modifier or equivalent):
  > We are the<br>
  > experiential<br>
  > software platform<br>
  > experts.

**Lede (`.hero__lede`):**

> Most experiential agencies spend more on integrations and CMS surgery than on the work clients hired them for. We rebuild that layer — **content modeling, integrations, workflows** — as one platform that actually behaves.

(Bold: `<strong>`.)

**CTAs (`.hero__cta`):**

- Primary (`.btn.btn--primary`): `Show us your stack`
- Ghost (`.btn.btn--ghost`): `How we work →`

**Stage canvas:** existing `.stage` block stays as-is per the draft.

---

## 6. Intro / Approach

Maps to existing `.intro` section in the draft (`.intro__grid`, `.marg`, `.intro__quote`, `.intro__sig`).

**Margin aside (`.marg`):**

> Before the deck.

**Lead block (`.intro__quote`):**

> Too many tools that don't talk to each other. Too much custom integration. Too much budget gone before the real work even starts. That's the **platform tax** most experiential agencies are paying. We come in, look at how work actually moves through your stack, find what's quietly working against you, and rebuild it as one platform — content, integrations, workflows, connected. Leaner, faster, dramatically cheaper to maintain.

**Closing line (`.intro__sig`):**

> We're operators by background — hospitality, physical-space experience — so every system has to earn its place. We polish every rock we touch, from the platform architecture to the invoices we put our name on. **Welcome to Bracket Bear. We build systems for the people building experiences.**

(Bold: `<strong>` on the welcome bookend so it visually closes the section.)

**Voice note:** the closing line uses LinkedIn phrasing nearly verbatim ("every system has to earn its place," "we polish every rock we touch — from the platform architecture to the invoices we put our name on"). The welcome line uses the "so"-style continuation pattern.

---

## 7. Offerings

Maps to existing `.sec.sec--orange#work` section. Three offerings use the existing `.offer` card pattern (`.offer__num`, `.offer__title`, `.offer__body`, `.offer__tag`, `.offer__arrow`). Add a new sub-strip beneath the three cards for platform layers.

### 7.1 Section header (`.sec__head`)

- Eyebrow (`.sec__num`): `WHAT WE DO`
- Title (`.sec__title`):
  > We come in, fix it, stay close.
- Meta (`.sec__meta`):
  > Observe. Identify. Streamline.<br>
  > Don't disappear.

### 7.2 Offering 001 — Audit

- `.offer__num`: `001`
- `.offer__title`:
  > We show you what's fighting you.
- `.offer__body`:
  > We come in, walk your stack, and write up where it's costing you the most. Specific systems, specific dollars, specific moves to make. You get a real read on your platform — the kind that's hard to do from the inside.
- `.offer__tag`: `Audit / 1–2 weeks`

### 7.3 Offering 002 — Rebuild

- `.offer__num`: `002`
- `.offer__title`:
  > We rebuild it as one platform.
- `.offer__body`:
  > Content modeling, integrations, workflows — the stuff currently held together by five tools and a cron job — collapsed into one platform that actually behaves. Leaner, faster, dramatically cheaper to maintain. Same work, less drag.
- `.offer__tag`: `Rebuild / project`

### 7.4 Offering 003 — Run with you

- `.offer__num`: `003`
- `.offer__title`:
  > We stay on the team.
- `.offer__body`:
  > Once the platform is healthy, the job is keeping it that way — extending it, integrating new tools as they come up, shipping new experiential builds on top of it. We join your standup, learn your repo, and stay close. Specialists in real-time graphics, TouchDesigner, and the integrations nobody else wants to touch.
- `.offer__tag`: `Embed / retainer`

### 7.5 Sub-strip — "What's inside the platform"

A compact 3-up beneath the three offering cards. Smaller scale than the offering cards, distinct visual treatment (suggested: monospace eyebrow, body type for the description). Existing draft does not have this element; new component class needed (e.g., `.layer-strip` with `.layer` items).

- Eyebrow / section label:

  > WHAT'S INSIDE THE PLATFORM.

- **Layer 01 — Content model + CMS**

  > How agencies actually create and version their work. Sanity, Payload, custom — whatever fits.

- **Layer 02 — Integrations + workflows**

  > The middle layer that decides whether things ship or sit. APIs, queues, automations, the boring stuff that makes the rest possible.

- **Layer 03 — Real-time + experiential apps**
  > TouchDesigner, kiosk software, native installs. The runtime layer where audiences actually interact.

---

## 8. Receipts (proof)

New section. Sits between Offerings (§7) and Three Cs (§9). Suggested structural placement: a new `.sec.sec--receipts` (or similar) — visual treatment per Harrison's design judgment, but content order is locked: provocation → demo description → operator credit → Hyperquake.

### 8.1 Section header

- Eyebrow: `RECEIPTS`
- Title:
  > Built before. Shipping now.
- Meta:
  > Past tense / present tense.<br>
  > Both ours.

### 8.2 Pull quote (lead)

Base display class: the global `.head` (Anton headline utility) — same family already used by `.sec__title`, `.cta__title`, etc. **Do not use `.hero__punch` or any other `.hero__*` class outside the hero.** The stamp on the conditional clause uses the global `.highlight` class.

> [`.highlight` stamp →] If you can't [/stamp] generate a CMS with a custom content model and a TouchDesigner app with a single command to an AI agent — we should talk.

This is the LinkedIn line verbatim. Visual treatment beyond the base classes (sizing, line breaks, surrounding chrome) is a new-component decision for Harrison per the design-source-of-truth boundary in §1.

### 8.3 Demo block (under the pull quote)

> Our tooling can. Custom-model CMS and a paired TouchDesigner app, from one prompt to a running project. It's the platform thesis taken to its end — new builds start at the speed of asking.

**CTA:** `See it live →` — opens a `mailto:` with subject "Demo request" prefilled until a video exists. **Future swap:** when Harrison records the demo video, embed it inline above this paragraph and change the CTA to `Watch the demo →`.

### 8.4 Operator credit block

Smaller scale than the demo block — frames as backing context, not the headline.

- Eyebrow (uses global `.label` class, mono uppercase): `WHERE THIS COMES FROM`
- Body (body-type, not display):
  > Our folks have built systems across **Downstream**, **Deeplocal**, and other award-winning experiential agencies — the kind of installations and tools where "almost working" doesn't count. That scar tissue comes with us.

**Phrasing rule:** these are operator credits (where the team has worked), not client credits. Do NOT use "we partnered with" or "our clients include" for these names.

### 8.5 Hyperquake partnership block

Visually distinct from the operator credit — frames as present-tense partnership. Bracket Bear LLC's actual B2B relationship.

- Eyebrow (uses global `.label` class, mono uppercase): `WHO WE'RE BUILDING WITH`
- Body (body-type, not display):
  > We're currently building alongside **Hyperquake** — `[OPEN ITEM #1: Harrison to provide one specific line about what the platform/technology partnership produces. Placeholder candidates: "extending their experiential runtime into the agency-side tooling layer," "co-developing the CMS + integrations stack their teams ship on." Lock before publication.]`

**Public mention:** confirmed greenlit by Harrison on 2026-05-03.

---

## 9. Three Cs (Commitments)

Replaces the existing four `.value` cards (`RULE 01–04`). Maps to existing `.sec.sec--bright#values` section and `.values` grid using existing `.value` card pattern (`.value__tag`, `.value__title`, `.value__body`).

### 9.1 Section header

- Eyebrow (`.sec__num`): `COMMITMENTS`
- Title (`.sec__title`):
  > Three things we keep showing up for.
- Meta (`.sec__meta`):
  > Community.<br>
  > Collaboration.<br>
  > Continuous improvement.

### 9.2 C / 01 — Community

- `.value__tag`: `C / 01`
- `.value__title`:
  > Lifting up the people coming after us.
- `.value__body`:
  > Somebody made room for us when we needed it. We make room for who's next — apprentices, junior engineers, agency folks learning the platform layer for the first time. That's how we got here. That's how the work keeps getting better.

### 9.3 C / 02 — Collaboration

- `.value__tag`: `C / 02`
- `.value__title`:
  > Ride with our partners, not for them.
- `.value__body`:
  > When an agency hands us work, we don't show up like a vendor running a checklist. We ride with the partner — share credit, share the messy parts, stay close enough that the work feels co-owned. Because it is.

### 9.4 C / 03 — Continuous improvement

- `.value__tag`: `C / 03`
- `.value__title`:
  > Question our own work first.
- `.value__body`:
  > We're harder on our own systems than anyone else is. The platform we use to run Bracket Bear gets the same scrutiny we put on a client's — invoices, repos, docs, the way we run a meeting. The day that stops, the work stops getting better.

**Note:** the existing draft has four cards. This spec reduces to three. Visual treatment (3-column instead of 2x2 grid, or 3-up strip) is Harrison's call per the design-source-of-truth boundary in §1.

---

## 10. Manifesto

Maps to existing `.manifesto#about` section. Drops the strike-through "we don't / we do" pattern in favor of a thesis-and-list treatment.

**Banner label** (uses global `.label` class with the existing inline overrides for orange-bright color and bold weight, matching the draft's manifesto treatment at `<p class="label" style="color: var(--orange-bright); ...">`):

> BRACKET BEAR IS ITSELF AN EXPERIENCE.

**Display lines** (`.manifesto__lines` — existing display treatment, large Anton, stacked):

> The platform we ship.<br>
> The invoice we send.<br>
> The repo we hand off.<br>
> The way we run a meeting.<br>
> All of it built to one standard.

**No `.strike` lines.** The contrarian frame is dropped intentionally — the section now states what we do rather than what we don't.

---

## 11. Closing CTA

Maps to existing `.cta#contact` section + `.cta__grid`. Two-column structure preserved per the existing draft.

### 11.1 Left column

- Eyebrow (`.sec__num`): `START`
- Title (`.cta__title`):
  > Show us where the work is getting stuck.

### 11.2 Right column (`.cta__contact`)

> Email us, write us a note, send a Loom — whatever's easiest. We'll come look.

> ◆ <a href="mailto:hello@bracketbear.com">hello@bracketbear.com</a><br>
> ◆ Pittsburgh × Portland<br>
> ◆ Booking summer '26

> [Button (`.btn.btn--primary` linked to `mailto:hello@bracketbear.com`): **Open the door**]

### 11.3 Welcome bookend (full-width, beneath both columns)

This is the page's last beat before the footer. New element, not present in the existing draft. Base display class: the global `.head` (Anton headline utility). **Do not reuse `.hero__punch` or any other `.hero__*` class — this is not a second hero.** Visual treatment (size, full-width framing, breathing room, surrounding chrome) is a new-component decision for Harrison per the design-source-of-truth boundary in §1.

> Welcome to Bracket Bear.<br>
> We're happy you're here.

---

## 12. Footer

Maps to existing `.foot` section. Three changes; everything else stays per the draft.

| Field                                                            | From                                                                               | To                                                                   |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Wordmark sub-line (under the BRACKET BEAR mark, max-width ~32ch) | _Studio for software with a pulse. Built by people who've shipped the hard stuff._ | **Built like systems engineers. Used like the people we build for.** |
| "Contact" column geography line                                  | _Pittsburgh, PA_                                                                   | **Pittsburgh × Portland**                                            |
| Bottom strip (`.foot__bottom`)                                   | _Built with care, not vibes_ (and the other two items)                             | unchanged                                                            |

---

## 13. "Welcome to Bracket Bear" — adaptive continuations

The tagline is adaptable. Each instance gets a continuation matched to its function on the page.

| Location            | Continuation                                                                                                          | Style                  | Notes                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| Hero (§5)           | _Welcome to Bracket Bear_ → followed by the second-deck headline _We are the experiential software platform experts._ | Thesis                 | The "continuation" is the second-deck headline itself, which sits visually below the welcome stamp. |
| Intro close (§6)    | _Welcome to Bracket Bear. We build systems for the people building experiences._                                      | "so"-style declarative | Lands the section on a thesis fragment.                                                             |
| Status ticker (§4)  | _Welcome to Bracket Bear_ (stands alone)                                                                              | Bare                   | Ticker beats are short by design.                                                                   |
| Closing CTA (§11.3) | _Welcome to Bracket Bear. We're happy you're here._                                                                   | Pleasantry             | Right context: end of page, after the door is opened.                                               |

Future copy that reuses the tagline should follow the same pattern: pick a continuation that matches the section's function. Bare use only inside the ticker.

---

## 14. Open items

| #   | Item                                    | Owner    | Blocking?                                                  |
| --- | --------------------------------------- | -------- | ---------------------------------------------------------- |
| 1   | Hyperquake partnership one-liner (§8.5) | Harrison | Blocks publication of Receipts section, not the whole page |
| 2   | AI-agent demo video swap (§8.3)         | Harrison | Non-blocking; page works without video using mailto CTA    |

---

## 15. What's not in this spec (handoff to implementation plan)

The implementation plan (to be written via the writing-plans skill in the next step) needs to resolve:

- Whether to update the existing CMS schema (`bracketbearIndexPage`) to fit this content shape, or restructure `apps/bracketbear-website/src/pages/index.astro` to render the draft's structure directly with a simpler content source.
- Component-level work: the new sub-strip in §7.5, the new Receipts section (§8) including the Hyperquake block and AI-agent demo CTA, and the welcome bookend treatment in §11.3 are not present in the existing draft and need to be built.
- Visual treatment for sections that exist conceptually but not visually in the draft (Receipts, Hyperquake block, welcome bookend) — Harrison's call per the design-source-of-truth boundary in §1.
- Migration: the existing CMS content for the homepage (`bracketbearIndexPage` collection) needs to be rewritten or replaced with the copy in this spec.
- Footer wordmark sub-line currently exists in the draft footer but the existing site's footer source is in shared layout components — the implementation plan should locate and update the canonical source.
