# docs/voice — writing voice

Everything about how Harrison writes, and how Bracket Bear writes. Start here,
then go to the one file you actually need.

## The map

| Path                       | What it is                                                                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VOICE.md`                 | **The profile.** The single source of truth: register selector, energy floors, word tiers, post-shape templates, the Bracket Bear brand register, and the pre-publish anti-AI-tells checklist. This is the file you read. |
| `linkedin/`                | **The corpus.** 202 scraped LinkedIn posts (plus 8 reposts, an index, and the raw scrape) that VOICE.md was derived from. Source material — not guidance.                                                                 |
| `calibration/round1/`      | **Round 1 — FAILED** at 73% fake-detection (bar: ≤60%). The diagnosis that drove the profile's revision.                                                                                                                  |
| `calibration/round2/`      | **Round 2 — PASSED** at 40%, with judge discriminability (d′) collapsing 1.59 → 0.09. Also documents the two shapes still caught 3/3.                                                                                     |
| `calibration/holdout.json` | The 10 posts deliberately excluded from VOICE.md's analysis and citations, so calibration judges see unseen material.                                                                                                     |

## How calibration works

Blind-judge test. Real posts drawn from the holdout are shuffled with
AI-written fakes; three independent judges who have never read `VOICE.md` or
the corpus guess which are fake. If they catch fakes more than 60% of the time,
the profile is too catchable and needs revision. Each round directory holds its
own `fakes.json`, `lineup.json`, `answers.json`, `verdicts.json`, and
`report.md` — **the JSON is frozen evidence; only reports get edited.**

Why the holdout matters: judges are shown real posts VOICE.md never quoted, so
a fake can't be caught just by noticing it isn't one of the profile's examples.
That is also why VOICE.md must never cite or quote a holdout file.

## Using the profile

Invoke the **`/bb-voice`** skill (`.claude/skills/bb-voice/SKILL.md`) whenever
you draft LinkedIn posts, articles, or Bracket Bear brand copy. It loads
`VOICE.md`, routes you to the right register, and runs the §6 self-check before
a draft is shown. Don't paraphrase VOICE.md's rules from memory — the skill
exists because the rules were revised twice during calibration and remembered
versions go stale.

## Two caveats worth knowing up front

- **Calibration only ever tested the personal register.** `VOICE.md` §3 (the
  Bracket Bear brand register) is brand decisions plus corpus-grounded
  carryovers — not measured evidence.
- **The round-2 pass has no margin**, and two post shapes (`hot take`, `short
reaction`) are still caught 3/3. They're recorded as open gaps in `VOICE.md`
  §6.1, items 10 and 11.
