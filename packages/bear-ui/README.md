# @bracketbear/bear-ui

Core UI system for BracketBear applications. This package contains shared types, utilities, and interfaces that are used across the BracketBear UI ecosystem.

## Installation

```bash
npm install @bracketbear/bear-ui
```

## Usage

Import shared types and utilities:

```typescript
import { ButtonProps, FormFieldProps } from '@bracketbear/bear-ui/types';
import { cn, validateForm } from '@bracketbear/bear-ui/utils';
```

## Available Exports

### Types

- `ButtonProps` - Button component interface
- `FormFieldProps` - Form field interface
- `ModalProps` - Modal component interface
- `ToastProps` - Toast notification interface

### Utils

- `cn` - Class name utility function
- `validateForm` - Form validation utilities
- `formatDate` - Date formatting utilities

## Development

```bash
npm run dev    # Watch mode for development
npm run build  # Build for production
npm run clean  # Clean build artifacts
```

## Dependencies

This package is consumed by:

- `@bracketbear/bear-ui-tailwind` - Tailwind CSS styles
- `@bracketbear/bear-ui-react` - React components
