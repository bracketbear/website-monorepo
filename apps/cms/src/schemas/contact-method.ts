import { fields } from '@keystatic/core';

/**
 * Contact Method Schema
 *
 * This schema defines the structure for contact methods that can be reused
 * across different pages and sites. Each contact method has a label, value,
 * and an optional icon.
 */
export const contactMethodSchema = {
  label: fields.text({
    label: 'Contact Method Label',
    description: 'Label for the contact method (e.g., "Email", "LinkedIn")',
  }),
  value: fields.text({
    label: 'Contact Method Value',
    description: 'Value for the contact method (e.g., email address, URL)',
  }),
  icon: fields.select({
    label: 'Icon',
    description: 'Icon to display for this contact method',
    options: [
      { label: 'Email', value: 'mail' },
      { label: 'GitHub', value: 'github' },
      { label: 'LinkedIn', value: 'linkedin' },
      { label: 'Phone', value: 'phone' },
      { label: 'Twitter', value: 'twitter' },
      { label: 'Website', value: 'website' },
    ],
    defaultValue: 'mail',
  }),
  isActive: fields.checkbox({
    label: 'Active',
    description: 'Whether this contact method is currently active',
    defaultValue: true,
  }),
};

/**
 * Contact Method Collection Schema
 *
 * This schema defines the structure for the contact methods collection.
 * It extends the base contact method schema with a title field.
 */
export const contactMethodCollectionSchema = {
  title: fields.slug({
    name: { label: 'Title', validation: { isRequired: true } },
  }),
  ...contactMethodSchema,
};
