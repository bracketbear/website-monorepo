import { collection, fields } from '@keystatic/core';

/**
 * Path creator for content collections
 *
 * @param collectionName - The name of the collection directory
 * @returns A path with the required wildcard for Keystatic collections
 */
const contentPath = (collectionName: string) =>
  `content/${collectionName}/*` as const;

/**
 * General content collections configuration
 *
 * These collections manage blog posts, static pages, and services
 */
export const contentCollections = {
  blog: collection({
    label: 'Blog Posts',
    slugField: 'title',
    format: 'json',
    path: contentPath('blog'),
    schema: {
      title: fields.slug({
        name: { label: 'Title', validation: { isRequired: true } },
      }),
      excerpt: fields.text({ label: 'Excerpt', multiline: true }),
      content: fields.text({
        label: 'Content',
        multiline: true,
        description: 'Blog content (markdown supported)',
      }),
      publishedAt: fields.date({ label: 'Published Date' }),
      isPublished: fields.checkbox({
        label: 'Is Published?',
        defaultValue: false,
      }),
      tags: fields.array(fields.text({ label: 'Tag' }), {
        label: 'Tags',
        itemLabel: (props) => props.value || 'New Tag',
      }),
      featuredImage: fields.image({ label: 'Featured Image' }),
    },
  }),

  pages: collection({
    label: 'Pages',
    slugField: 'title',
    format: 'json',
    path: contentPath('pages'),
    schema: {
      title: fields.slug({
        name: { label: 'Title', validation: { isRequired: true } },
      }),
      content: fields.text({
        label: 'Content',
        multiline: true,
        description: 'Page content (markdown supported)',
      }),
      metaDescription: fields.text({ label: 'Meta Description' }),
      isPublished: fields.checkbox({
        label: 'Is Published?',
        defaultValue: true,
      }),
    },
  }),

  services: collection({
    label: 'Services',
    slugField: 'title',
    format: 'json',
    path: contentPath('services'),
    schema: {
      title: fields.slug({
        name: { label: 'Title', validation: { isRequired: true } },
      }),
      description: fields.text({
        label: 'Description',
        multiline: true,
      }),
      icon: fields.text({
        label: 'Icon',
        description: 'Icon name or identifier',
      }),
      isFeatured: fields.checkbox({
        label: 'Is Featured?',
        defaultValue: false,
      }),
    },
  }),
};
