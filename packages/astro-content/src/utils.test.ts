import { describe, it, expect } from 'vitest';
import { generateRelativeImagePath, contentPath, workPath } from './utils';

describe('utils', () => {
  describe('contentPath', () => {
    it('should point to the CMS content directory', () => {
      expect(contentPath).toContain('apps/cms/content');
    });
  });

  describe('workPath', () => {
    it('should join work directory with provided paths', () => {
      const result = workPath('companies', 'test.json');
      expect(result).toContain('work/companies/test.json');
    });

    it('should work with single path', () => {
      const result = workPath('skills');
      expect(result).toContain('work/skills');
    });

    it('should work with no paths', () => {
      const result = workPath();
      expect(result).toContain('work');
    });
  });

  describe('generateRelativeImagePath', () => {
    it('should generate relative path from current path to image path', () => {
      const currentPath = '/test/current/path';
      const imagePath = 'work/projects/ds-bridge/coverImage.jpg';

      const result = generateRelativeImagePath(currentPath, imagePath);

      // Should return a relative path to the absolute image location
      expect(
        result.endsWith(
          '/apps/cms/content/work/projects/ds-bridge/coverImage.jpg'
        )
      ).toBe(true);
    });

    it('should handle paths with different separators', () => {
      const currentPath = 'C:\\test\\current\\path';
      const imagePath = 'work/projects/test/image.png';

      const result = generateRelativeImagePath(currentPath, imagePath);

      // Should still work with Windows-style paths
      expect(result).toContain('apps/cms/content/work/projects/test/image.png');
    });

    it('should handle empty image path', () => {
      const currentPath = '/test/path';
      const imagePath = '';

      const result = generateRelativeImagePath(currentPath, imagePath);

      expect(result).toContain('apps/cms/content');
    });
  });
});
