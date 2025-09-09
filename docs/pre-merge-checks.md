# Comprehensive Pre-Merge/Rebase Check System

This project includes a comprehensive checking system that runs automatically when merging or rebasing into the `dev` branch. The system ensures code quality, consistency, and prevents broken code from entering the main development branch.

## 🚀 Quick Start

### Manual Check

Run all checks manually before merging:

```bash
npm run check:all
```

### Individual Checks

Run specific checks as needed:

```bash
npm run check:format    # Code formatting
npm run check:lint      # Linting
npm run check:types     # TypeScript types
npm run check:tests      # Test suite
npm run check:build      # Build verification
npm run check:deps       # Dependency audit
npm run check:quick      # Format + Lint + Types
npm run check:ci         # Full CI pipeline
```

## 🔧 How It Works

### Automatic Checks

The system automatically runs when:

- **Merging** into `dev` branch
- **Rebasing** onto `dev` branch
- **Pushing** to `dev` branch (via pre-push hook)

### Manual Triggers

You can also run checks manually:

- Before creating a pull request
- During development to catch issues early
- Before deploying to production

## 📋 Check Categories

### Required Checks (Blocking)

These checks **must pass** for the merge/rebase to proceed:

1. **Code Formatting** - Prettier formatting compliance
2. **Linting** - ESLint rules compliance
3. **TypeScript Types** - Type checking across all packages
4. **Test Suite** - All tests must pass
5. **Build Verification** - All packages must build successfully
6. **Dependency Audit** - Security vulnerability check
7. **Git Status** - No uncommitted changes

### Optional Checks (Non-blocking)

These checks run but won't block the merge:

1. **CSS Pattern Analysis** - Tailwind CSS usage analysis
2. **Storybook Build** - Component documentation build

## 🛠️ Configuration

### Husky Hooks

- `.husky/pre-commit` - Branch protection + lint-staged
- `.husky/pre-push` - Full test suite before push
- `.husky/pre-merge` - Comprehensive checks before merge/rebase

### GitHub Actions

- `.github/workflows/ci.yml` - Automated CI checks on PRs and pushes

### Scripts

- `scripts/pre-merge-check.sh` - Main comprehensive check script
- `package.json` - Check commands and configurations

## 🚨 Troubleshooting

### Common Issues

**Formatting Errors**

```bash
npm run format  # Fix formatting issues
```

**Linting Errors**

```bash
npm run lint:fix  # Auto-fix linting issues
```

**TypeScript Errors**

```bash
npm run type-check  # See detailed type errors
```

**Test Failures**

```bash
npm run test:ui  # Interactive test runner
```

**Build Failures**

```bash
npm run build  # See detailed build errors
```

### Bypassing Checks (Emergency Only)

⚠️ **Use with extreme caution!**

```bash
# Bypass pre-push hook
git push --no-verify

# Bypass pre-merge hook (not recommended)
git merge --no-verify
```

## 📊 Check Results

### Success Output

```
🎉 ALL CHECKS PASSED!
✅ Safe to merge/rebase into dev branch
🚀 You can now proceed with your merge or rebase
```

### Failure Output

```
❌ SOME CHECKS FAILED!
🚫 Please fix the issues above before merging/rebase into dev
💡 Run this script again after fixing the issues
```

## 🔄 Workflow Integration

### Development Workflow

1. Create feature branch from `dev`
2. Make changes and commit
3. Run `npm run check:quick` during development
4. Before merging: run `npm run check:all`
5. Create PR or merge into `dev`

### CI/CD Integration

- GitHub Actions runs automatically on PRs
- All checks must pass before merge
- Build artifacts are uploaded for review

## 📈 Monitoring

### Check Performance

- Formatting: ~5-10 seconds
- Linting: ~10-15 seconds
- Type checking: ~30-60 seconds
- Tests: ~1-3 minutes
- Build: ~2-5 minutes
- **Total**: ~5-10 minutes

### Optimization Tips

- Run `npm run check:quick` frequently during development
- Use `npm run check:all` before final commits
- Fix issues incrementally rather than all at once

## 🤝 Contributing

### Adding New Checks

1. Add check to `scripts/pre-merge-check.sh`
2. Add corresponding npm script to `package.json`
3. Update this documentation
4. Test the new check thoroughly

### Modifying Existing Checks

1. Update the check script
2. Test with `npm run check:all`
3. Update documentation if behavior changes

## 📚 Related Documentation

- [Development Workflow](.cursor/rules/development-workflow.mdc)
- [Deployment Guide](docs/deployment.md)
- [Package Guidelines](packages/README.md)
