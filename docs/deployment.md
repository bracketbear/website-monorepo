# Deployment Guide

This document describes how to deploy the BracketBear websites to Netlify.

## Prerequisites

1. **Netlify CLI**: Install the Netlify CLI globally or locally

   ```bash
   # Global installation (recommended for development)
   npm install -g netlify-cli

   # Local installation (recommended for CI/CD)
   npm install netlify-cli --save-dev
   ```

2. **Authentication**: Authenticate with Netlify

   ```bash
   netlify login
   ```

3. **Site Linking**: Link your local project to Netlify sites (first time only)

   ```bash
   # For portfolio
   cd apps/portfolio
   netlify link

   # For bracketbear-website
   cd apps/bracketbear-website
   netlify link
   ```

## Available Deploy Scripts

### Individual Site Deployment

- **Portfolio**: `npm run deploy:portfolio`
- **BracketBear Website**: `npm run deploy:bracketbear`

### Deploy All Sites

- **All Sites**: `npm run deploy:all`

### Manual Deployment

You can also use the deploy script directly:

```bash
# Deploy specific site
./scripts/deploy.sh portfolio
./scripts/deploy.sh bracketbear

# Deploy all sites
./scripts/deploy.sh all
```

## What the Deploy Script Does

The deploy script performs the following steps in order:

1. **Prerequisites Check**:
   - Verifies Netlify CLI is installed
   - Checks authentication status

2. **Quality Checks**:
   - Runs all tests (`npm run test`)
   - Runs linting with zero warnings (`npm run lint:check`)
   - Runs TypeScript type checking (`npm run type-check`)

3. **Build and Deploy**:
   - Builds the site (`npm run build`)
   - Deploys to Netlify production (`netlify deploy --prod`)

## Configuration Files

Each site has a `netlify.toml` configuration file that defines:

- Build settings (publish directory, build command)
- Node.js version
- Redirects for SPA routing
- Security headers
- Asset caching rules

## Environment Variables

If your sites require environment variables, you can set them using:

```bash
# Set environment variables for a site
netlify env:set VARIABLE_NAME value

# Import from .env file
netlify env:import .env
```

## Troubleshooting

### Common Issues

1. **Authentication Error**: Run `netlify login` to authenticate
2. **Site Not Linked**: Run `netlify link` in the site directory
3. **Build Failures**: Check the build logs and ensure all dependencies are installed
4. **Quality Check Failures**: Fix linting errors, test failures, or type errors before deploying

### Debug Mode

To see detailed output, run with debug mode:

```bash
DEBUG=* npm run deploy:portfolio
```

## CI/CD Integration

For continuous deployment, you can use the same scripts in your CI/CD pipeline. The scripts will:

- Exit on any error (`set -e`)
- Provide colored output for better visibility
- Run all quality checks before deployment
- Deploy only if all checks pass

Example GitHub Actions workflow:

```yaml
- name: Deploy to Netlify
  run: npm run deploy:all
  env:
    NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
```
