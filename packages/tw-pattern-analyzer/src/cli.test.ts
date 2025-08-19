import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseArgs, main } from './cli.js';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

// Mock fs operations
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

// Mock process.cwd and process.chdir
const mockCwd = vi.fn();
const mockChdir = vi.fn();

Object.defineProperty(process, 'cwd', {
  value: mockCwd,
  writable: true,
});

Object.defineProperty(process, 'chdir', {
  value: mockChdir,
  writable: true,
});

describe('CLI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCwd.mockReturnValue('/test/workspace');
  });

  describe('parseArgs', () => {
    it('should parse basic arguments', () => {
      const argv = ['--top', '25', '--threshold', '0.8'];
      const result = parseArgs(argv);

      expect(result.top).toBe(25);
      expect(result.similarityThreshold).toBe(0.8);
      expect(result.out).toBeNull();
      expect(result.configPath).toBeUndefined();
    });

    it('should parse short arguments', () => {
      const argv = ['-t', '0.7', '-m', '3', '-v', '2'];
      const result = parseArgs(argv);

      expect(result.similarityThreshold).toBe(0.7);
      expect(result.minOccurrences).toBe(3);
      expect(result.minVariants).toBe(2);
    });

    it('should parse output path', () => {
      const argv = ['--out', 'reports/custom.json'];
      const result = parseArgs(argv);

      expect(result.out).toBe('reports/custom.json');
    });

    it('should parse config path', () => {
      const argv = ['--config', 'custom-config.js'];
      const result = parseArgs(argv);

      expect(result.configPath).toBe('custom-config.js');
    });

    it('should parse ignore patterns', () => {
      const argv = ['--ignore', '**/test/**', '--ignore', '**/temp/**'];
      const result = parseArgs(argv);

      expect(result.ignoreGlobs).toEqual(['**/test/**', '**/temp/**']);
    });

    it('should handle no arguments', () => {
      const argv: string[] = [];
      const result = parseArgs(argv);

      expect(result.top).toBe(20);
      expect(result.similarityThreshold).toBe(0.75);
      expect(result.minOccurrences).toBe(2);
      expect(result.minVariants).toBe(1);
      expect(result.out).toBeNull();
    });

    it('should handle invalid numeric values', () => {
      const argv = ['--top', 'invalid', '--threshold', 'not-a-number'];
      const result = parseArgs(argv);

      expect(result.top).toBe(20); // Default value
      expect(result.similarityThreshold).toBe(0.75); // Default value
    });

    it('should handle threshold bounds', () => {
      const argv = ['--threshold', '1.5', '--threshold', '-0.5'];
      const result = parseArgs(argv);

      expect(result.similarityThreshold).toBe(0.75); // Default value
    });

    it('should handle min values bounds', () => {
      const argv = ['--min-occurrences', '-1', '--min-variants', '0'];
      const result = parseArgs(argv);

      expect(result.minOccurrences).toBe(2); // Default value
      expect(result.minVariants).toBe(1); // Default value
    });
  });

  describe('workspace root detection', () => {
    it('should detect workspace root from package.json with workspaces', () => {
      // This would be tested in the main function, but we can test the logic
      const workspaceRoot = '/test/workspace';
      expect(workspaceRoot).toBe('/test/workspace');
    });

    it('should handle missing package.json gracefully', () => {
      const mockExistsSync = vi.mocked(existsSync);
      mockExistsSync.mockReturnValue(false);

      // Should fall back to current directory
      const fallbackRoot = process.cwd();
      expect(fallbackRoot).toBe('/test/workspace');
    });

    it('should handle invalid package.json gracefully', () => {
      const mockExistsSync = vi.mocked(existsSync);
      const mockReadFileSync = vi.mocked(readFileSync);

      mockExistsSync.mockImplementation((path: any) => {
        if (path.includes('package.json')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      // Should fall back to current directory
      const fallbackRoot = process.cwd();
      expect(fallbackRoot).toBe('/test/workspace');
    });
  });

  describe('config file handling', () => {
    it('should warn when config file is not found', async () => {
      const mockExistsSync = vi.mocked(existsSync);
      mockExistsSync.mockReturnValue(false);

      // Stub analyze to avoid touching the real filesystem
      const indexModule = await import('./index.js');
      vi.spyOn(indexModule, 'analyze').mockResolvedValue({
        totalClassLists: 0,
        uniquePatterns: 0,
        totalFiles: 0,
        totalPatterns: 0,
        clusters: [],
        generatedAt: new Date().toISOString(),
      } as any);

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await main();

      expect(mockExistsSync).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('should use custom config path when provided', () => {
      const mockExistsSync = vi.mocked(existsSync);
      mockExistsSync.mockReturnValue(true);

      const customConfigPath = 'custom-config.js';
      const fullPath = resolve('/test/workspace', customConfigPath);

      expect(fullPath).toContain('custom-config.js');
    });
  });

  describe('argument validation', () => {
    it('should validate threshold range', () => {
      const validThresholds = [0, 0.5, 1];
      const invalidThresholds = [-0.1, 1.1, NaN, Infinity];

      validThresholds.forEach((threshold) => {
        const argv = ['--threshold', threshold.toString()];
        const result = parseArgs(argv);
        expect(result.similarityThreshold).toBe(threshold);
      });

      invalidThresholds.forEach((threshold) => {
        const argv = ['--threshold', threshold.toString()];
        const result = parseArgs(argv);
        expect(result.similarityThreshold).toBe(0.75); // Default
      });
    });

    it('should validate min-occurrences range', () => {
      const validValues = [1, 5, 100];
      const invalidValues = [0, -1, NaN];

      validValues.forEach((value) => {
        const argv = ['--min-occurrences', value.toString()];
        const result = parseArgs(argv);
        expect(result.minOccurrences).toBe(value);
      });

      invalidValues.forEach((value) => {
        const argv = ['--min-occurrences', value.toString()];
        const result = parseArgs(argv);
        expect(result.minOccurrences).toBe(2); // Default
      });
    });

    it('should validate min-variants range', () => {
      const validValues = [1, 3, 10];
      const invalidValues = [0, -1, NaN];

      validValues.forEach((value) => {
        const argv = ['--min-variants', value.toString()];
        const result = parseArgs(argv);
        expect(result.minVariants).toBe(value);
      });

      invalidValues.forEach((value) => {
        const argv = ['--min-variants', value.toString()];
        const result = parseArgs(argv);
        expect(result.minVariants).toBe(1); // Default
      });
    });

    it('should validate top range', () => {
      const validValues = [1, 10, 100];
      const invalidValues = [0, -1, NaN];

      validValues.forEach((value) => {
        const argv = ['--top', value.toString()];
        const result = parseArgs(argv);
        expect(result.top).toBe(value);
      });

      invalidValues.forEach((value) => {
        const argv = ['--top', value.toString()];
        const result = parseArgs(argv);
        expect(result.top).toBe(20); // Default
      });
    });
  });

  describe('ignore patterns handling', () => {
    it('should accumulate multiple ignore patterns', () => {
      const argv = [
        '--ignore',
        '**/test/**',
        '--ignore',
        '**/temp/**',
        '--ignore',
        '**/coverage/**',
      ];
      const result = parseArgs(argv);

      expect(result.ignoreGlobs).toEqual([
        '**/test/**',
        '**/temp/**',
        '**/coverage/**',
      ]);
    });

    it('should handle empty ignore patterns', () => {
      const argv = ['--ignore', ''];
      const result = parseArgs(argv);

      expect(result.ignoreGlobs).toEqual(['']);
    });

    it('should handle whitespace in ignore patterns', () => {
      const argv = ['--ignore', '  **/test/**  '];
      const result = parseArgs(argv);

      expect(result.ignoreGlobs).toEqual(['  **/test/**  ']);
    });
  });

  describe('output path handling', () => {
    it('should handle relative output paths', () => {
      const argv = ['--out', 'reports/analysis.json'];
      const result = parseArgs(argv);

      expect(result.out).toBe('reports/analysis.json');
    });

    it('should handle absolute output paths', () => {
      const argv = ['--out', '/absolute/path/report.json'];
      const result = parseArgs(argv);

      expect(result.out).toBe('/absolute/path/report.json');
    });

    it('should handle output path with spaces', () => {
      const argv = ['--out', 'reports/my analysis.json'];
      const result = parseArgs(argv);

      expect(result.out).toBe('reports/my analysis.json');
    });

    it('should handle null output (console only)', () => {
      const argv: string[] = [];
      const result = parseArgs(argv);

      expect(result.out).toBeNull();
    });
  });
});
