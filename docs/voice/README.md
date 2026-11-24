# docs/voice — writing voice

How Harrison writes. Start here, then go to the one file you actually need.

**Bracket Bear's brand voice is not here** — it moved to
[`../brand/BRAND.md`](../brand/BRAND.md). The two were in one file and shouldn't
have been: `VOICE.md` is an empirical model of a real person's writing, derived
from a corpus and tested against blind judges. `BRAND.md` is a record of
decisions about a company voice that didn't exist yet. Different kinds of
document, different standards of evidence.

## The map

| Path                       | What it is                                                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VOICE.md`                 | **The profile.** Register selector, energy floors, word tiers, post-shape templates, editorial judgment, and the pre-publish anti-AI-tells checklist.     |
| `linkedin/`                | **The corpus.** 202 scraped LinkedIn posts (plus 8 reposts, an index, and the raw scrape) that VOICE.md was derived from. Source material — not guidance. |
| `calibration/round1/`      | **Round 1 — FAILED** at 73% fake-detection (bar: ≤60%). The diagnosis that drove the profile's revision.                                                  |
| `calibration/round2/`      | **Round 2 — PASSED** at 40%, with judge discriminability (d′) collapsing 1.59 → 0.09. Also documents the two shapes still caught 3/3.                     |
| `calibration/holdout.json` | The 10 posts excluded from VOICE.md's analysis and citations, so calibration judges saw unseen material.                                                  |

## What the profile is for

**The goal is drafts Harrison would actually publish.** Passing as human is the
floor, not the target — a post can clear every check in the profile and still be
one he'd never send. `VOICE.md` §2 governs how a post _sounds_; §3 (Editorial
judgment) governs whether it should _exist_. Calibration only ever tested the
first of those.

Use the **`/bb-voice`** skill (`.claude/skills/bb-voice/SKILL.md`) when drafting.
Don't paraphrase the rules from memory — the profile was revised twice during
calibration and hand-corrected several times since.

## Calibration is closed

Blind-judge test: real posts from the holdout shuffled with AI-written fakes,
judged by three subagents who never read `VOICE.md` or the corpus. Under 60%
fake-detection passes.

**Two rounds were run on 2026-08-05 and no third is planned.** Reasoning is in
[`../adr/0001-voice-calibration-closed-at-two-rounds.md`](../adr/0001-voice-calibration-closed-at-two-rounds.md).
The short version: a clean round 3 needs fresh holdout material, the corpus is
fixed at 202 posts, and the only source of new material is Harrison posting
more — which would make validating the writing system depend on doing the
writing manually first.

The JSON in each round directory is **frozen evidence; only reports get
edited.**

### Read the round-2 pass carefully

It's a real result, but not a clean win, and the reports say so:

- **The pass had no margin.** All three judges were perfectly correlated
  shape-by-shape, so the effective sample was 5 shape-level trials. One more
  shape flipping would have landed exactly on the 60% bar.
- **Only one shape improved on unconfounded evidence** (`network ask`). One
  shape's round-1 catches were a test-design artifact that round 2 removed.
- **Two shapes were caught 3/3 in both rounds** — `hot take` and
  `short reaction`. They are open gaps, recorded as `VOICE.md` §6.1 items 10
  and 11.
- **The strongest evidence is the d′ collapse** (1.59 → 0.09), not the raw
  73% → 40% swing, which is inflated by the confound above.

## Two caveats worth knowing

- **The corpus skews employee-era.** It's dominated by Harrison-the-employee —
  Deeplocal, Downstream, Gumband, management takes, "when I had employees."
  Bracket Bear appears in only a handful of recent posts. As he writes more as a
  founder, the profile describes a role he's leaving. `VOICE.md` is **not**
  scheduled for re-derivation — it's a living document, corrected by hand when a
  draft comes out wrong. If a genuine re-derivation ever happens, exclude any
  posts that were drafted with `/bb-voice`, or you'll be modeling the model.
- **Short-form only.** The corpus is LinkedIn posts; half are under 34 words.
  Nothing here covers articles or long-form. If long-form matters later, write
  two or three by hand and derive from those.
