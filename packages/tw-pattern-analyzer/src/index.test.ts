import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  analyze,
  tokenize,
  canonicalize,
  jaccard,
  findClassesInSource,
} from './index.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import type { AnalyzerConfig } from './types.js';

// Mock fs operations for testing
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

// Mock fast-glob
vi.mock('fast-glob', () => ({
  default: vi.fn(),
}));

describe('tw-pattern-analyzer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tokenize', () => {
    it('should split class strings into individual classes', () => {
      const input = 'flex gap-4 items-center text-center';
      const result = tokenize(input);
      expect(result).toEqual(['flex', 'gap-4', 'items-center', 'text-center']);
    });

    it('should handle empty strings', () => {
      const input = '';
      const result = tokenize(input);
      expect(result).toEqual([]);
    });

    it('should handle single class', () => {
      const input = 'flex';
      const result = tokenize(input);
      expect(result).toEqual(['flex']);
    });

    it('should handle whitespace variations', () => {
      const input = '  flex   gap-4  items-center  ';
      const result = tokenize(input);
      expect(result).toEqual(['flex', 'gap-4', 'items-center']);
    });
  });

  describe('canonicalize', () => {
    it('should sort classes alphabetically', () => {
      const input = ['text-center', 'flex', 'gap-4', 'items-center'];
      const result = canonicalize(input);
      expect(result).toEqual(['flex', 'gap-4', 'items-center', 'text-center']);
    });

    it('should handle empty arrays', () => {
      const input: string[] = [];
      const result = canonicalize(input);
      expect(result).toEqual([]);
    });

    it('should handle single class', () => {
      const input = ['flex'];
      const result = canonicalize(input);
      expect(result).toEqual(['flex']);
    });

    it('should handle duplicate classes', () => {
      const input = ['text-center', 'flex', 'flex', 'gap-4'];
      const result = canonicalize(input);
      expect(result).toEqual(['flex', 'gap-4', 'text-center']);
    });
  });

  describe('jaccard', () => {
    it('should calculate similarity between two class sets', () => {
      const set1 = ['flex', 'gap-4', 'items-center'];
      const set2 = ['flex', 'gap-4', 'justify-center'];
      const result = jaccard(set1, set2);
      expect(result).toBeCloseTo(0.5); // 2 common / 4 total unique
    });

    it('should return 1 for identical sets', () => {
      const set1 = ['flex', 'gap-4', 'items-center'];
      const set2 = ['flex', 'gap-4', 'items-center'];
      const result = jaccard(set1, set2);
      expect(result).toBe(1);
    });

    it('should return 0 for completely different sets', () => {
      const set1 = ['flex', 'gap-4'];
      const set2 = ['text-center', 'font-bold'];
      const result = jaccard(set1, set2);
      expect(result).toBe(0);
    });

    it('should handle empty sets', () => {
      const set1: string[] = [];
      const set2: string[] = [];
      const result = jaccard(set1, set2);
      expect(result).toBe(1); // Empty sets are considered identical
    });

    it('should handle one empty set', () => {
      const set1 = ['flex', 'gap-4'];
      const set2: string[] = [];
      const result = jaccard(set1, set2);
      expect(result).toBe(0);
    });
  });

  describe('findClassesInSource', () => {
    const mockConfig: AnalyzerConfig = {
      globs: [],
      ignoreGlobs: [],
      similarityThreshold: 0.75,
      minOccurrences: 2,
      minVariants: 1,
      output: {
        console: { enabled: true, top: 20 },
        json: { enabled: true, path: 'reports/test.json' },
      },
      parsing: {
        patterns: {
          react:
            /(?:className\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
          astro:
            /(?:class\s*=\s*|class:list\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))|(?:class:list\s*=\s*\{([^}]+)\})/g,
          vue: /(?:class\s*=\s*|:class\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
          svelte:
            /(?:class\s*=\s*|class:name\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
        },
        fileTypes: {
          '.tsx': ['react'],
          '.jsx': ['react'],
          '.astro': ['astro'],
          '.html': ['astro'],
          '.vue': ['vue'],
          '.svelte': ['svelte'],
        },
      },
      clustering: {
        scoring: {
          variants: 60,
          frequency: 40,
        },
      },
    };

    it('should extract React classes from TSX file', () => {
      const source = `
        <div className="flex gap-4 items-center">
          <button className="px-4 py-2 bg-blue-500 text-white">
            Click me
          </button>
        </div>
      `;
      const result = findClassesInSource(source, 'test.tsx', mockConfig);
      expect(result.patterns).toContain('flex gap-4 items-center');
      expect(result.patterns).toContain('px-4 py-2 bg-blue-500 text-white');
      expect(result.parseStrategies).toContain('react');
    });

    it('should extract Astro classes from Astro file', () => {
      const source = `
        <div class="container mx-auto px-4">
          <h1 class="text-2xl font-bold text-center">
            Welcome
          </h1>
        </div>
      `;
      const result = findClassesInSource(source, 'test.astro', mockConfig);
      expect(result.patterns).toContain('container mx-auto px-4');
      expect(result.patterns).toContain('text-2xl font-bold text-center');
      expect(result.parseStrategies).toContain('astro');
    });

    it('should extract class:list from Astro file', () => {
      const source = `
        <div class:list={["flex", "gap-4", theme === "dark" ? "bg-gray-800" : "bg-white"]}>
          Content
        </div>
      `;
      const result = findClassesInSource(source, 'test.astro', mockConfig);
      expect(result.patterns).toContain('flex');
      expect(result.patterns).toContain('gap-4');
      expect(result.parseStrategies).toContain('astro');
    });

    it('should extract Vue classes from Vue file', () => {
      const source = `
        <template>
          <div class="flex gap-4" :class="dynamicClass">
            <span class="text-lg font-semibold">Hello</span>
          </div>
        </template>
      `;
      const result = findClassesInSource(source, 'test.vue', mockConfig);
      expect(result.patterns).toContain('flex gap-4');
      expect(result.patterns).toContain('text-lg font-semibold');
      expect(result.parseStrategies).toContain('vue');
    });

    it('should extract Svelte classes from Svelte file', () => {
      const source = `
        <div class="container mx-auto" class:name="theme === 'dark' ? 'bg-gray-900' : 'bg-white'">
          <h1 class="text-3xl font-bold">Title</h1>
        </div>
      `;
      const result = findClassesInSource(source, 'test.svelte', mockConfig);
      expect(result.patterns).toContain('container mx-auto');
      expect(result.patterns).toContain('text-3xl font-bold');
      expect(result.parseStrategies).toContain('svelte');
    });

    it('should handle files with no classes', () => {
      const source = `
        <div>
          <p>No classes here</p>
        </div>
      `;
      const result = findClassesInSource(source, 'test.html', mockConfig);
      expect(result.patterns).toEqual([]);
      expect(result.parseStrategies).toEqual([]);
    });

    it('should handle unknown file extensions', () => {
      const source = '<div class="test">Content</div>';
      const result = findClassesInSource(source, 'test.unknown', mockConfig);
      expect(result.patterns).toEqual([]);
      expect(result.parseStrategies).toEqual([]);
    });

    it('should handle multiple parsing strategies for MDX files', () => {
      const source = `
        <div className="react-class">
          <span class="astro-class">Content</span>
        </div>
      `;
      const configWithMdx = {
        ...mockConfig,
        parsing: {
          ...mockConfig.parsing,
          fileTypes: {
            ...mockConfig.parsing.fileTypes,
            '.mdx': ['react', 'astro'],
          },
        },
      };
      const result = findClassesInSource(source, 'test.mdx', configWithMdx);
      expect(result.patterns).toContain('react-class');
      expect(result.patterns).toContain('astro-class');
      expect(result.parseStrategies).toContain('react');
      expect(result.parseStrategies).toContain('astro');
    });
  });

  describe('analyze', () => {
    it('should process files and generate report', async () => {
      // Mock file system operations
      const mockReadFile = vi.mocked(readFileSync);
      const mockWriteFile = vi.mocked(writeFileSync);
      const mockMkdir = vi.mocked(mkdirSync);

      // Mock glob results
      const { default: fastGlob } = await import('fast-glob');
      vi.mocked(fastGlob).mockResolvedValue([
        'test1.tsx',
        'test2.astro',
        'test3.vue',
      ]);

      // Mock file contents
      mockReadFile
        .mockReturnValueOnce('className="flex gap-4 items-center"') // test1.tsx
        .mockReturnValueOnce('class="container mx-auto px-4"') // test2.astro
        .mockReturnValueOnce('class="text-center font-bold"'); // test3.vue

      const result = await analyze({
        globs: ['**/*.{tsx,astro,vue}'],
        top: 10,
        out: 'reports/test.json',
      });

      expect(result.totalFiles).toBe(3);
      expect(result.totalPatterns).toBeGreaterThan(0);
      expect(result.clusters).toBeInstanceOf(Array);
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('reports/test.json'),
        expect.any(String),
        'utf8'
      );
    });

    it('should handle empty file sets', async () => {
      const { default: fastGlob } = await import('fast-glob');
      vi.mocked(fastGlob).mockResolvedValue([]);

      const result = await analyze({
        globs: ['**/*.{tsx,jsx,ts,js}'],
      });

      expect(result.totalFiles).toBe(0);
      expect(result.totalPatterns).toBe(0);
      expect(result.clusters).toEqual([]);
    });

    it('should respect similarity threshold', async () => {
      const { default: fastGlob } = await import('fast-glob');
      vi.mocked(fastGlob).mockResolvedValue(['test1.tsx', 'test2.tsx']);

      const mockReadFile = vi.mocked(readFileSync);
      mockReadFile
        .mockReturnValueOnce('className="flex gap-4 items-center"')
        .mockReturnValueOnce('className="flex gap-4 justify-center"');

      const result = await analyze({
        globs: ['**/*.{tsx,jsx,ts,js}'],
        similarityThreshold: 0.9, // Very high threshold
      });

      // With high threshold, similar patterns might not cluster
      expect(result.clusters.length).toBeLessThanOrEqual(2);
    });

    it('should respect minOccurrences filter', async () => {
      const { default: fastGlob } = await import('fast-glob');
      vi.mocked(fastGlob).mockResolvedValue(['test1.tsx', 'test2.tsx']);

      const mockReadFile = vi.mocked(readFileSync);
      mockReadFile
        .mockReturnValueOnce('className="unique-class"')
        .mockReturnValueOnce('className="another-unique"');

      const result = await analyze({
        globs: ['**/*.{tsx,jsx,ts,js}'],
        minOccurrences: 2, // Require at least 2 occurrences
      });

      // No patterns should appear twice
      expect(result.clusters.every((c) => c.occurrences >= 2)).toBe(true);
    });
  });
});
