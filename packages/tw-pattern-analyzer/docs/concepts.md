# Core Concepts

Understanding how the Tailwind CSS Pattern Analyzer works under the hood.

## 🧠 Pattern Detection Fundamentals

### What is a Pattern?

A **pattern** is a combination of Tailwind CSS classes that appears multiple times in your codebase. For example:

```tsx
// These are all variations of the same pattern
<div className="flex items-center gap-4">
<div className="flex items-center gap-6">
<div className="flex items-center gap-8">
```

The core pattern is `flex items-center gap-{size}` with different gap values.

### Pattern Canonicalization

Before comparison, all patterns are **canonicalized**:

1. **Split classes**: `"flex items-center gap-4"` → `["flex", "items-center", "gap-4"]`
2. **Sort alphabetically**: `["flex", "items-center", "gap-4"]` → `["flex", "gap-4", "items-center"]`
3. **Join back**: `["flex", "gap-4", "items-center"]` → `"flex gap-4 items-center"`

This ensures consistent comparison regardless of class order in your code.

## 🔗 Similarity Algorithms

### Jaccard Similarity

The analyzer uses **Jaccard similarity** to measure how similar two patterns are:

```
Jaccard(A, B) = |A ∩ B| / |A ∪ B|
```

Where:
- `A ∩ B` = classes present in both patterns
- `A ∪ B` = all unique classes across both patterns

**Example:**
```tsx
Pattern A: "flex items-center gap-4 text-lg"
Pattern B: "flex items-center gap-6 text-lg"

Classes A: ["flex", "items-center", "gap-4", "text-lg"]
Classes B: ["flex", "items-center", "gap-6", "text-lg"]

Intersection: ["flex", "items-center", "text-lg"] (3 classes)
Union: ["flex", "items-center", "gap-4", "gap-6", "text-lg"] (5 classes)

Similarity: 3/5 = 0.6 (60%)
```

### Similarity Threshold

The `similarityThreshold` setting determines when patterns are grouped together:

- **0.7-0.75**: Balanced clustering (default)
- **0.8-0.85**: Strict clustering (fewer, more precise groups)
- **0.6-0.7**: Aggressive clustering (more, broader groups)

## 🎯 Clustering Strategies

### Greedy Clustering

The analyzer uses a **greedy approach** for performance:

1. **Start with first pattern** as cluster seed
2. **Compare next pattern** against existing clusters
3. **Join if similarity ≥ threshold**, otherwise create new cluster
4. **Repeat** until all patterns processed

**Benefits:**
- Fast processing (O(n²) complexity)
- Deterministic results
- Memory efficient

**Trade-offs:**
- Order-dependent clustering
- May not find optimal groupings
- Good enough for practical use

### Cluster Formation

```typescript
// Example clustering process
Patterns: [
  "flex items-center gap-4",
  "flex items-center gap-6", 
  "flex items-center gap-8",
  "text-lg font-bold",
  "text-xl font-bold"
]

Threshold: 0.75

Cluster 1: ["flex items-center gap-4", "flex items-center gap-6", "flex items-center gap-8"]
Cluster 2: ["text-lg font-bold", "text-xl font-bold"]
```

## 📊 Likelihood Scoring

### Scoring Formula

The likelihood score combines two factors:

```
Likelihood = (Variant Score + Frequency Score) / 100

Variant Score = min(variants / 5, 1) * 60
Frequency Score = min(occurrences / 50, 1) * 40
```

### Score Breakdown

**Variant Score (0-60 points):**
- More variants = stronger signal for component extraction
- Capped at 5 variants (60 points)
- Linear scaling: 1 variant = 12 points, 5+ variants = 60 points

**Frequency Score (0-40 points):**
- Higher usage = stronger signal
- Capped at 50 occurrences (40 points)
- Linear scaling: 1 occurrence = 0.8 points, 50+ occurrences = 40 points

### Score Interpretation

| Score Range | Meaning | Action |
|-------------|---------|---------|
| **80-100%** | Excellent candidate | Extract component immediately |
| **70-79%** | Strong candidate | Plan extraction soon |
| **50-69%** | Good candidate | Consider extraction |
| **30-49%** | Moderate candidate | Monitor for growth |
| **<30%** | Weak candidate | Focus on higher scores |

## 🔍 Pattern Variants

### What Makes a Variant?

A **variant** is a pattern that's similar enough to be grouped together but has meaningful differences:

```tsx
// Core pattern: "flex items-center gap-{size}"
Variants:
- "flex items-center gap-4"     // Small gap
- "flex items-center gap-6"     // Medium gap  
- "flex items-center gap-8"     // Large gap
- "flex items-center gap-12"    // Extra large gap
```

### Variant Detection

Variants are detected when:
1. **Similarity ≥ threshold** (e.g., 0.75)
2. **Different enough** to be meaningful
3. **Same core structure** with variations

### Variant Benefits

More variants indicate:
- **Stronger pattern**: Multiple use cases
- **Better abstraction**: More flexible component
- **Higher ROI**: More code reuse potential

## 📁 File Parsing Strategies

### Framework Detection

The analyzer automatically detects file types and applies appropriate parsing:

```typescript
// File type mapping
'.tsx' → React parsing (className)
'.jsx' → React parsing (className)  
'.astro' → Astro parsing (class, class:list)
'.html' → Astro parsing (class)
'.vue' → Vue parsing (class, :class)
'.svelte' → Svelte parsing (class, class:name)
'.mdx' → Both React + Astro parsing
```

### Regex Patterns

Each framework uses optimized regex patterns:

```typescript
// React: className={...} or className="..."
react: /(?:className\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g

// Astro: class="..." or class={...} or class:list={...}
astro: /(?:class\s*=\s*|class:list\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g
```

### Parsing Challenges

**Dynamic classes** (not currently supported):
```tsx
// ❌ Won't be detected
className={`flex ${isActive ? 'bg-blue-500' : 'bg-gray-500'}`}

// ✅ Will be detected  
className="flex bg-blue-500"
className="flex bg-gray-500"
```

## ⚡ Performance Considerations

### Scalability

The analyzer is optimized for large codebases:

- **File discovery**: Uses `fast-glob` for efficient file matching
- **Parsing**: Regex-based extraction (faster than AST parsing)
- **Clustering**: Greedy algorithm with O(n²) complexity
- **Memory**: Streams results, doesn't load entire codebase

### Optimization Tips

1. **Use ignoreGlobs**: Skip build artifacts and dependencies
2. **Limit file types**: Only analyze relevant extensions
3. **Adjust threshold**: Higher threshold = faster clustering
4. **Set minOccurrences**: Filter out noise early

## 🔬 Technical Limitations

### Current Constraints

- **Static analysis only**: No runtime class detection
- **Regex-based parsing**: Limited to attribute-based classes
- **Framework-specific**: Requires explicit pattern definitions
- **Order-dependent clustering**: Results may vary with file order

### Future Improvements

- **AST parsing**: More accurate class extraction
- **Dynamic class detection**: Runtime class analysis
- **Machine learning**: Better similarity algorithms
- **Cross-framework patterns**: Universal pattern detection

---

**Next**: Learn how to configure the analyzer in the [Configuration Guide](./guides/configuration.md) or see it in action with [Examples](./examples/).
