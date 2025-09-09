import { describe, it, expect } from 'vitest';
import { generateMetaTitle, generatePageMetaTitle } from './meta-title';

describe('generateMetaTitle', () => {
  describe('basic functionality', () => {
    it('should combine page title and website title with default separator', () => {
      const result = generateMetaTitle('My Projects', 'Harrison Callahan');
      expect(result).toBe('My Projects - Harrison Callahan');
    });

    it('should use custom separator', () => {
      const result = generateMetaTitle('About', 'Bracket Bear', ' | ');
      expect(result).toBe('About | Bracket Bear');
    });

    it('should trim whitespace from both titles', () => {
      const result = generateMetaTitle(
        '  My Projects  ',
        '  Harrison Callahan  '
      );
      expect(result).toBe('My Projects - Harrison Callahan');
    });
  });

  describe('edge cases', () => {
    it('should return website title when page title is empty', () => {
      const result = generateMetaTitle('', 'Harrison Callahan');
      expect(result).toBe('Harrison Callahan');
    });

    it('should return website title when page title is only whitespace', () => {
      const result = generateMetaTitle('   ', 'Harrison Callahan');
      expect(result).toBe('Harrison Callahan');
    });

    it('should return page title when website title is empty', () => {
      const result = generateMetaTitle('My Projects', '');
      expect(result).toBe('My Projects');
    });

    it('should return page title when website title is only whitespace', () => {
      const result = generateMetaTitle('My Projects', '   ');
      expect(result).toBe('My Projects');
    });

    it('should return empty string when both titles are empty', () => {
      const result = generateMetaTitle('', '');
      expect(result).toBe('');
    });

    it('should return empty string when both titles are only whitespace', () => {
      const result = generateMetaTitle('   ', '   ');
      expect(result).toBe('');
    });
  });

  describe('separator handling', () => {
    it('should work with empty separator', () => {
      const result = generateMetaTitle('My Projects', 'Harrison Callahan', '');
      expect(result).toBe('My ProjectsHarrison Callahan');
    });

    it('should work with multi-character separator', () => {
      const result = generateMetaTitle('About', 'Bracket Bear', ' :: ');
      expect(result).toBe('About :: Bracket Bear');
    });

    it('should work with special characters in separator', () => {
      const result = generateMetaTitle('Projects', 'Portfolio', ' → ');
      expect(result).toBe('Projects → Portfolio');
    });
  });

  describe('real-world examples', () => {
    it('should work with portfolio page titles', () => {
      const examples = [
        {
          page: 'My Projects',
          website: 'Harrison Callahan',
          expected: 'My Projects - Harrison Callahan',
        },
        {
          page: 'About Me',
          website: 'Harrison Callahan',
          expected: 'About Me - Harrison Callahan',
        },
        {
          page: 'Work History',
          website: 'Harrison Callahan',
          expected: 'Work History - Harrison Callahan',
        },
        {
          page: 'Contact',
          website: 'Harrison Callahan',
          expected: 'Contact - Harrison Callahan',
        },
      ];

      examples.forEach(({ page, website, expected }) => {
        const result = generateMetaTitle(page, website);
        expect(result).toBe(expected);
      });
    });

    it('should work with different website titles', () => {
      const examples = [
        {
          page: 'About',
          website: 'Bracket Bear',
          expected: 'About - Bracket Bear',
        },
        {
          page: 'Services',
          website: 'Acme Corp',
          expected: 'Services - Acme Corp',
        },
        { page: 'Blog', website: 'Tech Blog', expected: 'Blog - Tech Blog' },
      ];

      examples.forEach(({ page, website, expected }) => {
        const result = generateMetaTitle(page, website);
        expect(result).toBe(expected);
      });
    });
  });
});

describe('generatePageMetaTitle', () => {
  describe('auto-generation', () => {
    it('should auto-generate from page title', () => {
      const pageData = {
        title: 'My Projects',
      };
      const result = generatePageMetaTitle(pageData, 'Harrison Callahan');
      expect(result).toBe('My Projects - Harrison Callahan');
    });

    it('should auto-generate when title is provided', () => {
      const pageData = {
        title: 'About Me',
      };
      const result = generatePageMetaTitle(pageData, 'Harrison Callahan');
      expect(result).toBe('About Me - Harrison Callahan');
    });

    it('should auto-generate when title is provided', () => {
      const pageData = {
        title: 'Work History',
      };
      const result = generatePageMetaTitle(pageData, 'Harrison Callahan');
      expect(result).toBe('Work History - Harrison Callahan');
    });
  });

  describe('edge cases', () => {
    it('should handle empty page title', () => {
      const pageData = {
        title: '',
      };
      const result = generatePageMetaTitle(pageData, 'Harrison Callahan');
      expect(result).toBe('Harrison Callahan');
    });

    it('should handle undefined page title', () => {
      const pageData = {
        title: undefined,
      };
      const result = generatePageMetaTitle(pageData, 'Harrison Callahan');
      expect(result).toBe('Harrison Callahan');
    });

    it('should handle empty website title', () => {
      const pageData = {
        title: 'My Projects',
      };
      const result = generatePageMetaTitle(pageData, '');
      expect(result).toBe('My Projects');
    });
  });

  describe('custom separator', () => {
    it('should use custom separator in auto-generation', () => {
      const pageData = {
        title: 'About',
      };
      const result = generatePageMetaTitle(pageData, 'Bracket Bear', ' | ');
      expect(result).toBe('About | Bracket Bear');
    });

    it('should use custom separator with different titles', () => {
      const pageData = {
        title: 'Services',
      };
      const result = generatePageMetaTitle(pageData, 'Acme Corp', ' → ');
      expect(result).toBe('Services → Acme Corp');
    });
  });

  describe('real-world scenarios', () => {
    it('should work with portfolio site data', () => {
      const portfolioData = [
        {
          pageData: { title: 'My Projects' },
          websiteTitle: 'Harrison Callahan',
          expected: 'My Projects - Harrison Callahan',
        },
        {
          pageData: {
            title: 'About Me',
          },
          websiteTitle: 'Harrison Callahan',
          expected: 'About Me - Harrison Callahan',
        },
        {
          pageData: { title: 'Work History' },
          websiteTitle: 'Harrison Callahan',
          expected: 'Work History - Harrison Callahan',
        },
      ];

      portfolioData.forEach(({ pageData, websiteTitle, expected }) => {
        const result = generatePageMetaTitle(pageData, websiteTitle);
        expect(result).toBe(expected);
      });
    });

    it('should work with different site configurations', () => {
      const siteConfigs = [
        {
          pageData: { title: 'About' },
          websiteTitle: 'Bracket Bear',
          separator: ' | ',
          expected: 'About | Bracket Bear',
        },
        {
          pageData: { title: 'Services' },
          websiteTitle: 'Acme Corp',
          separator: ' → ',
          expected: 'Services → Acme Corp',
        },
      ];

      siteConfigs.forEach(({ pageData, websiteTitle, separator, expected }) => {
        const result = generatePageMetaTitle(pageData, websiteTitle, separator);
        expect(result).toBe(expected);
      });
    });
  });
});
