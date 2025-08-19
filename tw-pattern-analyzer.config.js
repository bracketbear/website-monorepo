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

  // Analysis settings - more aggressive clustering
  similarityThreshold: 0.7, // Lower threshold for more clustering
  minOccurrences: 2, // Minimum occurrences to include
  minVariants: 1, // Minimum variants in cluster

  // Output settings
  output: {
    console: {
      enabled: true,
      top: 25, // Show more patterns
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
      react:
        /(?:className\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,

      // Astro/HTML: class="..." or class={...} or class:list={...} - enhanced for better Astro support
      astro:
        /(?:class\s*=\s*|class:list\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,

      // Vue: class="..." or :class="..."
      vue: /(?:class\s*=\s*|:class\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,

      // Svelte: class="..." or class:name="..."
      svelte:
        /(?:class\s*=\s*|class:name\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
    },

    // File extensions and their parsing strategy
    fileTypes: {
      '.tsx': ['react'],
      '.jsx': ['react'],
      '.astro': ['astro'],
      '.html': ['astro'],
      '.mdx': ['react', 'astro'], // MDX can use both React and Astro patterns
      '.vue': ['vue'],
      '.svelte': ['svelte'],
    },
  },

  // Clustering settings
  clustering: {
    // Likelihood scoring weights
    scoring: {
      variants: 60, // Maximum points for variant count
      frequency: 40, // Maximum points for frequency
    },
  },
};
