#!/usr/bin/env node

/**
 * Script to find arbitrary CSS values in the codebase and generate a report
 * with likelihood scores that they can be replaced with Tailwind utilities
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Patterns to find arbitrary CSS values in class attributes
const ARBITRARY_PATTERNS = [
  // CSS variables in class attributes
  /(?:class(?:Name|:list)?(?:\s*=\s*))(?:["`']|{["`']?)([^"`'{}]*\[var\(--[^)]+\)\][^"`'{}]*)/g,
  // Other arbitrary values in class attributes (but exclude regex patterns and test data)
  /(?:class(?:Name|:list)?(?:\s*=\s*))(?:["`']|{["`']?)([^"`'{}]*\[[^\[\]]+\][^"`'{}]*)/g,
];

// Known Tailwind utilities that could replace arbitrary values
const TAILWIND_UTILITIES = {
  // Colors
  '--color-foreground': [
    'text-foreground',
    'bg-foreground',
    'border-foreground',
  ],
  '--color-background': ['bg-background'],
  '--color-card': ['bg-card', 'border-card'],
  '--color-muted': ['bg-muted', 'text-muted', 'border-muted'],
  '--color-primary': ['bg-primary', 'text-primary', 'border-primary'],
  '--color-secondary': ['bg-secondary', 'text-secondary', 'border-secondary'],
  '--color-border': ['border-border', 'bg-border'],
  '--color-ring': ['ring-ring'],
  '--color-overlay': ['bg-overlay'],
  '--color-card-foreground': ['text-card-foreground'],
  '--color-muted-foreground': ['text-muted-foreground'],
  '--color-primary-foreground': ['text-primary-foreground'],
  '--color-secondary-foreground': ['text-secondary-foreground'],
  '--color-brand-dark': [
    'bg-brand-dark',
    'text-brand-dark',
    'border-brand-dark',
  ],
  '--color-brand-red': ['bg-brand-red', 'text-brand-red', 'border-brand-red'],
  '--color-brand-orange': [
    'bg-brand-orange',
    'text-brand-orange',
    'border-brand-orange',
  ],
  '--color-brand-blue': [
    'bg-brand-blue',
    'text-brand-blue',
    'border-brand-blue',
  ],
  '--color-brand-green': [
    'bg-brand-green',
    'text-brand-green',
    'border-brand-green',
  ],
  '--color-brand-yellow': [
    'bg-brand-yellow',
    'text-brand-yellow',
    'border-brand-yellow',
  ],
  '--color-brand-purple': [
    'bg-brand-purple',
    'text-brand-purple',
    'border-brand-purple',
  ],
  '--color-brand-light': [
    'bg-brand-light',
    'text-brand-light',
    'border-brand-light',
  ],

  // Common arbitrary values
  'rgba(0,0,0,0.3)': ['shadow-black/30'],
  'rgba(0,0,0,0.4)': ['shadow-black/40'],
  'rgba(0,0,0,0.6)': ['bg-black/60'],
  'rgba(255,255,255,0.9)': ['text-white/90'],
  'rgba(255,255,255,0.8)': ['text-white/80'],
  'rgba(255,255,255,0.6)': ['text-white/60'],
  'rgba(255,255,255,0.5)': ['text-white/50'],
  'rgba(255,255,255,0.3)': ['text-white/30'],
  'rgba(255,255,255,0.2)': ['text-white/20'],
  'rgba(255,255,255,0.1)': ['text-white/10'],
  'rgba(0,0,0,0.9)': ['text-black/90'],
  'rgba(0,0,0,0.8)': ['text-black/80'],
  'rgba(0,0,0,0.6)': ['text-black/60'],
  'rgba(0,0,0,0.5)': ['text-black/50'],
  'rgba(0,0,0,0.3)': ['text-black/30'],
  'rgba(0,0,0,0.2)': ['text-black/20'],
  'rgba(0,0,0,0.1)': ['text-black/10'],

  // Common px values that should be rem/em
  '2px': ['0.125rem', '2px → 0.125rem'],
  '4px': ['0.25rem', '4px → 0.25rem'],
  '6px': ['0.375rem', '6px → 0.375rem'],
  '8px': ['0.5rem', '8px → 0.5rem'],
  '12px': ['0.75rem', '12px → 0.75rem'],
  '16px': ['1rem', '16px → 1rem'],
  '24px': ['1.5rem', '24px → 1.5rem'],
  '32px': ['2rem', '32px → 2rem'],
};

// File extensions to scan
const SCAN_EXTENSIONS = [
  '.tsx',
  '.ts',
  '.astro',
  '.js',
  '.jsx',
  '.css',
  '.vue',
  '.svelte',
];

// Directories to exclude
const EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '.astro',
  'coverage',
  '.cursor',
  'reports',
  'docs',
];

// Files to exclude (test files, config files, etc.)
const EXCLUDE_FILES = [
  '.test.',
  '.spec.',
  'test.js',
  'test.ts',
  'config.js',
  'config.ts',
  '.config.',
  'vitest.config',
  'eslint.config',
  'tw-pattern-analyzer',
];

/**
 * Calculate likelihood score for replacing an arbitrary value with Tailwind utilities
 */
function calculateLikelihood(value, context, duplicateCount = 1) {
  let score = 0;
  let maxScore = 100;

  // VERY HIGH PRIORITY: Multiple instances of same value in file
  if (duplicateCount > 1) {
    score += 95; // Almost certain it should be a utility
  }

  // HIGH PRIORITY: Flag px usage for responsive design issues
  if (value.includes('px')) {
    score += 85; // Very high priority - px should be rem/em for responsive design
  }

  // Check if it's a known CSS variable
  if (value.includes('var(--color-')) {
    const colorName = value.match(/var\(--color-([^)]+)\)/)?.[1];
    if (colorName && TAILWIND_UTILITIES[`--color-${colorName}`]) {
      score += 90; // Very high likelihood for known color variables
    } else {
      score += 60; // Still high for unknown color variables
    }
  }

  // Check if it's a CSS custom property
  if (value.startsWith('--color-')) {
    if (TAILWIND_UTILITIES[value]) {
      score += 85; // Very high likelihood for known color properties
    } else {
      score += 50; // Medium for unknown color properties
    }
  }

  // Check if it's a color value (rgba, hex, hsl)
  if (/rgba?\(|#[0-9a-fA-F]{3,6}|hsl\(/i.test(value)) {
    score += 45; // Higher likelihood for color values
  }

  // Check if it's a dimension or spacing value
  if (/^\d+(\.\d+)?(px|rem|em|%|vh|vw)$/.test(value)) {
    if (value.includes('px')) {
      score += 80; // High priority for px values
    } else if (value.includes('rem') || value.includes('em')) {
      score += 20; // Lower priority for rem/em (good responsive practices)
    } else {
      score += 30; // Medium for other units
    }
  }

  // Check if it's a shadow value - be more nuanced
  if (
    /\d+px_\d+px_\d+/.test(value) ||
    value.includes('shadow') ||
    value.includes('box-shadow')
  ) {
    // If it's a custom shadow with CSS variables, it's probably intentional
    if (value.includes('var(--color-') || value.includes('--color-')) {
      score += 15; // Lower priority for intentional custom shadows with variables
    } else if (value.includes('px')) {
      score += 70; // High priority for px-based shadows (should use rem/em)
    } else {
      score += 40; // Medium priority for other shadow values
    }
  }

  // Check if it's a gradient
  if (value.includes('gradient') || value.includes('linear-gradient')) {
    score += 10; // Lower likelihood for complex gradients
  }

  // Context-based adjustments
  if (context.includes('text-')) {
    score += 15; // Text context increases likelihood more
  }
  if (context.includes('bg-')) {
    score += 15; // Background context increases likelihood more
  }
  if (context.includes('border-')) {
    score += 15; // Border context increases likelihood more
  }
  if (context.includes('shadow-') || context.includes('drop-shadow-')) {
    score += 10; // Shadow context
  }

  // Penalty for complex arbitrary values
  if (value.length > 50) {
    score -= 20; // Long values are less likely to have simple replacements
  }

  // Cap the score
  return Math.min(Math.max(score, 0), maxScore);
}

/**
 * Get suggested Tailwind utilities for an arbitrary value
 */
function getSuggestedUtilities(value) {
  const suggestions = [];

  // Check for CSS variables
  if (value.includes('var(--color-')) {
    const colorName = value.match(/var\(--color-([^)]+)\)/)?.[1];
    if (colorName) {
      const key = `--color-${colorName}`;
      return TAILWIND_UTILITIES[key] || [];
    }
  }

  // Check for custom properties
  if (value.startsWith('--color-')) {
    return TAILWIND_UTILITIES[value] || [];
  }

  // Check for px values - suggest rem/em alternatives
  if (value.includes('px')) {
    suggestions.push('Consider using rem or em for responsive design');

    // Try to suggest specific rem conversions for common px values
    const pxMatch = value.match(/(\d+)px/);
    if (pxMatch) {
      const pxValue = parseInt(pxMatch[1]);
      const remValue = (pxValue / 16).toFixed(2); // Assuming 16px base font size
      suggestions.push(`${remValue}rem (responsive alternative)`);
    }
  }

  // Check for color values
  if (/rgba?\(|#[0-9a-fA-F]{3,6}|hsl\(/i.test(value)) {
    // Try to find close matches
    Object.entries(TAILWIND_UTILITIES).forEach(([key, utils]) => {
      if (key.includes('rgba') || key.includes('#')) {
        suggestions.push(...utils);
      }
    });
    return suggestions.slice(0, 3); // Limit suggestions
  }

  // Check for shadow patterns
  if (/\d+px_\d+px/.test(value)) {
    suggestions.push('Consider creating a custom shadow utility');
    if (value.includes('0_0')) {
      suggestions.push('shadow-none (for no shadow)');
    }
  }

  return suggestions.slice(0, 4); // Limit total suggestions
}

/**
 * Get the reason why a value has a high likelihood score
 */
function getLikelihoodReason(value, _context, duplicateCount = 1) {
  const reasons = [];

  if (duplicateCount > 1) {
    reasons.push(
      `🔁 Used ${duplicateCount} times in same file (should be utility)`
    );
  }

  if (value.includes('px')) {
    reasons.push('🚨 Uses px units (should be rem/em for responsive design)');
  }

  if (value.includes('var(--color-')) {
    const colorName = value.match(/var\(--color-([^)]+)\)/)?.[1];
    if (colorName && TAILWIND_UTILITIES[`--color-${colorName}`]) {
      reasons.push('✅ Known CSS variable with Tailwind utility');
    } else {
      reasons.push('🟡 CSS variable (may have utility)');
    }
  }

  if (/\d+px_\d+px/.test(value)) {
    reasons.push('🚨 Shadow with px units (should use rem/em)');
  }

  if (/rgba?\(|#[0-9a-fA-F]{3,6}|hsl\(/i.test(value)) {
    reasons.push('🎨 Color value (may have utility equivalent)');
  }

  return reasons.length > 0 ? reasons.join(', ') : 'Multiple factors';
}

/**
 * Check if a file should be excluded
 */
function shouldExcludeFile(filePath) {
  const fileName = path.basename(filePath);
  return EXCLUDE_FILES.some((pattern) => fileName.includes(pattern));
}

/**
 * Extract arbitrary values from class strings
 */
function extractArbitraryValues(classString) {
  const arbitraryValues = [];
  const arbitraryPattern = /\[([^\[\]]+)\]/g;

  let match;
  while ((match = arbitraryPattern.exec(classString)) !== null) {
    const value = match[1];

    // Skip if it looks like regex, test data, or config
    if (
      value.includes('^') ||
      value.includes('$') ||
      value.includes('\\') ||
      value.includes('|') ||
      value.includes('*') ||
      value.includes('?') ||
      value.includes('+') ||
      value.includes('{') ||
      value.includes('}') ||
      value.includes('...') ||
      value.includes('typeof') ||
      value.includes('keyof') ||
      value.includes('extends') ||
      /^['"].*['"]$/.test(value) || // String literals
      /^\d+$/.test(value) || // Just numbers (array indices)
      value.includes('react') ||
      value.includes('astro') ||
      value.includes('vue') ||
      value.includes('svelte')
    ) {
      continue;
    }

    arbitraryValues.push({
      value: `[${value}]`,
      rawValue: value,
    });
  }

  return arbitraryValues;
}

/**
 * Scan a file for arbitrary CSS values
 */
function scanFile(filePath) {
  try {
    // Skip excluded files
    if (shouldExcludeFile(filePath)) {
      return [];
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const findings = [];
    const lines = content.split('\n');

    ARBITRARY_PATTERNS.forEach((pattern) => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const _fullMatch = match[0];
        const classString = match[1] || match[2] || '';

        if (!classString) continue;

        const lineNumber = content.substring(0, match.index).split('\n').length;
        const lineContent = lines[lineNumber - 1]?.trim() || '';

        // Extract arbitrary values from the class string
        const arbitraryValues = extractArbitraryValues(classString);

        arbitraryValues.forEach(({ value, rawValue }) => {
          findings.push({
            value,
            rawValue,
            lineNumber,
            lineContent,
            classString,
            filePath: path.relative(process.cwd(), filePath),
          });
        });
      }
    });

    // Calculate duplicate counts for this file
    const duplicateCounts = {};
    findings.forEach((finding) => {
      duplicateCounts[finding.rawValue] =
        (duplicateCounts[finding.rawValue] || 0) + 1;
    });

    // Add likelihood, suggestions, and duplicate info to each finding
    findings.forEach((finding) => {
      const duplicateCount = duplicateCounts[finding.rawValue];
      finding.duplicateCount = duplicateCount;
      finding.likelihood = calculateLikelihood(
        finding.rawValue,
        finding.classString,
        duplicateCount
      );
      finding.suggestions = getSuggestedUtilities(finding.rawValue);
    });

    return findings;
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Recursively scan directory for files
 */
function scanDirectory(dirPath) {
  const findings = [];

  try {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!EXCLUDE_DIRS.includes(item)) {
          findings.push(...scanDirectory(fullPath));
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (SCAN_EXTENSIONS.includes(ext)) {
          findings.push(...scanFile(fullPath));
        }
      }
    }
  } catch (error) {
    console.warn(
      `Warning: Could not scan directory ${dirPath}:`,
      error.message
    );
  }

  return findings;
}

/**
 * Generate the report
 */
function generateReport(findings, outputFile = null) {
  const reportContent = [];
  const log = (message) => {
    console.log(message);
    if (outputFile) {
      reportContent.push(message);
    }
  };

  log('\n🔍 ARBITRARY CSS VALUES SCAN REPORT\n');
  log(`Found ${findings.length} arbitrary CSS values across the codebase.\n`);

  // Group by likelihood
  const highLikelihood = findings.filter((f) => f.likelihood >= 70);
  const mediumLikelihood = findings.filter(
    (f) => f.likelihood >= 40 && f.likelihood < 70
  );
  const lowLikelihood = findings.filter((f) => f.likelihood < 40);

  log('📊 LIKELIHOOD BREAKDOWN:');
  log(`  🔴 High likelihood (70-100%): ${highLikelihood.length} items`);
  log(`  🟡 Medium likelihood (40-69%): ${mediumLikelihood.length} items`);
  log(`  🟢 Low likelihood (0-39%): ${lowLikelihood.length} items\n`);

  // Show high likelihood items first
  if (highLikelihood.length > 0) {
    log('🔴 HIGH LIKELIHOOD REPLACEMENTS:');
    highLikelihood.forEach((finding, index) => {
      log(`\n${index + 1}. ${finding.filePath}:${finding.lineNumber}`);
      log(`   Value: ${finding.value}`);
      log(`   Likelihood: ${finding.likelihood}%`);
      if (finding.duplicateCount > 1) {
        log(
          `   🔁 Duplicates: Used ${finding.duplicateCount} times in this file`
        );
      }
      log(
        `   Reason: ${getLikelihoodReason(finding.rawValue, finding.classString, finding.duplicateCount)}`
      );
      if (finding.suggestions.length > 0) {
        log(`   Suggested: ${finding.suggestions.join(', ')}`);
      }
      log(`   Class: ${finding.classString}`);
      log(`   Line: ${finding.lineContent}`);
    });
  }

  // Show medium likelihood items
  if (mediumLikelihood.length > 0) {
    log('\n🟡 MEDIUM LIKELIHOOD REPLACEMENTS:');
    mediumLikelihood.forEach((finding, index) => {
      log(`\n${index + 1}. ${finding.filePath}:${finding.lineNumber}`);
      log(`   Value: ${finding.value}`);
      log(`   Likelihood: ${finding.likelihood}%`);
      if (finding.duplicateCount > 1) {
        log(
          `   🔁 Duplicates: Used ${finding.duplicateCount} times in this file`
        );
      }
      log(
        `   Reason: ${getLikelihoodReason(finding.rawValue, finding.classString, finding.duplicateCount)}`
      );
      if (finding.suggestions.length > 0) {
        log(`   Suggested: ${finding.suggestions.join(', ')}`);
      }
      log(`   Class: ${finding.classString}`);
      log(`   Line: ${finding.lineContent}`);
    });
  }

  // Show low likelihood items (limit to first 10 to avoid spam)
  if (lowLikelihood.length > 0) {
    log('\n🟢 LOW LIKELIHOOD REPLACEMENTS (showing first 10):');
    lowLikelihood.slice(0, 10).forEach((finding, index) => {
      log(`\n${index + 1}. ${finding.filePath}:${finding.lineNumber}`);
      log(`   Value: ${finding.value}`);
      log(`   Likelihood: ${finding.likelihood}%`);
      log(`   Class: ${finding.classString}`);
      log(`   Line: ${finding.lineContent}`);
    });
    if (lowLikelihood.length > 10) {
      log(
        `\n   ... and ${lowLikelihood.length - 10} more low likelihood items`
      );
    }
  }

  // Summary
  log('\n📋 SUMMARY:');
  log(`  • Total findings: ${findings.length}`);
  log(`  • High priority replacements: ${highLikelihood.length}`);
  log(`  • Medium priority replacements: ${mediumLikelihood.length}`);
  log(`  • Low priority replacements: ${lowLikelihood.length}`);

  if (highLikelihood.length > 0) {
    log('\n💡 RECOMMENDATION:');
    log(
      '  Start with the high likelihood replacements (🔴) as they are most likely'
    );
    log('  to have direct Tailwind utility equivalents.');
  }

  // Save to file if outputFile is specified
  if (outputFile) {
    try {
      // Ensure reports directory exists
      const reportsDir = path.dirname(outputFile);
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      fs.writeFileSync(outputFile, reportContent.join('\n'), 'utf8');
      log(`\n💾 Report saved to: ${outputFile}`);
    } catch (error) {
      console.error(`Error saving report: ${error.message}`);
    }
  }
}

/**
 * Main function
 */
function main() {
  const startTime = Date.now();
  console.log('🔍 Scanning codebase for arbitrary CSS values...\n');

  // Scan specific directories that are likely to contain CSS classes
  const scanDirs = [
    'apps',
    'packages/core/src',
    'packages/astro-content/src',
    'packages/flateralus-react/src',
  ];

  let findings = [];

  for (const dir of scanDirs) {
    const fullPath = path.join(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
      findings.push(...scanDirectory(fullPath));
    }
  }

  // Remove duplicates based on file path, line number, and value
  const uniqueFindings = findings.filter(
    (finding, index, self) =>
      index ===
      self.findIndex(
        (f) =>
          f.filePath === finding.filePath &&
          f.lineNumber === finding.lineNumber &&
          f.value === finding.value
      )
  );

  // Sort findings by likelihood (highest first)
  uniqueFindings.sort((a, b) => b.likelihood - a.likelihood);

  // Generate timestamped report file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const reportsDir = path.join(process.cwd(), 'reports');
  const reportFile = path.join(reportsDir, `css-scan-${timestamp}.txt`);
  const latestFile = path.join(reportsDir, 'css-scan-latest.txt');

  // Generate report (both console and file)
  generateReport(uniqueFindings, reportFile);

  // Also create a 'latest' version for easy access
  try {
    if (fs.existsSync(reportFile)) {
      fs.copyFileSync(reportFile, latestFile);
      console.log(
        `🔗 Latest report also saved as: reports/css-scan-latest.txt`
      );
    }
  } catch (error) {
    console.warn(`Warning: Could not create latest report: ${error.message}`);
  }

  const endTime = Date.now();
  console.log(`\n⏱️  Scan completed in ${endTime - startTime}ms`);

  return {
    findings: uniqueFindings,
    reportFile,
    scanTime: endTime - startTime,
  };
}

// Export functions for testing
export {
  calculateLikelihood,
  getSuggestedUtilities,
  getLikelihoodReason,
  extractArbitraryValues,
  generateReport,
  main,
};

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
