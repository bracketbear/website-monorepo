# Configuration Guide

Complete configuration reference for the Tailwind CSS Pattern Analyzer.

## 📁 Configuration File

Create a `tw-pattern-analyzer.config.js` file at your workspace root:

```javascript
/** @type {import('@bracketbear/tw-pattern-analyzer').AnalyzerConfig} */
export default {
  // Your configuration here
};
```

## 🔍 File Discovery

### globs

**Type**: `string[]`  
**Default**: `['apps/**/*.{tsx,jsx,astro,html,mdx,vue,svelte}', 'packages/**/*.{tsx,jsx,astro,html,mdx,vue,svelte}']`

File patterns to analyze using glob syntax:

```javascript
globs: [
  // Analyze all React/JSX files in apps
  'apps/**/*.{tsx,jsx}',
  
  // Analyze all component files in packages
  'packages/**/*.{tsx,jsx,astro}',
  
  // Analyze specific directories
  'src/components/**/*.{tsx,jsx}',
  'src/pages/**/*.{tsx,jsx,astro}',
  
  // Analyze specific file types
  '**/*.tsx',
  '**/*.astro',
  
  // Exclude test files
  'src/**/*.{tsx,jsx,astro}',
  '!src/**/*.test.{tsx,jsx}',
  '!src/**/*.spec.{tsx,jsx}'
]
```

**Common glob patterns:**
- `**/*.{ext}` - All files with specific extensions
- `src/**/*.{ext}` - All files in src directory
- `!**/*.test.{ext}` - Exclude test files
- `packages/*/src/**/*.{ext}` - All packages' src directories

### ignoreGlobs

**Type**: `string[]`  
**Default**: `['**/node_modules/**', '**/.next/**', '**/dist/**', '**/.astro/**', '**/build/**', '**/.output/**', '**/coverage/**', '**/.turbo/**']`

Patterns to ignore during analysis:

```javascript
ignoreGlobs: [
  // Build artifacts
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/.astro/**',
  '**/.output/**',
  
  // Dependencies
  '**/node_modules/**',
  '**/vendor/**',
  
  // Generated files
  '**/coverage/**',
  '**/.turbo/**',
  '**/.cache/**',
  
  // Test files
  '**/*.test.{tsx,jsx}',
  '**/*.spec.{tsx,jsx}',
  
  // Documentation
  '**/docs/**',
  '**/README.md',
  
  // Configuration files
  '**/config/**',
  '**/*.config.{js,ts}'
]
```

## 🎯 Analysis Settings

### similarityThreshold

**Type**: `number`  
**Range**: `0.0` to `1.0`  
**Default**: `0.75`

Jaccard similarity threshold for clustering patterns:

```javascript
similarityThreshold: 0.75, // Default: balanced clustering

// Alternative thresholds:
similarityThreshold: 0.6,  // Aggressive: more, broader groups
similarityThreshold: 0.8,  // Strict: fewer, precise groups
similarityThreshold: 0.85, // Very strict: minimal grouping
```

**Threshold recommendations:**
- **0.6-0.7**: Large codebases, find broad patterns
- **0.7-0.75**: Balanced approach (default)
- **0.8-0.85**: Small codebases, precise patterns
- **0.9+**: Very specific, minimal clustering

### minOccurrences

**Type**: `number`  
**Default**: `2`

Minimum number of occurrences required to include a pattern:

```javascript
minOccurrences: 2, // Default: include patterns with 2+ occurrences

// Alternative values:
minOccurrences: 1,  // Include all patterns (noise)
minOccurrences: 3,  // Filter out rare patterns
minOccurrences: 5,  // Only frequent patterns
```

**Usage recommendations:**
- **1-2**: Development, find all patterns
- **3-5**: Production, focus on common patterns
- **10+**: Large codebases, filter noise

### minVariants

**Type**: `number`  
**Default**: `1`

Minimum number of variants required in a cluster:

```javascript
minVariants: 1, // Default: include all clusters

// Alternative values:
minVariants: 2, // Only clusters with multiple variants
minVariants: 3, // Focus on flexible patterns
```

**Usage recommendations:**
- **1**: Find all repeated patterns
- **2**: Focus on patterns with variations
- **3+**: Find highly flexible patterns

## 📤 Output Settings

### output.console

Console output configuration:

```javascript
output: {
  console: {
    enabled: true,        // Show console table
    top: 20,             // Number of top patterns to display
    showDetails: false,  // Show full cluster details
    format: 'table'      // 'table' or 'json'
  }
}
```

**Console options:**
- **enabled**: Show/hide console output
- **top**: Limit displayed patterns (0 = show all)
- **showDetails**: Include full cluster information
- **format**: Output format (table recommended)

### output.json

JSON report configuration:

```javascript
output: {
  json: {
    enabled: true,                           // Generate JSON report
    path: 'reports/tw-patterns.json',        // Output file path
    pretty: true,                            // Pretty-print JSON
    includeMetadata: true,                   // Include analysis metadata
    includeRawPatterns: false                // Include unprocessed patterns
  }
}
```

**JSON options:**
- **enabled**: Generate JSON report
- **path**: Output file location (relative to workspace root)
- **pretty**: Human-readable JSON formatting
- **includeMetadata**: Analysis settings and timing
- **includeRawPatterns**: Unprocessed pattern data

## 🔧 File Parsing Settings

### parsing.patterns

Custom regex patterns for different frameworks:

```javascript
parsing: {
  patterns: {
    // React/JSX: className={...} or className="..."
    react: /(?:className\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
    
    // Astro/HTML: class="..." or class={...} or class:list={...}
    astro: /(?:class\s*=\s*|class:list\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
    
    // Vue: class="..." or :class="..."
    vue: /(?:class\s*=\s*|:class\s*=\s*)(?:(?:{`([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
    
    // Svelte: class="..." or class:name="..."
    svelte: /(?:class\s*=\s*|class:name\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
    
    // Custom: Add your own patterns
    custom: /(?:data-class\s*=\s*)(?:"([^"]+)")/g
  }
}
```

**Custom pattern tips:**
- Use capture groups `()` to extract class content
- Include common whitespace variations `\s*`
- Support multiple quote styles `'`, `"`, `` ` ``
- Use global flag `g` for multiple matches

### parsing.fileTypes

File extension to parsing strategy mapping:

```javascript
parsing: {
  fileTypes: {
    // Default mappings
    '.tsx': ['react'],
    '.jsx': ['react'],
    '.astro': ['astro'],
    '.html': ['astro'],
    '.mdx': ['react', 'astro'],
    '.vue': ['vue'],
    '.svelte': ['svelte'],
    
    // Custom mappings
    '.js': ['react'],           // Treat .js as React
    '.ts': ['react'],           // Treat .ts as React
    '.component': ['react'],    // Custom extension
    '.template': ['astro'],     // Custom extension
    
    // Multiple strategies per file type
    '.mixed': ['react', 'astro', 'custom']
  }
}
```

**Multiple strategies:**
- Files with multiple strategies will be parsed with all of them
- Useful for `.mdx` files that support both React and Astro syntax
- Results are combined and deduplicated

## 🎯 Clustering Settings

### clustering.scoring

Likelihood scoring weights:

```javascript
clustering: {
  scoring: {
    variants: 60,    // Maximum points for variant count
    frequency: 40,   // Maximum points for frequency
  }
}
```

**Scoring formula:**
```
Variant Score = min(variants / 5, 1) * variants_weight
Frequency Score = min(occurrences / 50, 1) * frequency_weight
Total = (Variant Score + Frequency Score) / (variants_weight + frequency_weight)
```

**Custom weights:**
- **variants**: Higher values emphasize pattern flexibility
- **frequency**: Higher values emphasize usage frequency
- **Total must equal 100**: Adjust both values proportionally

## 📋 Complete Configuration Example

```javascript
/** @type {import('@bracketbear/tw-pattern-analyzer').AnalyzerConfig} */
export default {
  // File discovery
  globs: [
    'apps/**/*.{tsx,jsx,astro,html,mdx,vue,svelte}',
    'packages/**/*.{tsx,jsx,astro,html,mdx,vue,svelte}',
    'src/**/*.{tsx,jsx,astro,html,mdx,vue,svelte}',
  ],
  
  ignoreGlobs: [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/.astro/**',
    '**/build/**',
    '**/.output/**',
    '**/coverage/**',
    '**/.turbo/**',
    '**/*.test.{tsx,jsx}',
    '**/*.spec.{tsx,jsx}',
  ],
  
  // Analysis settings
  similarityThreshold: 0.75,
  minOccurrences: 2,
  minVariants: 1,
  
  // Output settings
  output: {
    console: {
      enabled: true,
      top: 20,
      showDetails: false,
      format: 'table'
    },
    json: {
      enabled: true,
      path: 'reports/tw-patterns.json',
      pretty: true,
      includeMetadata: true,
      includeRawPatterns: false
    },
  },
  
  // File parsing
  parsing: {
    patterns: {
      react: /(?:className\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
      astro: /(?:class\s*=\s*|class:list\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
      vue: /(?:class\s*=\s*|:class\s*=\s*)(?:(?:{`([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
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
  
  // Clustering
  clustering: {
    scoring: {
      variants: 60,
      frequency: 40,
    },
  },
};
```

## 🔄 Configuration Overrides

Command line options can override config file settings:

```bash
# Override similarity threshold
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --threshold 0.8

# Override minimum occurrences
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --min-occurrences 5

# Override output path
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --out reports/custom.json

# Override multiple settings
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --threshold 0.8 \
  --min-occurrences 5 \
  --min-variants 2 \
  --top 30 \
  --out reports/strict-analysis.json
```

## 📝 Environment Variables

You can also use environment variables for sensitive configuration:

```javascript
export default {
  // ... other config
  
  output: {
    json: {
      path: process.env.TW_PATTERNS_OUTPUT_PATH || 'reports/tw-patterns.json',
    }
  }
};
```

---

**Next**: Learn about [CLI Usage](./cli-usage.md) or explore [Examples](./examples/) to see configuration in action.
