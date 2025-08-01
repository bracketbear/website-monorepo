/**
 * Content Schemas for @bracketbear/astro-content
 *
 * This module exports all content schemas used for validating and typing
 * content data in the CMS. The schemas are organized into two main categories:
 *
 * 1. Work Schemas - For professional experience, projects, and skills
 * 2. Content Schemas - For general content like blog posts, pages, and services
 *
 * All schemas use Zod for runtime validation and TypeScript type generation.
 *
 * @example
 * ```typescript
 * import { workProjectSchema, blogSchema } from '@bracketbear/astro-content';
 *
 * // Validate project data
 * const projectData = workProjectSchema.parse(rawProjectData);
 *
 * // Validate blog post data
 * const blogData = blogSchema.parse(rawBlogData);
 * ```
 */

// Export all work schemas
export {
  workCompanySchema,
  workJobSchema,
  workSkillSchema,
  workSkillCategorySchema,
  workProjectCategorySchema,
  workProjectSchema,
} from './work';

// Export all content schemas
export { blogSchema, pageSchema, serviceSchema } from './content';
export { basePageSchema, makePageSchema } from './page';
export { indexPageSchema, type IndexPageData } from './index-page';
