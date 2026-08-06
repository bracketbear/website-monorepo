# Round 1 Blind Calibration Report

**Date:** 2026-08-05
**Profile under test:** `docs/voice/VOICE.md`
**Lineup:** 15 posts (10 real, held out from VOICE.md's analysis via `holdout.json`; 5 AI-written fakes from `round1/fakes.json`), shuffled with seed 42.
**Judges:** 3 independent `sonnet` subagents, each given only the 15-post reference pack and the shuffled lineup inline. None were told the fake/real ratio, none read `VOICE.md` or any file under `docs/voice/calibration/` or `docs/voice/linkedin/` (each judge's tool-use count was 0).

## Result: FAIL

**Mean fake accuracy: 73%** (pass threshold: <=60%)

Judges caught AI-written posts far more often than the calibration bar allows. The voice profile is currently _too imitable_ -- the tells judges used to catch fakes are legible enough that three independent readers converged on most of them.

## Per-judge scores

| Judge    | Fake accuracy          | False positives on real posts |
| -------- | ---------------------- | ----------------------------- |
| judge1   | 60% (3/5 fakes caught) | 2/10                          |
| judge2   | 80% (4/5 fakes caught) | 2/10                          |
| judge3   | 80% (4/5 fakes caught) | 1/10                          |
| **Mean** | **73%**                | --                            |

## Correct tells, grouped by fake shape

Of 5 fake shapes x 3 judges = 15 possible catches, judges made **11 correct catches**. One shape (`announcement build-up`) fooled all three judges completely.

### `hot take` (id 2, "AI coding agents...") -- caught 3/3 -- VOICE tells

All three judges converged on the same structural signal: the post reads as a polished, essay-cadence LinkedIn think-piece with **no slang, no emoji, and no first-person grounding**, closing on a crafted aphorism ("It's building a team you don't have to babysit").

- judge1: "Polished essay cadence ending in an aphorism... no slang, no emoji, no first-person anecdote... generic LinkedIn-thinkfluencer, not his."
- judge2: "abstract thought-leadership with no first-person story, unlike his hands-on AI posts... always grounded in his own specific experience."
- judge3: "stripped of any 'folks', 'freaking', or exclamation-point energy... smoothed-out AI thought-leadership."

**This is a VOICE tell** -- it's about rhythm, register, and the absence of his casual address markers and first-person grounding, not about invented facts. Directly actionable for revising VOICE.md.

### `short reaction` (id 5, "Alex Chen and the Lightwell crew...") -- caught 3/3 -- CONTENT tell

All three judges flagged the same thing: the named people/company feel invented.

- judge1: "'Alex Chen and the Lightwell crew' reads like placeholder-generic AI stand-in names rather than a real Portland connection."
- judge2: "generic placeholder-feeling names -- his real posts name specific, verifiable people with full titles."
- judge3: "generic placeholder-feeling names... not vague 'buddy X and the Y crew' phrasing."

**This is a CONTENT tell** -- it's about the plausibility of invented names/entities, not about rhythm or word choice. Not directly actionable for VOICE.md; it's a fake-generation artifact (Task 3's fakes used generic placeholder names) rather than a voice gap.

### `community spotlight` (id 12, "Rose City Machine Co...") -- caught 3/3 -- mixed

- judge1: "Invented-sounding business name 'Rose City Machine Co.' with tidy full names... plus a flat generic closer that lacks his usual punchy sign-off." (content + voice)
- judge2: "generic invented names, and the closer... is flat compared to his signature superlative enthusiasm." (content + voice)
- judge3: "invented filler names, and the closing line is flat and generic -- his real posts end with a punchier personal hook." (content + voice)

**Mixed** -- the invented business/people names are a CONTENT tell (same issue as `short reaction`), but all three judges independently also flagged the **flat, generic closing line** as missing his "punchy sign-off" / "signature superlative enthusiasm." That closer-line flatness is a VOICE tell and is actionable.

### `network ask` (id 15, "venue for 60 people...") -- caught 2/3 -- VOICE tell

- judge2: "missing his near-constant 'folks'/'y'all' address... reads flatter and more generic than his asks."
- judge3: "generically phrased... missing his quirky specificity" (contrasted with his real venue-hunting post's "NW 16th & Johnson" detail).
- judge1 missed this one, calling it real.

**This is primarily a VOICE tell** -- the absence of his address markers ("folks"/"y'all") and his habit of dropping quirky, hyper-local specificity. Actionable.

### `announcement build-up` (id 6, "Got some Bracket Bear news...") -- caught 0/3 -- no tells to report

This fake fooled every judge; all three called it real. It is a short, cryptic teaser ("Sitting on this is rough... #bracketbear2026") that closely matches his established withheld-announcement pattern (see reference posts 5, 6, 9). **This is the shape that most successfully passes as his voice** and represents a blind spot in this test, not a voice-profile weakness -- there's no incorrect tell to analyze because nobody was fooled _incorrectly_, they were fooled _correctly enough_ that the fake is a good match.

## False positives on real posts (informative, not scored against fakes)

Two real posts drew false positives, both on the same reasoning:

- **id 1** (funding/mentorship ask): called fake by judge1 and judge2 -- "corporate hedge-speak," "war chest," "no exclamation points, no folks/y'all."
- **id 7** (International Women's Day): called fake by **all three** judges -- "flat corporate boilerplate," "zero personal voice."

Both are genuinely his, but both are serious/formal-register posts with none of his usual slang or emoji. This shows the "no casual markers = fake" heuristic that drove several _correct_ catches (`hot take`, `network ask`) is also his most common false-positive trigger -- real posts on sensitive or corporate-adjacent topics (funding, DEI observances) already have low casual-marker density, so a tell keyed purely on "sounds too polished/generic" is unreliable in isolation.

## Interpretation

The profile fails calibration at 73% mean fake accuracy against a 60% pass bar, meaning the AI-written imitations are still too easy to catch. The dominant, reproducible signal judges used to catch fakes was a **voice** gap, not a **content** gap: AI writing defaults to polished essay cadence, abstract aphoristic closers, and an absence of his casual address markers ("folks," "y'all"), first-person grounding, and elongated-word/emoji-stacking enthusiasm -- exactly the traits that also drove false positives on his more formal real posts, confirming these are real, load-bearing voice features rather than noise. The content-tells (invented placeholder names in `short reaction` and `community spotlight`) are a separate, non-voice failure mode specific to how Task 3 generated those two fakes and don't indicate a VOICE.md gap. The one shape that fully passed (`announcement build-up`) suggests the profile is already strong at capturing his short cryptic-teaser register -- that pattern doesn't need rework. Net: VOICE.md should be revised to more forcefully require first-person grounded anecdote, casual address markers, and non-aphoristic, non-"thought-leadership" closers, since those are precisely the features whose absence gave the fakes away.
