# Integration Guide

Integrate the Tailwind CSS Pattern Analyzer into your development workflow, CI/CD pipeline, and build tools.

## 🚀 Quick Integration

### 1. Add to Package.json Scripts

```json
{
  "scripts": {
    "analyze:tw": "npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns",
    "analyze:tw:strict": "npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --threshold 0.8 --min-occurrences 5",
    "analyze:tw:ci": "npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --no-console --out reports/tw-patterns.json"
  }
}
```

### 2. Create Configuration File

```javascript
// tw-pattern-analyzer.config.js
export default {
  globs: ['src/**/*.{tsx,jsx,astro,html,mdx,vue,svelte}'],
  ignoreGlobs: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
  similarityThreshold: 0.75,
  minOccurrences: 2,
  minVariants: 1,
  output: {
    console: { enabled: true, top: 20 },
    json: { enabled: true, path: 'reports/tw-patterns.json' },
  },
};
```

### 3. Run Analysis

```bash
# Development
npm run analyze:tw

# CI/CD
npm run analyze:tw:ci
```

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/analyze-patterns.yml
name: Analyze Tailwind Patterns

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  analyze:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Analyze Tailwind patterns
        run: npm run analyze:tw:ci

      - name: Upload analysis report
        uses: actions/upload-artifact@v4
        with:
          name: tw-pattern-analysis
          path: reports/tw-patterns.json

      - name: Check for critical patterns
        run: |
          if [ -f reports/tw-patterns.json ]; then
            node -e "
              const r = require('./reports/tw-patterns.json');
              const critical = r.clusters.filter(c => c.likelihood >= 80);
              if (critical.length > 0) {
                console.log('⚠️  Critical patterns found:');
                critical.forEach(c => console.log(\`- \${c.sample} (\${c.likelihood}%)\`));
                console.log('Consider extracting these into components.');
              } else {
                console.log('✅ No critical patterns found.');
              }
            "
          fi
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - analyze

analyze-patterns:
  stage: analyze
  image: node:18
  script:
    - npm ci
    - npm run analyze:tw:ci
  artifacts:
    reports:
      junit: reports/tw-patterns.json
    paths:
      - reports/
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

### CircleCI

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  analyze-patterns:
    docker:
      - image: cimg/node:18.17
    steps:
      - checkout
      - run: npm ci
      - run: npm run analyze:tw:ci
      - store_artifacts:
          path: reports/
          destination: tw-pattern-analysis
      - run: |
          if [ -f reports/tw-patterns.json ]; then
            node -e "
              const r = require('./reports/tw-patterns.json');
              const high = r.clusters.filter(c => c.likelihood >= 70);
              console.log(\`Found \${high.length} high-likelihood patterns\`);
            "
          fi

workflows:
  version: 2
  analyze:
    jobs:
      - analyze-patterns:
          filters:
            branches:
              only: [main, develop]
```

## 🏗️ Build Tool Integration

### Turborepo

```json
// turbo.json
{
  "pipeline": {
    "analyze:tw": {
      "outputs": ["reports/tw-patterns.json"],
      "dependsOn": ["^build"],
      "cache": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", ".astro/**"]
    }
  }
}
```

**Usage:**

```bash
# Run analysis as part of build pipeline
npx turbo run analyze:tw

# Run with other tasks
npx turbo run build analyze:tw
```

### Nx

```json
// nx.json
{
  "targetDefaults": {
    "analyze:tw": {
      "executor": "nx:run-commands",
      "options": {
        "command": "npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --no-console --out reports/tw-patterns.json",
        "cwd": "."
      },
      "outputs": ["reports/tw-patterns.json"]
    }
  }
}
```

**Usage:**

```bash
# Run analysis
npx nx run-many --target=analyze:tw

# Run with dependencies
npx nx run-many --target=build,analyze:tw
```

### Lerna

```json
// lerna.json
{
  "scripts": {
    "analyze:tw": "npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns"
  }
}
```

**Usage:**

```bash
# Run analysis across all packages
npx lerna run analyze:tw

# Run in specific package
npx lerna run analyze:tw --scope=@bracketbear/core
```

## 📊 Monitoring & Reporting

### Automated Reports

```bash
# Generate daily reports
0 9 * * * cd /path/to/project && npm run analyze:tw:ci

# Weekly summary
0 9 * * 1 cd /path/to/project && npm run analyze:tw:ci && node scripts/weekly-summary.js
```

### Slack Integration

```javascript
// scripts/slack-notification.js
const { WebClient } = require('@slack/web-api');
const fs = require('fs');

async function sendSlackNotification() {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_CHANNEL;

  if (!token || !channel) return;

  const client = new WebClient(token);
  const report = JSON.parse(
    fs.readFileSync('reports/tw-patterns.json', 'utf8')
  );

  const critical = report.clusters.filter((c) => c.likelihood >= 80);
  const high = report.clusters.filter(
    (c) => c.likelihood >= 70 && c.likelihood < 80
  );

  const message = {
    channel,
    text: `🔍 Tailwind Pattern Analysis Complete`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `*Tailwind Pattern Analysis Complete*\n\n` +
            `📊 *Summary:*\n` +
            `• Files analyzed: ${report.metadata.stats.filesAnalyzed}\n` +
            `• Patterns found: ${report.metadata.stats.patternsFound}\n` +
            `• Clusters created: ${report.metadata.stats.clustersCreated}\n\n` +
            `🎯 *Priority Patterns:*\n` +
            `• Critical (80%+): ${critical.length}\n` +
            `• High (70%+): ${high.length}`,
        },
      },
    ],
  };

  if (critical.length > 0) {
    message.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🚨 *Critical Patterns Found:*\n${critical.map((c) => `• \`${c.sample}\` (${c.likelihood}%)`).join('\n')}`,
      },
    });
  }

  await client.chat.postMessage(message);
}

sendSlackNotification().catch(console.error);
```

### Email Reports

```javascript
// scripts/email-report.js
const nodemailer = require('nodemailer');
const fs = require('fs');

async function sendEmailReport() {
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const report = JSON.parse(
    fs.readFileSync('reports/tw-patterns.json', 'utf8')
  );
  const highPriority = report.clusters.filter((c) => c.likelihood >= 70);

  const html = `
    <h2>Tailwind Pattern Analysis Report</h2>
    <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
    
    <h3>Summary</h3>
    <ul>
      <li>Files analyzed: ${report.metadata.stats.filesAnalyzed}</li>
      <li>Patterns found: ${report.metadata.stats.patternsFound}</li>
      <li>Clusters created: ${report.metadata.stats.clustersCreated}</li>
    </ul>
    
    <h3>High Priority Patterns (70%+)</h3>
    ${highPriority
      .map(
        (c) => `
      <div style="margin: 10px 0; padding: 10px; border: 1px solid #ddd;">
        <strong>${c.sample}</strong><br>
        Likelihood: ${c.likelihood}% | Occurrences: ${c.occurrences} | Variants: ${c.variants}
      </div>
    `
      )
      .join('')}
  `;

  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: process.env.TO_EMAIL,
    subject: 'Tailwind Pattern Analysis Report',
    html,
  });
}

sendEmailReport().catch(console.error);
```

## 🔧 Advanced Integration

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{tsx,jsx,astro,html,mdx,vue,svelte}": ["npm run analyze:tw:strict"]
  }
}
```

### VS Code Extension Integration

```json
// .vscode/settings.json
{
  "tailwindCSS.experimental.classRegex": [
    ["className\\s*=\\s*([\"'`])(.*?)\\1", "([\"'`])(.*?)\\1"],
    ["class\\s*=\\s*([\"'`])(.*?)\\1", "([\"'`])(.*?)\\1"]
  ],
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

### Webpack Plugin

```javascript
// webpack.config.js
const TwPatternAnalyzerPlugin = require('@bracketbear/tw-pattern-analyzer/webpack');

module.exports = {
  // ... other config
  plugins: [
    new TwPatternAnalyzerPlugin({
      enabled: process.env.NODE_ENV === 'development',
      outputPath: 'reports/webpack-patterns.json',
      include: ['src/**/*.{tsx,jsx}'],
      exclude: ['**/node_modules/**', '**/*.test.{tsx,jsx}'],
    }),
  ],
};
```

## 📈 Performance Optimization

### Parallel Analysis

```bash
# Analyze different directories in parallel
npm run analyze:tw:components &
npm run analyze:tw:pages &
npm run analyze:tw:utils &
wait

# Merge results
node scripts/merge-reports.js
```

### Caching

```bash
# Cache analysis results
npm run analyze:tw:ci --cache

# Use cached results if available
npm run analyze:tw:ci --cache-only
```

### Incremental Analysis

```javascript
// tw-pattern-analyzer.config.js
export default {
  // ... other config

  // Only analyze changed files
  incremental: {
    enabled: true,
    cacheFile: '.tw-patterns-cache.json',
    baseBranch: 'main',
  },
};
```

## 🚨 Quality Gates

### Pattern Thresholds

```bash
# Fail CI if too many high-likelihood patterns
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --threshold 0.8 \
  --min-occurrences 5 \
  --out reports/ci-analysis.json

# Check thresholds
node -e "
const r = require('./reports/ci-analysis.json');
const critical = r.clusters.filter(c => c.likelihood >= 80);
const high = r.clusters.filter(c => c.likelihood >= 70);

if (critical.length > 5) {
  console.error('❌ Too many critical patterns:', critical.length);
  process.exit(1);
}

if (high.length > 20) {
  console.error('⚠️  Too many high-likelihood patterns:', high.length);
  process.exit(1);
}

console.log('✅ Pattern analysis passed quality gates');
"
```

### Automated Component Extraction

```javascript
// scripts/auto-extract.js
const fs = require('fs');
const path = require('path');

function extractComponent(pattern, outputDir) {
  const componentName = generateComponentName(pattern.sample);
  const componentPath = path.join(outputDir, `${componentName}.tsx`);

  const componentCode = `
import React from 'react';

interface ${componentName}Props {
  className?: string;
  children?: React.ReactNode;
}

export function ${componentName}({ className = '', children, ...props }: ${componentName}Props) {
  return (
    <div className={\`${pattern.sample} \${className}\`} {...props}>
      {children}
    </div>
  );
}
`;

  fs.writeFileSync(componentPath, componentCode);
  console.log(`✅ Extracted component: ${componentPath}`);
}

// Extract all high-likelihood patterns
const report = JSON.parse(fs.readFileSync('reports/tw-patterns.json', 'utf8'));
const highPriority = report.clusters.filter((c) => c.likelihood >= 70);

highPriority.forEach((pattern) => {
  extractComponent(pattern, 'src/components/extracted');
});
```

---

**Next**: Explore [Examples](./examples/) for real-world integration patterns, or learn [Best Practices](./best-practices.md) for optimal results.
