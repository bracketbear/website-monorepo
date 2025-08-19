import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyze } from './index.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

// Mock fs operations
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    existsSync: vi.fn(),
  };
});

// Mock fast-glob
vi.mock('fast-glob', () => ({
  default: vi.fn(),
}));

describe('Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock config file exists
    vi.mocked(existsSync).mockImplementation((path: any) => {
      if (path.includes('tw-pattern-analyzer.config.js')) return true;
      return false;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('End-to-End Analysis', () => {
    it('should analyze a React codebase and generate clusters', async () => {
      const { default: fastGlob } = await import('fast-glob');
      vi.mocked(fastGlob).mockResolvedValue([
        'components/Button.tsx',
        'components/Card.tsx',
        'components/Header.tsx',
        'pages/Home.tsx',
      ]);

      const mockReadFile = vi.mocked(readFileSync);
      mockReadFile.mockReturnValueOnce(`
          <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Click me
          </button>
        `).mockReturnValueOnce(`
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Card Title</h2>
            <p className="text-gray-600">Card content</p>
          </div>
        `).mockReturnValueOnce(`
          <header className="bg-white shadow-sm border-b">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-bold text-gray-900">Logo</h1>
                </div>
              </div>
            </nav>
          </header>
        `).mockReturnValueOnce(`
          <div className="min-h-screen bg-gray-50">
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
              <div className="px-4 py-6 sm:px-0">
                <h1 className="text-3xl font-bold text-gray-900">Welcome</h1>
                <p className="mt-4 text-gray-600">Home page content</p>
              </div>
            </main>
          </div>
        `);

      const result = await analyze({
        globs: ['**/*.{tsx,jsx,ts,js}'],
        top: 10,
        out: 'reports/react-analysis.json',
      });

      expect(result.totalFiles).toBe(4);
      expect(result.totalPatterns).toBeGreaterThan(0);
      expect(result.clusters).toBeInstanceOf(Array);
      expect(result.clusters.length).toBeGreaterThan(0);

      // Should find common patterns
      const flexPatterns = result.clusters.filter(
        (c) =>
          c.rep.includes('flex') || c.members.some((m) => m.includes('flex'))
      );
      expect(flexPatterns.length).toBeGreaterThan(0);

      // Should find text patterns
      const textPatterns = result.clusters.filter(
        (c) =>
          c.rep.includes('text-') || c.members.some((m) => m.includes('text-'))
      );
      expect(textPatterns.length).toBeGreaterThan(0);
    });

    it('should analyze an Astro codebase with class:list directives', async () => {
      const { default: fastGlob } = await import('fast-glob');
      vi.mocked(fastGlob).mockResolvedValue([
        'components/Navigation.astro',
        'layouts/Layout.astro',
        'pages/index.astro',
      ]);

      const mockReadFile = vi.mocked(readFileSync);
      mockReadFile.mockReturnValueOnce(`
          <nav class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div class="flex justify-between items-center h-16">
                <div class="flex items-center space-x-4">
                  <a href="/" class="text-xl font-bold text-gray-900">Home</a>
                  <a href="/about" class="text-gray-600 hover:text-gray-900">About</a>
                </div>
              </div>
            </div>
          </nav>
        `).mockReturnValueOnce(`
          <html lang="en">
            <head>
              <meta charset="utf-8" />
              <title>My Site</title>
            </head>
            <body class="bg-gray-50">
              <slot />
            </body>
          </html>
        `).mockReturnValueOnce(`
          <Layout>
            <main class="min-h-screen">
              <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div class="px-4 py-6 sm:px-0">
                  <h1 class="text-3xl font-bold text-gray-900">Welcome</h1>
                  <p class="mt-4 text-gray-600">Welcome to my site!</p>
                </div>
              </div>
            </main>
          </Layout>
        `);

      const result = await analyze({
        globs: ['**/*.astro'],
        top: 10,
        out: 'reports/astro-analysis.json',
      });

      expect(result.totalFiles).toBe(3);
      expect(result.totalPatterns).toBeGreaterThan(0);

      // Should find common layout patterns
      const layoutPatterns = result.clusters.filter(
        (c) =>
          c.rep.includes('max-w-7xl') ||
          c.members.some((m) => m.includes('max-w-7xl'))
      );
      expect(layoutPatterns.length).toBeGreaterThan(0);
    });

    it('should analyze a mixed framework codebase', async () => {
      const { default: fastGlob } = await import('fast-glob');
      vi.mocked(fastGlob).mockResolvedValue([
        'components/Button.tsx',
        'components/Card.astro',
        'components/Modal.vue',
        'components/Tooltip.svelte',
      ]);

      const mockReadFile = vi.mocked(readFileSync);
      mockReadFile.mockReturnValueOnce(`
          <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            React Button
          </button>
        `).mockReturnValueOnce(`
          <div class="p-6 bg-white rounded-lg shadow-md">
            <h2 class="text-xl font-bold text-gray-900 mb-4">Astro Card</h2>
            <p class="text-gray-600">Card content</p>
          </div>
        `).mockReturnValueOnce(`
          <template>
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div class="bg-white rounded-lg p-6 max-w-md w-full">
                <h3 class="text-lg font-semibold mb-4">Vue Modal</h3>
                <p class="text-gray-600">Modal content</p>
              </div>
            </div>
          </template>
        `).mockReturnValueOnce(`
          <div class="relative inline-block">
            <div class="bg-gray-900 text-white text-sm rounded py-1 px-2 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2">
              Svelte Tooltip
            </div>
          </div>
        `);

      const result = await analyze({
        globs: ['**/*.{tsx,astro,vue,svelte}'],
        top: 10,
        out: 'reports/mixed-analysis.json',
      });

      expect(result.totalFiles).toBe(4);
      expect(result.totalPatterns).toBeGreaterThan(0);

      // Should find common patterns across frameworks
      const commonPatterns = result.clusters.filter(
        (c) =>
          c.rep.includes('bg-white') ||
          c.members.some((m) => m.includes('bg-white'))
      );
      expect(commonPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Integration', () => {
    it('should respect custom similarity threshold', async () => {
      const { default: fastGlob } = await import('fast-glob');
      vi.mocked(fastGlob).mockResolvedValue([
        'test1.tsx',
        'test2.tsx',
        'test3.tsx',
      ]);

      const mockReadFile = vi.mocked(readFileSync);
      mockReadFile
        .mockReturnValueOnce('className="flex gap-4 items-center"')
        .mockReturnValueOnce('className="flex gap-4 justify-center"')
        .mockReturnValueOnce('className="text-center font-bold"');

      const highThresholdResult = await analyze({
        globs: ['**/*.{tsx,jsx,ts,js}'],
        similarityThreshold: 0.9,
        out: 'reports/high-threshold.json',
      });

      const lowThresholdResult = await analyze({
        globs: ['**/*.{tsx,jsx,ts,js}'],
        similarityThreshold: 0.5,
        out: 'reports/low-threshold.json',
      });

      // Higher threshold should result in fewer clusters
      expect(highThresholdResult.clusters.length).toBeGreaterThanOrEqual(
        lowThresholdResult.clusters.length
      );
    });

    it('should respect minimum occurrences filter', async () => {
      const { default: fastGlob } = await import('fast-glob');
      vi.mocked(fastGlob).mockResolvedValue([
        'test1.tsx',
        'test2.tsx',
        'test3.tsx',
        'test4.tsx',
      ]);

      const mockReadFile = vi.mocked(readFileSync);
      mockReadFile
        .mockReturnValueOnce('className="unique-pattern-1"')
        .mockReturnValueOnce('className="unique-pattern-2"')
        .mockReturnValueOnce('className="common-pattern"')
        .mockReturnValueOnce('className="common-pattern"');

      const result = await analyze({
        globs: ['**/*.{tsx,jsx,ts,js}'],
        minOccurrences: 2,
        out: 'reports/min-occurrences.json',
      });

      // Should only include patterns that appear at least twice
      expect(result.clusters.every((c) => c.occurrences >= 2)).toBe(true);
    });

    it('should respect minimum variants filter', async () => {
      const { default: fastGlob } = await import('fast-glob');
      vi.mocked(fastGlob).mockResolvedValue([
        'test1.tsx',
        'test2.tsx',
        'test3.tsx',
      ]);

      const mockReadFile = vi.mocked(readFileSync);
      mockReadFile
        .mockReturnValueOnce('className="pattern-a"')
        .mockReturnValueOnce('className="pattern-b"')
        .mockReturnValueOnce('className="pattern-c"');

      const result = await analyze({
        globs: ['**/*.{tsx,jsx,ts,js}'],
        minVariants: 2,
        out: 'reports/min-variants.json',
      });

      // Should only include clusters with at least 2 variants
      expect(result.clusters.every((c) => c.variants >= 2)).toBe(true);
    });
  });

  describe('Output Generation', () => {
    it('should generate JSON report when output is enabled', async () => {
      const { default: fastGlob } = await import('fast-glob');
      vi.mocked(fastGlob).mockResolvedValue(['test.tsx']);

      const mockReadFile = vi.mocked(readFileSync);
      const mockWriteFile = vi.mocked(writeFileSync);

      mockReadFile.mockReturnValue('className="flex gap-4 items-center"');

      await analyze({
        globs: ['**/*.{tsx,jsx,ts,js}'],
        out: 'reports/test-output.json',
      });

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('reports/test-output.json'),
        expect.any(String),
        'utf8'
      );
    });

    it('should not generate JSON report when output is disabled', async () => {
      const { default: fastGlob } = await import('fast-glob');
      vi.mocked(fastGlob).mockResolvedValue(['test.tsx']);

      const mockReadFile = vi.mocked(readFileSync);
      const mockWriteFile = vi.mocked(writeFileSync);

      mockReadFile.mockReturnValue('className="flex gap-4 items-center"');

      await analyze({
        globs: ['**/*.{tsx,jsx,ts,js}'],
        out: null, // Disable output
      });

      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('should create reports directory if it does not exist', async () => {
      const { default: fastGlob } = await import('fast-glob');
      vi.mocked(fastGlob).mockResolvedValue(['test.tsx']);

      const mockReadFile = vi.mocked(readFileSync);
      const mockMkdir = vi.mocked(mkdirSync);

      mockReadFile.mockReturnValue('className="flex gap-4 items-center"');

      await analyze({
        globs: ['**/*.{tsx,jsx,ts,js}'],
        out: 'reports/new-directory/analysis.json',
      });

      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('reports/new-directory'),
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle files that cannot be read', async () => {
      const { default: fastGlob } = await import('fast-glob');
      vi.mocked(fastGlob).mockResolvedValue([
        'valid.tsx',
        'invalid.tsx',
        'valid2.tsx',
      ]);

      const mockReadFile = vi.mocked(readFileSync);
      mockReadFile
        .mockReturnValueOnce('className="valid-pattern"')
        .mockImplementationOnce(() => {
          throw new Error('File read error');
        })
        .mockReturnValueOnce('className="another-valid-pattern"');

      const result = await analyze({
        globs: ['**/*.{tsx,jsx,ts,js}'],
        out: 'reports/error-handling.json',
      });

      // Should still process valid files
      expect(result.totalFiles).toBe(3);
      expect(result.totalPatterns).toBeGreaterThan(0);
    });

    it('should handle empty files gracefully', async () => {
      const { default: fastGlob } = await import('fast-glob');
      vi.mocked(fastGlob).mockResolvedValue(['empty.tsx', 'content.tsx']);

      const mockReadFile = vi.mocked(readFileSync);
      mockReadFile
        .mockReturnValueOnce('') // Empty file
        .mockReturnValueOnce('className="flex gap-4 items-center"');

      const result = await analyze({
        globs: ['**/*.{tsx,jsx,ts,js}'],
        out: 'reports/empty-files.json',
      });

      expect(result.totalFiles).toBe(2);
      expect(result.totalPatterns).toBeGreaterThan(0);
    });

    it('should handle files with no Tailwind classes', async () => {
      const { default: fastGlob } = await import('fast-glob');
      vi.mocked(fastGlob).mockResolvedValue([
        'no-classes.tsx',
        'with-classes.tsx',
      ]);

      const mockReadFile = vi.mocked(readFileSync);
      mockReadFile
        .mockReturnValueOnce(
          `
          <div>
            <p>No Tailwind classes here</p>
            <span>Just plain HTML</span>
          </div>
        `
        )
        .mockReturnValueOnce('className="flex gap-4 items-center"');

      const result = await analyze({
        globs: ['**/*.{tsx,jsx,ts,js}'],
        out: 'reports/no-classes.json',
      });

      expect(result.totalFiles).toBe(2);
      expect(result.totalPatterns).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of files efficiently', async () => {
      const { default: fastGlob } = await import('fast-glob');

      // Generate 100 test files
      const testFiles = Array.from({ length: 100 }, (_, i) => `file${i}.tsx`);
      vi.mocked(fastGlob).mockResolvedValue(testFiles);

      const mockReadFile = vi.mocked(readFileSync);
      testFiles.forEach(() => {
        mockReadFile.mockReturnValue('className="flex gap-4 items-center"');
      });

      const startTime = Date.now();
      const result = await analyze({
        globs: ['**/*.{tsx,jsx,ts,js}'],
        out: 'reports/performance-test.json',
      });
      const endTime = Date.now();

      expect(result.totalFiles).toBe(100);
      expect(result.totalPatterns).toBeGreaterThan(0);

      // Should complete within reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
    });

    it('should handle large numbers of unique patterns', async () => {
      const { default: fastGlob } = await import('fast-glob');
      vi.mocked(fastGlob).mockResolvedValue(['large-patterns.tsx']);

      const mockReadFile = vi.mocked(readFileSync);

      // Generate 50 unique patterns
      const patterns = Array.from(
        { length: 50 },
        (_, i) => `className="pattern-${i} class-${i} style-${i}"`
      ).join('\n');

      mockReadFile.mockReturnValue(patterns);

      const result = await analyze({
        globs: ['**/*.{tsx,jsx,ts,js}'],
        out: 'reports/large-patterns.json',
      });

      expect(result.totalFiles).toBe(1);
      expect(result.totalPatterns).toBeGreaterThanOrEqual(50);
    });
  });
});
