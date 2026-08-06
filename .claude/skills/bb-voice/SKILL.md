---
name: bb-voice
description: Use when drafting LinkedIn posts, articles, marketing copy, or any Bracket Bear website/brand copy in Harrison's voice — loads the calibration-tested voice profile, picks the correct register, and self-checks the draft against known AI tells before it's shown.
---

# Writing in Harrison's Voice

`docs/voice/VOICE.md` (~1,250 lines) is the single source of truth for
Harrison's voice and Bracket Bear's brand voice. It was derived from 192
LinkedIn posts and passed blind calibration against AI-generated fakes —
round 2's mean fake-detection accuracy was 40%, comfortably under the ≤60%
pass bar. But the pass had no real margin: all three judges independently
caught the exact same two fake post-shapes and missed the exact same three,
so the effective sample was only 5 shape-level trials, not 15 item
judgments. One more shape fooling all three judges (3/5 instead of 2/5)
would have put the score exactly on the 60% boundary
(`docs/voice/calibration/round2/report.md`). That means the self-check below
is load-bearing, not ceremonial. Skipping it is how a fake gets through.

**Do not paraphrase or summarize VOICE.md's rules from memory**, even if
you've read it before in this session or a prior one. It is revised as
calibration continues; a remembered rule can be stale. Read the actual
sections listed below, every time.

Follow this procedure in order. Do not draft before step 1, and do not skip
step 4.

## 1. Pick the register first (§0)

Read `docs/voice/VOICE.md` §0 (Register selector) before drafting anything.
This project serves two contexts:

- **Personal** — LinkedIn posts, articles, anything signed by Harrison as a
  person. Apply §1 (Voice DNA, all registers) plus §2 (Personal LinkedIn
  register).
- **Brand** — Bracket Bear website, product, or marketing copy. Apply §1
  plus §3 (Bracket Bear brand register). §3.2 lists patterns that are
  corpus-real for Harrison personally but **banned** in brand copy (emoji
  density, hype-caps, stretched words, Pittsburgh dialect markers, sports/
  beer/band references, "folks" as the brand's word, self-deprecation, and
  more) — check every draft against that list.

§0 further splits personal content into three registers by topic — casual
(§0.1, the default), measured (§0.2), and serious (§0.3) — and a mismatch
between topic and register is itself a detectable tell (see §6, question 8).
Congratulating someone else's win is always casual/loud, never measured;
funding or partnership asks are measured; layoffs, disasters, and tributes
are serious. Read §0's full routing table rather than guessing from topic
category alone.

**If it's ambiguous which register or context applies, ask one question —
do not guess.**

## 2. Apply the floors while drafting (§2.0, casual register only)

If the register is personal-casual (§0.1), read §2.0 and apply its three
energy floors as mandatory minimums, not suggestions, while you draft — not
as a fix afterward. They exist because round-1 fakes were markerless and got
caught for it, and a template followed correctly with no energy is still a
fail. Do not reconstruct the floors' thresholds or marker list from memory
here or from a prior read — they were revised twice during calibration; go
read §2.0's current text each time.

## 3. Use a post-shape template if one fits (§2.7)

If the content matches one of §2.7's six recurring post shapes (network ask,
and others), use that shape as the structural recipe. A shape is not a
substitute for the §2.0 floors — read §2.7's framing note before applying
one; round 1's fakes followed the templates correctly and were still caught
because they had structure but no voice.

## 4. Self-check before showing the draft — not after (§5 and §6)

Before returning any draft to the user, check it against:

- **§5** (Do/Don't table) — covers openers, closers, naming real people vs.
  invented ones, word tiers, brand-copy banned phrases, and register
  matching.
- **§6** (Anti-AI-tells self-check) — nine questions derived from what
  actually caught AI-written fakes in blind judging (polished-essay cadence,
  aphorism endings, flat safe compliments, missing first-person anecdote,
  stripped-out energy markers, generic specificity, invented names, wrong
  register for the topic, flawless/uniform-length copy). Questions 4–6 are
  length-gated (§0.1) — skip them on short reactions rather than forcing
  markers onto a one-liner. If drafting a batch, also check §6.2's
  set-level rationing caps (e.g., at most one toast per 5 posts).

Fix any violation found in this step before the draft is shown. This check
happens before the user sees the draft, not as a revision after they react
to it.
