# @bracketbear/core

## Overview
Shared components, layouts, and utilities for Bracket Bear applications. Provides a consistent design system, layout components, and type definitions across all projects.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Layout Components](#layout-components)
  - [Layout](#layout)
  - [NavBar](#navbar)
  - [Footer](#footer)
- [Configuration](#configuration)
  - [Navigation Configuration](#navigation-configuration)
  - [Pre-built Configurations](#pre-built-configurations)
- [Types](#types)
  - [Navigation Types](#navigation-types)
  - [Layout Types](#layout-types)
- [Styling](#styling)
- [Development](#development)
- [Examples](#examples)
- [Documentation](#documentation)
  - [ContentLayout Hero Section](/src/astro/layout/README.md)
- [Back to Monorepo](../../README.md)

## Features

- **Design System**: Atoms, tokens, and styling
- **Layout Components**: Configurable navigation, footer, and layout
- **Theme System**: Dark/light mode with system preference support
- **Type Safety**: Full TypeScript support with shared types
- **Framework Agnostic**: Support for both Astro and React

## Quick Start

### Basic Usage

```astro
---
import { Layout, portfolioNavigation } from '@bracketbear/core/astro';
import ContactForm from '@/components/ContactForm.astro';
---

<Layout 
  title="My Page"
  navigation={portfolioNavigation}
  contactForm={ContactForm}
>
  <main>
    <h1>Hello World!</h1>
  </main>
</Layout>
```

## Layout Components

### Layout

The main layout component that provides:
- HTML structure with theme initialization
- Configurable navigation
- Configurable footer
- Optional contact form
- Theme switching

```astro
---
import { Layout } from '@bracketbear/core/astro';

interface Props {
  title?: string;
  hideContactForm?: boolean;
  hideFooter?: boolean;
  hideNavigation?: boolean;
}
---

<Layout 
  title="Page Title"
  hideContactForm={false}
  hideFooter={false}
  hideNavigation={false}
  navigation={navigationConfig}
  theme={{ defaultTheme: 'system' }}
  contactForm={ContactFormComponent}
>
  <slot />
</Layout>
```

### NavBar

Configurable navigation component with:
- Responsive design (mobile menu)
- Dropdown support
- Theme switching
- Social links
- Custom branding

```astro
---
import { NavBar } from '@bracketbear/core/astro';
import { portfolioNavigation } from '@bracketbear/core/config';
---

<NavBar config={portfolioNavigation} class="relative z-50" />
```

### Footer

Configurable footer component with:
- Navigation links
- Social links
- Branding
- Copyright

```astro
---
import { Footer } from '@bracketbear/core/astro';
import { portfolioNavigation } from '@bracketbear/core/config';
---

<Footer 
  config={portfolioNavigation} 
  copyrightText="Custom copyright text"
/>
```

## Configuration

### Navigation Configuration

```typescript
import type { NavigationConfig } from '@bracketbear/core/types';

const navigation: NavigationConfig = {
  items: [
    { name: 'Home', href: '/' },
    { 
      name: 'About', 
      href: '/about',
      children: [
        { name: 'About Me', href: '/about/me' },
        { name: 'About Company', href: '/about/company' }
      ]
    },
    { name: 'Contact', href: '/contact' }
  ],
  branding: {
    name: 'My Brand',
    href: '/',
    logo: '/logo.svg' // Optional
  },
  socialLinks: {
    linkedin: 'https://linkedin.com/in/username',
    github: 'https://github.com/username',
    twitter: 'https://twitter.com/username'
  }
};
```

### Pre-built Configurations

```typescript
import { 
  defaultNavigation,
  portfolioNavigation, 
  bracketBearNavigation 
} from '@bracketbear/core/config';
```

## Types

### Navigation Types

```typescript
interface NavItem {
  name: string;
  href: string;
  icon?: string;
  children?: NavItem[];
  target?: string;
  rel?: string;
}

interface NavigationConfig {
  items: NavItem[];
  branding?: {
    logo?: string;
    name: string;
    href: string;
  };
  socialLinks?: {
    linkedin?: string;
    github?: string;
    twitter?: string;
  };
}
```

### Layout Types

```typescript
interface LayoutProps {
  title?: string;
  hideContactForm?: boolean;
  hideFooter?: boolean;
  hideNavigation?: boolean;
}

interface ThemeConfig {
  enableSystemPreference?: boolean;
  defaultTheme?: 'light' | 'dark' | 'system';
  storageKey?: string;
}
```

## Styling

The package includes a shared Tailwind configuration with:

- Custom color tokens
- Brutalist design utilities
- Dark mode support
- Responsive utilities

```css
@import '@bracketbear/core/styles';
```

## Development

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Clean

```bash
npm run clean
```

## Examples

### Portfolio Site

```astro
---
import { Layout, portfolioNavigation } from '@bracketbear/core/astro';
import ContactForm from '@/components/ContactForm.astro';
---

<Layout 
  title="Harrison Callahan - Portfolio"
  navigation={portfolioNavigation}
  contactForm={ContactForm}
>
  <main>
    <!-- Your content here -->
  </main>
</Layout>
```

### Company Site

```astro
---
import { Layout, bracketBearNavigation } from '@bracketbear/core/astro';
import ContactForm from '@/components/ContactForm.astro';
---

<Layout 
  title="Bracket Bear - Software Development"
  navigation={bracketBearNavigation}
  contactForm={ContactForm}
>
  <main>
    <!-- Your content here -->
  </main>
</Layout>
```

## Contributing

1. Add new components to `src/astro/components/`
2. Add types to `src/types/`
3. Add configurations to `src/config/`
4. Update exports in `src/astro/index.ts`
5. Build and test

## License

MIT