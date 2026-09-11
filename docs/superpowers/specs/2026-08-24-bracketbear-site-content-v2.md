# Bracket Bear Site — Content Design v2

**Date:** 2026-08-24
**Status:** Decisions locked via grilling session. Copy not yet drafted.
**Supersedes:** `2026-05-03-bracketbear-website-content-design.md` — that spec's
homepage shipped; this one revises it and extends to the rest of the site.

> **Read `docs/brand/BRAND.md` first, and read §2 of this file before writing a
> word.** §2 amends the brand voice. Drafting against the un-amended `BRAND.md`
> reproduces the exact problem this spec exists to fix.

---

## 1. Why v2 exists

The v1 homepage shipped and works structurally. Two things are wrong with it.

**It reads flat and generic.** Twelve consecutive first-person-plural
declaratives run from the hero to the bookend: _We are the… / We rebuild… / We
come in, fix it, stay close. / We show you… / We stay on the team. / We're
operators… / We polish… / We build systems… / We'll come look. / We're happy
you're here._ That is not a drafting accident. `BRAND.md` bans every device that
produces variation — contrast moves, contrarian flips, questions to the reader,
operator detail, self-deprecation, emoji, hype-caps — and approves exactly one:
"declarative statements about what the company actually does." **A voice defined
by subtraction has one sentence shape left.**

Symptom: the phrase "content modeling, integrations, workflows" appears verbatim
four times (meta description, hero lede, intro lead, offering 002). `BRAND.md`
demands named nouns over abstractions and cites "a CMS that powers the tasting
tables" as the standard. Nothing of that grade appears anywhere on the page.

**It asserts and never shows.** The section titled RECEIPTS contains a claim and
a `mailto:` link. Meanwhile `apps/cms/content/work/projects/` holds six written
and photographed projects — Stoller Winery ("Custom CMS powering two
tasting-room apps," with photos of the tasting tables and the barback LED wall),
Gumband, PwC, Elekta, Bridge, Supply Stream — none of which appear on
bracketbear.com.

**Also live and wrong:** the Hyperquake sentence in `index-page.json` is the
placeholder from v1 §14 open item #1, marked "lock before publication." It
published.

---

## 2. `BRAND.md` amendment — do this first

`BRAND.md` is edited before any copy is drafted. Three bans lift, three
obligations are added. Everything not listed here stands.

### 2.1 Bans lifted

| Lifted                                                                                               | Boundary that stays                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Second person.** Address the reader directly.                                                      | The generic vocative stays banned — "leaders," "founders," "builders" appear **zero times in 192 posts** (`VOICE.md` §1.2).                                                                                                                      |
| **Rhetorical questions.**                                                                            | **Consultative-asking stays banned.** These are different things and `BRAND.md` currently conflates them. Asking the reader to recognize a situation is fine; asking the reader what they'd like fixed is the magic-wand posture and stays dead. |
| **Specific enthusiasm.** The brand may be visibly into a tool, a content model, someone else's work. | It attaches to a **named thing** (`VOICE.md` §1.1). Enthusiasm about abstractions is hype, and stays banned.                                                                                                                                     |

### 2.2 Bans that hold

The **operator-flex ban holds** — "five tools and a cron job," "the integrations
nobody else wants to touch," "scar tissue comes with us." These are not what made
the site generic. What made it generic was that nothing concrete replaced them.
"A CMS powering two tasting-room apps and a barback LED wall" is more specific
than the flex ever was, and it's a fact rather than a boast.

### 2.3 Obligations added

1. **Every section carries at least one real named noun** — a tool, a system, a
   place, a company, a runtime. Not "content modeling, integrations, workflows."
2. **No two consecutive headlines open with "We."**
3. **Specific enthusiasm is permitted** where it attaches to a named thing.

---

## 3. Settled positioning constraints

- **Register:** `BRAND.md` governs the whole site. `VOICE.md` is LinkedIn-only.
  No first-person-singular founder voice anywhere, including `/about`.
- **Pronoun:** the ambiguous "we" stays. Consequence: all pre-Bracket-Bear work
  uses the sanctioned operator framings — "built at," "shipped systems inside."
  Never "our clients include," never "we partnered with."
- **Audience:** named **by symptom, not by title.** No "agency ops leads" in
  copy. Describe the situation precisely enough that only the right reader
  recognizes themselves. Model available in-repo: Gumband's `problem` field opens
  "Experiential agencies tend to invest as little as they can…"
- **Pricing:** shape, not numbers. No dollar figures exist to publish. The audit
  states duration, fixed fee, and deliverable — "1–2 weeks, fixed fee, a written
  read and a prioritized list."
- **No invented numbers.** No build-time-cut, integrations-collapsed, or
  hours-saved figures exist. Do not produce any.

---

## 4. Site architecture

| Surface       | Decision                                                                                                                                                                                                                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`           | Rebuilt per §5.                                                                                                                                                                                                                                     |
| `/services`   | **Killed.** Redirect to `/#work`. Its job — process shape and what an engagement actually is — moves into the homepage offerings cards.                                                                                                             |
| `/about`      | Rebuilt as the **standards page** (§6).                                                                                                                                                                                                             |
| `/contact`    | Survives, thin (§7).                                                                                                                                                                                                                                |
| Nav           | About · Contact.                                                                                                                                                                                                                                    |
| Design system | Copy ships on current styling first. Unifying `/about` and `/contact` onto `.bb-home` is a **separate tracked piece** — `bb-home.css` was deliberately scoped not to leak, and un-scoping it is a real refactor across shared `bear-ui` components. |

**The monorepo does not appear on the site.** Considered as proof and dropped —
not in the Hyperquake beat, not on `/about`.

---

## 5. Homepage beat map

| #   | Beat                          | Change from v1                                                |
| --- | ----------------------------- | ------------------------------------------------------------- |
| 1   | Status ticker                 | unchanged                                                     |
| 2   | Hero                          | **gains a concrete noun**: names TouchDesigner, Unreal, Unity |
| 3   | **Symptom beat**              | **new** — second person, the reader's situation               |
| 4   | Offerings                     | absorbs `/services`: process shape on each card               |
| 5   | Platform layers               | integrations layer rewritten (§5.5)                           |
| 6   | **Built before**              | **new content** — Stoller, Gumband, PwC, with photos          |
| 7   | **Shipping now**              | **new content** — Hyperquake (§5.7)                           |
| 8   | Manifesto                     | kept                                                          |
| 9   | Closing CTA + welcome bookend | kept                                                          |

Three C's leave the homepage for `/about`. That was three of seven beats spent on
character (intro closing line, three C's, manifesto); collapsing to one frees the
slot that beats 6 and 7 now occupy.

### 5.2 Hero

Names **TouchDesigner, Unreal, and Unity**. Rationale: true of past and present
work, tells an agency lead in half a second that Bracket Bear lives in their
world, and costs nothing downstream. Rejected: naming Hyperquake in the hero
(spends the proof section's payload three beats early and over-commits the page
to one in-progress partner); naming the Stoller tasting tables (past-tense
operator credit under "we" in a hero is the exact drift the operator-credit rule
prevents).

### 5.4 Offerings

Audit / Rebuild / Embed stay. Each card gains the **process shape** — what it is,
how long, what you get at the end. The audit card carries "1–2 weeks, fixed fee,
a written read and a prioritized list." No prices.

### 5.5 Platform layers

The middle layer currently reads: _"APIs, queues, automations, the boring stuff
that makes the rest possible."_ **Rewrite it.** That is the brand apologizing for
the most valuable thing it does, inside the section whose job is to make the
platform layer sound worth paying for.

It becomes the layer where integrations are **generated rather than hand-written**,
with the runtimes named. This is a real, sellable capability — see §5.7 for the
ownership constraint that governs how it's phrased.

**Not** a fourth offering. A fourth offering implies a productized service with a
price and repeatable delivery; the protocol was built once, for one client.

### 5.6 Built before

Stoller Winery, Gumband, PwC — sourced from `apps/cms/content/work/projects/`,
with the existing photography. Framing is **"Built at Downstream" / "Built at
Deeplocal"**, project-level, which is factually airtight, survives the ambiguous
"we" intact, and makes the tasting tables the subject of the sentence rather than
a pronoun.

Elekta, Bridge, and Supply Stream go to `/about`, not here.

### 5.7 Shipping now — Hyperquake

**Bracket Bear's portfolio piece.** Also Harrison's, cut differently (§8).

This is the only proof on the site where "we" is honest — `BRAND.md` records
Hyperquake as an actual Bracket Bear LLC relationship, unlike Downstream and
Deeplocal. It is also the platform-tax thesis demonstrated with a company's name
on it: an agency that stopped paying the tax and opened a line of business with
the time it got back.

**Framing:** new line of business **leads**; time and cost **support**. Rationale:
every agency has heard the efficiency pitch and discounted it. "You can now sell
something you couldn't sell before" is a claim competitors can't make, and it
avoids `BRAND.md`'s ban on flexing a virtue too small to flex on.

**Technical depth:** named components in plain language. Each component explained
in the clause that names it. Deeper architecture waits for the case-study page.

**Working draft:**

> Hyperquake opened a new line of business on a platform we built for them. A
> CMS, a watchdog agent that **[BLOCKED — see §9]**, and an integration layer
> built on a protocol that lets an AI write the connection to a new runtime —
> TouchDesigner, Unreal, Unity. Their team spends its hours making the work
> instead of wiring it together.

**Ownership constraint — non-negotiable.** The protocol is **Hyperquake's**. The
capability travels with Bracket Bear; the artifact does not. Copy may say "we
built a protocol for Hyperquake that…" It may **never** say "our protocol," and
must never imply the artifact goes to the next client.

**The AI-agent line survives, rewritten as a statement.** v1 had it as the
proof section's floating headline — _"If you can't generate a CMS with a custom
content model and a TouchDesigner app with a single command to an AI agent — we
should talk."_ It read as hollow because it was detached from the work that backs
it, not because it was untrue. It now sits against the Hyperquake description,
in statement form, with the challenge dropped. `BRAND.md` calls this the
aggressive-register ceiling; a challenge lands from a person on LinkedIn, but on
a page with the receipt beside it, the evidence does that work better.

**Surface:** homepage beat only. No `/work/hyperquake` page yet — it is in
progress, visuals are not permitted, and a case study with no images is a wall of
text asking for a lot of trust. Structure the beat so a page is later a content
addition, not a rebuild.

---

## 6. `/about` — the standards page

**It is about standards, not personality.** The constraint that decides this:
brand voice plus the ambiguous "we" means `/about` cannot do the thing about
pages usually do — introduce a person. Attempting a warm company-origin story
under those two rules reproduces the 2024 copy ("We're artists who code,
engineers who care").

**Structure:**

1. Why Bracket Bear exists — the platform-tax argument, stated once, properly.
2. **The three C's as the page's spine.** Community · Collaboration ·
   **Continuous improvement.**
3. Geography as fact: rooted in Pittsburgh, based in Portland.
4. **Back half: the full project list** — all six from
   `apps/cms/content/work/projects/`, operator framing throughout. The homepage
   shows three; `/about` shows all of them.

**The third C is Continuous improvement, not Consistency.** The current `/about`
says Consistency — "we sweat the details… quality craft… every time." That is a
virtue too small to flex on, which `BRAND.md` bans by name. "We question our own
work first" is a commitment with a cost.

**Delete on sight:** "Our Philosophy: The Magic Wand Method" and the magic-wand
question. `BRAND.md` kills it explicitly as consultative-asking. Also
"Creative Technology Partner" everywhere it appears.

---

## 7. `/contact`

Thin and useful. Email, the form, **what to send, and what happens next** — that
last part is the hospitality frame doing actual work rather than being claimed.

No marketing prose. Delete "Ready to explore how we can help your agency reach
its potential?"

**Verify before shipping:** the page currently promises a reply "within 24
hours." Delete it unless it is true.

---

## 8. Hyperquake across two properties

One engagement, **two cuts** — not one document with a swapped pronoun.

| Property        | Cut                                                                        | Reader is evaluating                       |
| --------------- | -------------------------------------------------------------------------- | ------------------------------------------ |
| bracketbear.com | The business case — what it solves for an agency, the new line of business | whether their platform problem is solvable |
| portfolio       | The build — architecture, stack, what Harrison personally wrote            | Harrison                                   |

A shared source of truth with "we"/"I" swapped serves neither audience. The CMS
models this well enough to support two cuts of one project.

---

## 9. Blocked and open — all owned by Harrison

| #   | Item                                                                                                                                                       | Blocks                                                                                                                            |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **What does the watchdog agent watch, and what does it do when it finds something?**                                                                       | §5.7 — one clause. **Do not ship a placeholder.** v1 shipped one and it is still live.                                            |
| 2   | Is `/contact`'s "within 24 hours" promise true?                                                                                                            | §7                                                                                                                                |
| 3   | Ask Hyperquake for screenshot permission, and for a partner quote of their own                                                                             | future `/work/hyperquake`; a partner quote would be the only proof on the site that isn't Bracket Bear talking about Bracket Bear |
| 4   | `apps/cms/content/work/jobs/bb-freelance-developer.json` says Bracket Bear ended `2023-12-12`, `isCurrentJob: false`, and describes generic freelance work | §8 — the portfolio cut hangs off this record                                                                                      |

---

## 10. Next step

Draft the copy — `BRAND.md` amendment (§2) first, then homepage, then `/about`,
then `/contact`. Use the `/bb-voice` skill; do not paraphrase the voice rules from
memory. Item #1 above blocks one clause of §5.7 and nothing else.
