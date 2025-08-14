import { fields } from '@keystatic/core';

/**
 * Base page schema with common SEO and content fields
 *
 * This schema provides a foundation for all page types with standard
 * SEO metadata, content structure, and publishing controls.
 * Meta titles are auto-generated from hero titles to reduce redundancy.
 *
 * @example
 * ```typescript
 * const basePageFields = makeBasePageFields();
 *
 * // Use in a singleton or collection
 * const pageSchema = {
 *   ...basePageFields,
 *   // Add custom fields here
 * };
 * ```
 */
export function makeBasePageFields() {
  return {
    title: fields.text({
      label: 'Page Title',
      description: 'The main title for this page',
    }),
    subtitle: fields.text({
      label: 'Page Subtitle',
      description: 'Optional subtitle for this page',
    }),
    content: fields.text({
      label: 'Content',
      multiline: true,
      description: 'Main page content (markdown supported)',
      validation: {
        isRequired: false,
      },
    }),
    metaDescription: fields.text({ label: 'Meta Description' }),
    canonicalUrl: fields.text({ label: 'Canonical URL' }),
    ogImage: fields.text({ label: 'Open Graph Image' }),
    noIndex: fields.checkbox({
      label: 'No Index',
      description: 'Exclude from search engines',
      defaultValue: false,
    }),
  };
}

/**
 * Creates a page schema with optional additional fields
 *
 * This function allows extending the base page schema with custom fields
 * while maintaining all the standard SEO and content structure.
 * This should be consistent with the Astro content version in packages/astro-content/src/schemas/page.ts
 *
 * @param extras - Optional additional field definitions to merge
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
 *   phone: fields.text({ label: 'Phone' }),
 *   address: fields.text({ label: 'Address' }),
 *   contactFormId: fields.text({ label: 'Contact Form ID' }),
 * });
 *
 * // About page with custom fields and conditional CTA
 * const aboutPageSchema = makePageSchema({
 *   teamMembers: fields.array(
 *     fields.object({
 *       name: fields.text({ label: 'Name' }),
 *       role: fields.text({ label: 'Role' }),
 *       bio: fields.text({ label: 'Bio', multiline: true }),
 *     }),
 *     { label: 'Team Members' }
 *   ),
 *   companyValues: fields.array(
 *     fields.text({ label: 'Value' }),
 *     { label: 'Company Values' }
 *   ),
 * }, { showCta: true });
 * ```
 */
export function makePageSchema(
  extras?: Record<string, any>,
  options?: { showCta?: boolean }
) {
  const baseFields = makeBasePageFields();
  const showCta = options?.showCta !== false; // Default to true for backward compatibility

  // Define CTA fields - always include the field but make it optional when showCta is false
  const ctaFields = {
    contactCTA: showCta
      ? fields.object({
          text: fields.text({
            label: 'CTA Text',
            description: 'Call-to-action text',
            multiline: true,
          }),
          buttonText: fields.text({
            label: 'Button Text',
            defaultValue: 'Get In Touch',
          }),
          buttonLink: fields.text({
            label: 'Button Link',
            defaultValue: '/contact',
          }),
        })
      : fields.object({
          text: fields.text({
            label: 'CTA Text',
            description: 'Call-to-action text (disabled when showCta is false)',
            multiline: true,
            validation: { isRequired: false },
          }),
          buttonText: fields.text({
            label: 'Button Text',
            defaultValue: 'Get In Touch',
            validation: { isRequired: false },
          }),
          buttonLink: fields.text({
            label: 'Button Link',
            defaultValue: '/contact',
            validation: { isRequired: false },
          }),
        }),
  };

  if (!extras) {
    return {
      ...baseFields,
      ...ctaFields,
    };
  }

  return {
    ...baseFields,
    ...ctaFields,
    ...extras,
  };
}
