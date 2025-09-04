# @bracketbear/bear-ui-react

React components for the BracketBear UI system. This package provides a comprehensive set of React components built on top of the core bear-ui system.

## Installation

```bash
npm install @bracketbear/bear-ui-react
```

## Usage

Import components:

```tsx
import { Button, Modal, Toast } from '@bracketbear/bear-ui-react';
```

Or import specific components:

```tsx
import { Button } from '@bracketbear/bear-ui-react/components';
import { useToast } from '@bracketbear/bear-ui-react/hooks';
```

## What's Included

### Components

- **Basic**: Button, Pill, SkillPill, BracketBearLogo
- **Forms**: ValidatedForm, TextInput, TextareaInput, CheckboxInput, Field, CheckboxField
- **Layout**: Accordion, Modal, AlertModal, Popover, ImageGallery, ImageViewerModal
- **Feedback**: Toast, ToastProvider, Testimonial, Stats
- **Interactive**: Slider, Ticker, PointerFX, BulletList, ContactIcon

### Hooks

- `useToast` - Toast management
- `useVisibilityObserver` - Visibility observation
- `useIntersectionObserver` - Intersection observation
- `useDebounce` - Debounce utility

### Types

Component prop interfaces for all exported components.

## Dependencies

This package depends on:

- `@bracketbear/bear-ui` - Core types and utilities
- `@bracketbear/bear-ui-tailwind` - Tailwind CSS styles
- `@headlessui/react` - Headless UI components
- `clsx` - Class name utility
- `gsap` - Animation library
- `pixi.js` - Graphics library

## Peer Dependencies

- `react` ^19.0.0
- `react-dom` ^19.0.0

## Development

```bash
npm run dev    # Watch mode for development
npm run build  # Build for production
npm run clean  # Clean build artifacts
npm run test   # Run tests
npm run type-check  # Type checking
```
