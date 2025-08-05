import { z } from 'zod';

/**
 * General content schemas for blog posts, pages, and services
 *
 * These schemas define the structure and validation rules for general content
 * including blog posts, static pages, and service offerings. They are used
 * to ensure data consistency and provide TypeScript types for content management.
 */

/**
 * Blog post schema
 */
export const blogSchema = z.object({
  title: z.string(),
  excerpt: z.string().optional(),
  content: z.string(),
  publishedAt: z.date().optional(),
  isPublished: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  featuredImage: z.string().optional(),
});

/**
 * Page schema
 */
export const pageSchema = z.object({
  title: z.string(),
  content: z.string().optional(),
  metaDescription: z.string().optional(),
  isPublished: z.boolean().default(true),
});

/**
 * Service schema
 */
export const serviceSchema = z.object({
  title: z.string(),
  description: z.string(),
  icon: z.string().optional(),
  isFeatured: z.boolean().default(false),
});

// Re-export the shared contact method schema
export { contactMethodSchema } from './contact-method';
