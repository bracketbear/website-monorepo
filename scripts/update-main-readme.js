#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Main README Update Script
 *
 * This script uses the generated repo-map.json to update ONLY the main README
 * with accurate information from the repo map.
 */

/**
 * Load the generated repo map
 */
function loadRepoMap(repoMapPath = null) {
  const defaultRepoMapPath = join(
    __dirname,
    '..',
    'apps',
    'portfolio',
    'src',
    'generated',
    'repo-map.json'
  );
  const repoMapPathToUse = repoMapPath || defaultRepoMapPath;

  if (!existsSync(repoMapPathToUse)) {
    console.error(
      '❌ repo-map.json not found. Run npm run generate:repo-map first.'
    );
    process.exit(1);
  }

  try {
    const content = readFileSync(repoMapPathToUse, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ Failed to parse repo-map.json:', error);
    process.exit(1);
  }
}

/**
 * Update the main README with repo map integration
 */
function updateMainReadme(repoMap, readmePath = null) {
  const mainReadmePath = readmePath || join(__dirname, '..', 'README.md');

  // Generate the new TOC sections using actual descriptions from repo-map.json
  const appsSection = repoMap.apps
    .map(
      (app) =>
        `- [${app.name}](/apps/${app.name}/) - ${app.description || 'Application in the Bracket Bear monorepo'}`
    )
    .join('\n');

  const packagesSection = repoMap.packages
    .map(
      (pkg) =>
        `- [${pkg.name}](/packages/${pkg.name}/) - ${pkg.description || 'Package in the Bracket Bear monorepo'}`
    )
    .join('\n');

  const newToc = `## Table of Contents

### Applications

${appsSection}

### Packages

${packagesSection}

### Repository Map

The repository structure is automatically generated and maintained. See the [source code page](/apps/portfolio/source-code) for an interactive view of all apps and packages.

**Total Items**: ${repoMap.totalItems} (${repoMap.apps.length} apps, ${repoMap.packages.length} packages)
**Last Updated**: ${new Date(repoMap.generatedAt).toLocaleDateString()}`;

  try {
    const currentContent = readFileSync(mainReadmePath, 'utf8');

    // Replace the existing TOC section
    const tocRegex = /## Table of Contents[\s\S]*?(?=## Requirements)/;
    const updatedContent = currentContent.replace(tocRegex, newToc + '\n\n');

    writeFileSync(mainReadmePath, updatedContent);
    console.log('✅ Updated main README with repo map integration');
  } catch (error) {
    console.error('❌ Failed to update main README:', error);
  }
}

/**
 * Main execution
 */
function main() {
  try {
    console.log('🚀 Updating main README with repo map data...');

    const repoMap = loadRepoMap();

    // Update only the main README
    updateMainReadme(repoMap);

    console.log('✨ Main README update complete!');
    console.log(`📊 Updated TOC with ${repoMap.totalItems} items`);
  } catch (error) {
    console.error('❌ Failed to update main README:', error);
    process.exit(1);
  }
}

// Export functions for testing
export { loadRepoMap, updateMainReadme };

// Run the script
main();
