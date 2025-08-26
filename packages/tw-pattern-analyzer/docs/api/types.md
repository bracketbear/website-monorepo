# Types Reference

Complete TypeScript type definitions for the Tailwind CSS Pattern Analyzer.

## 📦 Core Types

### `AnalyzerConfig`

Main configuration interface for the analyzer.

```typescript
interface AnalyzerConfig {
  // Required
  globs: string[];

  // Optional with defaults
  ignoreGlobs?: string[];
  similarityThreshold?: number;
  minOccurrences?: number;
  minVariants?: number;

  // Output configuration
  output?: OutputConfig;

  // Parsing configuration
  parsing?: ParsingConfig;

  // Clustering configuration
  clustering?: ClusteringConfig;
}
```

**Default Values:**

- `ignoreGlobs`: `['**/node_modules/**', '**/.next/**', '**/dist/**', '**/.astro/**', '**/build/**', '**/.output/**', '**/coverage/**', '**/.turbo/**']`
- `similarityThreshold`: `0.75`
- `minOccurrences`: `2`
- `minVariants`: `1`

### `OutputConfig`

Output configuration for console and JSON reports.

```typescript
interface OutputConfig {
  console?: ConsoleOutputConfig;
  json?: JsonOutputConfig;
}
```

### `ConsoleOutputConfig`

Console output configuration.

```typescript
interface ConsoleOutputConfig {
  enabled?: boolean; // Default: true
  top?: number; // Default: 20
  showDetails?: boolean; // Default: false
  format?: 'table' | 'json'; // Default: 'table'
}
```

### `JsonOutputConfig`

JSON output configuration.

```typescript
interface JsonOutputConfig {
  enabled?: boolean; // Default: true
  path?: string; // Default: 'reports/tw-patterns.json'
  pretty?: boolean; // Default: true
  includeMetadata?: boolean; // Default: true
  includeRawPatterns?: boolean; // Default: false
}
```

### `ParsingConfig`

File parsing configuration.

```typescript
interface ParsingConfig {
  patterns?: Record<string, RegExp>;
  fileTypes?: Record<string, string[]>;
}
```

### `ClusteringConfig`

Clustering algorithm configuration.

```typescript
interface ClusteringConfig {
  scoring?: ScoringConfig;
}
```

### `ScoringConfig`

Likelihood scoring weights.

```typescript
interface ScoringConfig {
  variants?: number; // Default: 60
  frequency?: number; // Default: 40
}
```

## 📊 Analysis Types

### `AnalysisResult`

Result object from pattern analysis.

```typescript
interface AnalysisResult {
  metadata: AnalysisMetadata;
  clusters: PatternCluster[];
  rawPatterns?: RawPattern[];
}
```

### `AnalysisMetadata`

Metadata about the analysis run.

```typescript
interface AnalysisMetadata {
  timestamp: string;
  config: AnalyzerConfig;
  stats: AnalyzerStats;
}
```

### `PatternCluster`

A cluster of similar patterns.

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

### `RawPattern`

Unprocessed pattern with context.

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

## 🔧 Analyzer Types

### `Analyzer`

Main analyzer class interface.

```typescript
interface Analyzer {
  analyze(globs?: string[]): Promise<AnalysisResult>;
  getStats(): AnalyzerStats;
  getConfig(): AnalyzerConfig;
}
```

### `AnalyzerOptions`

Options for analyzer creation.

```typescript
interface AnalyzerOptions {
  config: AnalyzerConfig;
  cache?: boolean;
  parallel?: boolean;
  maxWorkers?: number;
}
```

## 📁 File Processing Types

### `FileInfo`

Information about a file being processed.

```typescript
interface FileInfo {
  path: string;
  extension: string;
  size: number;
  lastModified: Date;
}
```

### `ParsedFile`

File with extracted patterns.

```typescript
interface ParsedFile {
  file: FileInfo;
  patterns: string[];
  parsingStrategy: string[];
  errors?: string[];
}
```

### `PatternMatch`

A single pattern match in a file.

```typescript
interface PatternMatch {
  pattern: string;
  file: string;
  line: number;
  column: number;
  context: string;
  parsingStrategy: string;
}
```

## 🎯 Clustering Types

### `SimilarityResult`

Result of similarity calculation.

```typescript
interface SimilarityResult {
  patternA: string;
  patternB: string;
  similarity: number;
  intersection: string[];
  union: string[];
}
```

### `ClusterCandidate`

A candidate for clustering.

```typescript
interface ClusterCandidate {
  pattern: string;
  occurrences: number;
  files: string[];
  lines: number[];
}
```

### `ClusterGroup`

A group of similar patterns.

```typescript
interface ClusterGroup {
  patterns: string[];
  similarity: number;
  representative: string;
  size: number;
}
```

## 📈 Scoring Types

### `LikelihoodScore`

Component extraction likelihood score.

```typescript
interface LikelihoodScore {
  total: number;
  variantScore: number;
  frequencyScore: number;
  breakdown: {
    variants: {
      score: number;
      maxScore: number;
      weight: number;
    };
    frequency: {
      score: number;
      maxScore: number;
      weight: number;
    };
  };
}
```

### `ScoreBreakdown`

Detailed scoring breakdown.

```typescript
interface ScoreBreakdown {
  variantScore: number;
  frequencyScore: number;
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
}
```

## 🚨 Error Types

### `AnalyzerError`

Custom error class for analyzer-specific errors.

```typescript
class AnalyzerError extends Error {
  constructor(message: string, code: string, details?: any);

  code: string;
  details?: any;

  static isAnalyzerError(error: any): error is AnalyzerError;
}
```

### `ErrorCode`

Error code enumeration.

```typescript
type ErrorCode =
  | 'INVALID_CONFIG'
  | 'FILE_READ_ERROR'
  | 'PARSE_ERROR'
  | 'CLUSTERING_ERROR'
  | 'OUTPUT_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';
```

### `ValidationError`

Configuration validation error.

```typescript
interface ValidationError {
  field: string;
  message: string;
  value?: any;
  expected?: any;
}
```

## 🔍 Utility Types

### `GlobPattern`

Glob pattern string type.

```typescript
type GlobPattern = string;
```

### `FileExtension`

Supported file extension.

```typescript
type FileExtension =
  | '.tsx'
  | '.jsx'
  | '.astro'
  | '.html'
  | '.mdx'
  | '.vue'
  | '.svelte';
```

### `ParsingStrategy`

Supported parsing strategy.

```typescript
type ParsingStrategy = 'react' | 'astro' | 'vue' | 'svelte' | 'html' | 'custom';
```

### `OutputFormat`

Supported output format.

```typescript
type OutputFormat = 'table' | 'json' | 'markdown' | 'csv';
```

## 📝 Generic Types

### `Result<T>`

Generic result wrapper.

```typescript
interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}
```

### `AsyncResult<T>`

Generic async result wrapper.

```typescript
type AsyncResult<T> = Promise<Result<T>>;
```

### `ConfigOverride<T>`

Configuration override type.

```typescript
type ConfigOverride<T> = Partial<T> & { [K in keyof T]?: T[K] };
```

## 🔧 Function Types

### `SimilarityFunction`

Function type for similarity calculation.

```typescript
type SimilarityFunction = (patternA: string, patternB: string) => number;
```

### `PatternExtractor`

Function type for pattern extraction.

```typescript
type PatternExtractor = (content: string, fileInfo: FileInfo) => string[];
```

### `ClusterValidator`

Function type for cluster validation.

```typescript
type ClusterValidator = (cluster: PatternCluster) => boolean;
```

### `OutputFormatter`

Function type for output formatting.

```typescript
type OutputFormatter = (result: AnalysisResult) => string;
```

## 📊 Report Types

### `ReportOptions`

Options for report generation.

```typescript
interface ReportOptions {
  format: OutputFormat;
  includeDetails?: boolean;
  includeMetadata?: boolean;
  includeRawPatterns?: boolean;
  sortBy?: 'likelihood' | 'occurrences' | 'variants' | 'pattern';
  sortOrder?: 'asc' | 'desc';
  filter?: {
    minLikelihood?: number;
    maxLikelihood?: number;
    minOccurrences?: number;
    maxOccurrences?: number;
    minVariants?: number;
    maxVariants?: number;
  };
}
```

### `FormattedReport`

Formatted report output.

```typescript
interface FormattedReport {
  content: string;
  format: OutputFormat;
  metadata: {
    generatedAt: string;
    totalPatterns: number;
    totalClusters: number;
    filteredClusters: number;
  };
}
```

## 🎨 Theme Types

### `ThemeConfig`

Theme configuration for reports.

```typescript
interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      small: string;
      base: string;
      large: string;
      heading: string;
    };
  };
  spacing: {
    small: string;
    medium: string;
    large: string;
  };
}
```

## 🔄 Cache Types

### `CacheConfig`

Cache configuration.

```typescript
interface CacheConfig {
  enabled: boolean;
  directory: string;
  maxAge: number; // milliseconds
  compression: boolean;
}
```

### `CacheEntry`

Cache entry structure.

```typescript
interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt: number;
  version: string;
}
```

## 📋 Complete Type Export

```typescript
// Main exports
export type {
  AnalyzerConfig,
  AnalysisResult,
  PatternCluster,
  Analyzer,
  AnalyzerError,
  ErrorCode,
};

// Configuration types
export type {
  OutputConfig,
  ConsoleOutputConfig,
  JsonOutputConfig,
  ParsingConfig,
  ClusteringConfig,
  ScoringConfig,
};

// Analysis types
export type {
  AnalysisMetadata,
  RawPattern,
  AnalyzerStats,
  FileInfo,
  ParsedFile,
  PatternMatch,
};

// Clustering types
export type {
  SimilarityResult,
  ClusterCandidate,
  ClusterGroup,
  LikelihoodScore,
  ScoreBreakdown,
};

// Utility types
export type {
  GlobPattern,
  FileExtension,
  ParsingStrategy,
  OutputFormat,
  Result,
  AsyncResult,
  ConfigOverride,
};

// Function types
export type {
  SimilarityFunction,
  PatternExtractor,
  ClusterValidator,
  OutputFormatter,
};

// Report types
export type {
  ReportOptions,
  FormattedReport,
  ThemeConfig,
  CacheConfig,
  CacheEntry,
};
```

## 📝 Type Usage Examples

### Basic Configuration

```typescript
import type { AnalyzerConfig } from '@bracketbear/tw-pattern-analyzer';

const config: AnalyzerConfig = {
  globs: ['src/**/*.{tsx,jsx}'],
  similarityThreshold: 0.8,
  minOccurrences: 3,
  output: {
    console: { enabled: true, top: 10 },
    json: { enabled: true, path: 'reports/patterns.json' },
  },
};
```

### Custom Types

```typescript
import type {
  AnalyzerConfig,
  ParsingConfig,
  SimilarityFunction,
} from '@bracketbear/tw-pattern-analyzer';

// Custom similarity function
const customSimilarity: SimilarityFunction = (patternA, patternB) => {
  // Custom similarity logic
  return 0.85;
};

// Custom parsing configuration
const customParsing: ParsingConfig = {
  patterns: {
    custom: /(?:data-tw\s*=\s*)(?:"([^"]+)")/g,
  },
  fileTypes: {
    '.custom': ['custom'],
  },
};

const config: AnalyzerConfig = {
  globs: ['src/**/*.custom'],
  parsing: customParsing,
  similarityThreshold: 0.8,
};
```

### Type Guards

```typescript
import type {
  AnalyzerError,
  ErrorCode,
} from '@bracketbear/tw-pattern-analyzer';

function handleError(error: unknown): void {
  if (AnalyzerError.isAnalyzerError(error)) {
    console.error(`Analyzer error (${error.code}):`, error.message);

    switch (error.code as ErrorCode) {
      case 'INVALID_CONFIG':
        console.error('Configuration error');
        break;
      case 'FILE_READ_ERROR':
        console.error('File reading error');
        break;
      default:
        console.error('Unknown analyzer error');
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

---

**Next**: Explore [CLI Options](./cli.md) for command line interface details, or see [Examples](./examples/) for real-world usage patterns.
