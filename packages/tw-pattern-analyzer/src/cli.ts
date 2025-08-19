#!/usr/bin/env node
import { analyze } from './index.js';
import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';

export function parseArgs(argv: string[]) {
  const args = {
    globs: [] as string[],
    ignoreGlobs: [] as string[],
    similarityThreshold: 0.75,
    minOccurrences: 2,
    minVariants: 1,
    top: 20,
    out: null as string | null,
    configPath: undefined as string | undefined,
  } as any;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--ignore' || a === '-i') args.ignoreGlobs.push(next());
    else if (a === '--threshold' || a === '-t') {
      const value = Number(next());
      args.similarityThreshold = value >= 0 && value <= 1 ? value : 0.75;
    } else if (a === '--min-occurrences' || a === '-m') {
      const value = Number(next());
      args.minOccurrences = value > 0 ? value : 2;
    } else if (a === '--min-variants' || a === '-v') {
      const value = Number(next());
      args.minVariants = value > 0 ? value : 1;
    } else if (a === '--out' || a === '-o') args.out = next();
    else if (a === '--top') {
      const value = Number(next());
      args.top = value > 0 ? value : 20;
    } else if (a === '--config' || a === '-c') args.configPath = next();
    else if (a.startsWith('-')) {
      throw new Error(`Unknown flag: ${a}`);
    } else {
      args.globs.push(a);
    }
  }
  return args;
}

export async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  // Find workspace root by looking for package.json with workspaces
  let workspaceRoot = process.cwd();
  while (workspaceRoot !== dirname(workspaceRoot) && workspaceRoot !== '/') {
    try {
      const pkgPath = resolve(workspaceRoot, 'package.json');
      const pkg = JSON.parse(require('fs').readFileSync(pkgPath, 'utf8'));
      if (pkg.workspaces) {
        break;
      }
    } catch {
      // Continue up the directory tree
    }
    workspaceRoot = dirname(workspaceRoot);
  }

  // If we didn't find a workspace, use the current directory
  if (workspaceRoot === '/') {
    workspaceRoot = process.cwd();
  }

  // If we're in a package directory, go up to the workspace root
  if (
    workspaceRoot.includes('/packages/') ||
    workspaceRoot.includes('/apps/')
  ) {
    workspaceRoot = dirname(workspaceRoot);
  }

  // If we're still in packages or apps, go up one more level
  if (workspaceRoot.endsWith('/packages') || workspaceRoot.endsWith('/apps')) {
    workspaceRoot = dirname(workspaceRoot);
  }

  // Check if config file exists
  const configPath = args.configPath || 'tw-pattern-analyzer.config.js';
  const fullConfigPath = resolve(workspaceRoot, configPath);

  if (!existsSync(fullConfigPath)) {
    console.warn(`Config file not found: ${fullConfigPath}`);
    console.warn(
      'Using default configuration. Create a config file to customize behavior.'
    );
  }

  // Change to workspace root directory for glob patterns to work correctly
  process.chdir(workspaceRoot);

  await analyze(args);
}

// Execute main function when this file is run directly
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('cli.js')
) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.stack || err.message : err);
    process.exit(1);
  });
}
