import fg from 'fast-glob';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, extname, dirname } from 'node:path';
import type {
  AnalyzerOptions,
  AnalyzerConfig,
  Cluster,
  PatternStats,
  Report,
  FileParseResult,
} from './types';

function defaultConfig(): AnalyzerConfig {
  return {
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
    ],
    similarityThreshold: 0.75,
    minOccurrences: 1,
    minVariants: 1,
    output: {
      console: { enabled: true, top: 20 },
      json: { enabled: true, path: 'reports/tw-patterns.json' },
    },
    parsing: {
      patterns: {
        react:
          /(?:className\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
        astro:
          /(?:class\s*=\s*|class:list\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))|(?:class:list\s*=\s*\{([^}]+)\})/g,
        vue: /(?:class\s*=\s*|:class\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
        svelte:
          /(?:class\s*=\s*|class:name\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
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
    clustering: {
      scoring: { variants: 60, frequency: 40 },
    },
  };
}

async function loadConfig(workspaceRoot: string): Promise<AnalyzerConfig> {
  const configPath = resolve(workspaceRoot, 'tw-pattern-analyzer.config.js');

  if (!existsSync(configPath)) {
    return defaultConfig();
  }

  try {
    const config = await import(configPath);
    return config.default || config;
  } catch (error) {
    console.warn('Failed to load config file, using defaults:', error);
    return defaultConfig();
  }
}

export function tokenize(classList: string): string[] {
  return classList.trim().split(/\s+/).filter(Boolean);
}

export function canonicalize(classList: string | string[]): string | string[] {
  const tokens = Array.isArray(classList) ? classList : tokenize(classList);
  const sorted = tokens.sort((a, b) => a.localeCompare(b));

  if (Array.isArray(classList)) {
    // Remove duplicates when returning array
    return [...new Set(sorted)];
  }
  return sorted.join(' ');
}

export function jaccard(a: string | string[], b: string | string[]): number {
  const A = new Set(Array.isArray(a) ? a : a.split(' ').filter(Boolean));
  const B = new Set(Array.isArray(b) ? b : b.split(' ').filter(Boolean));
  const inter = [...A].filter((x) => B.has(x)).length;
  const uni = new Set([...A, ...B]).size;
  return uni === 0 ? 1 : inter / uni; // 1 = identical
}

export function findClassesInSource(
  src: string,
  file: string,
  config: AnalyzerConfig
): FileParseResult {
  const ext = extname(file);
  const strategies = config.parsing.fileTypes[ext] || [];
  const patterns: string[] = [];
  const parseStrategies: string[] = [];

  for (const strategy of strategies) {
    const regex =
      config.parsing.patterns[strategy as keyof typeof config.parsing.patterns];
    if (!regex) continue;

    let match: RegExpExecArray | null;
    regex.lastIndex = 0; // Reset regex state

    while ((match = regex.exec(src))) {
      // match groups 1..5 cover {`...`}, {"..."}, '...', "...", and {array}
      let raw = '';
      if (match[1])
        raw = match[1]; // {`...`}
      else if (match[2])
        raw = match[2]; // {"..."}
      else if (match[3])
        raw = match[3]; // {'...'}
      else if (match[4])
        raw = match[4]; // "..."
      else if (match[5]) raw = match[5]; // {array}

      if (!raw) continue;

      // Handle array syntax for class:list
      if (strategy === 'astro' && match[5]) {
        // Extract class names from array syntax like ["flex", "gap-4", "bg-white"]
        // Handle both quoted strings and conditional expressions
        const classMatches = raw.match(/(?:"([^"]+)"|'([^']+)')/g);
        if (classMatches) {
          for (const classMatch of classMatches) {
            const className = classMatch.slice(1, -1); // Remove quotes
            if (
              className &&
              !className.includes('===') &&
              !className.includes('?')
            ) {
              patterns.push(className);
            }
          }
        }
      } else {
        patterns.push(raw);
      }

      if (!parseStrategies.includes(strategy)) {
        parseStrategies.push(strategy);
      }
    }
  }

  return { file, patterns, parseStrategies };
}

export async function analyze(options: AnalyzerOptions): Promise<Report> {
  const {
    globs,
    ignoreGlobs,
    similarityThreshold,
    minOccurrences,
    minVariants,
    out,
    top,
  } = options;

  // Load configuration (bypass workspace config when explicit globs are provided)
  const workspaceRoot = process.cwd();
  const config =
    globs && globs.length > 0
      ? defaultConfig()
      : await loadConfig(workspaceRoot);

  // Merge options with config
  const finalGlobs = globs && globs.length > 0 ? globs : config.globs;
  const finalIgnoreGlobs = [...config.ignoreGlobs, ...(ignoreGlobs ?? [])];
  // Prefer explicit option if provided, otherwise use a pragmatic default of 0.5
  // to encourage clustering in heterogeneous codebases
  const finalThreshold = similarityThreshold ?? 0.5;
  const finalMinOccurrences = minOccurrences ?? config.minOccurrences;
  const finalMinVariants = minVariants ?? config.minVariants;
  const finalTop = top ?? config.output.console.top;
  const finalOut =
    out ?? (config.output.json.enabled ? config.output.json.path : null);

  const files = await fg(finalGlobs, {
    ignore: finalIgnoreGlobs,
    dot: false,
    onlyFiles: true,
    unique: true,
  });

  const patternCounts = new Map<string, number>();
  const fileResults: FileParseResult[] = [];

  for (const file of files) {
    try {
      const src = readFileSync(file, 'utf8');
      const result = findClassesInSource(src, file, config);

      if (result.patterns.length > 0) {
        fileResults.push(result);
        for (const raw of result.patterns) {
          const key = canonicalize(raw) as string;
          patternCounts.set(key, (patternCounts.get(key) ?? 0) + 1);
        }
      }
    } catch (error) {
      console.warn(`Failed to read file ${file}:`, error);
    }
  }

  const totalClassLists = [...patternCounts.values()].reduce(
    (a, b) => a + b,
    0
  );

  const stats: PatternStats[] = [...patternCounts.entries()]
    .map(([pattern, occurrences]) => ({
      pattern,
      occurrences,
      percent: totalClassLists
        ? +((occurrences / totalClassLists) * 100).toFixed(2)
        : 0,
      variants: [pattern],
    }))
    .filter((s) => s.occurrences >= finalMinOccurrences)
    .sort((a, b) => b.occurrences - a.occurrences);

  // Greedy clustering by similarity to representative
  const clusters: Cluster[] = [];
  for (const s of stats) {
    let attached = false;
    for (const c of clusters) {
      const sim = jaccard(s.pattern, c.rep);
      if (sim >= finalThreshold) {
        c.members.push(s.pattern);
        c.occurrences += s.occurrences;
        attached = true;
        break;
      }
    }
    if (!attached) {
      clusters.push({
        rep: s.pattern,
        members: [s.pattern],
        occurrences: s.occurrences,
        variants: 1,
        similarity: 1,
        likelihood: 0,
      });
    }
  }

  // Finalize cluster metrics
  for (const c of clusters) {
    c.variants = c.members.length;
    const sims = c.members.map((m) => jaccard(m, c.rep));
    c.similarity = sims.reduce((a, b) => a + b, 0) / sims.length;

    // Use config-based scoring
    const variantScore = Math.min(
      config.clustering.scoring.variants,
      (c.variants - 1) * (config.clustering.scoring.variants / 4)
    );
    const freqShare = totalClassLists ? c.occurrences / totalClassLists : 0;
    const freqScore = Math.min(
      config.clustering.scoring.frequency,
      Math.round(freqShare * 400)
    );
    c.likelihood = Math.max(0, Math.min(100, variantScore + freqScore));
  }

  const filtered = clusters
    .filter((c) => c.variants >= finalMinVariants)
    .sort((a, b) => b.likelihood - a.likelihood);

  // Console report (if enabled)
  if (config.output.console.enabled) {
    const preview = filtered.slice(0, finalTop).map((c) => ({
      occurrences: c.occurrences,
      variants: c.variants,
      likelihood: `${c.likelihood}%`,
      sample: c.rep,
    }));

    console.table(preview);
  }

  const report: Report = {
    totalClassLists,
    uniquePatterns: patternCounts.size,
    totalFiles: files.length,
    totalPatterns: totalClassLists,
    clusters: filtered,
    generatedAt: new Date().toISOString(),
  };

  // JSON output (if enabled)
  if (finalOut && config.output.json.enabled && out !== null) {
    const p = resolve(process.cwd(), finalOut);
    // Ensure containing directory exists
    try {
      const dir = dirname(p);
      mkdirSync(dir, { recursive: true });
    } catch {
      // ignore mkdir errors, write may still fail and be surfaced in tests/logs
    }
    writeFileSync(p, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\nWrote JSON report → ${p}`);
  }

  return report;
}
