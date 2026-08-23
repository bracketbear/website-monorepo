---
name: bb-voice
description: Use when drafting LinkedIn posts or short-form copy in Harrison's personal voice, or any Bracket Bear brand/marketing/website copy — loads the voice profile or the brand doc, picks the correct register, and self-checks the draft against known AI tells before it's shown.
---

# Writing in Harrison's Voice

Two different voices live in two different files. Pick one first.

| You are writing | Read | What kind of document it is |
| --- | --- | --- |
| A LinkedIn post, or anything signed by Harrison as a person | `docs/voice/VOICE.md` | An **empirical model** — derived from 202 real posts, tested in two blind rounds |
| Bracket Bear website, product, or marketing copy | `docs/brand/BRAND.md` | A **decision record** — a company voice that didn't exist yet, so nothing could be measured |

**Scope: short-form only.** `VOICE.md` is built from LinkedIn posts — half of
them under 34 words. It does not cover articles or long-form writing, and its
energy floors are actively wrong applied across twenty paragraphs. If asked for
long-form in his voice, say the profile doesn't cover it rather than
extrapolating.

## What "good" means here

**The goal is a draft Harrison would actually publish.** Not being detectable as
AI is the floor, not the target. A post can clear every energy floor, pass all
fourteen §6 checks, and still be one he'd never send — because the take is
wrong, the timing is off, or it simply isn't worth saying. **This is not
hypothetical:** in the 2026-08-22 output test a draft cleared the whole
checklist and was rejected as "corny." §1.1 and §6 questions 12–14 exist because
of it. §3 (Editorial judgment) is
the section that decides whether a post should exist at all; §2 decides how it
sounds. **Both have to pass.**

`VOICE.md` was calibrated against blind judges in two rounds and **calibration
is now closed** — round 2 passed at 40% fake-detection against a ≤60% bar, with
discriminability (d′) falling to 0.09. **Do not read that as a comfortable
pass.** It had no margin: all three judges caught the same two fake shapes and
missed the same three, so the effective sample was 5 shape-level trials, and one
more shape flipping would have landed exactly on the bar. Two shapes
(`hot take`, `short reaction`) were caught 3/3 in *both* rounds and remain open
gaps. **That means the self-check below is load-bearing, not ceremonial.**
Skipping it is how a fake gets through.

**Do not paraphrase or summarize either file's rules from memory**, even if
you've read them before in this session or a prior one. `VOICE.md` was revised
twice during calibration and hand-corrected several times since; a remembered
rule can be stale. Read the actual sections listed below, every time.

Follow this procedure in order. Do not draft before step 1, and do not skip
step 5.

## 1. Pick the voice and the register (§0)

**If it's Bracket Bear speaking as a company**, go to `docs/brand/BRAND.md` and
skip to step 4. That file is not calibration-validated — it's a record of
decisions — so follow it as stated rather than inferring from `VOICE.md`. Its
personal-only table lists patterns that are real for Harrison and **banned** in
brand copy: emoji, hype-caps, stretched words, Pittsburgh dialect,
sports/beer/band references, "folks," self-deprecation. Check every draft
against it.

**Otherwise** read `docs/voice/VOICE.md` §0 before drafting anything. It splits
personal content into three registers by topic — casual (§0.1, the default),
measured (§0.2), and serious (§0.3) — and a mismatch between topic and register
is itself a detectable tell (§6, question 8). Congratulating someone else's win
is always casual and loud, never measured; funding or partnership asks are
measured; layoffs, disasters, and tributes are serious. Read §0's full routing
table rather than guessing from topic category alone.

**If it's ambiguous which voice or register applies, ask one question — do not
guess.**

## 2. Check it against editorial judgment (§3)

**Run §3.0 first — it is the cheapest check in the profile and the one that
failed first in practice.** A true, current fact about his week is not
automatically a post. Ask: is there a turn? Is there someone else in it? Is
there something to point at? Would he say it out loud at a meetup? One yes is
enough; zero means say so rather than drafting. A status update with none of the
four is where the energy floors turn into costume.

Then read the rest of §3. It records the positions the corpus actually takes —
a post arguing outside that set reads wrong even with perfect surface mimicry.
§3 also flags its own known gap: it covers *positions he holds*, not *what makes
something worth posting at all*. When the subject is speculative, unresolved, or
involves a third party who hasn't made their news public, that gap is yours to
raise with him rather than resolve silently.

## 3. Apply the floors while drafting (§2.0, casual register only)

If the register is personal-casual (§0.1), read §2.0 and apply its three energy
floors as mandatory minimums, not suggestions, **while** you draft — not as a
fix afterward. They exist because round-1 fakes were markerless and got caught
for it, and a template followed correctly with no energy is still a fail. Do not
reconstruct the floors' thresholds or marker list from memory — they were
revised twice during calibration; read §2.0's current text each time.

## 4. Use a post-shape template if one fits (§2.7)

If the content matches one of §2.7's post shapes, use it as the structural
recipe. A shape is not a substitute for the §2.0 floors — read §2.7's framing
note before applying one; round 1's fakes followed the templates correctly and
were still caught because they had structure but no voice. Note §6.1 item 10:
following the hot-take template beat-for-beat is itself a tell.

## 5. Self-check before showing the draft — not after (§5 and §6)

Before returning any draft, check it against:

- **§5** (Do/Don't table) — openers, closers, naming real people vs. invented
  ones, word tiers, register matching.
- **§1.1** (The corny failure mode) — the knowing frame, figurative language,
  and operator-flex. None of these are caught by anything else in §6, and they
  are what Harrison actually rejects.
- **§6** (Anti-AI-tells self-check) — fourteen questions. 1–11 derive from what
  caught fakes in blind judging: polished-essay cadence, aphorism endings, flat
  safe compliments, missing first-person anecdote, stripped-out energy markers,
  generic specificity, invented names, wrong register, flawless/uniform-length
  copy, plus the two gaps round 2 left open (a hot take walking §2.7E's template
  beat-for-beat, and an unanchored short reaction). Questions 4–6 are
  length-gated (§0.1) — skip them on short reactions rather than forcing markers
  onto a one-liner, but **question 11 still applies to short posts and is the
  only check covering them.** Questions **12–14** come from output testing
  rather than blind judging and are not length-gated.
- **§6.2** set-level rationing caps if drafting a batch — e.g. at most one toast
  per 5 posts, at least two posts under 34 words.

**Never invent a person, company, or event.** §6 question 7 exists because
fabricated names caught two fakes outright. If a draft needs a specific and you
don't have a real one, ask for it or restructure so none is needed.

Fix any violation found in this step before the draft is shown. This check
happens before the user sees the draft, not as a revision after they react.
