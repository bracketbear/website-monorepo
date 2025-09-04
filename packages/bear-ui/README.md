# @bracketbear/bear-ui

Core UI system for BracketBear applications. This package contains shared types, utilities, and interfaces that are used across the BracketBear UI ecosystem.

## Installation

```bash
npm install @bracketbear/bear-ui
```

## Usage

Import shared types and utilities:

```typescript
import {
  BreadcrumbItem,
  LabelValue,
  LayoutConfig,
} from '@bracketbear/bear-ui/types';
import { clsx, debounce, generateMetaTitle } from '@bracketbear/bear-ui/utils';
```

## What's Included

### Types

Navigation, layout, and form-related TypeScript interfaces and types.

### Utils

- Class name utilities (`clsx`) - Single source of truth for class name handling
- Form validation and meta title generation
- Button styling utilities
- Header spacing calculations
- Navigation helpers
- Shared constants

## Development

```bash
npm run dev    # Watch mode for development
npm run build  # Build for production
npm run clean  # Clean build artifacts
npm run type-check  # Type checking
```

## Dependencies

This package is consumed by:

- `@bracketbear/bear-ui-tailwind` - Tailwind CSS styles
- `@bracketbear/bear-ui-react` - React components
