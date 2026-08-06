# Task 6 report: /bb-voice skill

## What was built

`.claude/skills/bb-voice/SKILL.md` — a thin loader-plus-procedure skill that
points at `docs/voice/VOICE.md` as the single source of truth. No voice
content (word lists, examples, tables) is copied into the skill; every
instruction references a VOICE.md section by number and tells the reader to
go read it.

## Deviation from the brief (as instructed)

The brief's draft SKILL.md text was written before VOICE.md gained three
sections during calibration revision: §0 (register selector), §2.0 (energy
floors), and §6 (anti-AI-tells self-check). The brief's literal draft
referenced only §2, §3, §2.7, §5 — a skill built to that stale structure
would have skipped straight to drafting without ever picking a register or
running the self-check that the calibration data shows is load-bearing.

Per the task instructions, I implemented the brief's _intent_ (thin skill,
ordered procedure, VOICE.md as sole content source, ask-don't-guess on
register ambiguity) against VOICE.md's _actual_ current structure:

- Step 1 now points at §0 (register selector) instead of jumping straight to
  §2/§3, and explains §0's casual/measured/serious split and the
  personal-vs-brand fork.
- Step 2 (new) instructs applying §2.0's three energy floors _while_
  drafting a casual-register post, not as an afterthought — this is the
  section that exists specifically because round-1 AI fakes were markerless.
- Step 3 keeps the brief's §2.7 post-shape-template instruction, with a note
  that a template is not a substitute for the floors (this is stated
  explicitly in VOICE.md's §2.7 preamble).
- Step 4 replaces the brief's "§5 Do/Don't and 'Known tells' section if
  present" (that section didn't exist in draft form) with the real §6
  Anti-AI-tells self-check — nine concrete questions plus §6.2's set-level
  rationing caps — checked together with §5, before the draft is shown.
- Brand-copy guidance now explicitly calls out §3.2 (personal-only patterns
  banned in brand copy) by name, per the task's requirement.
- Added a short note that the profile was blind-tested and that the round-2
  PASS had no statistical margin (`docs/voice/calibration/round2/report.md`:
  all three judges independently landed at exactly the 60% pass threshold),
  framing the self-check as load-bearing rather than ceremonial.
- Kept the brief's explicit warning against paraphrasing VOICE.md from
  memory, since the file is revised and a remembered rule can be stale.

## Section references used and verified

Verified via `grep -n -E` against `docs/voice/VOICE.md` that each heading
exists at the claimed level with the claimed meaning:

| Reference | Line | Heading                                                                      |
| --------- | ---- | ---------------------------------------------------------------------------- |
| §0        | 14   | `## 0. Register selector — decide this first`                                |
| §0.1      | 55   | `### 0.1 Register A — casual (the default; 77/84 modern posts)`              |
| §0.2      | 81   | `### 0.2 Register B — measured (rare; ~1/84 modern posts, plus formal asks)` |
| §0.3      | 105  | `### 0.3 Register C — serious (3/84 modern posts; 8 across all 192)`         |
| §1        | 146  | `## 1. Voice DNA (all registers)`                                            |
| §2        | 203  | `## 2. Personal LinkedIn register`                                           |
| §2.0      | 208  | `### 2.0 Energy floors — what must be PRESENT (Register A only)`             |
| §2.7      | 796  | `### 2.7 Post shapes (templates)`                                            |
| §3        | 1053 | `## 3. Bracket Bear brand register`                                          |
| §3.2      | 1089 | `### 3.2 What is personal-only (do NOT use in brand copy)`                   |
| §5        | 1233 | `## 5. Do / Don't`                                                           |
| §6        | 1264 | `## 6. Anti-AI-tells self-check`                                             |
| §6.2      | 1312 | `### 6.2 Set-level rationing`                                                |

Also confirmed the frontmatter parses as valid YAML with `python3 -c
"yaml.safe_load(...)"`: `name: bb-voice` and a non-empty `description` that
names LinkedIn posts, articles, marketing copy, and Bracket Bear website/
brand copy — the trigger surface the task specified.

File path confirmed exact: `.claude/skills/bb-voice/SKILL.md`.

## Commit

Committed as a new commit (not amended) with message:
`feat: add /bb-voice skill applying the voice profile`

Not pushed, per instruction (Harrison will handle pushing).
`README.md`'s unrelated pre-existing working-tree change was left unstaged
and was not part of this commit.

## Concerns / notes

- The brief's Step 3 said `git push origin bracketbear`; I did not push, per
  the parent task's explicit override ("Do NOT push — I will handle
  pushing").
- The brief's "Final report to Harrison" section (calibration outcome,
  surviving tells, request for VOICE.md read-through/sign-off per spec §5)
  is outside this task's scope as redefined by the parent instructions,
  which asked only for a skill file, commit, and this report. That summary
  properly belongs to whoever closes out the overall voice-analysis project,
  not to this skill-authoring task. Flagging it here in case it still needs
  to be delivered to Harrison separately.
- No runtime test of the skill is possible in this session (skill list
  refreshes next session), consistent with the brief's own Step 2 note.
