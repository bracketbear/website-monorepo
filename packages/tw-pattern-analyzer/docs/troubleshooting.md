# Troubleshooting

Common issues and solutions for the Tailwind CSS Pattern Analyzer.

## 🚨 Common Issues

### No Patterns Found

**Problem:** The analyzer runs but finds no patterns.

**Possible Causes:**
1. **No matching files** - Glob patterns don't match any files
2. **All files ignored** - Ignore patterns are too broad
3. **No Tailwind classes** - Files don't contain class attributes
4. **Parsing issues** - File types not supported or parsing failed

**Solutions:**

**Check file discovery:**
```bash
# Verify files exist
find . -name "*.tsx" -o -name "*.jsx" -o -name "*.astro" | head -10

# Check glob patterns manually
ls -la src/components/
ls -la apps/*/src/
```

**Verify file content:**
```bash
# Check for class attributes
grep -r "className=" src/ | head -5
grep -r "class=" src/ | head -5

# Check for Tailwind classes
grep -r "flex\|bg-\|text-\|p-\|m-" src/ | head -5
```

**Debug configuration:**
```javascript
// Create debug config
export default {
  globs: ['**/*.{tsx,jsx,astro}'], // Very broad
  ignoreGlobs: [], // No ignores
  similarityThreshold: 0.5, // Very low
  minOccurrences: 1, // Very low
  minVariants: 1, // Very low
  output: {
    console: { enabled: true, top: 0, showDetails: true },
    json: { enabled: true, path: 'debug-output.json' }
  }
};
```

**Check file extensions:**
```bash
# Verify file types are supported
file src/components/Button.tsx
file src/pages/index.astro
```

### Too Many Patterns

**Problem:** The analyzer finds too many patterns, making results hard to interpret.

**Possible Causes:**
1. **Threshold too low** - Similarity threshold is too permissive
2. **Min occurrences too low** - Including rare patterns
3. **Min variants too low** - Including single patterns
4. **Glob patterns too broad** - Analyzing unnecessary files

**Solutions:**

**Increase similarity threshold:**
```bash
# More strict clustering
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --threshold 0.85

# Very strict clustering
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --threshold 0.9
```

**Filter by occurrences:**
```bash
# Only frequent patterns
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --min-occurrences 5

# Only very frequent patterns
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --min-occurrences 10
```

**Require multiple variants:**
```bash
# Only patterns with variations
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --min-variants 2

# Only highly flexible patterns
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --min-variants 3
```

**Narrow file scope:**
```javascript
// More specific glob patterns
export default {
  globs: [
    'src/components/**/*.{tsx,jsx}', // Only components
    'src/pages/**/*.{tsx,jsx,astro}' // Only pages
  ],
  ignoreGlobs: [
    '**/node_modules/**',
    '**/dist/**',
    '**/*.test.{tsx,jsx}',
    '**/*.stories.{tsx,jsx}',
    '**/utils/**', // Exclude utility files
    '**/hooks/**'  // Exclude hook files
  ]
};
```

### Performance Issues

**Problem:** Analysis takes too long or uses too much memory.

**Possible Causes:**
1. **Too many files** - Analyzing unnecessary files
2. **Large files** - Individual files are very large
3. **Complex patterns** - Too many class combinations
4. **Memory constraints** - Limited system resources

**Solutions:**

**Optimize file selection:**
```javascript
// Analyze smaller subsets
export default {
  globs: [
    'src/components/**/*.{tsx,jsx}', // Start with components only
  ],
  ignoreGlobs: [
    '**/node_modules/**',
    '**/dist/**',
    '**/*.test.{tsx,jsx}',
    '**/node_modules/**',
    '**/vendor/**',
    '**/third-party/**'
  ]
};
```

**Use incremental analysis:**
```bash
# Analyze specific directories
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --config component-config.js \
  --out reports/components.json

npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --config page-config.js \
  --out reports/pages.json
```

**Limit output:**
```javascript
// Reduce console output
export default {
  output: {
    console: { 
      enabled: true, 
      top: 10, // Show fewer patterns
      showDetails: false // Don't show full details
    },
    json: { 
      enabled: true,
      includeRawPatterns: false, // Don't include raw data
      includeMetadata: false // Don't include metadata
    }
  }
};
```

### Configuration Errors

**Problem:** Configuration file errors or invalid settings.

**Common Issues:**
1. **Syntax errors** - Invalid JavaScript syntax
2. **Invalid values** - Values outside expected ranges
3. **Missing properties** - Required properties not defined
4. **Type mismatches** - Wrong data types

**Solutions:**

**Validate configuration:**
```javascript
// Basic validation
export default {
  globs: ['src/**/*.{tsx,jsx,astro}'], // Must be array of strings
  
  // Validate ranges
  similarityThreshold: 0.75, // Must be 0.0-1.0
  minOccurrences: 2, // Must be positive integer
  minVariants: 1, // Must be positive integer
  
  // Validate output
  output: {
    console: {
      enabled: true, // Must be boolean
      top: 20, // Must be non-negative integer
      format: 'table' // Must be 'table' or 'json'
    },
    json: {
      enabled: true, // Must be boolean
      path: 'reports/patterns.json', // Must be string
      pretty: true // Must be boolean
    }
  }
};
```

**Check for common mistakes:**
```javascript
// ❌ Common mistakes
export default {
  globs: 'src/**/*.tsx', // Should be array
  similarityThreshold: '0.75', // Should be number
  minOccurrences: -1, // Should be positive
  output: {
    console: { top: '20' } // Should be number
  }
};

// ✅ Correct format
export default {
  globs: ['src/**/*.tsx'], // Array of strings
  similarityThreshold: 0.75, // Number
  minOccurrences: 2, // Positive integer
  output: {
    console: { top: 20 } // Number
  }
};
```

### File Parsing Issues

**Problem:** Files are found but classes aren't extracted properly.

**Possible Causes:**
1. **Unsupported file type** - File extension not recognized
2. **Parsing strategy mismatch** - Wrong regex patterns
3. **Class syntax variations** - Unusual class attribute syntax
4. **Encoding issues** - File encoding problems

**Solutions:**

**Check file type support:**
```bash
# Verify file extensions
ls -la src/ | grep -E '\.(tsx|jsx|astro|html|mdx|vue|svelte)$'

# Check file content
head -20 src/components/Button.tsx
```

**Custom parsing patterns:**
```javascript
// Add custom patterns for unusual syntax
export default {
  parsing: {
    patterns: {
      // Default patterns
      react: /(?:className\s*=\s*)(?:(?:{`([^`]+)`})|(?:{"([^"]+)"})|(?:'([^']+)')|(?:"([^"]+)"))/g,
      
      // Custom patterns
      dataClass: /(?:data-class\s*=\s*)(?:"([^"]+)")/g,
      customClass: /(?:custom-class\s*=\s*)(?:"([^"]+)")/g,
      
      // Template literal variations
      templateLiteral: /(?:className\s*=\s*`([^`]+)`)/g,
      
      // Dynamic class variations
      dynamicClass: /(?:className\s*=\s*\{[^}]+\s*\?\s*["']([^"']+)["']\s*:\s*["']([^"']+)["']\s*\})/g
    },
    
    fileTypes: {
      '.tsx': ['react', 'templateLiteral', 'dynamicClass'],
      '.jsx': ['react', 'templateLiteral', 'dynamicClass'],
      '.astro': ['astro', 'dataClass'],
      '.custom': ['customClass', 'dataClass']
    }
  }
};
```

**Debug parsing:**
```bash
# Check what's being parsed
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --config debug-config.js \
  --out debug-output.json

# Examine output for parsing issues
cat debug-output.json | jq '.rawPatterns[] | select(.pattern == "")'
```

## 🔧 Advanced Troubleshooting

### Memory Issues

**Problem:** Out of memory errors during analysis.

**Solutions:**

**Reduce memory usage:**
```javascript
// Process files in smaller batches
export default {
  globs: [
    'src/components/**/*.{tsx,jsx}', // Process components first
  ],
  output: {
    json: {
      includeRawPatterns: false, // Don't store raw patterns
      includeMetadata: false, // Don't store metadata
      pretty: false // Compact JSON
    }
  }
};
```

**Use streaming analysis:**
```bash
# Analyze in chunks
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --config chunk1-config.js \
  --out reports/chunk1.json

npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --config chunk2-config.js \
  --out reports/chunk2.json

# Merge results later
node -e "
const fs = require('fs');
const chunk1 = JSON.parse(fs.readFileSync('reports/chunk1.json'));
const chunk2 = JSON.parse(fs.readFileSync('reports/chunk2.json'));
const merged = { clusters: [...chunk1.clusters, ...chunk2.clusters] };
fs.writeFileSync('reports/merged.json', JSON.stringify(merged, null, 2));
"
```

### Network/File System Issues

**Problem:** File access errors or network timeouts.

**Solutions:**

**Check file permissions:**
```bash
# Verify file access
ls -la src/components/
ls -la reports/

# Check directory permissions
ls -ld src/ reports/

# Fix permissions if needed
chmod 755 src/ reports/
chmod 644 src/**/*.{tsx,jsx,astro}
```

**Handle large files:**
```javascript
// Skip very large files
export default {
  ignoreGlobs: [
    '**/node_modules/**',
    '**/dist/**',
    '**/*.min.{js,css}', // Skip minified files
    '**/*.bundle.{js,css}', // Skip bundled files
    '**/*.chunk.{js,css}' // Skip chunk files
  ]
};
```

### Output Issues

**Problem:** Reports not generated or incomplete.

**Solutions:**

**Check output directory:**
```bash
# Verify directory exists
mkdir -p reports/

# Check write permissions
touch reports/test.txt
rm reports/test.txt

# Verify output path
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --out ./reports/test-output.json
```

**Validate JSON output:**
```bash
# Check if JSON is valid
cat reports/tw-patterns.json | jq '.' > /dev/null

# Check JSON structure
cat reports/tw-patterns.json | jq '.clusters | length'
cat reports/tw-patterns.json | jq '.metadata.stats.filesAnalyzed'
```

## 📊 Diagnostic Commands

### System Information

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check available memory
free -h
# or on macOS
vm_stat

# Check disk space
df -h

# Check file count
find . -name "*.tsx" -o -name "*.jsx" -o -name "*.astro" | wc -l
```

### File Analysis

```bash
# Count files by type
find . -name "*.tsx" | wc -l
find . -name "*.jsx" | wc -l
find . -name "*.astro" | wc -l

# Check file sizes
find . -name "*.tsx" -exec ls -lh {} \; | sort -k5 -hr | head -10

# Check for large files
find . -name "*.tsx" -size +100k

# Check file encoding
file src/components/Button.tsx
```

### Pattern Analysis

```bash
# Check for class attributes
grep -r "className=" src/ | wc -l
grep -r "class=" src/ | wc -l

# Check for Tailwind classes
grep -r "flex\|bg-\|text-\|p-\|m-" src/ | wc -l

# Check for specific patterns
grep -r "container mx-auto" src/ | wc -l
grep -r "flex items-center" src/ | wc -l
```

## 🆘 Getting Help

### Debug Mode

```bash
# Enable verbose logging
DEBUG=* npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns

# Check configuration loading
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --config ./test-config.js
```

### Common Error Messages

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `Configuration file not found` | Config file missing or wrong path | Create config file or specify correct path |
| `Invalid similarity threshold` | Threshold outside 0.0-1.0 range | Use value between 0.0 and 1.0 |
| `No files found matching globs` | Glob patterns don't match files | Check glob patterns and file existence |
| `Output directory not writable` | Permission or path issues | Check directory permissions and path |
| `Memory allocation failed` | System out of memory | Reduce file scope or increase system memory |
| `File read error` | File access issues | Check file permissions and existence |

### Support Resources

1. **Check the logs** - Look for error details in console output
2. **Verify configuration** - Ensure config file syntax is correct
3. **Test with minimal config** - Start with basic settings
4. **Check file system** - Verify file permissions and paths
5. **Review examples** - Compare with working configurations
6. **Check dependencies** - Ensure all packages are installed

---

**Next**: Review [Best Practices](./best-practices.md) to avoid common issues, or explore [Examples](./examples/) for working configurations.
