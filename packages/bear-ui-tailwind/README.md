# @bracketbear/bear-ui-tailwind

Tailwind CSS styles and utilities for BracketBear UI components. This package provides a comprehensive set of Tailwind CSS utilities, components, and design tokens for the BracketBear design system.

## Installation

```bash
npm install @bracketbear/bear-ui-tailwind
```

## Usage

Import the main Tailwind CSS file in your application:

```css
@import '@bracketbear/bear-ui-tailwind/styles';
```

Or import specific style modules:

```css
@import '@bracketbear/bear-ui-tailwind/styles/theme.css';
@import '@bracketbear/bear-ui-tailwind/styles/typography.css';
@import '@bracketbear/bear-ui-tailwind/styles/buttons.css';
```

## What's Included

### Core Styles

- `bracketbear.tailwind.css` - Main Tailwind configuration and utilities

### Design System

- `theme.css` - Color scheme and design tokens
- `typography.css` - Typography utilities and font configurations
- `buttons.css` - Button component styles
- `forms.css` - Form element styles
- `cards.css` - Card component styles
- `pills.css` - Pill and badge styles

### Effects & Animations

- `glass.css` - Glass morphism effects
- `tangible.css` - Tangible design system styles
- `animations.css` - Animation utilities

### Layout & Utilities

- `section.css` - Section layout styles
- `border.css` - Border utilities
- `box-shadow.css` - Shadow utilities

## Font Dependencies

This package includes the following fonts:

- `@fontsource/barlow-condensed` - Condensed display font
- `@fontsource/fira-sans` - Sans-serif body font

## Peer Dependencies

- `tailwindcss` ^4.1.0

## Development

```bash
npm run dev    # Watch mode for development
npm run build  # Build for production
npm run clean  # Clean build artifacts
npm run type-check  # Type checking
```

## Design System Features

### Color Palette

- Brand colors (red, blue, yellow, green)
- Neutral grays
- Semantic colors (success, warning, error)
- Dark mode support

### Typography Scale

- Responsive font sizes
- Font weight variations
- Line height utilities
- Letter spacing controls

### Component Styles

- Button variants (primary, secondary, ghost, etc.)
- Form field styling
- Card layouts
- Pill/badge components
- Modal and overlay styles

### Animation System

- Transition utilities
- Keyframe animations
- Hover effects
- Loading states
