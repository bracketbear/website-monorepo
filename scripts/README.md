# Scripts Directory

This directory contains utility scripts for the BracketBear monorepo.

## find-arbitrary-css.js

A comprehensive scanner that finds arbitrary CSS values in your codebase and generates a report with likelihood scores for replacing them with Tailwind utilities.

### Features

- 🔍 **Comprehensive Scanning**: Scans all relevant file types (`.tsx`, `.ts`, `.astro`, `.js`, `.jsx`, `.css`, `.vue`, `.svelte`)
- 📊 **Likelihood Scoring**: Calculates how likely each arbitrary value can be replaced with Tailwind utilities
- 💡 **Smart Suggestions**: Provides specific Tailwind utility suggestions for known patterns
- 📋 **Detailed Reporting**: Groups findings by priority and provides context for each item
- ⚡ **Fast Performance**: Efficiently scans large codebases
- 🚨 **PX Unit Detection**: Identifies px values that should be converted to rem/em for responsive design

### Usage

```bash
# Run the scan
npm run scan:css

# Or run directly
node scripts/find-arbitrary-css.js
```

### What It Finds

The script detects various types of arbitrary CSS values:

1. **CSS Variables**: `[var(--color-foreground)]`
2. **Custom Properties**: `[--my-custom-property]`
3. **Color Values**: `[rgba(0,0,0,0.3)]`, `[#ff0000]`
4. **Dimensions**: `[20px]`, `[2rem]`
5. **Shadows**: `[4px_4px_0_rgba(0,0,0,0.3)]`
6. **Gradients**: `[linear-gradient(...)]`

### Critical Issues: PX Units

**🚨 HIGH PRIORITY**: The script flags px values as critical issues because they cause responsive design problems:

- **Problem**: `[16px]` doesn't scale with user's font size preferences
- **Solution**: Use `[1rem]` (16px ÷ 16px base = 1rem) for responsive design
- **Common Conversions**:
  - `2px` → `0.125rem`
  - `4px` → `0.25rem`
  - `8px` → `0.5rem`
  - `12px` → `0.75rem`
  - `16px` → `1rem`
  - `24px` → `1.5rem`
  - `32px` → `2rem`

### Likelihood Scoring

The script calculates replacement likelihood based on:

- **High (70-100%)**: 
  - Multiple instances of same value in file (should be utility)
  - PX units (critical for responsive design)
  - Known CSS variables with direct Tailwind equivalents
- **Medium (40-69%)**: Color values, dimensions, or shadows that likely have Tailwind alternatives
- **Low (0-39%)**: Complex values or custom properties that may need custom utilities

### Output Example

```
🔍 ARBITRARY CSS VALUES SCAN REPORT

Found 22 arbitrary CSS values across the codebase.

📊 LIKELIHOOD BREAKDOWN:
  🔴 High likelihood (70-100%): 4 items
  🟡 Medium likelihood (40-69%): 1 items
  🟢 Low likelihood (0-39%): 17 items

🟢 HIGH LIKELIHOOD REPLACEMENTS:

1. apps/bracketbear-website/src/pages/about/index.astro:12
   Value: [8px_8px_0_0_#111111]
   Likelihood: 100%
   🔁 Duplicates: Used 4 times in this file
   Reason: 🔁 Used 4 times in same file (should be utility), 🚨 Uses px units (should be rem/em for responsive design)
   Suggested: Consider using rem or em for responsive design, 0.50rem (responsive alternative)
```

### Configuration

The script automatically excludes common directories:
- `node_modules`
- `.git`
- `dist`
- `build`
- `.astro`
- `coverage`

### Customization

You can modify the script to:
- Add new file extensions to scan
- Include/exclude specific directories
- Add new Tailwind utility mappings
- Adjust likelihood scoring algorithms

### Integration

This script is perfect for:
- **Code Reviews**: Identify arbitrary CSS values before merging
- **Refactoring**: Plan systematic replacements of arbitrary values
- **Quality Assurance**: Ensure consistent use of Tailwind utilities
- **Documentation**: Generate reports for team discussions
- **Responsive Design**: Catch px values that break accessibility

### Best Practices

1. **Never use px values** - always use rem/em for responsive design
2. **Use Tailwind utilities** instead of arbitrary values when possible
3. **Create custom utilities** for repeated patterns using `@utility` directive
4. **Add to theme system** in `packages/core/src/styles/theme.css` for new values
5. **Run regularly** to catch new arbitrary values before they accumulate
