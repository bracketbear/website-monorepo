/**
 * Content Schemas for @bracketbear/schemas
 *
 * This module exports all content schemas used for validating and typing
 * content data across the Bracket Bear ecosystem. The schemas are organized into
 * three main categories:
 *
 * 1. Work Schemas - For professional experience, projects, and skills
 * 2. Content Schemas - For general content like blog posts, pages, and services
 * 3. Page Schemas - For site-specific page configurations
 *
 * All schemas use Zod for runtime validation and TypeScript type generation.
 *
 * @example
 * ```typescript
 * import { workProjectSchema, blogSchema } from '@bracketbear/schemas';
 *
 * // Validate project data
 * const projectData = workProjectSchema.parse(rawProjectData);
 *
 * // Validate blog post data
 * const blogData = blogSchema.parse(rawBlogData);
 * ```
 */

// Export all work schemas
export * from './work.js';

// Export all content schemas
export * from './content.js';
export * from './page.js';
export * from './about-page.js';
export * from './contact-page.js';
export * from './work-page.js';
export * from './projects-page.js';
export * from './project-page.js';
export * from './source-code-page.js';
