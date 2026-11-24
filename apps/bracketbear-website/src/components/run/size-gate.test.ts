import { describe, it, expect } from 'vitest';
import { SizeGate } from './size-gate';

describe('SizeGate', () => {
  it('swallows the first notification, which is the size it already has', () => {
    const g = new SizeGate();
    expect(g.changed(448, 548)).toBe(false);
  });

  it('ignores a repeat of the same size', () => {
    const g = new SizeGate();
    g.changed(448, 548);
    expect(g.changed(448.3, 547.6)).toBe(false);
  });

  it('reports a real change, then settles on it', () => {
    const g = new SizeGate();
    g.changed(448, 548);
    expect(g.changed(358, 437)).toBe(true);
    expect(g.changed(358, 437)).toBe(false);
  });
});
