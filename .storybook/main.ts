import { createRequire } from 'node:module';
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import fs from 'node:fs';
import path, { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

function workspaceDirs(base: string) {
  const root = path.resolve(__dirname, '..'); // monorepo root
  const full = path.join(root, base);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => !d.name.startsWith('.')) // Exclude hidden directories
    .filter((d) => d.name !== 'dist') // Exclude dist directories
    .filter((d) => d.name !== 'node_modules') // Exclude node_modules
    .map((d) => ({
      name: d.name,
      src: path.join(full, d.name, 'src'),
    }))
    .filter((d) => fs.existsSync(d.src));
}

const appEntries = workspaceDirs('apps').map(({ name, src }) => ({
  directory: src,
  files: '**/*.stories.@(ts|tsx|mdx)',
  titlePrefix: `apps/${name}`,
}));

const pkgEntries = workspaceDirs('packages').map(({ name, src }) => ({
  directory: src,
  files: '**/*.stories.@(ts|tsx|mdx)',
  titlePrefix: `packages/${name}`,
}));

const config: StorybookConfig = {
  framework: { name: getAbsolutePath('@storybook/react-vite'), options: {} },
  addons: [
    getAbsolutePath('@storybook/addon-a11y'),
    getAbsolutePath('@storybook/addon-docs'),
  ],
  stories: [...appEntries, ...pkgEntries],
  viteFinal: async (config) => {
    (config.plugins ??= []).push(tsconfigPaths());

    // Configure PostCSS for Tailwind CSS processing
    config.css = {
      ...(config.css ?? {}),
      postcss: {
        plugins: [require('@tailwindcss/postcss')],
      },
    };

    // Ensure a single React instance across workspaces
    config.resolve = {
      ...(config.resolve ?? {}),
      dedupe: ['react', 'react-dom'],
    };

    // Allow Vite dev server to read files from parent dirs (monorepo)
    config.server = {
      ...(config.server ?? {}),
      fs: {
        ...(config.server?.fs ?? {}),
        allow: ['..'],
      },
    };

    // Configure Vite for React-only environment
    config.define = {
      ...(config.define ?? {}),
      'import.meta.env.SSR': false,
    };

    // Exclude Astro files from dependency optimization
    config.optimizeDeps = {
      ...(config.optimizeDeps ?? {}),
      exclude: ['*.astro'],
    };

    // Add custom plugin to ignore Astro files
    config.plugins = [
      ...(config.plugins ?? []),
      {
        name: 'ignore-astro-files',
        resolveId(id) {
          if (id.endsWith('.astro')) {
            return id;
          }
        },
        load(id) {
          if (id.endsWith('.astro')) {
            return 'export default {}';
          }
        },
      },
    ];

    return config;
  },
};

export default config;

function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, 'package.json')));
}
