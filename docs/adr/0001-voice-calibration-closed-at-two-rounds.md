---
status: accepted
date: 2026-08-22
---

# Voice calibration is closed at two rounds, because the goal is publishability

`docs/voice/VOICE.md` was built and validated as a **detectability** system: two
rounds of blind judging measured how often three judges could pick AI-written
fakes out of a lineup of real posts. Round 2 passed (40% against a ≤60% bar,
with discriminability d′ falling from 1.59 to 0.09). **We are declaring the
objective to be publishability instead — drafts Harrison would actually post —
with indistinguishability demoted to a floor, and closing calibration at two
rounds.**

## Why the objective moved

Indistinguishability and publishability are different targets and they diverge.
A flat, safe, correctly-marked post scores fine against blind judges and is
worthless as a post. Optimizing for judges rewards texture-matching; optimizing
for publication requires knowing what is worth saying, which no amount of
rhythm analysis provides.

This matters for a reader encountering the artifacts cold. Someone who finds
1,300 lines of energy floors, marker counts, and a d′ table will reasonably
conclude the goal was passing a Turing test. It wasn't. The profile exists to
draft LinkedIn posts.

The visible consequence is `VOICE.md` §3 (Editorial judgment), promoted from a
buried subsection (§2.8, "Stance & values") to a top-level section. It had been
filed under _Personal LinkedIn register_ alongside emoji grammar, as though
"never punches down" were a voice trait rather than a position. That
misfiling is why the publishability half of the system was invisible.

## Why no round 3

The reports are honest that round 2 was not a clean win: the pass had no margin
(all three judges perfectly correlated shape-by-shape, so the effective sample
was 5 shape-level trials), only `network ask` improved on unconfounded evidence,
and two shapes — `hot take` and `short reaction` — were caught 3/3 in _both_
rounds. That reads like an argument for another round.

It isn't, because **a clean round 3 has no material to run on.** The corpus is
fixed at 202 posts. `VOICE.md` analyzes and quotes 192 of them; the other 10 are
the holdout, already used twice with the _same_ real posts both times, and §2.5
has since absorbed one holdout post's content into the profile. Fresh holdout
would have to come from posts the profile already cites, which defeats the
purpose.

The only real source of new holdout material is Harrison posting more — which
inverts the dependency, making validation of the writing system require doing
the writing manually first.

## What replaces it

Output testing. Drafts are produced through `/bb-voice` from real current
material and sorted into _would post / would post after edits / would never
post_; the rejects are read backward to find which rule produced them. This
tests the objective we actually care about, and unlike calibration it can be run
any time without consuming scarce holdout.

## Consequences

- The two open shape gaps (`hot take`, `short reaction`) stay open and stay
  documented, as `VOICE.md` §6.1 items 10 and 11. They are not scheduled for
  repair by a further calibration round.
- The calibration directories become frozen evidence of a finished experiment,
  not a work in progress.
- Reopening calibration means first building a new holdout — a real cost, which
  is what makes this decision worth recording rather than silently drifting into.
- Deferred, not rejected: mining the corpus for _what makes something worth
  posting at all_ — the trigger that turns an event into a post. §3 currently
  records only positions held. That pass is expensive and should wait until
  output testing shows whether editorial judgment is in fact the binding
  constraint.
