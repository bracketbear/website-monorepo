# Basic Analysis Examples

Simple examples to get you started with the Tailwind CSS Pattern Analyzer.

## 🚀 Quick Start Examples

### 1. Basic Analysis

The simplest way to run the analyzer:

```bash
# From workspace root
npm run analyze:tw

# Or run directly
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns
```

**Output:**

```
🔍 Analyzing Tailwind CSS patterns...
📁 Found 150 files to analyze
⚡ Processing files...
📊 Analysis complete!

┌─────────┬─────────────┬──────────┬────────────┬─────────────────────────────────────┐
│ (index) │ occurrences │ variants │ likelihood │ sample                             │
├─────────┼─────────────┼──────────┼────────────┼─────────────────────────────────────┤
│ 0       │ 25          │ 4        │ '49%'      │ 'container mx-auto px-4'           │
│ 1       │ 30          │ 4        │ '49%'      │ 'font-black text-foreground upper' │
│ 2       │ 48          │ 3        │ '37%'      │ 'flex gap-4 items-center'          │
└─────────┴─────────────┴──────────┴────────────┴─────────────────────────────────────┘

📄 JSON report saved to: reports/tw-patterns.json
⏱️  Processing time: 2.3s
```

### 2. Custom Threshold

Adjust the similarity threshold for different clustering behavior:

```bash
# More aggressive clustering (broader groups)
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --threshold 0.6

# Stricter clustering (more precise groups)
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --threshold 0.85
```

### 3. Filter by Occurrences

Focus on patterns that appear frequently:

```bash
# Only patterns with 3+ occurrences
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --min-occurrences 3

# Only patterns with 5+ occurrences
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --min-occurrences 5
```

## 📁 Configuration Examples

### Basic Configuration

Create a `tw-pattern-analyzer.config.js` file at your workspace root:

```javascript
/** @type {import('@bracketbear/tw-pattern-analyzer').AnalyzerConfig} */
export default {
  globs: [
    'apps/**/*.{tsx,jsx,astro,html,mdx,vue,svelte}',
    'packages/**/*.{tsx,jsx,astro,html,mdx,vue,svelte}',
  ],
  ignoreGlobs: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
  similarityThreshold: 0.75,
  minOccurrences: 2,
  minVariants: 1,
};
```

### Component-Focused Configuration

Analyze only component files:

```javascript
export default {
  globs: ['src/components/**/*.{tsx,jsx,astro}', 'src/ui/**/*.{tsx,jsx,astro}'],
  ignoreGlobs: [
    '**/node_modules/**',
    '**/*.test.{tsx,jsx}',
    '**/*.stories.{tsx,jsx}',
  ],
  similarityThreshold: 0.8,
  minOccurrences: 3,
  minVariants: 2,
  output: {
    console: { enabled: true, top: 15 },
    json: { enabled: true, path: 'reports/component-patterns.json' },
  },
};
```

### Page-Focused Configuration

Analyze only page files:

```javascript
export default {
  globs: ['src/pages/**/*.{tsx,jsx,astro}', 'src/routes/**/*.{tsx,jsx,astro}'],
  ignoreGlobs: ['**/node_modules/**', '**/api/**', '**/*.test.{tsx,jsx}'],
  similarityThreshold: 0.7,
  minOccurrences: 2,
  minVariants: 1,
  output: {
    console: { enabled: true, top: 20 },
    json: { enabled: true, path: 'reports/page-patterns.json' },
  },
};
```

## 🎯 Analysis Scenarios

### Development Workflow

During development, you might want to find all patterns:

```bash
# Find all patterns (including rare ones)
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --min-occurrences 1 \
  --threshold 0.6 \
  --out reports/dev-patterns.json
```

**Use case:** Discover all repeated patterns to understand your codebase better.

### Code Review

Before a code review, check for high-likelihood patterns:

```bash
# Focus on patterns that should be components
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --threshold 0.8 \
  --min-occurrences 3 \
  --min-variants 2 \
  --out reports/review-patterns.json
```

**Use case:** Identify patterns that should be extracted into components before merging.

### Production Audit

For production releases, use strict settings:

```bash
# Strict analysis for production
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --threshold 0.85 \
  --min-occurrences 5 \
  --min-variants 3 \
  --out reports/production-patterns.json
```

**Use case:** Ensure code quality and identify critical component extraction opportunities.

## 📊 Understanding Results

### Console Output Interpretation

```
┌─────────┬─────────────┬──────────┬────────────┬─────────────────────────────────────┐
│ (index) │ occurrences │ variants │ likelihood │ sample                             │
├─────────┼─────────────┼──────────┼────────────┼─────────────────────────────────────┤
│ 0       │ 25          │ 4        │ '49%'      │ 'container mx-auto px-4'           │
│ 1       │ 30          │ 4        │ '49%'      │ 'font-black text-foreground upper' │
│ 2       │ 48          │ 3        │ '37%'      │ 'flex gap-4 items-center'          │
└─────────┴─────────────┴──────────┴────────────┴─────────────────────────────────────┘
```

**Column meanings:**

- **`(index)`**: Cluster ID
- **`occurrences`**: Total times this pattern appears
- **`variants`**: Number of different variations
- **`likelihood`**: Component extraction score (0-100%)
- **`sample`**: Representative pattern example

### Likelihood Score Interpretation

| Score Range | Meaning             | Action                        |
| ----------- | ------------------- | ----------------------------- |
| **80-100%** | Excellent candidate | Extract component immediately |
| **70-79%**  | Strong candidate    | Plan extraction soon          |
| **50-69%**  | Good candidate      | Consider extraction           |
| **30-49%**  | Moderate candidate  | Monitor for growth            |
| **<30%**    | Weak candidate      | Focus on higher scores        |

### Example Pattern Analysis

**Pattern:** `container mx-auto px-4`

- **Occurrences:** 25
- **Variants:** 4
- **Likelihood:** 49%

**Variants found:**

- `container mx-auto px-4`
- `container mx-auto px-6`
- `container mx-auto px-8`
- `container mx-auto px-12`

**Analysis:** This is a layout pattern with consistent structure but different padding values. Good candidate for a `Container` component with configurable padding.

## 🔧 Custom Analysis Examples

### Framework-Specific Analysis

Analyze only React components:

```bash
# Create React-specific config
cat > react-config.js << 'EOF'
export default {
  globs: ['src/**/*.{tsx,jsx}'],
  ignoreGlobs: ['**/node_modules/**', '**/*.test.{tsx,jsx}'],
  similarityThreshold: 0.75,
  minOccurrences: 2,
  parsing: {
    patterns: {
      react: /(?:className\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
    },
    fileTypes: {
      '.tsx': ['react'],
      '.jsx': ['react'],
    },
  },
};
EOF

# Run React analysis
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --config react-config.js \
  --out reports/react-patterns.json
```

### Directory-Specific Analysis

Analyze different parts of your codebase separately:

```bash
# Analyze components
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --config component-config.js \
  --out reports/components.json

# Analyze pages
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --config page-config.js \
  --out reports/pages.json

# Analyze utilities
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --config utility-config.js \
  --out reports/utilities.json
```

### Incremental Analysis

Analyze only changed files (if supported):

```bash
# Analyze specific directories
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --config incremental-config.js \
  --out reports/changed-patterns.json
```

## 📈 Result Processing Examples

### Filter High-Priority Patterns

```bash
# Get only high-likelihood patterns
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --no-console | \
  jq '.clusters[] | select(.likelihood >= 70)'
```

### Generate Summary Report

```bash
# Create summary
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --no-console | \
  jq -r '
    "## Tailwind Pattern Analysis Summary\n\n" +
    "**Total Clusters:** \(.clusters | length)\n" +
    "**High Priority (70%+):** \(.clusters | map(select(.likelihood >= 70)) | length)\n" +
    "**Medium Priority (40-69%):** \(.clusters | map(select(.likelihood >= 40 and .likelihood < 70)) | length)\n\n" +
    "### Top Patterns\n" +
    (.clusters | sort_by(.likelihood) | reverse | .[0:5] |
     map("- \(.sample) (\(.likelihood)%)") | join("\n"))
  ' > pattern-summary.md
```

### Count Pattern Types

```bash
# Count patterns by category
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --no-console | \
  jq -r '
    .clusters[] |
    .sample |
    if contains("flex") then "layout"
    elif contains("text-") then "typography"
    elif contains("bg-") or contains("text-") then "colors"
    elif contains("p-") or contains("m-") then "spacing"
    else "other" end
  ' | sort | uniq -c
```

## 🚨 Troubleshooting Examples

### No Patterns Found

```bash
# Check if files exist
find . -name "*.tsx" -o -name "*.jsx" | head -10

# Check configuration
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --config debug-config.js

# Verify file content
grep -r "className=" src/ | head -5
```

### Too Many Patterns

```bash
# Increase threshold for stricter clustering
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --threshold 0.85

# Filter by minimum occurrences
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --min-occurrences 5

# Focus on specific directories
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --config focused-config.js
```

### Performance Issues

```bash
# Analyze smaller subset first
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --config small-config.js

# Use more specific glob patterns
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --config specific-config.js
```

## 📝 Integration Examples

### Package.json Scripts

```json
{
  "scripts": {
    "analyze:tw": "npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns",
    "analyze:tw:dev": "npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --min-occurrences 1 --threshold 0.6",
    "analyze:tw:review": "npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --threshold 0.8 --min-occurrences 3",
    "analyze:tw:production": "npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --threshold 0.85 --min-occurrences 5"
  }
}
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "🔍 Analyzing Tailwind patterns..."

# Run analysis
npm run analyze:tw:review

# Check for critical patterns
if [ -f reports/tw-patterns.json ]; then
  critical_count=$(node -e "
    const r = require('./reports/tw-patterns.json');
    console.log(r.clusters.filter(c => c.likelihood >= 80).length);
  ")

  if [ $critical_count -gt 0 ]; then
    echo "⚠️  Found $critical_count critical patterns. Consider extracting components."
    echo "Run 'npm run analyze:tw:review' for details."
  fi
fi
```

---

**Next**: Explore [Custom Patterns](./custom-patterns.md) for framework-specific examples, or learn [Output Interpretation](./output-interpretation.md) for understanding results.
