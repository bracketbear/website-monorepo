import { z } from 'zod';

/**
 * General content schemas for blog posts, pages, and services
 *
 * These schemas define the structure and validation rules for general content
 * including blog posts, static pages, and service offerings. They are used
 * to ensure data consistency and provide TypeScript types for content management.
 */

/**
 * Schema for blog post information
 *
 * Defines the structure for blog post data including title, content,
 * publication details, and metadata.
 *
 * @example
 * ```typescript
 * const blogData = {
 *   title: "Building Interactive Experiences with Three.js",
 *   excerpt: "Learn how to create immersive 3D experiences...",
 *   content: "# Building Interactive Experiences...",
 *   publishedAt: "2024-01-15",
 *   isPublished: true,
 *   tags: ["threejs", "webgl", "interactive"],
 *   featuredImage: "blog-hero.jpg"
 * };
 * ```
 */
export const blogSchema = z.object({
  title: z.string(),
  excerpt: z.string().optional(),
  content: z.string(), // This will be the rich text content
  publishedAt: z.coerce.date().optional(),
  isPublished: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  featuredImage: z.string().optional(),
});

/**
 * Schema for static page information
 *
 * Defines the structure for static page data including title, content,
 * and SEO metadata.
 *
 * @example
 * ```typescript
 * const pageData = {
 *   title: "About Bracket Bear",
 *   content: "# About Bracket Bear...",
 *   metaDescription: "Learn about Bracket Bear's mission and values",
 *   isPublished: true
 * };
 * ```
 */
export const pageSchema = z.object({
  title: z.string(),
  content: z.string(), // This will be the rich text content
  metaDescription: z.string().optional(),
  isPublished: z.boolean().default(true),
});

/**
 * Schema for service offering information
 *
 * Defines the structure for service data including title, description,
 * icon, and whether it should be featured prominently.
 *
 * @example
 * ```typescript
 * const serviceData = {
 *   title: "Web Development",
 *   description: "Custom web applications built with modern technologies",
 *   icon: "code-icon.svg",
 *   isFeatured: true
 * };
 * ```
 */
export const serviceSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  isFeatured: z.boolean().default(false),
});
