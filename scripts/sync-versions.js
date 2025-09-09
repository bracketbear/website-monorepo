#!/usr/bin/env node

/**
 * Sync versions across all package.json files in the monorepo
 * This script updates the version field in all package.json files to match the root version
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * Get the root package.json version
 */
function getRootVersion() {
  try {
    const rootPackagePath = join(rootDir, 'package.json');
    const rootPackage = JSON.parse(readFileSync(rootPackagePath, 'utf8'));
    return rootPackage.version;
  } catch (error) {
    logError(`Failed to read root package.json: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Find all package.json files in the monorepo
 */
async function findPackageJsonFiles() {
  try {
    const pattern = join(rootDir, '**/package.json');
    const files = await glob(pattern, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    });

    // Filter out the root package.json since we don't want to update it
    return files.filter((file) => file !== join(rootDir, 'package.json'));
  } catch (error) {
    logError(`Failed to find package.json files: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Update version in a package.json file
 */
function updatePackageVersion(filePath, newVersion) {
  try {
    const packageContent = JSON.parse(readFileSync(filePath, 'utf8'));
    const oldVersion = packageContent.version;

    if (oldVersion === newVersion) {
      return { updated: false, oldVersion, newVersion };
    }

    packageContent.version = newVersion;
    writeFileSync(filePath, JSON.stringify(packageContent, null, 2) + '\n');

    return { updated: true, oldVersion, newVersion };
  } catch (error) {
    logError(`Failed to update ${filePath}: ${error.message}`);
    return { updated: false, error: error.message };
  }
}

/**
 * Main function to sync versions
 */
async function syncVersions() {
  logInfo('Starting version sync across monorepo...');

  // Get the root version
  const rootVersion = getRootVersion();
  logInfo(`Root version: ${rootVersion}`);

  // Find all package.json files
  const packageFiles = await findPackageJsonFiles();
  logInfo(`Found ${packageFiles.length} package.json files to update`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Update each package.json file
  for (const filePath of packageFiles) {
    const relativePath = filePath.replace(rootDir + '/', '');
    const result = updatePackageVersion(filePath, rootVersion);

    if (result.error) {
      logError(`Failed to update ${relativePath}: ${result.error}`);
      errorCount++;
    } else if (result.updated) {
      logSuccess(
        `Updated ${relativePath}: ${result.oldVersion} → ${result.newVersion}`
      );
      updatedCount++;
    } else {
      logWarning(
        `Skipped ${relativePath}: already at version ${result.newVersion}`
      );
      skippedCount++;
    }
  }

  // Summary
  log('\n📊 Version Sync Summary:', 'bright');
  logSuccess(`Updated: ${updatedCount} files`);
  if (skippedCount > 0) {
    logWarning(`Skipped: ${skippedCount} files (already up to date)`);
  }
  if (errorCount > 0) {
    logError(`Errors: ${errorCount} files`);
    process.exit(1);
  }

  logSuccess('Version sync completed successfully!');
}

// Run the script
syncVersions().catch((error) => {
  logError(`Script failed: ${error.message}`);
  process.exit(1);
});
