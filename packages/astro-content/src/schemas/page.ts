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
 * @param options - Optional configuration for the schema
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
 * // About page with custom fields and conditional CTA
 * const aboutPageSchema = makePageSchema({
 *   teamMembers: z.array(z.object({
 *     name: z.string(),
 *     role: z.string(),
 *     bio: z.string()
 *   })),
 *   companyValues: z.array(z.string())
 * }, { showCta: true });
 * ```
 */
export function makePageSchema<Extras extends z.ZodRawShape = z.ZodRawShape>(
  extras?: Extras,
  options?: { showCta?: boolean }
) {
  const showCta = options?.showCta !== false; // Default to true for backward compatibility

  // Define CTA fields
  const ctaFields: z.ZodRawShape = showCta
    ? {
        contactCTA: z.object({
          text: z.string(),
          buttonText: z.string().default('Get In Touch'),
          buttonLink: z.string().default('/contact'),
        }),
      }
    : {};

  // Merge fields only if there are any to merge
  if (extras || (showCta && Object.keys(ctaFields).length > 0)) {
    const fieldsToMerge = { ...ctaFields, ...extras };
    return basePageSchema.merge(z.object(fieldsToMerge));
  }

  return basePageSchema;
}
