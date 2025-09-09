# @bracketbear/tw-pattern-analyzer

## Overview

A powerful Tailwind CSS pattern analyzer that scans your codebase for repeated UI patterns and identifies opportunities for component extraction. This tool helps developers discover duplicated Tailwind class combinations and provides intelligent clustering to suggest which patterns are good candidates for refactoring into reusable components.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [Configuration](#configuration)
- [Examples](#examples)
- [API Reference](#api-reference)
- [Development](#development)
- [Build](#build)
- [Back to Monorepo](../../README.md)

## Features

- **🔍 Pattern Detection**: Automatically finds repeated Tailwind CSS class combinations across your codebase
- **🧠 Intelligent Clustering**: Groups similar patterns using Jaccard similarity algorithm
- **📊 Likelihood Scoring**: Ranks patterns by extraction potential (0-100%)
- **🎯 Multi-Framework Support**: Works with React, Astro, Vue, Svelte, and more
- **⚙️ Configurable**: Customizable similarity thresholds, file patterns, and output formats
- **📈 Detailed Reports**: Console tables and JSON reports for analysis
- **🚀 CLI Interface**: Easy-to-use command line tool with multiple options
- **🔧 TypeScript**: Full type safety and IntelliSense support

## Quick Start

### 1. Run Analysis

```bash
# From workspace root - uses existing configuration
npm run analyze:tw
```

### 2. View Results

The analyzer will display a table showing the most promising patterns:

```
┌─────────┬─────────────┬──────────┬────────────┬─────────────────────────────────────┐
│ (index) │ occurrences │ variants │ likelihood │ sample                             │
├─────────┼─────────────┼──────────┼────────────┼─────────────────────────────────────┤
│ 0       │ 25          │ 4        │ '49%'      │ 'container mx-auto px-4'           │
│ 1       │ 30          │ 4        │ '49%'      │ 'font-black text-foreground upper' │
│ 2       │ 48          │ 3        │ '37%'      │ 'flex gap-4 items-center'          │
└─────────┴─────────────┴──────────┴────────────┴─────────────────────────────────────┘
```

### 3. Review JSON Report

Check `reports/tw-patterns.json` for detailed analysis including all pattern variants and metadata.

## Usage

### Basic Commands

```bash
# Run with default configuration
npm run analyze:tw

# Run CLI directly
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns

# Build and run manually
npm run build --workspace=@bracketbear/tw-pattern-analyzer
npm run analyze --workspace=@bracketbear/tw-pattern-analyzer
```

### Command Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--threshold` | `-t` | Similarity threshold (0.0-1.0) | From config |
| `--min-occurrences` | `-m` | Minimum occurrences to include | From config |
| `--min-variants` | `-v` | Minimum variants in cluster | From config |
| `--out` | `-o` | Output JSON file path | From config |
| `--top` | - | Number of top patterns to display | From config |
| `--ignore` | `-i` | Additional ignore patterns | From config |
| `--config` | `-c` | Custom config file path | `tw-pattern-analyzer.config.js` |

### Examples

```bash
# More aggressive clustering (fewer, broader groups)
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --threshold 0.7

# Focus on common patterns only
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --min-occurrences 5

# Require multiple variants
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --min-variants 2

# Custom output location
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --out reports/my-analysis.json

# Combine multiple settings
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --threshold 0.8 \
  --min-occurrences 3 \
  --min-variants 2 \
  --top 15
```

## Configuration

### Configuration File

Create `tw-pattern-analyzer.config.js` at your workspace root:

```javascript
/** @type {import('@bracketbear/tw-pattern-analyzer').AnalyzerConfig} */
export default {
  // File patterns to analyze (glob patterns)
  globs: [
    'apps/**/*.{tsx,jsx,astro,html,mdx,vue,svelte}',
    'packages/**/*.{tsx,jsx,astro,html,mdx,vue,svelte}',
    'src/**/*.{tsx,jsx,astro,html,mdx,vue,svelte}',
  ],
  
  // Patterns to ignore
  ignoreGlobs: [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/.astro/**',
    '**/build/**',
    '**/.output/**',
    '**/coverage/**',
    '**/.turbo/**',
  ],
  
  // Analysis settings
  similarityThreshold: 0.75, // Jaccard similarity threshold (0.0-1.0)
  minOccurrences: 2, // Minimum occurrences to include
  minVariants: 1, // Minimum variants in cluster
  
  // Output settings
  output: {
    console: {
      enabled: true,
      top: 20, // Number of top patterns to display
    },
    json: {
      enabled: true,
      path: 'reports/tw-patterns.json',
    },
  },
  
  // File parsing settings
  parsing: {
    patterns: {
      // React/JSX: className={...} or className="..."
      react: /(?:className\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
      
      // Astro/HTML: class="..." or class={...} or class:list={...}
      astro: /(?:class\s*=\s*|class:list\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
      
      // Vue: class="..." or :class="..."
      vue: /(?:class\s*=\s*|:class\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
      
      // Svelte: class="..." or class:name="..."
      svelte: /(?:class\s*=\s*|class:name\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
    },
    
    fileTypes: {
      '.tsx': ['react'],
      '.jsx': ['react'],
      '.astro': ['astro'],
      '.html': ['astro'],
      '.mdx': ['react', 'astro'],
      '.vue': ['vue'],
      '.svelte': ['svelte'],
    },
  },
  
  // Clustering settings
  clustering: {
    scoring: {
      variants: 60, // Maximum points for variant count
      frequency: 40, // Maximum points for frequency
    },
  },
};
```

### Interactive Setup

Use the configuration wizard to create a config file:

```bash
npm run init --workspace=@bracketbear/tw-pattern-analyzer
```

## Examples

### Understanding Results

**High Priority (70%+ likelihood)**
- Strong candidates for component extraction
- Multiple variants with high frequency
- Good opportunity to reduce duplication

**Medium Priority (40-70% likelihood)**
- Good candidates with room for improvement
- Some variants, moderate frequency
- Consider extracting if you see more variants

**Low Priority (<40% likelihood)**
- Specific patterns that may not need extraction
- Low frequency or few variants
- Focus on higher-scoring patterns first

### Real-World Use Cases

1. **Component Extraction**: Identify repeated button styles, card layouts, or form patterns
2. **Design System Audit**: Find inconsistencies in spacing, colors, or typography
3. **Refactoring Planning**: Prioritize which patterns to extract first
4. **Code Review**: Ensure new code follows established patterns

### Integration Examples

```bash
# CI/CD Integration
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --no-console \
  --out reports/ci-analysis.json

# Development Workflow
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --min-occurrences 1 \
  --threshold 0.6

# Production Analysis
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --threshold 0.85 \
  --min-occurrences 5 \
  --min-variants 2
```

## API Reference

### Core Functions

```typescript
import { analyze, tokenize, canonicalize, jaccard } from '@bracketbear/tw-pattern-analyzer';

// Main analysis function
const report = await analyze({
  globs: ['src/**/*.{tsx,jsx}'],
  similarityThreshold: 0.75,
  minOccurrences: 2,
  minVariants: 1,
  out: 'reports/analysis.json',
  top: 20,
});

// Utility functions
const tokens = tokenize('flex gap-4 items-center'); // ['flex', 'gap-4', 'items-center']
const canonical = canonicalize('items-center flex gap-4'); // 'flex gap-4 items-center'
const similarity = jaccard('flex gap-4', 'flex gap-2'); // 0.5
```

### Types

```typescript
interface AnalyzerOptions {
  globs: string[];
  ignoreGlobs?: string[];
  similarityThreshold?: number;
  minOccurrences?: number;
  minVariants?: number;
  out?: string | null;
  top?: number;
}

interface Report {
  totalClassLists: number;
  uniquePatterns: number;
  totalFiles: number;
  totalPatterns: number;
  clusters: Cluster[];
  generatedAt: string;
}

interface Cluster {
  rep: string; // representative pattern
  members: string[]; // all patterns in cluster
  occurrences: number; // total occurrences
  variants: number; // number of variants
  similarity: number; // average similarity
  likelihood: number; // extraction likelihood (0-100)
}
```

## Development

To start development:

```bash
# From monorepo root
npm run dev --workspace=packages/tw-pattern-analyzer

# Or from tw-pattern-analyzer directory
cd packages/tw-pattern-analyzer && npm run dev
```

## Build

To build for production:

```bash
# From monorepo root
npm run build --workspace=packages/tw-pattern-analyzer

# Or from tw-pattern-analyzer directory
cd packages/tw-pattern-analyzer && npm run build
```

## Version

Current version: **1.0.1**

## Technologies Used

- **TypeScript**: Type safety and modern JavaScript features
- **fast-glob**: Efficient file pattern matching
- **Node.js**: CLI and file system operations
- **Jaccard Similarity**: Pattern clustering algorithm
