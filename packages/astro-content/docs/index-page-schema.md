# Index Page Schema

The `indexPageSchema` provides a structured way to manage content for portfolio homepages. It extends the base page schema with specific fields for hero sections, about content, featured projects, recent experience, and contact information.

## Usage

```typescript
import { indexPageSchema } from '@bracketbear/astro-content';

// Validate index page data
const pageData = indexPageSchema.parse(rawData);
```

## Schema Structure

### Base Page Fields
All index pages inherit these fields from `basePageSchema`:
- `title` (required): Page title
- `content` (required): Main content in markdown
- `metaTitle` (optional): SEO title
- `metaDescription` (optional): SEO description
- `canonicalUrl` (optional): Canonical URL
- `ogImage` (optional): Open Graph image
- `noIndex` (optional): Whether to exclude from search engines

### Index-Specific Fields

#### Hero Section
```typescript
hero: {
  title: string;                    // Hero title
  subtitle?: string;                // Hero subtitle
  description?: string;             // Hero description
  showParticleBackground?: boolean; // Show particle background
}
```

#### About Section
```typescript
about: {
  title?: string;                   // Section title (default: "What I Do")
  introduction: string;             // Main introduction text
  description: string;              // Description paragraph
  experience: string;               // Experience paragraph
  additional: string;               // Additional information
  showSkillsTicker?: boolean;       // Show skills ticker
}
```

#### Featured Projects Section
```typescript
featuredProjects: {
  title?: string;                   // Section title (default: "Featured Projects")
  subtitle: string;                 // Section subtitle
  maxDisplay?: number;              // Max projects to show (default: 3)
  showViewAllButton?: boolean;      // Show view all button
  viewAllButtonText?: string;       // Button text (default: "View All Projects →")
  viewAllButtonLink?: string;       // Button link (default: "/projects")
}
```

#### Recent Experience Section
```typescript
recentExperience: {
  title?: string;                   // Section title (default: "Recent Experience")
  subtitle: string;                 // Section subtitle
  maxDisplay?: number;              // Max jobs to show (default: 3)
  showViewAllButton?: boolean;      // Show view all button
  viewAllButtonText?: string;       // Button text (default: "View Full Work History →")
  viewAllButtonLink?: string;       // Button link (default: "/work")
}
```

#### Contact Section
```typescript
contact: {
  title?: string;                   // Section title (default: "Let's Work Together")
  subtitle: string;                 // Section subtitle
  showContactForm?: boolean;        // Show contact form
}
```

#### Layout Options
```typescript
layout: {
  hideContactForm?: boolean;        // Hide contact form in layout
  showHeroSection?: boolean;        // Show hero section
  showAboutSection?: boolean;       // Show about section
  showFeaturedProjects?: boolean;   // Show featured projects
  showRecentExperience?: boolean;   // Show recent experience
  showContactSection?: boolean;     // Show contact section
}
```

#### SEO Options
```typescript
seo: {
  structuredData?: boolean;         // Include structured data
  enableAnalytics?: boolean;        // Enable analytics
  preloadCriticalAssets?: boolean;  // Preload critical assets
}
```

## Example Usage

```json
{
  "title": "Harrison Callahan - Portfolio",
  "content": "# Welcome to my portfolio",
  "metaTitle": "Harrison Callahan - Full Stack Developer Portfolio",
  "metaDescription": "Professional portfolio showcasing web development projects",
  "hero": {
    "title": "Harrison Callahan",
    "subtitle": "Full Stack Developer",
    "description": "Building amazing web experiences for over two decades"
  },
  "about": {
    "introduction": "I can tell you that I'm a full-stack developer...",
    "description": "I've been working on the web for so long...",
    "experience": "Throughout my career, I've worked on...",
    "additional": "Beyond my technical skills, I've also collected..."
  },
  "featuredProjects": {
    "subtitle": "I've been fortunate to work on some really cool projects...",
    "maxDisplay": 3
  },
  "recentExperience": {
    "subtitle": "My journey spans from agency work...",
    "maxDisplay": 3
  },
  "contact": {
    "subtitle": "Ready to build something amazing?"
  }
}
```

## Integration with Astro

The index page collection is automatically available in your Astro app:

```typescript
// In your Astro page
import { getCollection } from 'astro:content';

const indexPage = await getCollection('indexPage');
const pageData = indexPage[0]; // Assuming single index page
```

## Benefits

1. **Type Safety**: Full TypeScript support with inferred types
2. **Content Validation**: Runtime validation ensures data integrity
3. **Flexible Layout**: Control which sections to show/hide
4. **SEO Optimized**: Built-in SEO fields and options
5. **Reusable**: Consistent structure across different portfolio sites 