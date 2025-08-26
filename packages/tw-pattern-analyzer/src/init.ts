#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createInterface } from 'node:readline';

interface InitOptions {
  projectType: 'react' | 'astro' | 'vue' | 'svelte' | 'mixed' | 'custom';
  includePaths: string[];
  ignorePaths: string[];
  similarityThreshold: number;
  minOccurrences: number;
  minVariants: number;
  outputPath: string;
  topResults: number;
}

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function closeReadline() {
  rl.close();
}

async function getProjectType(): Promise<
  'react' | 'astro' | 'vue' | 'svelte' | 'mixed' | 'custom'
> {
  console.log('\n🎯 What type of project are you analyzing?');
  console.log('1. React/Next.js (TSX/JSX)');
  console.log('2. Astro');
  console.log('3. Vue');
  console.log('4. Svelte');
  console.log('5. Mixed (multiple frameworks)');
  console.log('6. Custom');

  const choice = await question('\nSelect option (1-6): ');

  const typeMap: Record<string, string> = {
    '1': 'react',
    '2': 'astro',
    '3': 'vue',
    '4': 'svelte',
    '5': 'mixed',
    '6': 'custom',
  };

  return (typeMap[choice] || 'mixed') as
    | 'react'
    | 'astro'
    | 'vue'
    | 'svelte'
    | 'mixed'
    | 'custom';
}

async function getIncludePaths(projectType: string): Promise<string[]> {
  console.log('\n📁 Which directories should be analyzed?');

  const defaultPaths: Record<string, string[]> = {
    react: [
      'src/**/*.{tsx,jsx}',
      'app/**/*.{tsx,jsx}',
      'components/**/*.{tsx,jsx}',
    ],
    astro: ['src/**/*.astro', 'src/**/*.{tsx,jsx}', 'components/**/*.astro'],
    vue: ['src/**/*.vue', 'src/**/*.{tsx,jsx}', 'components/**/*.vue'],
    svelte: ['src/**/*.svelte', 'src/**/*.{tsx,jsx}', 'components/**/*.svelte'],
    mixed: [
      'src/**/*.{tsx,jsx,astro,vue,svelte}',
      'components/**/*.{tsx,jsx,astro,vue,svelte}',
    ],
    custom: [],
  };

  const defaults = defaultPaths[projectType] || defaultPaths.mixed;

  console.log('Default paths for your project type:');
  defaults.forEach((path, i) => console.log(`  ${i + 1}. ${path}`));

  const custom = await question(
    '\nAdd custom paths (comma-separated, or press Enter for defaults): '
  );

  if (custom.trim()) {
    return [...defaults, ...custom.split(',').map((p) => p.trim())];
  }

  return defaults;
}

async function getIgnorePaths(): Promise<string[]> {
  console.log('\n🚫 Which directories should be ignored?');

  const defaults = [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/.astro/**',
    '**/build/**',
    '**/.output/**',
    '**/coverage/**',
    '**/.turbo/**',
  ];

  console.log('Default ignore paths:');
  defaults.forEach((path, i) => console.log(`  ${i + 1}. ${path}`));

  const custom = await question(
    '\nAdd custom ignore paths (comma-separated, or press Enter for defaults): '
  );

  if (custom.trim()) {
    return [...defaults, ...custom.split(',').map((p) => p.trim())];
  }

  return defaults;
}

async function getAnalysisSettings(): Promise<{
  similarityThreshold: number;
  minOccurrences: number;
  minVariants: number;
}> {
  console.log('\n⚙️  Analysis Settings');

  const similarityThreshold = parseFloat(
    (await question('Similarity threshold (0.0-1.0, default 0.75): ')) || '0.75'
  );

  const minOccurrences = parseInt(
    (await question('Minimum occurrences to include (default 2): ')) || '2'
  );

  const minVariants = parseInt(
    (await question('Minimum variants in cluster (default 1): ')) || '1'
  );

  return {
    similarityThreshold: Math.max(0, Math.min(1, similarityThreshold)),
    minOccurrences: Math.max(1, minOccurrences),
    minVariants: Math.max(1, minVariants),
  };
}

async function getOutputSettings(): Promise<{
  outputPath: string;
  topResults: number;
}> {
  console.log('\n📊 Output Settings');

  const outputPath =
    (await question(
      'JSON report path (default: reports/tw-patterns.json): '
    )) || 'reports/tw-patterns.json';
  const topResults = parseInt(
    (await question('Number of top results to display (default 20): ')) || '20'
  );

  return {
    outputPath,
    topResults: Math.max(1, topResults),
  };
}

function generateConfig(options: InitOptions): string {
  const {
    projectType,
    includePaths,
    ignorePaths,
    similarityThreshold,
    minOccurrences,
    minVariants,
    outputPath,
    topResults,
  } = options;

  // Generate appropriate file extensions based on project type
  const fileExtensions: Record<string, string[]> = {
    react: ['.tsx', '.jsx'],
    astro: ['.astro', '.html', '.tsx', '.jsx'],
    vue: ['.vue', '.tsx', '.jsx'],
    svelte: ['.svelte', '.tsx', '.jsx'],
    mixed: ['.tsx', '.jsx', '.astro', '.html', '.vue', '.svelte'],
    custom: ['.tsx', '.jsx', '.astro', '.html', '.vue', '.svelte'],
  };

  const extensions = fileExtensions[projectType] || fileExtensions.mixed;
  const globPatterns = includePaths.map((path) => {
    if (path.includes('**/*')) return path;
    return `${path}/**/*.{${extensions.join(',')}}`;
  });

  return `/** @type {import('@bracketbear/tw-pattern-analyzer').AnalyzerConfig} */
export default {
  // File patterns to analyze (glob patterns)
  globs: ${JSON.stringify(globPatterns, null, 2).replace(/"/g, "'")},
  
  // Patterns to ignore
  ignoreGlobs: ${JSON.stringify(ignorePaths, null, 2).replace(/"/g, "'")},
  
  // Analysis settings
  similarityThreshold: ${similarityThreshold}, // Jaccard similarity threshold (0.0-1.0)
  minOccurrences: ${minOccurrences}, // Minimum occurrences to include
  minVariants: ${minVariants}, // Minimum variants in cluster
  
  // Output settings
  output: {
    console: {
      enabled: true,
      top: ${topResults}, // Number of top patterns to display
    },
    json: {
      enabled: true,
      path: '${outputPath}',
    },
  },
  
  // File parsing settings
  parsing: {
    // Regex patterns for different file types
    patterns: {
      // React/JSX: className={...} or className="..."
      react: /(?:className\\s*=\\s*)(?:(?:{\`([^\`]+)\`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
      
      // Astro/HTML: class="..." or class={...} or class:list={...}
      astro: /(?:class\\s*=\\s*|class:list\\s*=\\s*)(?:(?:{\`([^\`]+)\`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
      
      // Vue: class="..." or :class="..."
      vue: /(?:class\\s*=\\s*|:class\\s*=\\s*)(?:(?:{\`([^\`]+)\`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
      
      // Svelte: class="..." or class:name="..."
      svelte: /(?:class\\s*=\\s*|class:name\\s*=\\s*)(?:(?:{\`([^\`]+)\`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
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
      variants: 60, // Maximum points for variant count
      frequency: 40, // Maximum points for frequency
    },
  },
};
`;
}

async function main() {
  try {
    console.log('🚀 Tailwind Pattern Analyzer - Configuration Wizard');
    console.log('==================================================');

    // Find workspace root
    let workspaceRoot = process.cwd();
    while (workspaceRoot !== dirname(workspaceRoot) && workspaceRoot !== '/') {
      try {
        const pkgPath = resolve(workspaceRoot, 'package.json');
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
        if (pkg.workspaces) {
          break;
        }
      } catch {
        // Continue up the directory tree
      }
      workspaceRoot = dirname(workspaceRoot);
    }

    if (workspaceRoot === '/') {
      workspaceRoot = process.cwd();
    }

    // Check if config already exists
    const configPath = resolve(workspaceRoot, 'tw-pattern-analyzer.config.js');
    if (existsSync(configPath)) {
      const overwrite = await question(
        '\n⚠️  Configuration file already exists. Overwrite? (y/N): '
      );
      if (overwrite.toLowerCase() !== 'y') {
        console.log('❌ Setup cancelled.');
        closeReadline();
        return;
      }
    }

    // Gather configuration options
    const projectType = await getProjectType();
    const includePaths = await getIncludePaths(projectType);
    const ignorePaths = await getIgnorePaths();
    const analysisSettings = await getAnalysisSettings();
    const outputSettings = await getOutputSettings();

    // Generate configuration
    const config = generateConfig({
      projectType,
      includePaths,
      ignorePaths,
      ...analysisSettings,
      ...outputSettings,
    });

    // Write configuration file
    writeFileSync(configPath, config, 'utf8');

    console.log('\n✅ Configuration file created successfully!');
    console.log(`📁 Location: ${configPath}`);

    // Create reports directory if needed
    const reportsDir = dirname(
      resolve(workspaceRoot, outputSettings.outputPath)
    );
    if (!existsSync(reportsDir)) {
      try {
        const { mkdirSync } = await import('node:fs');
        mkdirSync(reportsDir, { recursive: true });
        console.log(`📁 Created reports directory: ${reportsDir}`);
      } catch {
        console.log(`⚠️  Could not create reports directory: ${reportsDir}`);
      }
    }

    console.log('\n🎉 Setup complete! You can now run:');
    console.log('  npm run analyze:tw');
    console.log('\nOr customize the configuration file as needed.');
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    closeReadline();
  }
}

main();
