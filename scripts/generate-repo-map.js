#!/usr/bin/env node

import {
  readdirSync,
  readFileSync,
  existsSync,
  writeFileSync,
  mkdirSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Repo Map Generator
 *
 * This script scans the monorepo structure and generates a JSON file
 * containing information about all apps and packages. This data is used
 * to auto-generate the repo map section on the source-code page.
 */

// Type definitions (for documentation)
// RepoItem: { name: string, description: string, type: 'public'|'private'|'unknown', path: string, version?: string }
// RepoMap: { apps: RepoItem[], packages: RepoItem[], generatedAt: string, totalItems: number }

/**
 * Scans a directory and extracts package information
 */
function scanDirectory(dirPath, basePath) {
  if (!existsSync(dirPath)) {
    console.warn(`Directory ${dirPath} does not exist`);
    return [];
  }

  try {
    return readdirSync(dirPath)
      .filter(
        (item) => !item.startsWith('.') && !item.startsWith('node_modules')
      )
      .map((item) => {
        const fullPath = join(dirPath, item);
        const packageJsonPath = join(fullPath, 'package.json');

        let description = '';
        let type = 'unknown';
        let version = '';

        if (existsSync(packageJsonPath)) {
          try {
            const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
            description = pkg.description || '';
            type = pkg.private ? 'private' : 'public';
            version = pkg.version || '';
          } catch (error) {
            console.warn(`Failed to parse package.json for ${item}:`, error);
          }
        }

        return {
          name: item,
          description,
          type,
          path: `${basePath}/${item}`,
          version: version || undefined,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
    return [];
  }
}

/**
 * Generates the repo map data
 */
function generateRepoMap() {
  const repoRoot = join(__dirname, '..');
  const appsDir = join(repoRoot, 'apps');
  const packagesDir = join(repoRoot, 'packages');

  console.log('🔍 Scanning monorepo structure...');

  const apps = scanDirectory(appsDir, 'apps');
  const packages = scanDirectory(packagesDir, 'packages');

  const totalItems = apps.length + packages.length;

  console.log(`📦 Found ${apps.length} apps and ${packages.length} packages`);

  return {
    apps,
    packages,
    generatedAt: new Date().toISOString(),
    totalItems,
  };
}

/**
 * Writes the repo map to a JSON file
 */
function writeRepoMap(repoMap) {
  const outputDir = join(
    __dirname,
    '..',
    'apps',
    'portfolio',
    'src',
    'generated'
  );
  const outputFile = join(outputDir, 'repo-map.json');

  // Ensure the output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  try {
    writeFileSync(outputFile, JSON.stringify(repoMap, null, 2));
    console.log(`✅ Repo map written to ${outputFile}`);
  } catch (error) {
    console.error('Failed to write repo map:', error);
    process.exit(1);
  }
}

/**
 * Main execution
 */
function main() {
  try {
    console.log('🚀 Generating repo map...');

    const repoMap = generateRepoMap();
    writeRepoMap(repoMap);

    console.log('✨ Repo map generation complete!');
    console.log(`📊 Generated map for ${repoMap.totalItems} total items`);
  } catch (error) {
    console.error('❌ Failed to generate repo map:', error);
    process.exit(1);
  }
}

// Run the script
main();
