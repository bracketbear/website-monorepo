# Core API Reference

Complete API reference for the Tailwind CSS Pattern Analyzer core functions.

## 📦 Import

```typescript
import { analyzePatterns, createAnalyzer, AnalyzerConfig } from '@bracketbear/tw-pattern-analyzer';
```

## 🔧 Core Functions

### `analyzePatterns(config: AnalyzerConfig): Promise<AnalysisResult>`

Main function to analyze Tailwind CSS patterns in your codebase.

**Parameters:**
- `config: AnalyzerConfig` - Configuration object for the analysis

**Returns:** `Promise<AnalysisResult>` - Analysis results with clusters and metadata

**Example:**
```typescript
import { analyzePatterns } from '@bracketbear/tw-pattern-analyzer';

const config = {
  globs: ['src/**/*.{tsx,jsx,astro}'],
  ignoreGlobs: ['**/node_modules/**'],
  similarityThreshold: 0.75,
  minOccurrences: 2,
  minVariants: 1
};

const result = await analyzePatterns(config);
console.log(`Found ${result.clusters.length} pattern clusters`);
```

### `createAnalyzer(config: AnalyzerConfig): Analyzer`

Create a reusable analyzer instance with configuration.

**Parameters:**
- `config: AnalyzerConfig` - Configuration object for the analyzer

**Returns:** `Analyzer` - Configured analyzer instance

**Example:**
```typescript
import { createAnalyzer } from '@bracketbear/tw-pattern-analyzer';

const analyzer = createAnalyzer({
  globs: ['src/**/*.{tsx,jsx}'],
  similarityThreshold: 0.8
});

// Reuse analyzer for multiple analyses
const result1 = await analyzer.analyze();
const result2 = await analyzer.analyze(['src/components/**/*.tsx']);
```

## 🏗️ Analyzer Class

### `new Analyzer(config: AnalyzerConfig)`

Create a new analyzer instance.

**Methods:**

#### `analyze(globs?: string[]): Promise<AnalysisResult>`

Analyze patterns using the configured or provided glob patterns.

**Parameters:**
- `globs?: string[]` - Optional glob patterns to override configuration

**Returns:** `Promise<AnalysisResult>` - Analysis results

#### `getStats(): AnalyzerStats`

Get statistics about the last analysis run.

**Returns:** `AnalyzerStats` - Analysis statistics

#### `getConfig(): AnalyzerConfig`

Get the current analyzer configuration.

**Returns:** `AnalyzerConfig` - Current configuration

## 📊 Types

### `AnalyzerConfig`

Configuration object for the analyzer.

```typescript
interface AnalyzerConfig {
  // File discovery
  globs: string[];
  ignoreGlobs?: string[];
  
  // Analysis settings
  similarityThreshold?: number;
  minOccurrences?: number;
  minVariants?: number;
  
  // Output settings
  output?: {
    console?: ConsoleOutputConfig;
    json?: JsonOutputConfig;
  };
  
  // File parsing
  parsing?: ParsingConfig;
  
  // Clustering
  clustering?: ClusteringConfig;
}
```

**Properties:**

#### `globs: string[]`
File patterns to analyze using glob syntax. **Required.**

```typescript
globs: [
  'src/**/*.{tsx,jsx,astro,html,mdx,vue,svelte}',
  'packages/**/*.{tsx,jsx,astro}'
]
```

#### `ignoreGlobs?: string[]`
Patterns to ignore during analysis. **Optional.**

```typescript
ignoreGlobs: [
  '**/node_modules/**',
  '**/dist/**',
  '**/.next/**',
  '**/*.test.{tsx,jsx}'
]
```

#### `similarityThreshold?: number`
Jaccard similarity threshold for clustering (0.0-1.0). **Default: 0.75**

```typescript
similarityThreshold: 0.8 // Strict clustering
similarityThreshold: 0.6 // Aggressive clustering
```

#### `minOccurrences?: number`
Minimum occurrences required to include a pattern. **Default: 2**

```typescript
minOccurrences: 3 // Only patterns with 3+ occurrences
minOccurrences: 1 // Include all patterns
```

#### `minVariants?: number`
Minimum variants required in a cluster. **Default: 1**

```typescript
minVariants: 2 // Only clusters with multiple variants
minVariants: 3 // Focus on flexible patterns
```

### `ConsoleOutputConfig`

Console output configuration.

```typescript
interface ConsoleOutputConfig {
  enabled?: boolean;        // Show console output
  top?: number;            // Number of top patterns to display
  showDetails?: boolean;   // Show full cluster details
  format?: 'table' | 'json'; // Output format
}
```

**Properties:**

#### `enabled?: boolean`
Whether to show console output. **Default: true**

#### `top?: number`
Number of top patterns to display. **Default: 20**

```typescript
top: 10    // Show top 10 patterns
top: 0     // Show all patterns
```

#### `showDetails?: boolean`
Whether to show full cluster details. **Default: false**

#### `format?: 'table' | 'json'`
Console output format. **Default: 'table'**

### `JsonOutputConfig`

JSON output configuration.

```typescript
interface JsonOutputConfig {
  enabled?: boolean;              // Generate JSON report
  path?: string;                  // Output file path
  pretty?: boolean;               // Pretty-print JSON
  includeMetadata?: boolean;      // Include analysis metadata
  includeRawPatterns?: boolean;   // Include unprocessed patterns
}
```

**Properties:**

#### `enabled?: boolean`
Whether to generate JSON report. **Default: true**

#### `path?: string`
Output file path relative to workspace root. **Default: 'reports/tw-patterns.json'**

```typescript
path: 'reports/my-analysis.json'
path: 'analysis-results.json'
```

#### `pretty?: boolean`
Whether to pretty-print JSON. **Default: true**

#### `includeMetadata?: boolean`
Whether to include analysis metadata. **Default: true**

#### `includeRawPatterns?: boolean`
Whether to include unprocessed patterns. **Default: false**

### `ParsingConfig`

File parsing configuration.

```typescript
interface ParsingConfig {
  patterns?: Record<string, RegExp>;
  fileTypes?: Record<string, string[]>;
}
```

**Properties:**

#### `patterns?: Record<string, RegExp>`
Custom regex patterns for different frameworks.

```typescript
patterns: {
  react: /(?:className\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
  astro: /(?:class\s*=\s*|class:list\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
  custom: /(?:data-class\s*=\s*)(?:"([^"]+)")/g
}
```

#### `fileTypes?: Record<string, string[]>`
File extension to parsing strategy mapping.

```typescript
fileTypes: {
  '.tsx': ['react'],
  '.astro': ['astro'],
  '.custom': ['custom', 'astro']
}
```

### `ClusteringConfig`

Clustering configuration.

```typescript
interface ClusteringConfig {
  scoring?: {
    variants?: number;
    frequency?: number;
  };
}
```

**Properties:**

#### `scoring?: { variants?: number; frequency?: number }`
Likelihood scoring weights.

```typescript
scoring: {
  variants: 60,    // Maximum points for variant count
  frequency: 40    // Maximum points for frequency
}
```

## 📈 Analysis Results

### `AnalysisResult`

Result object from pattern analysis.

```typescript
interface AnalysisResult {
  metadata: AnalysisMetadata;
  clusters: PatternCluster[];
  rawPatterns?: RawPattern[];
}
```

**Properties:**

#### `metadata: AnalysisMetadata`
Analysis metadata and statistics.

```typescript
interface AnalysisMetadata {
  timestamp: string;
  config: AnalyzerConfig;
  stats: AnalyzerStats;
}
```

#### `clusters: PatternCluster[]`
Pattern clusters found during analysis.

```typescript
interface PatternCluster {
  id: number;
  likelihood: number;
  occurrences: number;
  variants: number;
  patterns: string[];
  sample: string;
}
```

**Properties:**

- **`id: number`** - Unique cluster identifier
- **`likelihood: number`** - Component extraction likelihood (0-100)
- **`occurrences: number`** - Total pattern occurrences
- **`variants: number`** - Number of pattern variants
- **`patterns: string[]`** - All patterns in the cluster
- **`sample: string`** - Representative pattern sample

#### `rawPatterns?: RawPattern[]`
Unprocessed patterns (if enabled).

```typescript
interface RawPattern {
  pattern: string;
  file: string;
  line: number;
  context: string;
}
```

### `AnalyzerStats`

Statistics about the analysis run.

```typescript
interface AnalyzerStats {
  filesAnalyzed: number;
  patternsFound: number;
  clustersCreated: number;
  processingTime: string;
  memoryUsage?: string;
}
```

**Properties:**

- **`filesAnalyzed: number`** - Number of files processed
- **`patternsFound: number`** - Total patterns found
- **`clustersCreated: number`** - Number of clusters created
- **`processingTime: string`** - Total processing time
- **`memoryUsage?: string`** - Memory usage (if available)

## 🔍 Utility Functions

### `calculateSimilarity(patternA: string, patternB: string): number`

Calculate Jaccard similarity between two patterns.

**Parameters:**
- `patternA: string` - First pattern
- `patternB: string` - Second pattern

**Returns:** `number` - Similarity score (0.0-1.0)

**Example:**
```typescript
import { calculateSimilarity } from '@bracketbear/tw-pattern-analyzer';

const similarity = calculateSimilarity(
  'flex items-center gap-4',
  'flex items-center gap-6'
);
console.log(`Similarity: ${similarity}`); // 0.75
```

### `canonicalizePattern(pattern: string): string`

Canonicalize a pattern for consistent comparison.

**Parameters:**
- `pattern: string` - Raw pattern string

**Returns:** `string` - Canonicalized pattern

**Example:**
```typescript
import { canonicalizePattern } from '@bracketbear/tw-pattern-analyzer';

const canonical = canonicalizePattern('gap-4 flex items-center');
console.log(canonical); // 'flex gap-4 items-center'
```

### `extractClasses(content: string, fileType: string): string[]`

Extract Tailwind classes from file content.

**Parameters:**
- `content: string` - File content
- `fileType: string` - File type (e.g., 'react', 'astro')

**Returns:** `string[]` - Extracted class strings

**Example:**
```typescript
import { extractClasses } from '@bracketbear/tw-pattern-analyzer';

const content = '<div className="flex items-center gap-4">';
const classes = extractClasses(content, 'react');
console.log(classes); // ['flex items-center gap-4']
```

## 🚨 Error Handling

### `AnalyzerError`

Custom error class for analyzer-specific errors.

```typescript
class AnalyzerError extends Error {
  constructor(message: string, code: string, details?: any);
  
  code: string;
  details?: any;
}
```

**Error Codes:**

- **`INVALID_CONFIG`** - Invalid configuration
- **`FILE_READ_ERROR`** - Error reading files
- **`PARSE_ERROR`** - Error parsing files
- **`CLUSTERING_ERROR`** - Error during clustering
- **`OUTPUT_ERROR`** - Error writing output

**Example:**
```typescript
import { analyzePatterns } from '@bracketbear/tw-pattern-analyzer';

try {
  const result = await analyzePatterns(config);
} catch (error) {
  if (error instanceof AnalyzerError) {
    console.error(`Analyzer error (${error.code}):`, error.message);
    console.error('Details:', error.details);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## 📝 Examples

### Basic Analysis

```typescript
import { analyzePatterns } from '@bracketbear/tw-pattern-analyzer';

const config = {
  globs: ['src/**/*.{tsx,jsx}'],
  ignoreGlobs: ['**/node_modules/**', '**/*.test.{tsx,jsx}'],
  similarityThreshold: 0.75,
  minOccurrences: 2,
  output: {
    console: { enabled: true, top: 20 },
    json: { enabled: true, path: 'reports/patterns.json' }
  }
};

const result = await analyzePatterns(config);

console.log(`Analysis complete:`);
console.log(`- Files analyzed: ${result.metadata.stats.filesAnalyzed}`);
console.log(`- Patterns found: ${result.metadata.stats.patternsFound}`);
console.log(`- Clusters created: ${result.metadata.stats.clustersCreated}`);

// Process high-priority patterns
const highPriority = result.clusters.filter(c => c.likelihood >= 70);
console.log(`High-priority patterns: ${highPriority.length}`);
```

### Custom Analyzer Instance

```typescript
import { createAnalyzer } from '@bracketbear/tw-pattern-analyzer';

const analyzer = createAnalyzer({
  globs: ['src/**/*.{tsx,jsx,astro}'],
  similarityThreshold: 0.8,
  minOccurrences: 3,
  parsing: {
    patterns: {
      custom: /(?:data-tw\s*=\s*)(?:"([^"]+)")/g
    },
    fileTypes: {
      '.custom': ['custom']
    }
  }
});

// Analyze specific directories
const componentResult = await analyzer.analyze(['src/components/**/*.tsx']);
const pageResult = await analyzer.analyze(['src/pages/**/*.astro']);

// Get analysis statistics
const stats = analyzer.getStats();
console.log(`Total files analyzed: ${stats.filesAnalyzed}`);
```

### Error Handling

```typescript
import { analyzePatterns, AnalyzerError } from '@bracketbear/tw-pattern-analyzer';

async function runAnalysis() {
  try {
    const result = await analyzePatterns({
      globs: ['src/**/*.tsx'],
      similarityThreshold: 0.75
    });
    
    return result;
  } catch (error) {
    if (error instanceof AnalyzerError) {
      switch (error.code) {
        case 'INVALID_CONFIG':
          console.error('Configuration error:', error.message);
          break;
        case 'FILE_READ_ERROR':
          console.error('File reading error:', error.message);
          break;
        case 'PARSE_ERROR':
          console.error('Parsing error:', error.message);
          break;
        default:
          console.error('Analyzer error:', error.message);
      }
      
      if (error.details) {
        console.error('Error details:', error.details);
      }
    } else {
      console.error('Unexpected error:', error);
    }
    
    throw error;
  }
}
```

---

**Next**: Explore [Types](./types.md) for detailed type definitions, or see [Examples](./examples/) for real-world usage patterns.
