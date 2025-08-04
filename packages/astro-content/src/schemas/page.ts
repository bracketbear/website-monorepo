import { z } from 'astro:content';

/**
 * Base page schema with common SEO and content fields
 *
 * This schema provides a foundation for all page types with standard
 * SEO metadata, content structure, and publishing controls.
 * Meta titles are auto-generated from hero titles to reduce redundancy.
 *
 * @example
 * ```typescript
 * const pageData = {
 *   content: "# About Bracket Bear...",
 *   metaTitle: "About Bracket Bear - Custom Software Development",
 *   metaDescription: "Learn about Bracket Bear's mission and values",
 *   canonicalUrl: "https://bracketbear.com/about",
 *   ogImage: "about-og-image.jpg",
 *   noIndex: false
 * };
 * ```
 */
export const basePageSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  content: z.string().optional(),
  metaDescription: z.string().optional(),
  canonicalUrl: z.string().url().optional(),
  ogImage: z.string().optional(),
  noIndex: z.boolean().default(false),
});

/**
 * Creates a page schema with optional additional fields
 *
 * This function allows extending the base page schema with custom fields
 * while maintaining all the standard SEO and content structure.
 * This should be consistent with the CMS version in apps/cms/src/schemas/page.ts
 *
 * @param extras - Optional additional Zod schema fields to merge
 * @returns A merged schema that includes base page fields plus any extras
 *
 * @example
 * ```typescript
 * // Basic page with only base fields
 * const basicPageSchema = makePageSchema();
 *
 * // Contact page with additional fields
 * const contactPageSchema = makePageSchema({
 *   phone: z.string(),
 *   address: z.string(),
 *   contactFormId: z.string(),
 * });
 *
 * // About page with custom fields
 * const aboutPageSchema = makePageSchema({
 *   teamMembers: z.array(z.object({
 *     name: z.string(),
 *     role: z.string(),
 *     bio: z.string()
 *   })),
 *   companyValues: z.array(z.string())
 * });
 * ```
 */
export function makePageSchema<Extras extends z.ZodRawShape = z.ZodRawShape>(
  extras?: Extras
) {
  return extras ? basePageSchema.merge(z.object(extras)) : basePageSchema;
}
