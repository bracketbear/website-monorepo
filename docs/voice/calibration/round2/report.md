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

## Result: PASS — the real evidence is discriminability collapse, not the raw accuracy delta

**Primary evidence: d′ (discriminability) fell from 1.59 in round 1 to 0.09 in
round 2.** A d′ near zero means round 2's judges could not distinguish fakes
from real posts materially better than chance. This is the headline result.
The raw 73% → 40% mean-accuracy figure is _not_ the headline result — see
"Why the raw accuracy comparison is inflated," below, for why that number
overstates what actually changed.

**Mean fake accuracy: 40%** (pass threshold: ≤60%). All three judges
independently landed at exactly 40% (2/5 fakes caught each).

**The PASS has no margin.** All three judges produced an _identical_
hit/miss pattern at the shape level: each independently caught exactly the
same two fakes (`hot take`, `short reaction`) and missed exactly the same
three (`announcement build-up`, `network ask`, `community spotlight`).
Because the three judges are perfectly correlated shape-by-shape, the
effective sample size here is **5 independent shape-level trials**, not 15
fake-item-judgments. On that basis: 2/5 shapes fooled every judge = 40%. If
one more shape had fooled all three judges (3/5 instead of 2/5), the result
would be exactly 60% — precisely at the pass/fail boundary. The PASS holds,
but this round could not have absorbed a single additional shape flipping
the other way.

## Signal-detection breakdown

| Round | Hit rate (pooled, 3 judges × 5 fakes) | False-alarm rate (pooled, 3 judges × 10 reals) | d′       |
| ----- | ------------------------------------- | ---------------------------------------------- | -------- |
| 1     | 11/15 = 73.3%                         | 5/30 = 16.7%                                   | **1.59** |
| 2     | 6/15 = 40.0%                          | 11/30 = 36.7%                                  | **0.09** |

Total "fake" calls (hits + false alarms, out of 45 possible per round: 15
items × 3 judges) were **16/45 in round 1 vs. 17/45 in round 2** — judges'
overall willingness to say "fake" barely moved between rounds. What changed
is _where_ those calls landed: in round 1 they landed mostly on genuine
fakes (high hit rate, low false-alarm rate); in round 2 they landed almost as
often on real posts as on fakes (hit rate ≈ false-alarm rate). That
hit≈false-alarm pattern is the textbook signature of discrimination
collapsing toward chance, not of judges becoming more "trigger-happy" in
aggregate — response bias (the propensity to say "fake" at all) stayed
essentially flat; only the judges' ability to tell fakes from reals changed.

## Why the raw accuracy comparison is inflated

The report originally framed "73% FAIL → 40% PASS" as evidence the VOICE.md
revision worked. A per-shape decomposition of the 5-catch drop (11/15 → 6/15)
shows this framing overstates the case:

| Shape                   | Round 1 catches (of 3) | Round 2 catches (of 3) | Δ   | Confound status                                                                                                                                                                                                                                                                   |
| ----------------------- | ---------------------- | ---------------------- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hot take`              | 3                      | 3                      | 0   | Net zero. Mechanism shifted (floor-absence → template-recognizability), not evidence of improvement.                                                                                                                                                                              |
| `short reaction`        | 3                      | 3                      | 0   | Net zero. Round 1's catches were pure CONTENT tells (invented names); round 2's are pure VOICE tells (flatness). Same catch count, different cause.                                                                                                                               |
| `community spotlight`   | 3                      | 0                      | -3  | **Confounded.** Round 1's catches were driven by invented names (a CONTENT tell) mixed with a flat-closer VOICE tell. The test-design change removed the invented-name trigger for this shape entirely, so this 3-catch swing cannot be cleanly credited to VOICE.md's revisions. |
| `network ask`           | 2                      | 0                      | -2  | **Unconfounded.** Round 1's catches were pure VOICE tells (missing address marker, generic specificity) with no content component. This is the one shape where the drop is legitimate evidence of profile improvement.                                                            |
| `announcement build-up` | 0                      | 0                      | 0   | Net zero, and not independent evidence across rounds — see below.                                                                                                                                                                                                                 |

Of the raw 5-catch (33-percentage-point) drop, 3 of the 5 catches
(`community spotlight`) come from a shape whose round-1 tells were CONTENT
tells the test-design change specifically eliminated. Only `network ask`'s
2-catch drop is unconfounded evidence that the profile itself got harder to
catch on a pure-voice basis.

**The decisive counterfactual: scoring round 1 on VOICE tells only.**
Round 1's `docs/voice/calibration/round1/correct_tells.json` lets each of the
11 round-1 catches be classified: `hot take` (3, pure VOICE), `network ask`
(2, pure VOICE), `short reaction` (3, pure CONTENT — every one of the six
judge quotes is about "Alex Chen" / "the Lightwell crew" reading as
placeholder names, with no voice-based reasoning at all), `community
spotlight` (3, mixed — every judge cited _both_ the invented names _and_ the
flat closer for the same catch). Scoring only the unambiguous VOICE catches
gives a **low bound of 5/15 = 33%** (excluding `community spotlight`
entirely, since its catches can't be untangled from the content confound)
and a **high bound of 8/15 = 53%** (crediting `community spotlight` in full
to its voice component). **Both bounds are under the 60% pass bar. Round 1
would have PASSED under round 2's content-neutral rules.**

This means the FAIL in round 1 was itself partly a test-design artifact —
two of its five caught shapes were being caught on fact-plausibility, not
voice — and round 2's PASS is not a clean "profile fix turned a fail into a
pass" story. It is better read as: round 1's measured fail rate was
inflated by a confound; round 2 removed that confound and _also_ measured a
genuine, non-confounded improvement on one shape (`network ask`); and the
d′ collapse to near-chance is the strongest evidence the profile revision
made the surviving voice signal harder to key on, independent of any of this
attribution complexity.

## Per-judge scores

| Judge    | Fake accuracy          | False positives on real posts |
| -------- | ---------------------- | ----------------------------- |
| judge1   | 40% (2/5 fakes caught) | 4/10                          |
| judge2   | 40% (2/5 fakes caught) | 4/10                          |
| judge3   | 40% (2/5 fakes caught) | 3/10                          |
| **Mean** | **40%**                | —                             |

## Correct tells, grouped by fake shape

Of 5 fake shapes × 3 judges = 15 possible catches, judges made **6 correct
catches** — down from round 1's 11/15 (see the attribution caveats above
before reading this drop as a clean improvement).

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
still too tightly prescriptive.

### `short reaction` (id 4, "Congrats on the promotion — you earned it. 🎉") — caught 3/3 — VOICE tell (was a CONTENT tell in round 1)

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

This catch count is unchanged from round 1 (3/3 both rounds) — but the
_cause_ changed completely, from a content-plausibility tell to a genuine
voice-floor tell. That reclassification is the clearest illustration of what
the test-design change was for: removing the content escape hatch revealed a
real, still-unfixed voice gap on this shape rather than making it
uncatchable.

### `network ask` (id 8) — caught 0/3 — tell disappeared (unconfounded improvement)

Round 1 caught this shape 2/3 on missing address markers and generic
specificity ("Nothing corporate — just power and some open floor"), both
pure VOICE tells with no content component. The round-2 fake ("Hey PDX
network: anyone know a TouchDesigner dev…") opens with the address-marker
callout and closes on a favor-CTA ("Hit me up or drop a comment. Let's
chat!"), and fully passed:

- judge1: "a plain, low-key direct ask consistent with his casual networking
  posts."
- judge2: "'Hey PDX network' ask format and TouchDesigner reference match his
  established local-network-favor pattern."
- judge3: "matches his casual, direct networking-ask voice."

This is the one shape in the whole comparison where the before/after is not
confounded by the test-design change — the round-1 tell was pure voice, and
it is genuinely gone in round 2.

### `community spotlight` (id 13) — caught 0/3 — tell disappeared, but comparison is confounded

Round 1 caught this shape 3/3 on invented names ("Rose City Machine Co.",
"Dave Kessler and his partner Mia Torres") mixed with a flat closer. The
round-2 fake avoided naming any person or business (per the test-design
constraint), used a real Pittsburgh neighborhood ("Lawrenceville") instead of
a fabricated shop name, and closed with "Cool space, cooler people. 🤘"
instead of a bland compliment. All three judges called it real.

That said, one of the three judges' stated reasoning contains an error worth
flagging. Judge3's tell reads: "the wistful Pittsburgh nostalgia capped with
'🤘' mirrors the exact sign-off emoji used in his 'Cool space, cooler people'
style reference posts about Pittsburgh/Deeplocal." But **"Cool space, cooler
people" does not appear anywhere in the reference pack — it is the fake's own
closing line**, not a phrase from an authentic post. Judge3 hallucinated a
corroborating match rather than actually verifying it against the reference
posts. The verdict (real) was still correct, and judge1/judge2's
reasoning about the specific-detail and closer fix is sound, but judge3's
specific justification should not be read as validated evidence that this
phrasing is corpus-attested — it's a judge error that happened to land on
the right side.

Because round 1's catches on this shape were entangled with the
invented-name confound (see the attribution table above), this 3→0 flip is
**not** clean evidence the closer-fix (§2.4's banned bland-compliment rule)
alone fixed the shape — it's evidence the shape passes under round 2's
content-neutral test, which is a real result on its own terms, just not a
controlled before/after comparison.

### `announcement build-up` (id 3) — caught 0/3 — still passes, but not independent evidence across rounds

Consistent with round 1, all three judges called the teaser real, citing the
terse cryptic-teaser format and `#bracketbear2026` hashtag. Worth flagging:
the round-1 and round-2 fakes for this shape are structurally near-identical
constructs — a one-to-two-line vague-good-news tease, an ellipsis, and the
`#bracketbear2026` hashtag ("Got some Bracket Bear news coming next week,
folks. Sitting on this is rough..." in round 1 vs. "I've been quietly working
on something for Bracket Bear the past few weeks... more very soon." in round
2). The 0/3-in-both-rounds result should be read as the same underlying
pattern confirmed twice with different wording, not as two independent
confirmations of the profile's strength here.

## False positives on real posts

Four distinct real posts drew at least one false-positive "fake" call in
round 2 — up from two in round 1:

- **id 2** (`2026-07-24--hey-network-do-you-or-someone.md`, the funding/
  mentorship ask) — flagged fake by **all three** judges in round 2. This is
  the same underlying post round 1 flagged, but round 1 only caught it 2/3
  (judge1, judge2); in round 2 judge3 also flagged it, so this post's
  false-positive rate got _worse_ between rounds, not merely repeated.
- **id 10** (`2025-03-08--for-international-womens-day-id-like.md`, the
  International Women's Day post) — flagged fake by **all three** judges in
  both rounds. Unchanged.
- **id 15** (`2023-11-30--openais-chatgpt-turns-1-today-this.md`) — flagged
  fake by **all three** judges. This post was **not** a false positive in
  round 1 at all; it is new to round 2. It uses a ✅-bulleted-checklist
  structure that VOICE.md's §2.5 lists under "**Never** ✅❌📈🎯🚀🙌 in a
  modern post as decoration" — §2.5's "appears once" note is about 🚀, not
  about ✅. The sharper point is that this is a **real** post violating that
  "never," which is part of why judges called it fake: the absolute is stated
  without its counterexample. §2.5 has since been softened to record it.
- **id 6** (`2024-12-15--hey-design-network-have-you-thought.md`) — flagged
  fake by judge1 and judge2 (not judge3) for "flat, generic complaint
  language." Also new to round 2.

So three posts (id2, id10, id15) are unanimous false positives across all
three judges. Two of those three (id2, id10) are the same underlying posts
round 1 flagged; one (id15) is entirely new. A fourth post (id6) drew a 2/3
false-positive vote and is also new to round 2. Note that judge3 has the
_lowest_ total false-positive count of the three judges (3/10) despite
independently agreeing on the id15 unanimous false positive — the increase in
false positives is concentrated on specific posts that multiple judges
misread the same way, not a general shift toward suspicion by any one judge.

Per Task 5's instructions, these are judge noise on real posts, not
actionable VOICE.md gaps — they're the same "flat/formal register read as
fake" failure mode round 1 already documented and that VOICE.md's §0.2/§0.3
register rules explicitly warn against over-correcting.

## Round 1 vs round 2 comparison

**Tells that disappeared, unconfounded (real evidence of improvement):**

- `network ask` generic-specificity + missing-address-marker tell (round 1:
  2/3 catches, pure VOICE) — gone in round 2 (0/3).

**Tells that disappeared, but confounded by the test-design change (not
clean evidence of improvement):**

- `community spotlight` invented-name + flat-closer tell (round 1: 3/3
  catches, mixed CONTENT+VOICE) — gone in round 2 (0/3). Cannot be
  disentangled from the content-confound removal.

**Tells that persist (net zero, mechanism sometimes changed):**

- `hot take` is still caught 3/3, but the _mechanism_ changed from
  floor-absence (round 1: no markers, no first person, no proper noun) to
  template-recognizability (round 2: markers present, but the post follows
  the documented hot-take skeleton closely enough to read as derivative of
  the one real hot-take post in the reference pack).
- `short reaction` is still caught 3/3, but the mechanism flipped from a
  CONTENT tell (invented names) to a VOICE tell (markerless flatness) — this
  is the test-design change working as intended, exposing a real gap that was
  previously hidden behind an easier-to-catch content tell.
- The same two real posts (funding ask, IWD tribute) are still
  false-positive magnets for the same reason: formal/flat register on a
  topic that is genuinely supposed to be flat. The funding-ask post actually
  got worse (2/3 → 3/3 judges).
- `announcement build-up` still passes 0/3, but the round-1 and round-2
  fakes are structurally near-identical, so this is one confirmed data point,
  not two.

**New:**

- Two new real-post false positives (id15, id6) that round 1 did not have.

## Interpretation

The profile passes calibration, and the strongest evidence for that is not
the raw 73%→40% accuracy swing but the collapse in discriminability: d′ fell
from 1.59 (round 1, well above chance) to 0.09 (round 2, indistinguishable
from chance), while judges' overall propensity to call something "fake" held
essentially flat (16/45 vs. 17/45 total fake calls). That is a bias-
independent signal that the surviving voice gaps are no longer reliably
exploitable, even though the raw accuracy comparison is inflated by a
test-design confound removed between rounds (community spotlight's 3-catch
swing is inseparable from that removal; a content-neutral rescoring of round
1 lands at 33–53%, which would itself have passed).

Only one shape (`network ask`) shows unconfounded before/after improvement.
Two shapes (`hot take`, `short reaction`) still get caught 3/3 in both
rounds — `short reaction`'s underlying cause changed from content to voice,
meaning there is a real, still-open voice gap on markerless short reactions
that the content confound was previously masking; `hot take`'s persistence
suggests the §2.7E template is recognizable as a template regardless of floor
compliance. The PASS holds, but it holds with no statistical margin — all
three judges are perfectly correlated at the shape level, so the effective
sample is 5 shapes, and a single shape flipping the other way would put the
result exactly at the 60% bar. No further revision loop is required by the
letter of the pass bar, but the `short reaction` and `hot take` gaps are
worth a future look given how little room this round had to spare.
