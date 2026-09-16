import { describe, it, expect } from 'vitest';
import { TALKS, findTalk } from './index';
import { REGISTRY } from '../components/lab/registry';

describe('talks', () => {
  it('registers the Fireside talk under its slug', () => {
    const talk = findTalk('everything-is-an-experience');
    expect(talk).toBeDefined();
    expect(talk?.slides).toHaveLength(14);
  });

  it('gives every slide a unique id', () => {
    for (const talk of TALKS) {
      const ids = talk.slides.map((s) => s.id);
      expect(new Set(ids).size, talk.slug).toBe(ids.length);
    }
  });

  it('only references animations the lab registry knows', () => {
    const known = new Set(REGISTRY.map((e) => e.id));
    for (const talk of TALKS) {
      for (const s of talk.slides) {
        if (s.animation) expect(known.has(s.animation.id), s.id).toBe(true);
      }
    }
  });

  it('puts an animation on exactly the ten storyboard slides', () => {
    const talk = findTalk('everything-is-an-experience')!;
    const withAnim = talk.slides.filter((s) => s.animation).map((s) => s.id);
    expect(withAnim).toEqual([
      'title',
      'statement',
      'ux',
      'hospitality',
      'beyond',
      'experiential',
      'touch-point',
      'bad-ux',
      'habit',
      'thanks',
    ]);
  });

  it('gives every slide a speaker beat', () => {
    const talk = findTalk('everything-is-an-experience')!;
    for (const s of talk.slides)
      expect((s.notes ?? '').length, s.id).toBeGreaterThan(20);
  });

  it('returns undefined for an unknown slug', () => {
    expect(findTalk('nope')).toBeUndefined();
  });
});
