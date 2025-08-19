# CLI Usage Guide

Complete command line interface reference for the Tailwind CSS Pattern Analyzer.

## 🚀 Basic Usage

### From Workspace Root

```bash
# Use the workspace script
npm run analyze:tw

# Or run the CLI directly
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns
```

### From Package Directory

```bash
# Build and run
npm run build
npm run analyze

# Or use tsx for development
npm run dev
```

## 📋 Command Line Options

### Configuration

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--config` | `-c` | Custom config file path | `tw-pattern-analyzer.config.js` |
| `--help` | `-h` | Show help information | - |

```bash
# Use custom config file
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --config ./custom-config.js

# Show help
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --help
```

### Analysis Settings

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--threshold` | `-t` | Similarity threshold (0.0-1.0) | From config |
| `--min-occurrences` | `-m` | Minimum occurrences to include | From config |
| `--min-variants` | `-v` | Minimum variants in cluster | From config |

```bash
# Adjust similarity threshold
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --threshold 0.8

# Filter by minimum occurrences
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --min-occurrences 5

# Require multiple variants
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --min-variants 2

# Combine multiple settings
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --threshold 0.8 \
  --min-occurrences 5 \
  --min-variants 2
```

### Output Control

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--out` | `-o` | Output JSON file path | From config |
| `--top` | - | Number of top patterns to display | From config |
| `--no-console` | - | Disable console output | false |
| `--no-json` | - | Disable JSON output | false |

```bash
# Custom output path
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --out reports/my-analysis.json

# Limit console display
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --top 10

# Disable console output
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --no-console

# Disable JSON output
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --no-json

# Only console output
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --no-json --top 50
```

### File Filtering

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--ignore` | `-i` | Additional ignore patterns | From config |

```bash
# Ignore additional patterns
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --ignore "**/temp/**"

# Multiple ignore patterns
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --ignore "**/temp/**" \
  --ignore "**/drafts/**" \
  --ignore "**/*.backup.*"
```

## 🎯 Common Usage Patterns

### Quick Analysis

```bash
# Basic analysis with defaults
npm run analyze:tw

# Quick analysis with custom threshold
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --threshold 0.8
```

### Development Workflow

```bash
# Find all patterns (including rare ones)
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --min-occurrences 1 \
  --threshold 0.6

# Focus on common patterns
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --min-occurrences 3 \
  --threshold 0.75
```

### Production Analysis

```bash
# Strict analysis for production
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --threshold 0.85 \
  --min-occurrences 5 \
  --min-variants 2 \
  --out reports/production-analysis.json
```

### CI/CD Integration

```bash
# Generate report for CI
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --no-console \
  --out reports/ci-analysis.json

# Fail if high-likelihood patterns found
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --threshold 0.8 \
  --out reports/ci-analysis.json

# Check for critical patterns
node -e "
const r = require('./reports/ci-analysis.json');
if (r.clusters.some(c => c.likelihood >= 80)) {
  console.error('Critical: High-likelihood component candidates found');
  process.exit(1);
}
"
```

## 📊 Output Examples

### Console Table Output

```
┌─────────┬─────────────┬──────────┬────────────┬─────────────────────────────────────┐
│ (index) │ occurrences │ variants │ likelihood │ sample                             │
├─────────┼─────────────┼──────────┼────────────┼─────────────────────────────────────┤
│ 0       │ 25          │ 4        │ '49%'      │ 'container mx-auto px-4'           │
│ 1       │ 30          │ 4        │ '49%'      │ 'font-black text-foreground upper' │
│ 2       │ 48          │ 3        │ '37%'      │ 'flex gap-4 items-center'          │
└─────────┴─────────────┴──────────┴────────────┴─────────────────────────────────────┘
```

### JSON Output Structure

```json
{
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "config": { /* configuration used */ },
    "stats": {
      "filesAnalyzed": 150,
      "patternsFound": 89,
      "clustersCreated": 23,
      "processingTime": "2.3s"
    }
  },
  "clusters": [
    {
      "id": 0,
      "likelihood": 49,
      "occurrences": 25,
      "variants": 4,
      "patterns": [
        "container mx-auto px-4",
        "container mx-auto px-6",
        "container mx-auto px-8",
        "container mx-auto px-12"
      ],
      "sample": "container mx-auto px-4"
    }
  ]
}
```

## 🔧 Advanced Usage

### Custom Config with Overrides

```bash
# Use custom config but override specific settings
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --config ./custom-config.js \
  --threshold 0.8 \
  --min-occurrences 3
```

### Batch Analysis

```bash
# Analyze different parts of codebase
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --config ./components-config.js \
  --out reports/components.json

npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns \
  --config ./pages-config.js \
  --out reports/pages.json
```

### Integration with Other Tools

```bash
# Pipe to jq for filtering
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --no-console | \
  jq '.clusters[] | select(.likelihood >= 70)'

# Generate markdown report
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --no-console | \
  jq -r '.clusters[] | "## \(.sample)\n- Likelihood: \(.likelihood)%\n- Occurrences: \(.occurrences)\n- Variants: \(.variants)\n"' > pattern-report.md
```

## 🆘 Troubleshooting

### Common Issues

**"Command not found"**
```bash
# Ensure package is built
npm run build --workspace=@bracketbear/tw-pattern-analyzer

# Check binary path
ls -la packages/tw-pattern-analyzer/dist/cli.js
```

**"No patterns found"**
```bash
# Check file patterns
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --config ./debug-config.js

# Verify files exist
find . -name "*.tsx" -o -name "*.astro" | head -10
```

**"Too many patterns"**
```bash
# Increase threshold for stricter clustering
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --threshold 0.85

# Filter by minimum occurrences
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --min-occurrences 5
```

### Debug Mode

```bash
# Enable verbose logging (if supported)
DEBUG=* npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns

# Check configuration loading
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --config ./test-config.js
```

## 📝 Script Integration

### Package.json Scripts

```json
{
  "scripts": {
    "analyze:tw": "npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns",
    "analyze:tw:strict": "npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --threshold 0.8 --min-occurrences 5",
    "analyze:tw:dev": "npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --min-occurrences 1 --threshold 0.6",
    "analyze:tw:ci": "npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns --no-console --out reports/ci-analysis.json"
  }
}
```

### Turborepo Integration

```json
{
  "pipeline": {
    "tw:analyze": {
      "outputs": ["reports/tw-patterns.json"],
      "dependsOn": ["^build"]
    }
  }
}
```

---

**Next**: Learn about [Integration Guide](./integration.md) for CI/CD and build tools, or explore [Examples](./examples/) for real-world usage patterns.
