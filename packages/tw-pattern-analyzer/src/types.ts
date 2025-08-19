export interface AnalyzerOptions {
  globs: string[];
  ignoreGlobs?: string[];
  similarityThreshold?: number; // 0..1; Jaccard similarity
  minOccurrences?: number; // ignore patterns that appear less than this
  minVariants?: number; // ignore clusters with fewer variant members
  out?: string | null; // path to write JSON report; null disables
  top?: number; // how many clusters to print in console
}

export interface AnalyzerConfig {
  globs: string[];
  ignoreGlobs: string[];
  similarityThreshold: number;
  minOccurrences: number;
  minVariants: number;
  output: {
    console: {
      enabled: boolean;
      top: number;
    };
    json: {
      enabled: boolean;
      path: string;
    };
  };
  parsing: {
    patterns: {
      react: RegExp;
      astro: RegExp;
      vue: RegExp;
      svelte: RegExp;
    };
    fileTypes: Record<string, string[]>;
  };
  clustering: {
    scoring: {
      variants: number;
      frequency: number;
    };
  };
}

export interface PatternStats {
  pattern: string;
  occurrences: number;
  percent: number;
  variants: string[];
}

export interface Cluster {
  rep: string; // representative pattern
  members: string[]; // all patterns that fell into this cluster
  occurrences: number; // total occurrences across members
  variants: number; // members.length
  similarity: number; // average similarity to rep (0..1)
  likelihood: number; // 0..100 score
}

export interface Report {
  totalClassLists: number;
  uniquePatterns: number;
  totalFiles: number;
  totalPatterns: number;
  clusters: Cluster[];
  generatedAt: string;
}

export interface FileParseResult {
  file: string;
  patterns: string[];
  parseStrategies: string[];
}
