# @bracketbear/tw-pattern-analyzer

A Tailwind CSS class pattern analyzer that scans your codebase for repeated class combinations, clusters similar patterns, and provides insights to help identify opportunities for component extraction.

## Features

- **Configuration-Driven**: Uses a config file at the workspace root for flexible setup
- **Multi-Framework Support**: Parses TSX, JSX, Astro, HTML, MDX, Vue, and Svelte files
- **Smart Pattern Detection**: Finds repeated Tailwind class combinations across your codebase
- **Intelligent Clustering**: Groups similar patterns using Jaccard similarity
- **Likelihood Scoring**: Ranks patterns by their potential for component extraction
- **Flexible Output**: Console table + optional JSON report
- **Workspace Aware**: Automatically detects monorepo structure

## Installation

The package is already included in the workspace. To use it:

```bash
# From workspace root
npm run analyze:tw

# Or build and run manually
npm run build --workspace=@bracketbear/tw-pattern-analyzer
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns
```

## Quick Setup

Create a `tw-pattern-analyzer.config.js` file at your workspace root (see Configuration section below).

## Configuration

Create a `tw-pattern-analyzer.config.js` file at your workspace root:

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
  minOccurrences: 2,         // Minimum occurrences to include
  minVariants: 1,            // Minimum variants in cluster
  
  // Output settings
  output: {
    console: {
      enabled: true,
      top: 20,               // Number of top patterns to display
    },
    json: {
      enabled: true,
      path: 'reports/tw-patterns.json',
    },
  },
  
  // File parsing settings
  parsing: {
    // Regex patterns for different file types
    patterns: {
      // React/JSX: className={...} or className="..."
      react: /(?:className\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
      
      // Astro/HTML: class="..." or class={...} or class:list={...}
      astro: /(?:class\s*=\s*|class:list\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
      
      // Vue: class="..." or :class="..."
      vue: /(?:class\s*=\s*|:class\s*=\s*)(?:(?:{`([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
      
      // Svelte: class="..." or class:name="..."
      svelte: /(?:class\s*=\s*|class:name\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
    },
    
    // File extensions and their parsing strategy
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
    // Likelihood scoring weights
    scoring: {
      variants: 60,    // Maximum points for variant count
      frequency: 40,   // Maximum points for frequency
    },
  },
};
```

## Usage

### Basic Analysis

```bash
# Analyze with config file settings
npm run analyze:tw

# Custom analysis (overrides config)
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --threshold 0.8 \
  --min-occurrences 3 \
  --min-variants 2 \
  --top 30 \
  --out reports/custom-analysis.json
```

### Command Line Options

- `--config, -c`: Custom config file path (default: `tw-pattern-analyzer.config.js`)
- `--threshold, -t`: Similarity threshold for clustering (0.0-1.0, overrides config)
- `--min-occurrences, -m`: Minimum occurrences to include (overrides config)
- `--min-variants, -v`: Minimum variants in cluster (overrides config)
- `--out, -o`: Output JSON file path (overrides config)
- `--top`: Number of top patterns to display (overrides config)
- `--ignore, -i`: Additional ignore patterns (can be used multiple times)

### Default Behavior (if no config file)

- **File Patterns**: `apps/**/*.{tsx,jsx,astro,html,mdx,vue,svelte}` and `packages/**/*.{tsx,jsx,astro,html,mdx,vue,svelte}`
- **Ignore Patterns**: `**/node_modules/**`, `**/.next/**`, `**/dist/**`, `**/.astro/**`, `**/build/**`, `**/.output/**`, `**/coverage/**`, `**/.turbo/**`
- **Similarity Threshold**: 0.75 (Jaccard similarity)
- **Output**: Console table + JSON report to `reports/tw-patterns.json`

## File Parsing

The analyzer automatically detects file types and applies the appropriate parsing strategy:

- **`.tsx`/`.jsx`**: Uses React parsing (looks for `className` attributes)
- **`.astro`/`.html`**: Uses Astro parsing (looks for `class` and `class:list` attributes)
- **`.mdx`**: Uses both React and Astro parsing strategies
- **`.vue`**: Uses Vue parsing (looks for `class` and `:class` attributes)
- **`.svelte`**: Uses Svelte parsing (looks for `class` and `class:name` attributes)

## How It Works

1. **Configuration Loading**: Loads settings from `tw-pattern-analyzer.config.js`
2. **File Discovery**: Uses configured glob patterns to find relevant source files
3. **Smart Parsing**: Applies appropriate parsing strategy based on file extension
4. **Class Extraction**: Regex-based extraction of class attributes for each framework
5. **Canonicalization**: Sorts classes alphabetically for consistent comparison
6. **Similarity Clustering**: Groups patterns using Jaccard similarity
7. **Likelihood Scoring**: Combines variant count and frequency for ranking

## Likelihood Scoring

The likelihood score (0-100%) indicates how good a candidate a pattern is for component extraction:

- **Variant Score** (0-60 points): More variants = stronger signal
- **Frequency Score** (0-40 points): Higher usage = stronger signal

**High likelihood (70%+)**: Strong candidates for component extraction
**Medium likelihood (40-70%)**: Good candidates with some variants
**Low likelihood (<40%)**: May be too specific or infrequent

## Example Output

```
┌─────────┬─────────────┬──────────┬────────────┬─────────────────────────────────────┐
│ (index) │ occurrences │ variants │ likelihood │ sample                             │
├─────────┼─────────────┼──────────┼────────────┼─────────────────────────────────────┤
│ 0       │ 25          │ 4        │ '49%'      │ 'container mx-auto px-4'           │
│ 1       │ 30          │ 4        │ '49%'      │ 'font-black text-foreground upper' │
│ 2       │ 48          │ 3        │ '37%'      │ 'flex gap-4 items-center'          │
└─────────┴─────────────┴──────────┴────────────┴─────────────────────────────────────┘
```

## Use Cases

- **Component Discovery**: Find repeated UI patterns for extraction
- **Design System Audit**: Identify inconsistent class usage
- **Refactoring Planning**: Prioritize which patterns to componentize
- **Code Quality**: Spot opportunities for better abstraction
- **Multi-Framework Support**: Analyze patterns across different frameworks

## Integration

### CI/CD Pipeline

Add to your build process to catch high-likelihood patterns:

```bash
npm run analyze:tw

# Optionally fail if high-likelihood patterns found
node -e "
const r = require('./reports/tw-patterns.json');
if (r.clusters.some(c => c.likelihood >= 80)) {
  console.error('High-likelihood component candidates found. Extract components or lower threshold.');
  process.exit(1);
}
"
```

### Turborepo

```json
{
  "pipeline": {
    "tw:analyze": {
      "outputs": ["reports/tw-patterns.json"]
    }
  }
}
```

## Tuning

- **Lower threshold** (0.7-0.75): More aggressive clustering, fewer false positives
- **Higher threshold** (0.8-0.85): Stricter clustering, more precise patterns
- **Increase min-occurrences**: Filter out noise in large codebases
- **Increase min-variants**: Focus on patterns with multiple variants
- **Custom config**: Override any setting via configuration file

## Technical Details

- **Regex Patterns**: Framework-specific patterns for optimal class extraction
- **Similarity Algorithm**: Jaccard similarity (intersection over union)
- **Clustering**: Greedy approach for performance
- **File Support**: TSX, JSX, Astro, HTML, MDX, Vue, Svelte
- **Performance**: Optimized for large codebases
- **Configuration**: ES module-based configuration with fallbacks

## Contributing

The analyzer is designed to be extensible:

- Add new file extensions in the config file
- Extend regex patterns for custom class attributes
- Modify the likelihood scoring algorithm
- Add new clustering strategies
- Support additional frameworks

## License

Internal package - @bracketbear workspace
