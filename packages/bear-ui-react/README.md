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

## Available Components

### Basic Components

- `Button` - Primary button component
- `Pill` - Pill/badge component
- `SkillPill` - Specialized skill pill
- `BracketBearLogo` - Logo component

### Form Components

- `ValidatedForm` - Form with validation
- `TextInput` - Text input field
- `TextareaInput` - Textarea input field
- `CheckboxInput` - Checkbox input field
- `Field` - Generic form field wrapper
- `CheckboxField` - Checkbox field wrapper

### Layout Components

- `Accordion` - Collapsible accordion
- `Modal` - Modal dialog
- `AlertModal` - Alert modal
- `Popover` - Popover component
- `ImageGallery` - Image gallery
- `ImageViewerModal` - Image viewer modal

### Feedback Components

- `Toast` - Toast notification
- `ToastProvider` - Toast context provider
- `Testimonial` - Testimonial component
- `Stats` - Statistics display

### Interactive Components

- `Slider` - Slider component
- `Ticker` - Scrolling ticker
- `PointerFX` - Pointer effects
- `BulletList` - Bullet list component
- `ContactIcon` - Contact icon component

## Hooks

- `useToast` - Toast management hook

## Dependencies

This package depends on:

- `@bracketbear/bear-ui` - Core types and utilities
- `@bracketbear/bear-ui-tailwind` - Tailwind CSS styles

## Development

```bash
npm run dev    # Watch mode for development
npm run build  # Build for production
npm run clean  # Clean build artifacts
npm run test   # Run tests
```
