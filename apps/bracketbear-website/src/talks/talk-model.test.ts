import { describe, it, expect } from 'vitest';
import {
  clampIndex,
  next,
  prev,
  indexFromParam,
  formatCounter,
  formatElapsed,
} from './talk-model';

const slides = [{ id: 'title' }, { id: 'ux' }, { id: 'thanks' }];

describe('talk-model', () => {
  it('clamps at both ends', () => {
    expect(clampIndex(-1, 3)).toBe(0);
    expect(clampIndex(3, 3)).toBe(2);
    expect(clampIndex(1, 3)).toBe(1);
  });

  it('next and prev do not wrap', () => {
    expect(next(2, 3)).toBe(2);
    expect(prev(0, 3)).toBe(0);
    expect(next(0, 3)).toBe(1);
    expect(prev(2, 3)).toBe(1);
  });

  it('resolves ?slide= to an index and falls back to 0', () => {
    expect(indexFromParam('ux', slides)).toBe(1);
    expect(indexFromParam('nope', slides)).toBe(0);
    expect(indexFromParam(null, slides)).toBe(0);
  });

  it('formats the counter with two-digit padding', () => {
    expect(formatCounter(0, 14)).toBe('01 / 14');
    expect(formatCounter(13, 14)).toBe('14 / 14');
  });

  it('formats elapsed milliseconds as m:ss', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(187_000)).toBe('3:07');
    expect(formatElapsed(600_000)).toBe('10:00');
  });
});
