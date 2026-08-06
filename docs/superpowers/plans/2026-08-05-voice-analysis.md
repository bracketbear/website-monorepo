# Voice Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce `docs/voice/VOICE.md` — a calibration-tested voice profile of Harrison's writing derived from the LinkedIn corpus — plus a `/bb-voice` project skill that applies it.

**Architecture:** Sequential pipeline: holdout selection → close read + profile draft → blind ghostwriting by a fresh subagent (VOICE.md only) → blind judging by 3 fresh subagents (real posts only, no VOICE.md) → revision from judge tells → skill creation. Calibration artifacts are committed under `docs/voice/calibration/` for auditability.

**Tech Stack:** Markdown docs, Python 3 one-liners for harness mechanics (shuffle, scoring), Claude Agent tool for ghostwriter/judge subagents. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-05-voice-analysis-design.md`

## Global Constraints

- Corpus input is `docs/voice/linkedin/posts/` only (202 originals); `reposts/` is never read for voice patterns.
- Era weighting: 2023–2026 posts define the current voice; 2017–2022 inform the Evolution section only.
- The 10 holdout files (listed in Task 1) must never be quoted or cited in VOICE.md, and must be excluded from the close read.
- The ghostwriter subagent receives ONLY the text of VOICE.md — no corpus files, no repo access instructions.
- Judge subagents never see VOICE.md — they receive only real reference posts and the shuffled lineup.
- Pass criterion: mean judge accuracy on fakes ≤ 60% (i.e., ≤ 3.0 of 5 fakes correctly flagged, averaged over 3 judges).
- Maximum one revision round; if round 2 fails, report surviving tells to Harrison and stop.
- Commit at the end of every task. Do not push until the final task.
- Repo has a lint-staged pre-commit hook (prettier) — expect it to reformat markdown; that is fine.

---

### Task 1: Record the holdout set and calibration directory

**Files:**

- Create: `docs/voice/calibration/holdout.json`

**Interfaces:**

- Produces: `holdout.json` — JSON object `{"holdout": [<10 filenames>], "purpose": ...}`. Tasks 2, 4, and 5 consume this exact list.

- [ ] **Step 1: Create the calibration directory and holdout manifest**

Write `docs/voice/calibration/holdout.json` with exactly this content:

```json
{
  "purpose": "Files held out of the VOICE.md close read and citations so calibration judges see unseen material. Do not quote these in VOICE.md.",
  "holdout": [
    "2023-11-30--openais-chatgpt-turns-1-today-this.md",
    "2023-12-04--github-copilot-has-always-felt-a.md",
    "2024-10-02--thirtythousand-feet-in-the-sky-on.md",
    "2024-12-15--hey-design-network-have-you-thought.md",
    "2025-02-07--do-yall-know-how-hard-it.md",
    "2025-03-08--for-international-womens-day-id-like.md",
    "2026-01-10--first-bracket-bear-install-yall-gotta.md",
    "2026-03-13--one-year-ago-today-my-team.md",
    "2026-07-24--hey-network-do-you-or-someone.md",
    "2026-08-01--portland-experiential-technology-pros-how-the.md"
  ]
}
```

- [ ] **Step 2: Verify every holdout file exists**

Run:

```bash
python3 -c "
import json
h = json.load(open('docs/voice/calibration/holdout.json'))['holdout']
import os
missing = [f for f in h if not os.path.exists('docs/voice/linkedin/posts/' + f)]
print('missing:', missing); assert not missing and len(h) == 10
"
```

Expected: `missing: []` and no assertion error.

- [ ] **Step 3: Commit**

```bash
git add docs/voice/calibration/holdout.json
git commit -m "docs(voice): record calibration holdout set"
```

---

### Task 2: Close read and draft VOICE.md

**Files:**

- Create: `docs/voice/VOICE.md`
- Read: all of `docs/voice/linkedin/posts/` EXCEPT the 10 holdout files; `docs/voice/linkedin/INDEX.md` for orientation

**Interfaces:**

- Consumes: `docs/voice/calibration/holdout.json` (exclusion list)
- Produces: `docs/voice/VOICE.md` with the exact section headings below. Tasks 3 and 6 consume this file verbatim.

- [ ] **Step 1: Read the corpus (192 non-holdout posts)**

Read every file in `docs/voice/linkedin/posts/` except the 10 holdout filenames. Read them in date order (filenames sort chronologically). While reading, collect evidence per dimension from the spec's §2 table: signature lexicon, sentence rhythm, openers, closers, emoji grammar, punctuation habits, post shapes, stance & values. For every pattern you intend to claim, note at least one exact quote and its source filename. Note frequency honestly — a word used twice in 192 posts is not "signature."

- [ ] **Step 2: Draft `docs/voice/VOICE.md`**

Use exactly this skeleton (fill every section; no TBDs):

```markdown
# Harrison Callahan — Voice Profile

> Derived from 192 LinkedIn posts (2017–2026) at `docs/voice/linkedin/posts/`.
> Calibration-tested per `docs/superpowers/specs/2026-08-05-voice-analysis-design.md`.
> Evidence tags: [corpus] = grounded in the posts; [brand-decision] = a Bracket
> Bear rule from brand direction, not corpus-derived.

## 1. Voice DNA (both registers)

## 2. Personal LinkedIn register

### 2.1 Signature lexicon

### 2.2 Sentence rhythm & paragraph shape

### 2.3 Openers

### 2.4 Closers

### 2.5 Emoji grammar

### 2.6 Punctuation habits

### 2.7 Post shapes (templates)

### 2.8 Stance & values

## 3. Bracket Bear brand register

### 3.1 What carries over from the personal register

### 3.2 What is personal-only (do NOT use in brand copy)

### 3.3 Brand-only rules

## 4. Evolution notes (2017 → 2026)

## 5. Do / Don't

| Do (real quotes) | Don't (violations) |
| ---------------- | ------------------ |
```

Content requirements:

- Every claimed pattern in §2.x cites ≥1 real quote with its filename, e.g. `— "HERE WE GOOOOOOOOOOO!!!" (2024-01-03--heres-what-ive-been-holding-in.md)`. Citations must come from non-holdout files only.
- §2.7 must describe each recurring template as a reusable recipe (structure, typical length, register cues), covering at least: network ask, community spotlight, announcement build-up, gratitude story, hot take, short reaction.
- §3 folds in the brand-direction rules: agency-speak ban, performative-virtue ban, operator-flex/twee ban, measured-confident expert posture, "Welcome to Bracket Bear" tagline usage. Tag each §3 claim `[corpus]` or `[brand-decision]`.
- §3.2 must explicitly name the divergences (at minimum: emoji density, hype-caps, stretched words, interrobangs, "yinz"/regional identity markers — decide each based on evidence).
- §4 states which eras to imitate (2023+) and which to ignore (2017–2022 link-share era), with one example of the difference.
- §5 Don't column includes the brand memory's flagged phrases (e.g. "values-driven," "leverage," "we don't take a brief, we give one," "five tools and a cron job").

- [ ] **Step 3: Verify no holdout leakage**

Run:

```bash
python3 -c "
import json, re
h = json.load(open('docs/voice/calibration/holdout.json'))['holdout']
text = open('docs/voice/VOICE.md').read()
leaks = [f for f in h if f[:10] in text and f[12:30].replace('-',' ')[:12] in text.lower()]
print('filename leaks:', [f for f in h if f in text])
assert not [f for f in h if f in text]
"
```

Expected: `filename leaks: []`. Also manually confirm no quote in VOICE.md comes from a holdout post.

- [ ] **Step 4: Verify citation coverage**

Skim VOICE.md: every bullet in §2.1–§2.8 that asserts a pattern has a quoted example with filename. Fix any bare assertions.

- [ ] **Step 5: Commit**

```bash
git add docs/voice/VOICE.md
git commit -m "docs(voice): draft voice profile from LinkedIn corpus"
```

---

### Task 3: Generate round-1 fakes (blind ghostwriter)

**Files:**

- Create: `docs/voice/calibration/round1/fakes.json`

**Interfaces:**

- Consumes: `docs/voice/VOICE.md` (full text, pasted into the subagent prompt)
- Produces: `fakes.json` — JSON array of 5 objects `{"shape": str, "text": str}`. Task 4 consumes it.

- [ ] **Step 1: Dispatch the ghostwriter subagent**

Use the Agent tool (subagent_type: general-purpose, run_in_background: false). The prompt must contain the FULL text of `docs/voice/VOICE.md` followed by:

```
You are ghostwriting LinkedIn posts as Harrison Callahan using ONLY the voice
profile above. Do not search for or read any other files. Write 5 posts, one
per assignment:

1. shape "network ask": asking his network for leads on a venue that could
   host a Portland creative-tech meetup with room for ~60 people.
2. shape "community spotlight": hyping a (real-sounding) Portland fabrication
   shop he just toured that offers cheap CNC time to artists.
3. shape "announcement build-up": teasing that Bracket Bear has news coming
   next week, without revealing what it is.
4. shape "hot take": his opinion on AI coding agents changing how small
   software teams work.
5. shape "short reaction": a 1–3 line celebratory reaction to a friend's
   company landing a big install.

Match his personal LinkedIn register: length distribution, openers, closers,
emoji grammar, punctuation, lexicon — per the profile. Output ONLY a JSON
array: [{"shape": "...", "text": "..."}] with real newlines escaped as \n.
```

- [ ] **Step 2: Save and validate output**

Write the subagent's JSON to `docs/voice/calibration/round1/fakes.json`. Run:

```bash
python3 -c "
import json
f = json.load(open('docs/voice/calibration/round1/fakes.json'))
assert len(f) == 5 and all(o.get('text') and o.get('shape') for o in f)
print('shapes:', [o['shape'] for o in f])
"
```

Expected: 5 shapes printed, no assertion error.

- [ ] **Step 3: Commit**

```bash
git add docs/voice/calibration/round1/fakes.json
git commit -m "docs(voice): add round-1 calibration fakes"
```

---

### Task 4: Run round-1 judges and score

**Files:**

- Create: `docs/voice/calibration/round1/lineup.json` (judge-facing, no answers)
- Create: `docs/voice/calibration/round1/answers.json` (answer key)
- Create: `docs/voice/calibration/round1/verdicts.json`
- Create: `docs/voice/calibration/round1/report.md`

**Interfaces:**

- Consumes: `round1/fakes.json`, `holdout.json`, reference-pack files (listed below)
- Produces: `report.md` with `mean_fake_accuracy` and the list of correct tells. Task 5 consumes the tells.

- [ ] **Step 1: Build the shuffled lineup**

Run:

```bash
python3 - << 'EOF'
import json, random, re, os
POSTS = 'docs/voice/linkedin/posts/'
def body(fn):
    t = open(POSTS + fn).read()
    return re.split(r'\n---\n', t, maxsplit=2)[-1].strip()
holdout = json.load(open('docs/voice/calibration/holdout.json'))['holdout']
fakes = json.load(open('docs/voice/calibration/round1/fakes.json'))
items = [{'text': body(f), 'label': 'real', 'src': f} for f in holdout] + \
        [{'text': o['text'], 'label': 'fake', 'src': o['shape']} for o in fakes]
random.seed(42)
random.shuffle(items)
lineup = [{'id': i + 1, 'text': it['text']} for i, it in enumerate(items)]
answers = [{'id': i + 1, 'label': it['label'], 'src': it['src']} for i, it in enumerate(items)]
json.dump(lineup, open('docs/voice/calibration/round1/lineup.json', 'w'), indent=2)
json.dump(answers, open('docs/voice/calibration/round1/answers.json', 'w'), indent=2)
print('lineup of', len(lineup))
EOF
```

Expected: `lineup of 15`.

- [ ] **Step 2: Dispatch 3 judge subagents in parallel**

Reference pack = the full body text of these 15 non-holdout files (strip frontmatter):

```
2023-07-17--announcement-ive-published-my-first-linkedin.md
2023-10-19--openai-announced-today-that-dalle-3.md
2023-12-01--mike-tomlin-coach-of-the-pittsburgh.md
2024-01-01--happy-new-year-network-i-hope.md
2024-01-03--heres-what-ive-been-holding-in.md
2024-03-14--i-was-today-years-old-when.md
2024-06-14--i-think-at-the-end-of.md
2024-11-28--more-fun-with-touchdesigner-but-this.md
2024-12-13--folks-were-trying-to-take-gumband.md
2025-02-21--last-night-i-went-to-my.md
2025-02-28--another-reason-why-i-dig-deeplocal.md
2025-12-17--folks-im-honored-and-humbled-to.md
2026-03-15--had-a-blast-representing-fireside-at.md
2026-07-15--if-you-havent-seen-experiential-software.md
2026-08-05--welp-its-that-time-of-the.md
```

Each judge (Agent tool, general-purpose, all three dispatched in one message) gets this prompt — with the reference posts and the `lineup.json` contents inlined, and NO other file access implied:

```
Below are 15 REFERENCE posts genuinely written by one author (Harrison).
Study his voice. Then judge a LINEUP of 15 posts: some are genuinely his,
some are AI imitations. For each lineup item, output real or fake, a
confidence 1-5, and the specific tell that drove your call (quote the
words that feel off or authentic).

Do not assume a fixed ratio of real to fake. Judge each item on its own.

REFERENCE POSTS:
<reference pack here>

LINEUP:
<lineup.json contents here>

Output ONLY a JSON array:
[{"id": 1, "verdict": "real"|"fake", "confidence": 1-5, "tell": "..."}]
```

- [ ] **Step 3: Save verdicts and score**

Save the three arrays as `docs/voice/calibration/round1/verdicts.json`:
`{"judge1": [...], "judge2": [...], "judge3": [...]}`. Then run:

```bash
python3 - << 'EOF'
import json
ans = {a['id']: a for a in json.load(open('docs/voice/calibration/round1/answers.json'))}
v = json.load(open('docs/voice/calibration/round1/verdicts.json'))
fake_ids = [i for i, a in ans.items() if a['label'] == 'fake']
accs = []
for name, arr in v.items():
    got = {o['id']: o for o in arr}
    acc = sum(1 for i in fake_ids if got[i]['verdict'] == 'fake') / len(fake_ids)
    fp = sum(1 for i, a in ans.items() if a['label'] == 'real' and got[i]['verdict'] == 'fake')
    print(f'{name}: fake-accuracy {acc:.0%}, false-positives on real {fp}/10')
    accs.append(acc)
print('MEAN FAKE ACCURACY:', f'{sum(accs)/len(accs):.0%}', '| pass threshold <= 60%')
correct_tells = []
for name, arr in v.items():
    for o in arr:
        if o['id'] in fake_ids and o['verdict'] == 'fake':
            correct_tells.append({'judge': name, 'shape': ans[o['id']]['src'], 'tell': o['tell']})
json.dump(correct_tells, open('docs/voice/calibration/round1/correct_tells.json', 'w'), indent=2)
print('correct tells:', len(correct_tells))
EOF
```

- [ ] **Step 4: Write `docs/voice/calibration/round1/report.md`**

Contents: mean fake accuracy, per-judge accuracy and false positives, the
correct tells grouped by fake shape, and a one-paragraph interpretation.
State clearly: PASS (≤60%) or FAIL (>60%).

- [ ] **Step 5: Commit**

```bash
git add docs/voice/calibration/round1/
git commit -m "docs(voice): round-1 calibration verdicts and report"
```

---

### Task 5: Revise VOICE.md from tells; round 2 if needed

**Files:**

- Modify: `docs/voice/VOICE.md`
- Create (only if round 2 runs): `docs/voice/calibration/round2/` (same file set as round1)

**Interfaces:**

- Consumes: `round1/correct_tells.json`, `round1/report.md`
- Produces: final `docs/voice/VOICE.md`; `round2/report.md` if round 2 ran.

- [ ] **Step 1: Apply tell-driven fixes to VOICE.md**

For each correct tell in `round1/correct_tells.json`, decide what profile gap
let the ghostwriter produce it (missing rule, wrong emphasis, overused
pattern) and edit the relevant VOICE.md section. Every fix must be a concrete
rule change, e.g. "max one 🔥 per post outside celebration posts", not a vague
note. Add nothing for tells that flagged REAL posts as fake (those are judge
noise). If round 1 PASSED: apply only tells that ≥2 judges independently
agreed on, then skip to Step 4.

- [ ] **Step 2 (FAIL path only): Regenerate fakes and re-judge**

Repeat Task 3 with `docs/voice/calibration/round2/fakes.json`, a fresh
ghostwriter subagent, the revised VOICE.md, and these 5 NEW assignments
(same shapes, new topics):

```
1. "network ask": looking for a freelance TouchDesigner dev for a 3-week gig.
2. "community spotlight": praising a Pittsburgh maker space he visited over
   the holidays.
3. "announcement build-up": hinting Bracket Bear is about to sign its first
   retainer client.
4. "hot take": why experiential agencies underinvest in their own platforms.
5. "short reaction": reacting to a former coworker's promotion.
```

Then repeat Task 4 against `round2/` with `random.seed(43)` and 3 fresh
judges. Write `round2/report.md` with PASS/FAIL.

- [ ] **Step 3 (FAIL path only): If round 2 also fails**

Do not loop again. Add a "Known tells" section at the bottom of VOICE.md
listing the surviving tells verbatim, and flag them for Harrison in the final
summary. Continue to Task 6 regardless.

- [ ] **Step 4: Commit**

```bash
git add docs/voice/VOICE.md docs/voice/calibration/
git commit -m "docs(voice): calibration-driven revisions to voice profile"
```

---

### Task 6: Create the /bb-voice skill

**Files:**

- Create: `.claude/skills/bb-voice/SKILL.md`

**Interfaces:**

- Consumes: `docs/voice/VOICE.md` (loaded at skill runtime, not inlined)
- Produces: user-invocable `/bb-voice` skill.

- [ ] **Step 1: Write the skill file**

Create `.claude/skills/bb-voice/SKILL.md` with exactly:

```markdown
---
name: bb-voice
description: Use when drafting LinkedIn posts, articles, marketing copy, or any Bracket Bear website/brand copy in Harrison's voice — loads the calibration-tested voice profile and applies the correct register.
---

# Writing in Harrison's Voice

1. Read `docs/voice/VOICE.md` in full before drafting anything.

2. Determine the register:
   - **Personal** — LinkedIn posts, articles, anything signed by Harrison
     as a person. Use §2 (personal register) on top of §1 (Voice DNA).
   - **Brand** — Bracket Bear website, product, or marketing copy. Use §3
     (brand register) on top of §1. §3.2 lists personal-only patterns that
     are BANNED in brand copy.
   - If the register is ambiguous, ask one question; do not guess.

3. Draft using the post-shape templates (§2.7) when the content matches a
   known shape.

4. Before returning a draft, check it against the §5 Do/Don't table and the
   "Known tells" section if present. Fix violations before showing the draft.

Do not paraphrase or summarize VOICE.md rules from memory — the file is the
source of truth and may have been revised since this skill was written.
```

- [ ] **Step 2: Verify the skill loads**

Confirm the file parses: frontmatter has `name` and `description`, path is
`.claude/skills/bb-voice/SKILL.md`. (Skill list refreshes next session; no
runtime test available now.)

- [ ] **Step 3: Commit and push**

```bash
git add .claude/skills/bb-voice/SKILL.md
git commit -m "feat: add /bb-voice skill applying the voice profile"
git push origin bracketbear
```

---

## Final report to Harrison

Summarize: calibration outcome (per-round fake accuracy vs. the 60%
threshold), any surviving tells, and a request for his read-through of
`docs/voice/VOICE.md` — spec §5 makes his sign-off the final acceptance gate.
