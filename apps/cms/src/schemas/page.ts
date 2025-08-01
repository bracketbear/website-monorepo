import { fields } from '@keystatic/core';

/**
 * Base page schema with common SEO and content fields
 *
 * This schema provides a foundation for all page types with standard
 * SEO metadata, content structure, and publishing controls.
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
      validation: { isRequired: true },
    }),
    content: fields.text({
      label: 'Content',
      multiline: true,
      description: 'Main page content (markdown supported)',
    }),
    metaTitle: fields.text({ label: 'Meta Title' }),
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
 *
 * @param extras - Optional additional field definitions to merge
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
 * // About page with custom fields
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
 * });
 * ```
 */
export function makePageSchema(extras?: Record<string, any>) {
  const baseFields = makeBasePageFields();

  if (!extras) {
    return baseFields;
  }

  return {
    ...baseFields,
    ...extras,
  };
}
