import { describe, it, expect, beforeEach } from 'vitest';
import { PAL, THEMES, applyTheme, getThemeId, hx } from './palette';

describe('palette', () => {
  beforeEach(() => applyTheme('sunset'));

  it('defaults to the sunset brand values', () => {
    expect(PAL.orange).toBe(0xff5f1f);
    expect(PAL.cream).toBe(0xfff3e3);
    expect(PAL.ink).toBe(0x110a08);
    expect(getThemeId()).toBe('sunset');
  });

  it('ships exactly the six named themes', () => {
    expect(Object.keys(THEMES)).toEqual([
      'sunset',
      'miami84',
      'nick95',
      'gameboy',
      'rave',
      'memphis',
    ]);
  });

  it('mutates PAL in place so held references see the new theme', () => {
    const held = PAL;
    applyTheme('gameboy');
    expect(held.orange).toBe(0x8bac0f);
    expect(held).toBe(PAL);
    expect(getThemeId()).toBe('gameboy');
  });

  it('gives every theme all ten palette keys', () => {
    const keys = [
      'orange',
      'bright',
      'deep',
      'rust',
      'sun',
      'cream',
      'ink',
      'ink2',
      'cyan',
      'acid',
    ];
    for (const t of Object.values(THEMES)) {
      expect(Object.keys(t.colors).sort()).toEqual([...keys].sort());
    }
  });

  it('ignores an unknown theme id', () => {
    applyTheme('nope' as never);
    expect(PAL.orange).toBe(0xff5f1f);
    expect(getThemeId()).toBe('sunset');
  });

  it('formats colors as six-digit hex', () => {
    expect(hx(0xff5f1f)).toBe('#ff5f1f');
    expect(hx(0x000f0a)).toBe('#000f0a');
  });
});
