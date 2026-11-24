import { describe, expect, it } from 'vitest';
import { bootState } from './portal-boot';

describe('bootState', () => {
  it('animates when motion is allowed and WebGL exists', () => {
    expect(bootState({ reducedMotion: false, webgl: true })).toBe('animate');
  });
  it('holds a still frame under reduced motion', () => {
    expect(bootState({ reducedMotion: true, webgl: true })).toBe('still');
  });
  it('does nothing without WebGL', () => {
    expect(bootState({ reducedMotion: false, webgl: false })).toBe('none');
  });
  it('prefers none over still when both apply', () => {
    expect(bootState({ reducedMotion: true, webgl: false })).toBe('none');
  });
});
