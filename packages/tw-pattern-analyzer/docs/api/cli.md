# CLI Reference

Complete command line interface reference for the Tailwind CSS Pattern Analyzer.

## 🚀 Command

```bash
tw-patterns [options]
```

## 📋 Options

### Configuration

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--config <path>` | `-c` | Custom config file path | `tw-pattern-analyzer.config.js` |
| `--help` | `-h` | Show help information | - |
| `--version` | `-v` | Show version information | - |

### Analysis Settings

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--threshold <number>` | `-t` | Similarity threshold (0.0-1.0) | From config |
| `--min-occurrences <number>` | `-m` | Minimum occurrences to include | From config |
| `--min-variants <number>` | `-v` | Minimum variants in cluster | From config |

### Output Control

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--out <path>` | `-o` | Output JSON file path | From config |
| `--top <number>` | - | Number of top patterns to display | From config |
| `--no-console` | - | Disable console output | false |
| `--no-json` | - | Disable JSON output | false |
| `--format <format>` | `-f` | Console output format (table/json) | table |

### File Filtering

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--ignore <pattern>` | `-i` | Additional ignore patterns | From config |

## 🔧 Option Details

### `--config, -c`

Specify a custom configuration file path.

```bash
# Use custom config file
tw-patterns --config ./custom-config.js

# Use config in different directory
tw-patterns --config ../configs/tw-analysis.js
```

**Default:** `tw-pattern-analyzer.config.js` in current directory

### `--threshold, -t`

Set the Jaccard similarity threshold for clustering patterns.

```bash
# Strict clustering (fewer, more precise groups)
tw-patterns --threshold 0.85

# Aggressive clustering (more, broader groups)
tw-patterns --threshold 0.6

# Balanced clustering (default)
tw-patterns --threshold 0.75
```

**Range:** `0.0` to `1.0`  
**Default:** From configuration file or `0.75`

### `--min-occurrences, -m`

Set the minimum number of occurrences required to include a pattern.

```bash
# Only show patterns with 3+ occurrences
tw-patterns --min-occurrences 3

# Show all patterns (including rare ones)
tw-patterns --min-occurrences 1

# Focus on common patterns
tw-patterns --min-occurrences 10
```

**Range:** `1` to `∞`  
**Default:** From configuration file or `2`

### `--min-variants, -v`

Set the minimum number of variants required in a cluster.

```bash
# Only clusters with multiple variants
tw-patterns --min-variants 2

# Focus on highly flexible patterns
tw-patterns --min-variants 3

# Include all clusters
tw-patterns --min-variants 1
```

**Range:** `1` to `∞`  
**Default:** From configuration file or `1`

### `--out, -o`

Specify the output JSON file path.

```bash
# Custom output path
tw-patterns --out reports/my-analysis.json

# Output to different directory
tw-patterns --out ../analysis-results.json

# Output to current directory
tw-patterns --out ./patterns.json
```

**Default:** From configuration file or `reports/tw-patterns.json`

### `--top`

Limit the number of top patterns displayed in console output.

```bash
# Show top 10 patterns
tw-patterns --top 10

# Show all patterns
tw-patterns --top 0

# Show top 50 patterns
tw-patterns --top 50
```

**Default:** From configuration file or `20`

### `--no-console`

Disable console output (only generate JSON report).

```bash
# Generate JSON report only
tw-patterns --no-console

# Useful for CI/CD pipelines
tw-patterns --no-console --out reports/ci-analysis.json
```

### `--no-json`

Disable JSON output (only show console table).

```bash
# Console output only
tw-patterns --no-json

# Quick analysis without file output
tw-patterns --no-json --top 50
```

### `--format, -f`

Set the console output format.

```bash
# Table format (default)
tw-patterns --format table

# JSON format
tw-patterns --format json

# Both formats
tw-patterns --format table --out results.json
```

**Values:** `table`, `json`  
**Default:** `table`

### `--ignore, -i`

Add additional ignore patterns beyond those in the configuration file.

```bash
# Ignore additional directories
tw-patterns --ignore "**/temp/**" --ignore "**/drafts/**"

# Ignore specific file types
tw-patterns --ignore "**/*.backup.*" --ignore "**/*.old.*"

# Ignore multiple patterns
tw-patterns -i "**/temp/**" -i "**/drafts/**" -i "**/*.backup.*"
```

**Note:** Can be used multiple times to specify multiple ignore patterns.

## 📊 Output Formats

### Table Format (Default)

```
┌─────────┬─────────────┬──────────┬────────────┬─────────────────────────────────────┐
│ (index) │ occurrences │ variants │ likelihood │ sample                             │
├─────────┼─────────────┼──────────┼────────────┼─────────────────────────────────────┤
│ 0       │ 25          │ 4        │ '49%'      │ 'container mx-auto px-4'           │
│ 1       │ 30          │ 4        │ '49%'      │ 'font-black text-foreground upper' │
│ 2       │ 48          │ 3        │ '37%'      │ 'flex gap-4 items-center'          │
└─────────┴─────────────┴──────────┴────────────┴─────────────────────────────────────┘
```

### JSON Format

```json
{
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

## 🎯 Common Usage Patterns

### Quick Analysis

```bash
# Basic analysis with defaults
tw-patterns

# Quick analysis with custom threshold
tw-patterns --threshold 0.8

# Quick analysis with custom output
tw-patterns --out ./quick-analysis.json
```

### Development Workflow

```bash
# Find all patterns (including rare ones)
tw-patterns --min-occurrences 1 --threshold 0.6

# Focus on common patterns
tw-patterns --min-occurrences 3 --threshold 0.75

# Focus on flexible patterns
tw-patterns --min-variants 2 --threshold 0.7
```

### Production Analysis

```bash
# Strict analysis for production
tw-patterns --threshold 0.85 --min-occurrences 5 --min-variants 2

# Generate production report
tw-patterns --threshold 0.8 --min-occurrences 5 --out reports/production.json
```

### CI/CD Integration

```bash
# Generate report for CI (no console output)
tw-patterns --no-console --out reports/ci-analysis.json

# Fail if high-likelihood patterns found
tw-patterns --threshold 0.8 --out reports/ci-analysis.json

# Check for critical patterns
tw-patterns --threshold 0.85 --min-occurrences 10 --out reports/critical.json
```

## 🔄 Configuration Overrides

Command line options override configuration file settings:

```bash
# Override multiple settings
tw-patterns \
  --threshold 0.8 \
  --min-occurrences 5 \
  --min-variants 2 \
  --top 30 \
  --out reports/strict-analysis.json

# Use custom config but override specific settings
tw-patterns \
  --config ./custom-config.js \
  --threshold 0.85 \
  --min-occurrences 3
```

## 📁 Environment Variables

The CLI respects these environment variables:

### `TW_PATTERNS_CONFIG`

Custom configuration file path.

```bash
export TW_PATTERNS_CONFIG=./my-config.js
tw-patterns  # Uses ./my-config.js
```

### `TW_PATTERNS_OUTPUT`

Default output file path.

```bash
export TW_PATTERNS_OUTPUT=./my-results.json
tw-patterns  # Outputs to ./my-results.json
```

### `TW_PATTERNS_THRESHOLD`

Default similarity threshold.

```bash
export TW_PATTERNS_THRESHOLD=0.8
tw-patterns  # Uses 0.8 threshold
```

## 🆘 Help and Version

### `--help, -h`

Show comprehensive help information.

```bash
tw-patterns --help
tw-patterns -h
```

**Output:**
```
Usage: tw-patterns [options]

Tailwind CSS Pattern Analyzer

Options:
  -c, --config <path>           Custom config file path
  -t, --threshold <number>      Similarity threshold (0.0-1.0)
  -m, --min-occurrences <number> Minimum occurrences to include
  -v, --min-variants <number>   Minimum variants in cluster
  -o, --out <path>              Output JSON file path
  --top <number>                Number of top patterns to display
  --no-console                  Disable console output
  --no-json                     Disable JSON output
  -f, --format <format>         Console output format (table/json)
  -i, --ignore <pattern>        Additional ignore patterns
  -h, --help                    Show help information
  -v, --version                 Show version information

Examples:
  tw-patterns                    # Basic analysis
  tw-patterns --threshold 0.8   # Strict clustering
  tw-patterns --out results.json # Custom output path
```

### `--version, -v`

Show version information.

```bash
tw-patterns --version
tw-patterns -v
```

**Output:**
```
@bracketbear/tw-pattern-analyzer v0.1.0
```

## 🔧 Advanced Usage

### Multiple Ignore Patterns

```bash
# Ignore multiple patterns
tw-patterns \
  --ignore "**/temp/**" \
  --ignore "**/drafts/**" \
  --ignore "**/*.backup.*" \
  --ignore "**/node_modules/**" \
  --ignore "**/dist/**"
```

### Custom Output Formats

```bash
# Generate both table and JSON
tw-patterns --format table --out results.json

# JSON only for processing
tw-patterns --format json --no-console --out results.json

# Table only for quick review
tw-patterns --format table --no-json
```

### Batch Analysis

```bash
# Analyze different parts of codebase
tw-patterns --config ./components-config.js --out reports/components.json
tw-patterns --config ./pages-config.js --out reports/pages.json
tw-patterns --config ./utils-config.js --out reports/utils.json
```

### Integration with Other Tools

```bash
# Pipe to jq for filtering
tw-patterns --no-console | jq '.clusters[] | select(.likelihood >= 70)'

# Generate markdown report
tw-patterns --no-console | jq -r '.clusters[] | "## \(.sample)\n- Likelihood: \(.likelihood)%\n- Occurrences: \(.occurrences)\n- Variants: \(.variants)\n"' > pattern-report.md

# Count high-priority patterns
tw-patterns --no-console | jq '.clusters | map(select(.likelihood >= 70)) | length'
```

## 🚨 Error Handling

### Common Error Messages

**"Configuration file not found"**
```bash
# Solution: Create config file or specify custom path
tw-patterns --config ./my-config.js
```

**"Invalid similarity threshold"**
```bash
# Solution: Use value between 0.0 and 1.0
tw-patterns --threshold 0.75
```

**"No patterns found"**
```bash
# Solution: Check file patterns and ignore settings
tw-patterns --config ./debug-config.js
```

**"Output directory not writable"**
```bash
# Solution: Check permissions or use different path
tw-patterns --out ./results.json
```

### Exit Codes

- **`0`** - Success
- **`1`** - General error
- **`2`** - Configuration error
- **`3`** - File processing error
- **`4`** - Output error

## 📝 Script Integration

### Package.json Scripts

```json
{
  "scripts": {
    "analyze:tw": "tw-patterns",
    "analyze:tw:strict": "tw-patterns --threshold 0.8 --min-occurrences 5",
    "analyze:tw:dev": "tw-patterns --min-occurrences 1 --threshold 0.6",
    "analyze:tw:ci": "tw-patterns --no-console --out reports/ci-analysis.json"
  }
}
```

### Shell Scripts

```bash
#!/bin/bash
# analyze-patterns.sh

echo "Running Tailwind pattern analysis..."

# Run analysis
tw-patterns --threshold 0.8 --out reports/analysis.json

# Check for high-priority patterns
if [ -f reports/analysis.json ]; then
  high_priority=$(node -e "
    const r = require('./reports/analysis.json');
    console.log(r.clusters.filter(c => c.likelihood >= 70).length);
  ")
  
  echo "Found $high_priority high-priority patterns"
  
  if [ $high_priority -gt 10 ]; then
    echo "⚠️  Too many high-priority patterns found"
    exit 1
  fi
fi

echo "Analysis complete"
```

---

**Next**: Explore [Examples](./examples/) for real-world CLI usage patterns, or learn [Best Practices](./best-practices.md) for optimal results.
