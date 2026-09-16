import { describe, it, expect } from 'vitest';
import { planPhraseLines, LEADING } from './shader-harness';

/**
 * A stand-in for Anton's metrics: every glyph one em wide, so a string's
 * width is its character count. The planner only ever compares widths, so
 * uniform advance is enough to exercise every branch — and it makes the
 * expected splits something a reader can check by counting letters.
 */
const mono = (t: string) => t.length;

/** The aspect the mark occupies, which phrases are fitted to by default. */
const MARK_ASPECT = 400.89 / 249.73;

/** What the planner's own scoring function says a set of lines measures. */
const aspectOf = (lines: string[]) =>
  Math.max(...lines.map(mono)) / (LEADING * lines.length);

describe('planPhraseLines', () => {
  it('breaks the talk line into a block near the mark aspect', () => {
    const lines = planPhraseLines(
      'LEAVE A GREAT IMPRESSION.',
      mono,
      MARK_ASPECT
    );
    expect(lines.join(' ')).toBe('LEAVE A GREAT IMPRESSION.');
    // Whatever split it picks, it has to land in the mark's neighbourhood
    // rather than one long thin line.
    expect(aspectOf(lines)).toBeGreaterThan(MARK_ASPECT / 2);
    expect(aspectOf(lines)).toBeLessThan(MARK_ASPECT * 2);
  });

  it('beats every other split it could have chosen', () => {
    const text = 'LEAVE A GREAT IMPRESSION.';
    const chosen = planPhraseLines(text, mono, MARK_ASPECT);
    const score = (l: string[]) =>
      Math.abs(Math.log(aspectOf(l) / MARK_ASPECT));
    // Compare against every contiguous split of the words into 1..4 lines.
    const words = text.split(' ');
    const splits: string[][] = [];
    const walk = (start: number, acc: string[]) => {
      if (acc.length > 4) return;
      if (start === words.length) {
        splits.push(acc);
        return;
      }
      for (let end = start + 1; end <= words.length; end++)
        walk(end, [...acc, words.slice(start, end).join(' ')]);
    };
    walk(0, []);
    const bestPossible = Math.min(...splits.map(score));
    // Greedy balancing, so allow a little slack against the optimal split.
    expect(score(chosen)).toBeLessThan(bestPossible + 0.2);
  });

  it('keeps every word, in order, whatever the target', () => {
    const text = 'EVERYTHING IS AN EXPERIENCE AND SO IS THIS';
    for (const target of [0.4, 1, MARK_ASPECT, 4, 12]) {
      const lines = planPhraseLines(text, mono, target);
      expect(lines.join(' '), `target ${target}`).toBe(text);
      expect(lines.length, `target ${target}`).toBeLessThanOrEqual(4);
    }
  });

  it('sets a wide target on one line and a narrow one on many', () => {
    const text = 'ONE TWO THREE FOUR';
    expect(planPhraseLines(text, mono, 20)).toHaveLength(1);
    expect(planPhraseLines(text, mono, 0.2)).toHaveLength(4);
  });

  it('never splits a single word', () => {
    expect(planPhraseLines('IMPRESSION', mono, 0.1)).toEqual(['IMPRESSION']);
  });

  it('survives empty and whitespace-only input', () => {
    expect(planPhraseLines('', mono, MARK_ASPECT)).toEqual([]);
    expect(planPhraseLines('   \n\t ', mono, MARK_ASPECT)).toEqual([]);
  });

  it('collapses runs of whitespace between words', () => {
    expect(planPhraseLines('A    B', mono, 20)).toEqual(['A B']);
  });
});
