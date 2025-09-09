#!/usr/bin/env node

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Tests for the update-main-readme.js script
 */

// Mock data for testing
const mockRepoMap = {
  apps: [
    {
      name: 'test-app',
      description: 'Test application for unit testing',
      type: 'public',
      path: 'apps/test-app',
      version: '1.0.0',
    },
  ],
  packages: [
    {
      name: 'test-package',
      description: 'Test package for unit testing',
      type: 'public',
      path: 'packages/test-package',
      version: '1.0.0',
    },
  ],
  generatedAt: '2025-01-01T00:00:00.000Z',
  totalItems: 2,
};

const mockReadmeContent = `# Test Monorepo

## Table of Contents

### Applications

- [old-app](/apps/old-app/README.md) - Old application

### Packages

- [old-package](/packages/old-package/README.md) - Old package

## Requirements

- Node.js (v18 or higher)
`;

describe('update-main-readme.js', () => {
  let testDir;
  let testReadmePath;
  let testRepoMapPath;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = join(__dirname, 'test-temp');
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });

    testReadmePath = join(testDir, 'README.md');
    testRepoMapPath = join(testDir, 'repo-map.json');

    // Write test files
    writeFileSync(testReadmePath, mockReadmeContent);
    writeFileSync(testRepoMapPath, JSON.stringify(mockRepoMap, null, 2));
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('should update README with correct directory links', async () => {
    // Import the update function
    const { updateMainReadme } = await import('./update-main-readme.js');

    // Update the README
    updateMainReadme(mockRepoMap, testReadmePath);

    // Read the updated content
    const updatedContent = readFileSync(testReadmePath, 'utf8');

    // Verify the content was updated correctly
    expect(updatedContent).toContain('[test-app](/apps/test-app/)');
    expect(updatedContent).toContain('[test-package](/packages/test-package/)');
    expect(updatedContent).toContain('Test application for unit testing');
    expect(updatedContent).toContain('Test package for unit testing');
    expect(updatedContent).toContain('**Total Items**: 2 (1 apps, 1 packages)');
    expect(updatedContent).toContain('**Last Updated**: 12/31/2024');
  });

  it('should handle missing descriptions gracefully', async () => {
    const repoMapWithoutDescriptions = {
      ...mockRepoMap,
      apps: [{ ...mockRepoMap.apps[0], description: '' }],
      packages: [{ ...mockRepoMap.packages[0], description: '' }],
    };

    const { updateMainReadme } = await import('./update-main-readme.js');
    updateMainReadme(repoMapWithoutDescriptions, testReadmePath);

    const updatedContent = readFileSync(testReadmePath, 'utf8');

    expect(updatedContent).toContain(
      'Application in the Bracket Bear monorepo'
    );
    expect(updatedContent).toContain('Package in the Bracket Bear monorepo');
  });

  it('should preserve content outside the TOC section', async () => {
    const { updateMainReadme } = await import('./update-main-readme.js');
    updateMainReadme(mockRepoMap, testReadmePath);

    const updatedContent = readFileSync(testReadmePath, 'utf8');

    // Should preserve content before and after TOC
    expect(updatedContent).toContain('# Test Monorepo');
    expect(updatedContent).toContain('## Requirements');
    expect(updatedContent).toContain('Node.js (v18 or higher)');
  });

  it('should handle empty repo map', async () => {
    const emptyRepoMap = {
      apps: [],
      packages: [],
      generatedAt: '2025-01-01T00:00:00.000Z',
      totalItems: 0,
    };

    const { updateMainReadme } = await import('./update-main-readme.js');
    updateMainReadme(emptyRepoMap, testReadmePath);

    const updatedContent = readFileSync(testReadmePath, 'utf8');

    expect(updatedContent).toContain('**Total Items**: 0 (0 apps, 0 packages)');
    expect(updatedContent).toContain('### Applications');
    expect(updatedContent).toContain('### Packages');
  });
});
