/** @todo Unused?  */
export const siteCollectionPath = (collectionName: string) =>
  `content/sites/bracketbear/${collectionName}/*` as const;

/**
 * Bracket Bear site collections
 *
 * These collections are specific to the Bracket Bear website and contain
 * content that is only relevant to this site.
 */

export const bracketbearCollections = {
  // Add any collections specific to Bracket Bear here
  // For now, we don't need any collections, just singletons for pages
};
