# @bracketbear/schemas

Zod schemas for content validation and TypeScript type generation across the Bracket Bear ecosystem.

## Overview

This package contains all the Zod schemas used for validating and typing content data in the CMS and Astro applications. The schemas are organized into logical groups:

- **Work Schemas** - Professional experience, projects, and skills
- **Content Schemas** - General content like blog posts, pages, and services
- **Page Schemas** - Site-specific page configurations

## Usage

```typescript
import {
  workProjectSchema,
  blogSchema,
  portfolioAboutPageSchema,
} from '@bracketbear/schemas';

// Validate project data
const projectData = workProjectSchema.parse(rawProjectData);

// Validate blog post data
const blogData = blogSchema.parse(rawBlogData);

// Get TypeScript types
type ProjectData = typeof workProjectSchema._type;
type BlogData = typeof blogSchema._type;
```

## Schema Categories

### Work Schemas

- `workCompanySchema` - Company information
- `workJobSchema` - Job/employment details
- `workSkillSchema` - Individual skills
- `workSkillCategorySchema` - Skill categories
- `workProjectCategorySchema` - Project categories
- `workProjectSchema` - Work projects
- `personalProjectSchema` - Personal projects

### Content Schemas

- `blogSchema` - Blog posts
- `pageSchema` - Static pages
- `serviceSchema` - Service offerings
- `contactMethodSchema` - Contact methods

### Page Schemas

- `basePageSchema` - Base page with SEO fields
- `makePageSchema()` - Factory function for custom pages
- `portfolioAboutPageSchema` - Portfolio about page
- `portfolioIndexPageSchema` - Portfolio homepage
- `portfolioContactPageSchema` - Portfolio contact page
- `portfolioWorkPageSchema` - Portfolio work page
- `portfolioProjectsPageSchema` - Portfolio projects page
- `portfolioProjectPageSchema` - Individual project pages
- `sourceCodePageSchema` - Source code showcase page

## Dependencies

This package only depends on `zod` for schema validation and type generation, keeping it lightweight and focused.
