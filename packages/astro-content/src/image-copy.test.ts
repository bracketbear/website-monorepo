import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ensureContentImage, ensureProjectImage, ensureMediaImage } from './image-copy';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Mock fs and path modules
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  rmSync: vi.fn(),
  copyFileSync: vi.fn(),
}));

vi.mock('node:path', () => ({
  join: vi.fn(),
  dirname: vi.fn(),
  relative: vi.fn(),
}));

vi.mock('node:url', () => ({
  fileURLToPath: vi.fn(),
}));

const mockExistsSync = vi.mocked(existsSync);
const mockMkdirSync = vi.mocked(mkdirSync);
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockJoin = vi.mocked(join);
const mockDirname = vi.mocked(dirname);
const mockFileURLToPath = vi.mocked(fileURLToPath);

describe('image-copy', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockFileURLToPath.mockReturnValue('/test/workspace/packages/astro-content/src/image-copy.ts');
    mockDirname.mockReturnValue('/test/workspace/packages/astro-content/src');
    mockJoin.mockImplementation((...args) => args.join('/'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ensureContentImage', () => {
    it('should return public URL when image exists', () => {
      mockExistsSync.mockReturnValue(true);

      const result = ensureContentImage('work/projects', 'test-project', 'cover.jpg');

      expect(result).toBe('/test-project/cover.jpg');
    });

    it('should return undefined when no image path provided', () => {
      const result = ensureContentImage('work/projects', 'test-project', '');

      expect(result).toBeUndefined();
    });

    it('should return undefined when image path is undefined', () => {
      const result = ensureContentImage('work/projects', 'test-project', undefined);

      expect(result).toBeUndefined();
    });

    it('should create directory and copy file when image does not exist', () => {
      mockExistsSync.mockReturnValueOnce(false).mockReturnValueOnce(true);

      const result = ensureContentImage('work/projects', 'test-project', 'cover.jpg');

      expect(mockMkdirSync).toHaveBeenCalled();
      expect(result).toBe('/test-project/cover.jpg');
    });
  });

  describe('ensureProjectImage', () => {
    it('should call ensureContentImage with correct parameters', () => {
      mockExistsSync.mockReturnValue(true);

      const result = ensureProjectImage('test-project', 'cover.jpg');

      expect(result).toBe('/test-project/cover.jpg');
    });
  });

  describe('ensureMediaImage', () => {
    it('should call ensureContentImage with correct parameters', () => {
      mockExistsSync.mockReturnValue(true);

      const result = ensureMediaImage('test-project', 'media/image.jpg');

      expect(result).toBe('/test-project/media/image.jpg');
    });
  });
}); 