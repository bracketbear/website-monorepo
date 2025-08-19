# Advanced Usage Guide

Master advanced features, custom patterns, and fine-tuning for the Tailwind CSS Pattern Analyzer.

## 🔧 Custom Pattern Detection

### Framework-Specific Patterns

Extend the analyzer to support custom frameworks and class attributes:

```javascript
// tw-pattern-analyzer.config.js
export default {
  parsing: {
    patterns: {
      // Default patterns
      react: /(?:className\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
      astro: /(?:class\s*=\s*|class:list\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
      
      // Custom patterns
      angular: /(?:class\s*=\s*|\[class\]\s*=\s*|\[ngClass\]\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
      svelte: /(?:class\s*=\s*|class:name\s*=\s*|class:list\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
      
      // Custom attribute patterns
      dataClasses: /(?:data-class\s*=\s*|data-tw\s*=\s*)(?:"([^"]+)")/g,
      styleClasses: /(?:style\s*=\s*)(?:"([^"]+)")(?=.*?class\s*=\s*)/g,
      
      // Template literal patterns
      templateLiterals: /(?:className\s*=\s*`([^`]+)`)/g,
      
      // Dynamic class patterns (basic support)
      dynamicClasses: /(?:className\s*=\s*\{[^}]+\s*\?\s*["']([^"']+)["']\s*:\s*["']([^"']+)["']\s*\})/g
    },
    
    fileTypes: {
      // Map custom extensions
      '.tsx': ['react', 'templateLiterals'],
      '.jsx': ['react', 'templateLiterals'],
      '.astro': ['astro', 'dataClasses'],
      '.vue': ['vue', 'styleClasses'],
      '.svelte': ['svelte', 'dataClasses'],
      '.component': ['angular', 'dataClasses'],
      '.template': ['astro', 'dataClasses']
    }
  }
};
```

### Custom Class Extraction

For complex class extraction scenarios, create custom extraction functions:

```javascript
// custom-extractor.js
export function extractCustomClasses(content, filePath) {
  const classes = new Set();
  
  // Extract from CSS-in-JS
  const cssInJsMatches = content.match(/css\s*`([^`]+)`/g);
  if (cssInJsMatches) {
    cssInJsMatches.forEach(match => {
      const cssContent = match.match(/css\s*`([^`]+)`/)[1];
      extractTailwindClasses(cssContent, classes);
    });
  }
  
  // Extract from styled-components
  const styledMatches = content.match(/styled\.[a-zA-Z]+\s*`([^`]+)`/g);
  if (styledMatches) {
    styledMatches.forEach(match => {
      const styledContent = match.match(/styled\.[a-zA-Z]+\s*`([^`]+)`/)[1];
      extractTailwindClasses(styledContent, classes);
    });
  }
  
  // Extract from CSS modules
  const cssModuleMatches = content.match(/styles\.[a-zA-Z_][a-zA-Z0-9_]*/g);
  if (cssModuleMatches) {
    cssModuleMatches.forEach(match => {
      // Map CSS module classes to Tailwind equivalents
      const tailwindClass = mapCssModuleToTailwind(match);
      if (tailwindClass) classes.add(tailwindClass);
    });
  }
  
  return Array.from(classes);
}

function extractTailwindClasses(cssContent, classes) {
  // Extract Tailwind-like classes from CSS
  const tailwindPattern = /@apply\s+([^;]+);/g;
  let match;
  
  while ((match = tailwindPattern.exec(cssContent)) !== null) {
    const appliedClasses = match[1].trim().split(/\s+/);
    appliedClasses.forEach(cls => classes.add(cls));
  }
}

function mapCssModuleToTailwind(cssModuleClass) {
  // Map common CSS module patterns to Tailwind
  const mappings = {
    'styles.container': 'container mx-auto px-4',
    'styles.flex': 'flex items-center',
    'styles.button': 'px-4 py-2 bg-blue-500 text-white rounded'
  };
  
  return mappings[cssModuleClass] || null;
}
```

## 🎯 Advanced Clustering Strategies

### Custom Similarity Algorithms

Implement custom similarity functions for specific use cases:

```javascript
// custom-similarity.js
export function customSimilarity(patternA, patternB, options = {}) {
  const { weights = { exact: 1.0, prefix: 0.8, suffix: 0.6, semantic: 0.4 } } = options;
  
  const classesA = patternA.split(' ');
  const classesB = patternB.split(' ');
  
  let totalScore = 0;
  let maxScore = 0;
  
  classesA.forEach(classA => {
    let bestMatch = 0;
    
    classesB.forEach(classB => {
      const score = calculateClassSimilarity(classA, classB, weights);
      bestMatch = Math.max(bestMatch, score);
    });
    
    totalScore += bestMatch;
    maxScore += 1;
  });
  
  return totalScore / maxScore;
}

function calculateClassSimilarity(classA, classB, weights) {
  // Exact match
  if (classA === classB) return weights.exact;
  
  // Prefix match (e.g., "text-" prefix)
  if (classA.startsWith('text-') && classB.startsWith('text-')) {
    return weights.prefix;
  }
  
  // Suffix match (e.g., "-4" suffix)
  if (classA.endsWith('-4') && classB.endsWith('-4')) {
    return weights.suffix;
  }
  
  // Semantic similarity
  if (isSemanticallySimilar(classA, classB)) {
    return weights.semantic;
  }
  
  return 0;
}

function isSemanticallySimilar(classA, classB) {
  const semanticGroups = {
    spacing: ['p-', 'm-', 'px-', 'py-', 'mx-', 'my-'],
    sizing: ['w-', 'h-', 'max-w-', 'min-h-'],
    colors: ['bg-', 'text-', 'border-'],
    layout: ['flex', 'grid', 'block', 'inline'],
    typography: ['text-', 'font-', 'leading-', 'tracking-']
  };
  
  for (const [group, prefixes] of Object.entries(semanticGroups)) {
    const aInGroup = prefixes.some(prefix => classA.startsWith(prefix));
    const bInGroup = prefixes.some(prefix => classB.startsWith(prefix));
    
    if (aInGroup && bInGroup) return true;
  }
  
  return false;
}
```

### Hierarchical Clustering

Group patterns into hierarchical categories:

```javascript
// hierarchical-clustering.js
export function hierarchicalClustering(patterns, options = {}) {
  const { maxDepth = 3, minClusterSize = 2 } = options;
  
  const clusters = [];
  const processed = new Set();
  
  patterns.forEach(pattern => {
    if (processed.has(pattern)) return;
    
    const cluster = createHierarchicalCluster(pattern, patterns, maxDepth, minClusterSize);
    if (cluster.patterns.length >= minClusterSize) {
      clusters.push(cluster);
      cluster.patterns.forEach(p => processed.add(p));
    }
  });
  
  return clusters;
}

function createHierarchicalCluster(seed, allPatterns, maxDepth, minClusterSize, depth = 0) {
  if (depth >= maxDepth) {
    return { patterns: [seed], depth, children: [] };
  }
  
  const cluster = { patterns: [seed], depth, children: [] };
  const candidates = allPatterns.filter(p => p !== seed);
  
  // Find similar patterns at current level
  const similar = candidates.filter(candidate => 
    calculateSimilarity(seed, candidate) >= 0.7
  );
  
  cluster.patterns.push(...similar);
  
  // Recursively create sub-clusters
  if (depth < maxDepth - 1 && similar.length >= minClusterSize) {
    similar.forEach(pattern => {
      const subCluster = createHierarchicalCluster(
        pattern, 
        candidates, 
        maxDepth, 
        minClusterSize, 
        depth + 1
      );
      
      if (subCluster.patterns.length >= minClusterSize) {
        cluster.children.push(subCluster);
      }
    });
  }
  
  return cluster;
}
```

## 📊 Advanced Output Formats

### Custom Report Generators

Create specialized report formats for different stakeholders:

```javascript
// report-generators.js
export function generateDeveloperReport(clusters) {
  return {
    summary: generateSummary(clusters),
    highPriority: clusters.filter(c => c.likelihood >= 70),
    mediumPriority: clusters.filter(c => c.likelihood >= 40 && c.likelihood < 70),
    lowPriority: clusters.filter(c => c.likelihood < 40),
    recommendations: generateRecommendations(clusters)
  };
}

export function generateDesignerReport(clusters) {
  return {
    visualPatterns: extractVisualPatterns(clusters),
    spacingPatterns: extractSpacingPatterns(clusters),
    colorPatterns: extractColorPatterns(clusters),
    typographyPatterns: extractTypographyPatterns(clusters),
    layoutPatterns: extractLayoutPatterns(clusters)
  };
}

export function generateManagerReport(clusters) {
  return {
    summary: generateSummary(clusters),
    effortEstimate: calculateEffortEstimate(clusters),
    impactScore: calculateImpactScore(clusters),
    priorityOrder: generatePriorityOrder(clusters),
    timeline: generateTimeline(clusters)
  };
}

function generateSummary(clusters) {
  const totalPatterns = clusters.reduce((sum, c) => sum + c.occurrences, 0);
  const highPriority = clusters.filter(c => c.likelihood >= 70).length;
  const estimatedSavings = clusters
    .filter(c => c.likelihood >= 70)
    .reduce((sum, c) => sum + (c.occurrences * 0.5), 0); // 0.5 hours per pattern
  
  return {
    totalPatterns,
    highPriority,
    estimatedSavings,
    topPatterns: clusters.slice(0, 5)
  };
}

function calculateEffortEstimate(clusters) {
  return clusters
    .filter(c => c.likelihood >= 70)
    .reduce((total, cluster) => {
      const baseEffort = 2; // 2 hours base
      const variantEffort = cluster.variants * 0.5; // 0.5 hours per variant
      const complexityEffort = cluster.patterns[0].split(' ').length * 0.1; // 0.1 hours per class
      
      return total + baseEffort + variantEffort + complexityEffort;
    }, 0);
}

function generatePriorityOrder(clusters) {
  return clusters
    .filter(c => c.likelihood >= 50)
    .sort((a, b) => {
      // Sort by likelihood, then by occurrences, then by variants
      if (a.likelihood !== b.likelihood) return b.likelihood - a.likelihood;
      if (a.occurrences !== b.occurrences) return b.occurrences - a.occurrences;
      return b.variants - a.variants;
    })
    .map((cluster, index) => ({
      rank: index + 1,
      pattern: cluster.sample,
      likelihood: cluster.likelihood,
      occurrences: cluster.occurrences,
      variants: cluster.variants,
      effort: estimateEffort(cluster)
    }));
}
```

### Markdown Report Generation

Generate human-readable markdown reports:

```javascript
// markdown-generator.js
export function generateMarkdownReport(clusters, options = {}) {
  const { title = 'Tailwind Pattern Analysis Report', includeDetails = true } = options;
  
  let markdown = `# ${title}\n\n`;
  markdown += `Generated on ${new Date().toLocaleDateString()}\n\n`;
  
  // Summary section
  markdown += generateSummarySection(clusters);
  
  // High priority patterns
  const highPriority = clusters.filter(c => c.likelihood >= 70);
  if (highPriority.length > 0) {
    markdown += generatePrioritySection('High Priority Patterns (70%+)', highPriority, '🚨');
  }
  
  // Medium priority patterns
  const mediumPriority = clusters.filter(c => c.likelihood >= 40 && c.likelihood < 70);
  if (mediumPriority.length > 0) {
    markdown += generatePrioritySection('Medium Priority Patterns (40-69%)', mediumPriority, '⚠️');
  }
  
  // Low priority patterns
  const lowPriority = clusters.filter(c => c.likelihood < 40);
  if (lowPriority.length > 0) {
    markdown += generatePrioritySection('Low Priority Patterns (<40%)', lowPriority, 'ℹ️');
  }
  
  if (includeDetails) {
    markdown += generateDetailedSection(clusters);
  }
  
  return markdown;
}

function generateSummarySection(clusters) {
  const totalPatterns = clusters.reduce((sum, c) => sum + c.occurrences, 0);
  const highPriority = clusters.filter(c => c.likelihood >= 70).length;
  const mediumPriority = clusters.filter(c => c.likelihood >= 40 && c.likelihood < 70).length;
  
  return `## 📊 Summary\n\n` +
         `- **Total Patterns Found:** ${totalPatterns}\n` +
         `- **High Priority:** ${highPriority}\n` +
         `- **Medium Priority:** ${mediumPriority}\n` +
         `- **Total Clusters:** ${clusters.length}\n\n`;
}

function generatePrioritySection(title, clusters, emoji) {
  let section = `## ${emoji} ${title}\n\n`;
  
  clusters.forEach((cluster, index) => {
    section += `### ${index + 1}. ${cluster.sample}\n\n`;
    section += `- **Likelihood:** ${cluster.likelihood}%\n`;
    section += `- **Occurrences:** ${cluster.occurrences}\n`;
    section += `- **Variants:** ${cluster.variants}\n\n`;
    
    if (cluster.variants > 1) {
      section += `**Variants:**\n`;
      cluster.patterns.forEach(pattern => {
        section += `- \`${pattern}\`\n`;
      });
      section += `\n`;
    }
    
    section += `**Recommendation:** ${generateRecommendation(cluster)}\n\n`;
  });
  
  return section;
}

function generateRecommendation(cluster) {
  if (cluster.likelihood >= 80) {
    return "Extract into component immediately - high reuse potential";
  } else if (cluster.likelihood >= 70) {
    return "Plan component extraction soon - good reuse potential";
  } else if (cluster.likelihood >= 50) {
    return "Consider extraction if pattern grows - moderate potential";
  } else {
    return "Monitor for growth - low extraction priority";
  }
}
```

## 🚀 Performance Optimization

### Parallel Processing

Implement parallel analysis for large codebases:

```javascript
// parallel-analyzer.js
import { Worker } from 'worker_threads';
import { cpus } from 'os';

export async function parallelAnalysis(files, options = {}) {
  const { maxWorkers = cpus().length, chunkSize = 100 } = options;
  
  // Split files into chunks
  const chunks = [];
  for (let i = 0; i < files.length; i += chunkSize) {
    chunks.push(files.slice(i, i + chunkSize));
  }
  
  // Process chunks in parallel
  const workers = Math.min(maxWorkers, chunks.length);
  const results = await Promise.all(
    chunks.map((chunk, index) => 
      processChunk(chunk, index % workers)
    )
  );
  
  // Merge results
  return mergeResults(results);
}

async function processChunk(files, workerId) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(`
      const { parentPort } = require('worker_threads');
      
      parentPort.on('message', (files) => {
        const patterns = analyzeFiles(files);
        parentPort.postMessage(patterns);
      });
      
      function analyzeFiles(files) {
        // File analysis logic here
        return patterns;
      }
    `, { eval: true });
    
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.postMessage(files);
  });
}
```

### Incremental Analysis

Only analyze changed files:

```javascript
// incremental-analyzer.js
export function incrementalAnalysis(config, options = {}) {
  const { cacheFile = '.tw-patterns-cache.json', baseBranch = 'main' } = options;
  
  // Load cache
  const cache = loadCache(cacheFile);
  
  // Get changed files
  const changedFiles = getChangedFiles(baseBranch);
  
  // Analyze only changed files
  const newPatterns = analyzeFiles(changedFiles);
  
  // Merge with cached patterns
  const mergedPatterns = mergeWithCache(newPatterns, cache);
  
  // Update cache
  saveCache(cacheFile, mergedPatterns);
  
  return mergedPatterns;
}

function getChangedFiles(baseBranch) {
  // Use git to find changed files
  const { execSync } = require('child_process');
  
  try {
    const output = execSync(`git diff --name-only ${baseBranch}...HEAD`, { encoding: 'utf8' });
    return output.split('\n').filter(Boolean);
  } catch (error) {
    console.warn('Could not determine changed files, analyzing all files');
    return null;
  }
}
```

## 🔍 Advanced Pattern Analysis

### Semantic Pattern Analysis

Analyze patterns beyond simple class matching:

```javascript
// semantic-analyzer.js
export function analyzeSemanticPatterns(clusters) {
  return clusters.map(cluster => ({
    ...cluster,
    semantic: analyzeSemantics(cluster.patterns),
    accessibility: analyzeAccessibility(cluster.patterns),
    responsive: analyzeResponsiveness(cluster.patterns),
    theme: analyzeThemeUsage(cluster.patterns)
  }));
}

function analyzeSemantics(patterns) {
  const semanticClasses = {
    button: ['btn', 'button', 'cta'],
    form: ['form', 'input', 'select'],
    navigation: ['nav', 'menu', 'breadcrumb'],
    layout: ['container', 'wrapper', 'section'],
    typography: ['heading', 'title', 'text']
  };
  
  const scores = {};
  
  Object.entries(semanticClasses).forEach(([category, keywords]) => {
    scores[category] = patterns.some(pattern => 
      keywords.some(keyword => 
        pattern.includes(keyword) || 
        pattern.includes(`bg-${keyword}`) ||
        pattern.includes(`text-${keyword}`)
      )
    ) ? 1 : 0;
  });
  
  return scores;
}

function analyzeAccessibility(patterns) {
  const accessibilityClasses = [
    'sr-only', 'focus:', 'hover:', 'active:', 'disabled:',
    'aria-', 'role-', 'tabindex-'
  ];
  
  const hasAccessibility = patterns.some(pattern =>
    accessibilityClasses.some(cls => pattern.includes(cls))
  );
  
  return {
    hasAccessibility,
    score: hasAccessibility ? 1 : 0,
    recommendations: hasAccessibility ? [] : ['Consider adding accessibility classes']
  };
}
```

---

**Next**: Explore [Examples](./examples/) for real-world advanced usage patterns, or learn [Best Practices](./best-practices.md) for optimal results.
