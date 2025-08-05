import { collection } from '@keystatic/core';
import { contactMethodCollectionSchema } from '../../schemas/contact-method';

const siteCollectionPath = (collectionName: string) =>
  `content/sites/portfolio/${collectionName}/*` as const;

/**
 * Portfolio site collections
 *
 * These collections are specific to the portfolio site and contain
 * content that is only relevant to this site.
 */

export const portfolioCollections = {
  portfolioContactMethods: collection({
    label: 'Portfolio Contact Methods',
    slugField: 'title',
    format: 'json',
    path: siteCollectionPath('contact-methods'),
    schema: contactMethodCollectionSchema,
  }),
};
