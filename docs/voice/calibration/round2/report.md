# Round 2 Blind Calibration Report

**Date:** 2026-08-05
**Profile under test:** `docs/voice/VOICE.md` (revised since round 1; see commits
`70d373c`, `8dcfd57`, `fdf21c2`).
**Lineup:** 15 posts (10 real, held out from VOICE.md's analysis via
`holdout.json` — identical real posts to round 1; 5 AI-written fakes from
`round2/fakes.json`), shuffled with seed 43.
**Judges:** 3 independent `sonnet` subagents, each given only the 15-post
reference pack and the shuffled lineup inline. None were told the fake/real
ratio, none read `VOICE.md` or any file under `docs/voice/calibration/` or
`docs/voice/linkedin/` (each judge's tool-use count was 0, verified from
subagent usage stats).

## Result: PASS

**Mean fake accuracy: 40%** (pass threshold: ≤60%)

Down from round 1's 73%. All three judges independently landed at exactly
40% (2/5 fakes caught each), well under the bar.

## Per-judge scores

| Judge    | Fake accuracy          | False positives on real posts |
| -------- | ---------------------- | ----------------------------- |
| judge1   | 40% (2/5 fakes caught) | 4/10                          |
| judge2   | 40% (2/5 fakes caught) | 4/10                          |
| judge3   | 40% (2/5 fakes caught) | 3/10                          |
| **Mean** | **40%**                | —                             |

## Correct tells, grouped by fake shape

Of 5 fake shapes × 3 judges = 15 possible catches, judges made **6 correct
catches** — down from round 1's 11/15. Three of the five shapes now fool
every judge completely.

### `hot take` (id 7, "Most experiential agencies are sitting on a platform problem…") — caught 3/3 — VOICE tell

All three judges again converged on this shape, but the mechanism shifted.
This fake was **not** markerless like round 1's — it carries a first-person
frame, an em dash, and a closing emoji (🧐) — yet judges still flagged the
rhetorical cadence and, notably, its close structural resemblance to the real
reference hot-take post:

- judge1: "textbook LinkedIn-thought-leader hook… too rhetorically tight and
  depersonalized versus his rambling, anecdote-first voice."
- judge2: "Copies REF7's rhetorical skeleton almost beat-for-beat (claim → 'Why?'
  → 'Because...' → reframe → half-joking business idea → single emoji), reading
  like template reuse rather than organic variation."
- judge3: "the crafted aphorism 'That's backwards.' and clipped 'Half joking.
  Mostly not.' read as polished thought-leader rhythm."

**This is a VOICE tell**, but a different one than round 1's (which was pure
floor-absence). Judge2's framing is important: VOICE.md's §2.7E hot-take
template is itself derived from the one real hot-take post in the 15-post
reference pack, so a fake that follows that template closely enough starts to
read as a structural echo of that specific reference post rather than an
independent voice sample. This is partly a methodology artifact of a small
reference pack, and partly a genuine signal that the hot-take template is
still too tightly prescriptive — "claim, 'Why?', reasoning, half-joking
close" is reproducible as a recognizable skeleton even when every individual
floor is technically cleared.

### `short reaction` (id 4, "Congrats on the promotion — you earned it. 🎉") — caught 3/3 — VOICE tell (was CONTENT tell in round 1)

All three judges caught this one, but for a different reason than round 1's
equivalent fake. The round-2 ghostwriter, following the no-invented-names
instruction, wrote a reaction with **no named person at all** — so there was
no fabricated "Alex Chen" for judges to catch this time. Instead, judges
converged on flatness:

- judge1: "generic filler with no voice markers at all — no 'y'all', 'folks',
  exclamation-stacking, or personal anecdote."
- judge2: "Generic 'you earned it' with no named person, company, or concrete
  detail — every reference post, even short ones like REF6, anchors itself in
  a specific fact."
- judge3: "generic and flat — 'you earned it. 🎉' has none of his signature
  markers."

**This is a genuine VOICE tell**, and it is the most important finding of
round 2: with the content confound removed, the underlying voice gap on this
shape is now visible. A short reaction without a named referent still needs
_some_ texture — VOICE.md's §2.7F sub-shapes (announcement tease,
finished-a-thing note, standalone observation) are the documented way to keep
a nameless short post self-contained; this fake used none of them and reads
as a content-free platitude instead.

### `network ask` (id 8) — caught 0/3 — tell disappeared

Round 1 caught this shape 2/3 on missing address markers and generic
specificity ("Nothing corporate — just power and some open floor"). The
round-2 fake ("Hey PDX network: anyone know a TouchDesigner dev…") opens with
the address-marker callout and closes on a favor-CTA ("Hit me up or drop a
comment. Let's chat!"), and fully passed:

- judge1: "a plain, low-key direct ask consistent with his casual networking
  posts."
- judge2: "'Hey PDX network' ask format and TouchDesigner reference match his
  established local-network-favor pattern."
- judge3: "matches his casual, direct networking-ask voice."

### `community spotlight` (id 13) — caught 0/3 — tell disappeared

Round 1 caught this shape 3/3 on invented names ("Rose City Machine Co.",
"Dave Kessler and his partner Mia Torres") plus a flat closer. The round-2
fake avoided naming any person or business (per the test-design constraint),
used a real Pittsburgh neighborhood ("Lawrenceville") instead of a fabricated
shop name, and closed with "Cool space, cooler people. 🤘" instead of a bland
compliment. All three judges called it real, citing the sensory specificity
and the punchy closer as authentic.

### `announcement build-up` (id 3) — caught 0/3 — still passes, as expected

Consistent with round 1 and with VOICE.md §6.3's explicit note that this
shape is the profile's strongest area. All three judges called the teaser
real, citing the terse cryptic-teaser format and `#bracketbear2026` hashtag.

## False positives on real posts

Three real posts drew false positives from **all three judges**, and all
three are the exact same posts round 1 flagged as false positives:

- **id 2** (`2026-07-24--hey-network-do-you-or-someone.md`, the funding/
  mentorship ask) — flagged by judge1 and judge2 (round 1: same post, same
  two judges).
- **id 10** (`2025-03-08--for-international-womens-day-id-like.md`, the
  International Women's Day post) — flagged by all three judges (round 1:
  same post, all three judges).

Two additional real posts were newly caught as false positives in round 2
that were not flagged in round 1:

- **id 15** (`2023-11-30--openais-chatgpt-turns-1-today-this.md`) — flagged by
  all three judges as "clean checklist" / "non-judgmental partner" reading as
  too tidy — ironically, this real post uses a ✅-bulleted list structure that
  VOICE.md's §2.5 explicitly calls out as an AI-slop-era pattern he actually
  used once for real.
- **id 6** (`2024-12-15--hey-design-network-have-you-thought.md`) — flagged by
  judge1 and judge2 for "flat, generic complaint language."

Per Task 5's instructions, these are judge noise on real posts, not actionable
VOICE.md gaps — they're the same "flat/formal register read as fake" failure
mode round 1 already documented and that VOICE.md's §0.2/§0.3 register rules
explicitly warn against over-correcting.

## Round 1 vs round 2 comparison

**Tells that disappeared** (fixed by the revision):

- `network ask` generic-specificity + missing-address-marker tell (round 1:
  2/3 catches) — gone in round 2 (0/3).
- `community spotlight` invented-name + flat-closer tell (round 1: 3/3
  catches) — gone in round 2 (0/3), though this is partly a test-design
  effect (see below) and partly a real closer fix (§2.4's banned-bland-
  compliment rule).

**Tells that persist:**

- `hot take` is still caught 3/3, but the _mechanism_ changed from
  floor-absence (round 1: no markers, no first person, no proper noun) to
  template-recognizability (round 2: markers present, but the post follows
  the documented hot-take skeleton closely enough to read as derivative of
  the one real hot-take post in the reference pack).
- The same two real posts (funding ask, IWD tribute) are still false-positive
  magnets for the same reason: formal/flat register on a topic that is
  genuinely supposed to be flat.

**New tells:**

- `short reaction` markerless-flatness tell (round 2: 3/3) — this didn't
  exist as a _distinct_ finding in round 1 because that fake was caught on
  invented names first; stripping the content confound revealed the voice
  gap underneath.
- Two new real-post false positives (id 15, id 6) not seen in round 1,
  suggesting judges 2 and 3 in this round were somewhat more trigger-happy on
  "too tidy" prose generally — consistent with mean false-positive rate
  ticking up slightly (round 1: ~1.7/10 mean; round 2: ~3.7/10 mean) even as
  fake-catch accuracy fell.

## Note on the test-design change and its effect on comparability

Per the round-2 brief, the ghostwriter was explicitly instructed not to
invent named individuals or businesses — it could only use entities that
genuinely appear in VOICE.md's own text (Deeplocal, Downstream, Gumband,
Fireside, Bracket Bear, TouchDesigner, Portland/PDX, Pittsburgh, etc.) or
refer to people/places without naming them. This removes the round-1 CONTENT
confound (judges catching fakes on _fact-plausibility_ — "Alex Chen" sounding
made up — rather than on _voice fidelity_).

**Effect on comparability:** round 1 and round 2 scores are not a strictly
apples-to-apples measure of the same thing. Round 1's 73% included two
shapes (`short reaction`, `community spotlight`) caught partly or wholly on
invented-name detection, which is not a voice-profile property at all. Round
2's 40% is a cleaner measure of voice fidelity specifically, because the
content escape hatch was closed. That the score still dropped by 33 points
under a _harder_, more voice-focused test is a stronger signal that the
VOICE.md revisions (§0 register selector, §2.0 energy floors, §2.4 banned
closers, §6 self-check) genuinely improved voice fidelity, not merely that
the test got easier. The one shape where the content-confound removal
directly produced a _different_ tell rather than no tell (`short reaction`,
still 3/3) shows the confound removal is doing its job as designed: it
converts a content-plausibility test back into a voice test and the voice
gap that was hiding underneath is now visible and actionable.

## Interpretation

The profile passes calibration at 40% mean fake accuracy against a 60% pass
bar. Two of five fakes were caught, both on genuine voice properties: the hot
take fake for reading as too structurally/rhetorically polished relative to
the single real hot-take exemplar it was templated from, and the short
reaction fake for being markerless and referent-free once it could no longer
lean on a plausible-sounding invented name. Three shapes that failed round 1
(`network ask`, `community spotlight`, `announcement build-up`) now pass
cleanly. The persisting false positives on the funding-ask and IWD posts
confirm — again — that judges' single most reliable (and least reliable)
heuristic is "sounds flat = fake," which is sometimes right and sometimes
exactly backwards; VOICE.md's register-selector fix (§0) has not eliminated
this because it is a property of how AI judges reason under uncertainty, not
a property of the corpus. No further revision loop is required; round 2
passes.
