# @bracketbear/core

## Overview

Core utilities and Astro components for Bracket Bear applications. This package provides Astro-specific layout components, utilities, and type definitions. For React components, see `@bracketbear/bear-ui-react`. For Tailwind styles, see `@bracketbear/bear-ui-tailwind`.

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

- **Astro Components**: Layout, navigation, and footer components
- **Utilities**: Meta title generation, navigation utilities
- **Type Safety**: Full TypeScript support with shared types
- **Framework Specific**: Optimized for Astro applications

## Package Structure

The BracketBear UI system is now split into multiple packages:

- **@bracketbear/bear-ui** - Core types and utilities
- **@bracketbear/bear-ui-tailwind** - Tailwind CSS styles and utilities
- **@bracketbear/bear-ui-react** - React components
- **@bracketbear/core** - Astro components and utilities (this package)

## Installation

For React applications:

```bash
npm install @bracketbear/bear-ui-react @bracketbear/bear-ui-tailwind
```

For Astro applications:

```bash
npm install @bracketbear/core @bracketbear/bear-ui-tailwind
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

<Footer config={portfolioNavigation} copyrightText="Custom copyright text" />
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
        { name: 'About Company', href: '/about/company' },
      ],
    },
    { name: 'Contact', href: '/contact' },
  ],
  branding: {
    name: 'My Brand',
    href: '/',
    logo: '/logo.svg', // Optional
  },
  socialLinks: {
    linkedin: 'https://linkedin.com/in/username',
    github: 'https://github.com/username',
    twitter: 'https://twitter.com/username',
  },
};
```

### Pre-built Configurations

```typescript
import {
  defaultNavigation,
  portfolioNavigation,
  bracketBearNavigation,
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
```

## Styling

This package no longer includes styles. For Tailwind CSS styles, use:

```css
@import '@bracketbear/bear-ui-tailwind/styles';
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
