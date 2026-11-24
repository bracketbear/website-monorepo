import { describe, expect, it } from 'vitest';
import { displayTitle } from './display-title';

describe('displayTitle', () => {
  it('keeps "an" lowercase mid-title', () => {
    expect(displayTitle('EVERYTHING IS AN EXPERIENCE')).toBe(
      'Everything Is an Experience'
    );
  });

  it('keeps "of" lowercase but capitalizes a leading "the"', () => {
    expect(displayTitle('THE ART OF IT')).toBe('The Art of It');
  });

  it('capitalizes a minor word when it is first', () => {
    expect(displayTitle('AN IDEA')).toBe('An Idea');
  });
});
