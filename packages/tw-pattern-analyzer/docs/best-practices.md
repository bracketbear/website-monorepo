# Best Practices

Guidelines and recommendations for getting the most out of the Tailwind CSS Pattern Analyzer.

## 🎯 Configuration Best Practices

### File Discovery

**✅ Do: Use specific glob patterns**
```javascript
// Good: Specific and focused
globs: [
  'src/components/**/*.{tsx,jsx,astro}',
  'src/pages/**/*.{tsx,jsx,astro}',
  'src/layouts/**/*.{tsx,jsx,astro}'
]

// Avoid: Too broad
globs: ['**/*.{tsx,jsx,astro}'] // Will analyze everything
```

**✅ Do: Exclude build artifacts and dependencies**
```javascript
ignoreGlobs: [
  '**/node_modules/**',
  '**/dist/**',
  '**/.next/**',
  '**/.astro/**',
  '**/build/**',
  '**/coverage/**',
  '**/*.test.{tsx,jsx}',
  '**/*.spec.{tsx,jsx}',
  '**/*.stories.{tsx,jsx}'
]
```

**✅ Do: Use negation patterns for fine-grained control**
```javascript
globs: [
  'src/**/*.{tsx,jsx,astro}',
  '!src/**/*.test.{tsx,jsx}',
  '!src/**/*.stories.{tsx,jsx}',
  '!src/api/**/*.{tsx,jsx}'
]
```

### Similarity Threshold

**✅ Do: Choose threshold based on codebase size**
```javascript
// Large codebase (1000+ files): More aggressive clustering
similarityThreshold: 0.6

// Medium codebase (100-1000 files): Balanced approach
similarityThreshold: 0.75

// Small codebase (<100 files): Strict clustering
similarityThreshold: 0.8
```

**✅ Do: Adjust threshold based on your goals**
```javascript
// Development: Find broad patterns
similarityThreshold: 0.6

// Code review: Find specific patterns
similarityThreshold: 0.8

// Production: Find critical patterns only
similarityThreshold: 0.85
```

### Occurrence and Variant Thresholds

**✅ Do: Set realistic minimums**
```javascript
// Development: Include all patterns
minOccurrences: 1
minVariants: 1

// Code review: Focus on common patterns
minOccurrences: 3
minVariants: 2

// Production: Focus on frequent patterns
minOccurrences: 5
minVariants: 3
```

**✅ Do: Balance between noise and signal**
```javascript
// Too low: Lots of noise
minOccurrences: 1
minVariants: 1

// Too high: Miss important patterns
minOccurrences: 20
minVariants: 10

// Balanced: Good signal-to-noise ratio
minOccurrences: 3
minVariants: 2
```

## 🔧 Analysis Best Practices

### When to Run Analysis

**✅ Do: Run analysis at key points**
- **Before code reviews** - Identify patterns that should be components
- **After major features** - Find new patterns introduced
- **Before refactoring** - Understand current pattern usage
- **During sprints** - Monitor pattern growth
- **Before releases** - Ensure code quality

**✅ Do: Use different settings for different purposes**
```bash
# Development: Find all patterns
npm run analyze:tw:dev

# Code review: Focus on component candidates
npm run analyze:tw:review

# Production: Strict quality check
npm run analyze:tw:production
```

### Pattern Interpretation

**✅ Do: Focus on high-likelihood patterns first**
```javascript
// Priority order
const priorities = {
  critical: clusters.filter(c => c.likelihood >= 80),    // Extract immediately
  high: clusters.filter(c => c.likelihood >= 70),       // Plan extraction
  medium: clusters.filter(c => c.likelihood >= 50),     // Consider extraction
  low: clusters.filter(c => c.likelihood < 50)          // Monitor growth
};
```

**✅ Do: Look for patterns with multiple variants**
```javascript
// Good: Multiple variants indicate flexibility
{
  pattern: 'flex items-center gap-{size}',
  variants: [
    'flex items-center gap-4',
    'flex items-center gap-6',
    'flex items-center gap-8'
  ]
}

// Avoid: Single pattern might be too specific
{
  pattern: 'flex items-center gap-4',
  variants: ['flex items-center gap-4']
}
```

**✅ Do: Consider pattern context and usage**
```javascript
// Good: Layout pattern with consistent structure
'container mx-auto px-{size}'

// Good: Component pattern with variations
'bg-{color} text-{color} px-{size} py-{size} rounded'

// Avoid: Random class combinations
'text-red-500 bg-blue-300 p-4 m-2'
```

## 📊 Output and Reporting Best Practices

### Console Output

**✅ Do: Use appropriate display limits**
```javascript
// Development: Show more patterns
output: {
  console: { top: 50, showDetails: true }
}

// Code review: Focus on top patterns
output: {
  console: { top: 20, showDetails: false }
}

// Production: Show critical patterns only
output: {
  console: { top: 10, showDetails: false }
}
```

**✅ Do: Enable detailed output for development**
```javascript
output: {
  console: {
    enabled: true,
    top: 0,           // Show all patterns
    showDetails: true, // Include full cluster information
    format: 'table'   // Human-readable format
  }
}
```

### JSON Reports

**✅ Do: Include metadata for traceability**
```javascript
output: {
  json: {
    enabled: true,
    includeMetadata: true,    // Include config and timing
    includeRawPatterns: false, // Usually not needed
    pretty: true              // Human-readable
  }
}
```

**✅ Do: Use descriptive file names**
```javascript
// Good: Descriptive and timestamped
output: {
  json: {
    path: 'reports/component-patterns-2024-01-15.json'
  }
}

// Good: Purpose-specific naming
output: {
  json: {
    path: 'reports/code-review-patterns.json'
  }
}
```

## 🚀 Performance Best Practices

### File Processing

**✅ Do: Use efficient glob patterns**
```javascript
// Good: Specific and efficient
globs: [
  'src/components/**/*.{tsx,jsx}',
  'src/pages/**/*.{tsx,jsx}'
]

// Avoid: Inefficient patterns
globs: [
  '**/*.{tsx,jsx,astro,html,mdx,vue,svelte}' // Too broad
]
```

**✅ Do: Exclude unnecessary directories early**
```javascript
ignoreGlobs: [
  '**/node_modules/**',     // Large dependency directories
  '**/dist/**',            // Build outputs
  '**/.next/**',           // Next.js build
  '**/coverage/**',        // Test coverage
  '**/*.test.{tsx,jsx}',   // Test files
  '**/*.stories.{tsx,jsx}' // Storybook files
]
```

### Analysis Settings

**✅ Do: Start with conservative settings**
```javascript
// Start here, then adjust
{
  similarityThreshold: 0.75,
  minOccurrences: 3,
  minVariants: 2
}

// Adjust based on results
{
  similarityThreshold: 0.8,    // Stricter if too many clusters
  minOccurrences: 5,           // Higher if too much noise
  minVariants: 3               // Higher if patterns too specific
}
```

## 🔍 Framework-Specific Best Practices

### React/JSX

**✅ Do: Handle dynamic classes properly**
```tsx
// Good: Static classes are detected
<div className="flex items-center gap-4">

// Good: Template literals are detected
<div className={`flex items-center gap-${size}`}>

// Avoid: Dynamic classes won't be detected
<div className={getDynamicClasses()}>

// Avoid: Conditional classes won't be detected
<div className={`flex ${isActive ? 'bg-blue-500' : 'bg-gray-500'}`}>
```

**✅ Do: Use consistent class ordering**
```tsx
// Good: Consistent structure
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">

// Avoid: Inconsistent ordering
<div className="bg-white p-4 flex rounded-lg items-center shadow-md justify-between">
```

### Astro

**✅ Do: Use class:list for dynamic classes**
```astro
<!-- Good: class:list is detected -->
<div class:list={[
  'flex items-center gap-4',
  { 'bg-blue-500': isActive, 'bg-gray-500': !isActive }
]}>

<!-- Good: Static classes are detected -->
<div class="flex items-center gap-4">

<!-- Avoid: Dynamic classes won't be detected -->
<div class={getDynamicClasses()}>
```

### Vue

**✅ Do: Use consistent class binding syntax**
```vue
<!-- Good: Static classes are detected -->
<div class="flex items-center gap-4">

<!-- Good: Object syntax is detected -->
<div :class="{ 'bg-blue-500': isActive, 'bg-gray-500': !isActive }">

<!-- Avoid: Complex expressions won't be detected -->
<div :class="getComplexClasses()">
```

## 📈 Continuous Improvement Best Practices

### Regular Analysis

**✅ Do: Run analysis regularly**
```bash
# Daily development
npm run analyze:tw:dev

# Weekly review
npm run analyze:tw:review

# Monthly audit
npm run analyze:tw:production
```

**✅ Do: Track pattern evolution**
```javascript
// Keep historical reports
output: {
  json: {
    path: `reports/patterns-${new Date().toISOString().split('T')[0]}.json`
  }
}
```

### Pattern Extraction

**✅ Do: Extract high-likelihood patterns**
```typescript
// When likelihood >= 80%, extract immediately
if (cluster.likelihood >= 80) {
  extractComponent(cluster);
}

// When likelihood >= 70%, plan extraction
if (cluster.likelihood >= 70) {
  scheduleExtraction(cluster);
}
```

**✅ Do: Monitor extracted patterns**
```typescript
// After extraction, re-run analysis to verify
const beforeExtraction = await analyzePatterns(config);
extractComponents(highPriorityPatterns);
const afterExtraction = await analyzePatterns(config);

// Verify reduction in pattern occurrences
const improvement = beforeExtraction.clusters.length - afterExtraction.clusters.length;
console.log(`Reduced patterns by ${improvement}`);
```

## 🚨 Common Pitfalls to Avoid

### ❌ Don't: Use too broad glob patterns
```javascript
// Bad: Will analyze everything
globs: ['**/*.{tsx,jsx,astro}']

// Good: Specific and focused
globs: ['src/**/*.{tsx,jsx,astro}']
```

### ❌ Don't: Ignore too many files
```javascript
// Bad: Might miss important patterns
ignoreGlobs: [
  '**/src/**',           // Ignores all source code!
  '**/*.{tsx,jsx,astro}' // Ignores all target files!
]

// Good: Only ignore build artifacts and tests
ignoreGlobs: [
  '**/node_modules/**',
  '**/dist/**',
  '**/*.test.{tsx,jsx}'
]
```

### ❌ Don't: Set thresholds too high initially
```javascript
// Bad: Might miss important patterns
{
  similarityThreshold: 0.9,
  minOccurrences: 20,
  minVariants: 10
}

// Good: Start conservative, then adjust
{
  similarityThreshold: 0.75,
  minOccurrences: 3,
  minVariants: 2
}
```

### ❌ Don't: Ignore pattern context
```typescript
// Bad: Only looking at likelihood score
const highPriority = clusters.filter(c => c.likelihood >= 70);

// Good: Consider multiple factors
const highPriority = clusters.filter(c => 
  c.likelihood >= 70 && 
  c.variants >= 2 && 
  c.occurrences >= 5
);
```

## 📋 Checklist for Optimal Results

### Before Running Analysis
- [ ] Review and update glob patterns
- [ ] Verify ignore patterns are appropriate
- [ ] Set realistic thresholds for your codebase size
- [ ] Choose appropriate output settings

### During Analysis
- [ ] Monitor processing time and file count
- [ ] Check for any error messages
- [ ] Verify output file generation

### After Analysis
- [ ] Review console output for immediate insights
- [ ] Examine JSON report for detailed analysis
- [ ] Identify high-priority patterns for extraction
- [ ] Plan component extraction strategy
- [ ] Schedule follow-up analysis

### Regular Maintenance
- [ ] Run analysis before code reviews
- [ ] Extract high-likelihood patterns
- [ ] Monitor pattern evolution over time
- [ ] Adjust thresholds based on results
- [ ] Update configuration as codebase grows

---

**Next**: Explore [Examples](./examples/) for real-world usage patterns, or learn about [Integration](./guides/integration.md) for CI/CD and build tools.
