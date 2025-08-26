/**
 * Tests for the CSS arbitrary value scanner
 */

import { describe, it, expect } from 'vitest';
import {
  calculateLikelihood,
  getSuggestedUtilities,
  getLikelihoodReason,
  extractArbitraryValues,
} from './find-arbitrary-css.js';

describe('CSS Arbitrary Value Scanner', () => {
  describe('calculateLikelihood', () => {
    it('should give high scores to px values', () => {
      const score1 = calculateLikelihood('16px', 'text-[16px]');
      const score2 = calculateLikelihood(
        '4px_4px_0_rgba(0,0,0,0.3)',
        'shadow-[4px_4px_0_rgba(0,0,0,0.3)]'
      );

      expect(score1).toBeGreaterThanOrEqual(85);
      expect(score2).toBeGreaterThanOrEqual(85);
    });

    it('should give very high scores to known CSS variables', () => {
      const score = calculateLikelihood(
        'var(--color-primary)',
        'bg-[var(--color-primary)]'
      );
      expect(score).toBeGreaterThanOrEqual(90);
    });

    it('should give lower scores to rem/em values', () => {
      const score1 = calculateLikelihood('2rem', 'text-[2rem]');
      const score2 = calculateLikelihood('1.5em', 'text-[1.5em]');

      expect(score1).toBeLessThan(50);
      expect(score2).toBeLessThan(50);
    });

    it('should give high scores to shadow patterns with px', () => {
      const score = calculateLikelihood(
        '8px_8px_0_#000',
        'shadow-[8px_8px_0_#000]'
      );
      expect(score).toBeGreaterThanOrEqual(85);
    });

    it('should give lower scores to custom shadows with CSS variables', () => {
      const score = calculateLikelihood(
        '4px_4px_0_var(--color-border)',
        'shadow-[4px_4px_0_var(--color-border)]'
      );
      expect(score).toBeGreaterThanOrEqual(70);
    });

    it('should give medium scores to color values', () => {
      const score = calculateLikelihood('#ff0000', 'bg-[#ff0000]');
      expect(score).toBeGreaterThanOrEqual(40);
      expect(score).toBeLessThan(70);
    });

    it('should give low scores to complex gradients', () => {
      const score = calculateLikelihood(
        'linear-gradient(45deg, red, blue)',
        'bg-[linear-gradient(45deg, red, blue)]'
      );
      expect(score).toBeLessThan(40);
    });

    it('should give very high scores for duplicate values', () => {
      const singleScore = calculateLikelihood('2rem', 'text-[2rem]', 1);
      const duplicateScore = calculateLikelihood('2rem', 'text-[2rem]', 3);

      expect(duplicateScore).toBeGreaterThan(singleScore);
      expect(duplicateScore).toBeGreaterThanOrEqual(95);
    });
  });

  describe('getSuggestedUtilities', () => {
    it('should suggest utilities for known CSS variables', () => {
      const suggestions = getSuggestedUtilities('var(--color-primary)');
      expect(suggestions).toContain('bg-primary');
      expect(suggestions).toContain('text-primary');
    });

    it('should suggest rem alternatives for px values', () => {
      const suggestions = getSuggestedUtilities('16px');
      expect(suggestions).toContain(
        'Consider using rem or em for responsive design'
      );
      expect(suggestions).toContain('1.00rem (responsive alternative)');
    });

    it('should suggest utilities for color values', () => {
      const suggestions = getSuggestedUtilities('rgba(0,0,0,0.3)');
      // The function returns suggestions from TAILWIND_UTILITIES
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should suggest shadow utilities for shadow patterns', () => {
      const suggestions = getSuggestedUtilities('4px_4px_0_rgba(0,0,0,0.3)');
      // Should suggest px alternatives and shadow utilities
      expect(suggestions).toContain(
        'Consider using rem or em for responsive design'
      );
      expect(suggestions.length).toBeGreaterThan(1);
    });

    it('should return empty array for unknown values', () => {
      const suggestions = getSuggestedUtilities('unknown-value');
      expect(suggestions).toEqual([]);
    });
  });

  describe('getLikelihoodReason', () => {
    it('should identify px usage', () => {
      const reason = getLikelihoodReason('16px', 'text-[16px]');
      expect(reason).toContain('🚨 Uses px units');
    });

    it('should identify known CSS variables', () => {
      const reason = getLikelihoodReason(
        'var(--color-primary)',
        'bg-[var(--color-primary)]'
      );
      expect(reason).toContain('✅ Known CSS variable');
    });

    it('should identify shadow patterns', () => {
      const reason = getLikelihoodReason(
        '4px_4px_0_rgba(0,0,0,0.3)',
        'shadow-[4px_4px_0_rgba(0,0,0,0.3)]'
      );
      expect(reason).toContain('🚨 Shadow with px units');
    });

    it('should identify color values', () => {
      const reason = getLikelihoodReason('#ff0000', 'bg-[#ff0000]');
      expect(reason).toContain('🎨 Color value');
    });

    it('should combine multiple reasons', () => {
      const reason = getLikelihoodReason(
        '4px_4px_0_var(--color-primary)',
        'shadow-[4px_4px_0_var(--color-primary)]'
      );
      expect(reason).toContain('🚨 Uses px units');
      expect(reason).toContain('✅ Known CSS variable');
      expect(reason).toContain('🚨 Shadow with px units');
    });

    it('should identify duplicate usage', () => {
      const reason = getLikelihoodReason('16px', 'text-[16px]', 3);
      expect(reason).toContain('🔁 Used 3 times in same file');
    });
  });

  describe('extractArbitraryValues', () => {
    it('should extract simple arbitrary values', () => {
      const classString = 'bg-primary text-[16px] font-bold';
      const values = extractArbitraryValues(classString);

      expect(values).toHaveLength(1);
      expect(values[0].value).toBe('[16px]');
      expect(values[0].rawValue).toBe('16px');
    });

    it('should extract multiple arbitrary values', () => {
      const classString =
        'bg-[var(--color-primary)] text-[16px] shadow-[4px_4px_0_#000]';
      const values = extractArbitraryValues(classString);

      expect(values).toHaveLength(3);
      expect(values.map((v) => v.rawValue)).toContain('var(--color-primary)');
      expect(values.map((v) => v.rawValue)).toContain('16px');
      expect(values.map((v) => v.rawValue)).toContain('4px_4px_0_#000');
    });

    it('should skip regex patterns', () => {
      const classString = 'pattern-[^a-z]+ test-[\\d+] regex-[.*]';
      const values = extractArbitraryValues(classString);

      expect(values).toHaveLength(0);
    });

    it('should skip string literals', () => {
      const classString = 'test-["string"] another-[\'literal\']';
      const values = extractArbitraryValues(classString);

      expect(values).toHaveLength(0);
    });

    it('should skip framework names', () => {
      const classString = 'framework-[react] lib-[vue] build-[astro]';
      const values = extractArbitraryValues(classString);

      expect(values).toHaveLength(0);
    });

    it('should skip TypeScript patterns', () => {
      const classString = 'type-[typeof] generic-[keyof] extends-[extends]';
      const values = extractArbitraryValues(classString);

      expect(values).toHaveLength(0);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle complex button styles', () => {
      const classString =
        'inline-flex items-center px-4 py-2 text-[14px] font-medium shadow-[2px_2px_0_rgba(0,0,0,0.1)] hover:shadow-[4px_4px_0_rgba(0,0,0,0.2)]';
      const values = extractArbitraryValues(classString);

      expect(values).toHaveLength(3);

      // All should have high likelihood due to px usage
      values.forEach(({ rawValue }) => {
        const likelihood = calculateLikelihood(rawValue, classString);
        expect(likelihood).toBeGreaterThanOrEqual(70);
      });
    });

    it('should handle CSS variable shadows', () => {
      const classString = 'shadow-[4px_4px_0_var(--color-border)] border-2';
      const values = extractArbitraryValues(classString);

      expect(values).toHaveLength(1);

      const likelihood = calculateLikelihood(values[0].rawValue, classString);
      expect(likelihood).toBeGreaterThanOrEqual(85); // High due to px and CSS var
    });

    it('should handle responsive design patterns', () => {
      const classString = 'text-[1.2rem] lg:text-[1.5rem] leading-[1.4]';
      const values = extractArbitraryValues(classString);

      expect(values).toHaveLength(3);

      // rem values should have lower scores
      const remValues = values.filter((v) => v.rawValue.includes('rem'));
      remValues.forEach(({ rawValue }) => {
        const likelihood = calculateLikelihood(rawValue, classString);
        expect(likelihood).toBeLessThan(50);
      });
    });

    it('should handle complex calc expressions', () => {
      const classString =
        'min-h-[calc(100vh - 120px)] max-w-[calc(100% - 2rem)]';
      const values = extractArbitraryValues(classString);

      expect(values).toHaveLength(2);

      // The one with px should have higher score
      const pxCalc = values.find((v) => v.rawValue.includes('px'));
      const remCalc = values.find((v) => v.rawValue.includes('rem'));

      const pxScore = calculateLikelihood(pxCalc.rawValue, classString);
      const remScore = calculateLikelihood(remCalc.rawValue, classString);

      expect(pxScore).toBeGreaterThan(remScore);
    });
  });
});
