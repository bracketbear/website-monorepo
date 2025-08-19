# @bracketbear/tw-pattern-analyzer Documentation

Welcome to the comprehensive documentation for the Tailwind CSS Pattern Analyzer. This tool helps you discover repeated UI patterns in your codebase and identify opportunities for component extraction.

## 📚 Documentation Sections

### 🚀 [Getting Started](./getting-started.md)
- Quick installation and setup
- First analysis run
- Basic configuration

### 🧠 [Core Concepts](./concepts.md)
- Pattern detection fundamentals
- Similarity algorithms explained
- Clustering strategies
- Likelihood scoring

### 📖 [User Guides](./guides/)
- [Configuration Guide](./guides/configuration.md) - Detailed config options
- [CLI Usage](./guides/cli-usage.md) - Command line interface
- [Integration Guide](./guides/integration.md) - CI/CD and build tools
- [Advanced Usage](./guides/advanced-usage.md) - Custom patterns and tuning

### 🔧 [API Reference](./api/)
- [Core API](./api/core.md) - Main analyzer functions
- [Types](./api/types.md) - TypeScript interfaces
- [CLI Options](./api/cli.md) - Command line parameters

### 📊 [Examples](./examples/)
- [Basic Analysis](./examples/basic-analysis.md) - Simple usage examples
- [Custom Patterns](./examples/custom-patterns.md) - Framework-specific examples
- [Output Interpretation](./examples/output-interpretation.md) - Understanding results

### 🎯 [Best Practices](./best-practices.md)
- Configuration recommendations
- Performance optimization
- Result interpretation
- Component extraction strategies

## 🎯 Quick Start

```bash
# Install and run
npm run analyze:tw

# Or build and run manually
npm run build --workspace=@bracketbear/tw-pattern-analyzer
npm exec --workspace=@bracketbear/tw-pattern-analyzer tw-patterns
```

## 🔍 What It Does

The analyzer scans your codebase for repeated Tailwind CSS class combinations, groups similar patterns using intelligent clustering, and provides likelihood scores to help you identify which patterns are good candidates for component extraction.

## 🆘 Need Help?

- Check the [Troubleshooting](./troubleshooting.md) guide
- Review [Common Issues](./troubleshooting.md#common-issues)
- Look at [Examples](./examples/) for usage patterns

## 📝 Contributing

This documentation is part of the `@bracketbear/tw-pattern-analyzer` package. To contribute:

1. Edit the markdown files in this `docs/` folder
2. Follow the established structure and formatting
3. Test your changes locally
4. Submit a pull request

---

**Next**: Start with [Getting Started](./getting-started.md) for a quick introduction, or dive into [Core Concepts](./concepts.md) to understand how the analyzer works.
