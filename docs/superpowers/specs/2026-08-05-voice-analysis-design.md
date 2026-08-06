# Voice Analysis Design — LinkedIn Corpus → Voice Profile + Skill

**Date:** 2026-08-05
**Status:** Approved approach (Option B: close read + calibration test)
**Input:** `docs/voice/linkedin/` (scraped 2026-08-05; 202 original posts, 2017-07-17 → 2026-08-05)

## Goal

Produce one canonical voice profile of Harrison's writing, grounded in his real
LinkedIn posts, that serves two uses:

1. **Ghostwriting** — an AI (or collaborator) can draft LinkedIn posts,
   articles, and marketing copy that reads as authentically Harrison.
2. **Bracket Bear brand copy** — extends the confirmed brand-direction voice
   rules with evidence from real writing, and states exactly where the personal
   register and the brand register diverge.

The profile must _reproduce_ the voice, not merely describe it — hence the
calibration test (§5).

## Non-goals

- No analysis of comments, LinkedIn articles, or other platforms (corpus is
  feed posts only).
- No rewriting of existing site copy — that's a later task that _uses_ the
  profile.
- No statistical/NLP tooling; the corpus (~63K chars) fits a single close read.

## 1. Corpus handling

- **Inputs:** `docs/voice/linkedin/posts/` (202 originals). `reposts/` is
  excluded — other people's words.
- **Era weighting:** 2023–2026 posts define the current voice. 2017–2022 posts
  inform the "Evolution" section only, so the early generic link-share era
  cannot dilute the profile.
- **Holdout set:** ~10 posts from 2023–2026, spanning different post shapes,
  are held out: they may not be quoted in VOICE.md so the calibration test can
  use unseen material. Holdout selection is recorded in the test harness, not
  in VOICE.md.

## 2. Analysis dimensions

One close read of the full corpus, extracting per dimension, with cited
examples (file links) for every claimed pattern:

| Dimension          | What to capture                                                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Signature lexicon  | "folks," "yinz," "y'all," "rad," "freaking," "stoked," minced oaths ("heck," "fudge"), etc. — with frequency and context of use                 |
| Sentence rhythm    | Length distribution, short-paragraph habit, single-line punch lines, build-up cadence                                                           |
| Openers            | Audience callouts ("Hey PDX network," "Experiential tech peeps"), scene-setting, cold opens                                                     |
| Closers            | Toasts ("🍻", "Here's to…"), sign-off emoji, calls to action, "Let's gooooo" hype                                                               |
| Emoji grammar      | Which emoji, positions (inline vs. line-end vs. standalone), functions (emphasis, tone-softening, celebration), density by post type            |
| Punctuation habits | Ellipses, ALL CAPS, interrobangs (?!?), em-dash use, stretched words ("Yuuuuuup")                                                               |
| Post shapes        | Recurring templates: network ask, community spotlight, announcement build-up (teaser → reveal), gratitude story, hot take, job boost            |
| Stance & values    | Generosity/community-building, earnest enthusiasm, anti-corporate-speak, Pittsburgh/Portland identity, willingness to name people and companies |

## 3. Deliverable: `docs/voice/VOICE.md`

Structure:

1. **Voice DNA** — the core that holds in both registers (direct verbs,
   specific nouns, real opinions, conversational sentence-first construction).
2. **Personal LinkedIn register** — full pattern inventory from §2 with quoted
   examples and file citations.
3. **Bracket Bear brand register** — folds in the existing brand-direction
   rules (agency-speak ban, performative-virtue ban, operator-flex ban) and
   names each divergence explicitly (e.g., emoji density, hype-caps, and
   stretched words are personal-only; measured-confident claims are brand-only).
4. **Evolution notes** — how the voice changed 2017 → 2026; which eras to
   imitate and which to ignore.
5. **Do/Don't table** — real quoted lines on the Do side; violations
   (including the brand memory's flagged anti-patterns) on the Don't side.

## 4. Skill: `/bb-voice`

Project skill at `.claude/skills/bb-voice/SKILL.md`:

- **Trigger:** any task drafting posts, articles, or Bracket Bear copy in
  Harrison's voice.
- **Behavior:** loads `docs/voice/VOICE.md`, asks (or infers) which register
  applies (personal vs. brand), and applies the corresponding rules.
- Thin by design: the skill is a loader + register-selection instruction; all
  voice content lives in VOICE.md so there is one source of truth.

## 5. Calibration test

The acceptance gate for VOICE.md:

1. Using **only VOICE.md** (no direct corpus access), draft 5 fake posts across
   different post shapes.
2. Shuffle with 10 real held-out posts.
3. 3 fresh subagents — no access to VOICE.md, given ~15 real posts (non-holdout)
   as reference material — independently classify each of the 15 items
   real/fake and state their tells.
4. Any tell that correctly separates fakes becomes a VOICE.md fix.
5. One revision round, then re-test with fresh fakes. **Pass:** judges perform
   near chance (≤60% accuracy on fakes on average). If still failing, report
   the surviving tells to Harrison rather than looping further.

Final acceptance is Harrison's read-through: the profile should feel true, not
just test well.

## Execution shape

Single session, sequential: close read → draft VOICE.md → calibration →
revise → skill → commit. The calibration judges are the only subagents needed.

## Risks

- **Small holdout:** 10 real posts is a small judge sample; near-chance results
  are directional, not statistical proof. Harrison's read-through is the
  backstop.
- **Register bleed:** the corpus is personal-register-heavy; brand-register
  rules lean on the brand-direction memory rather than corpus evidence. The
  profile must mark which claims are corpus-grounded vs. brand-decision.
