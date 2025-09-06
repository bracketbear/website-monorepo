import {
  getCollection,
  type AnyEntryMap,
  type CollectionEntry,
} from 'astro:content';
import type { PortfolioAboutPageData } from '@bracketbear/astro-content';
import { renderMarkdoc } from './markdoc-renderer';

type GetCollectionParams<
  C extends keyof AnyEntryMap,
  E extends CollectionEntry<C>,
> = [C, (entry: CollectionEntry<C>) => entry is E];
type CollectionName = GetCollectionParams<
  keyof AnyEntryMap,
  CollectionEntry<keyof AnyEntryMap>
>[0];

/**
 * Get a collection and return it as a keyed object for efficient lookups.
 */
export async function getKeyedCollection<T extends CollectionName>(
  key: T
): Promise<Record<string, CollectionEntry<T>>> {
  const collection = await getCollection(key);
  const keyedCollection: Record<string, CollectionEntry<T>> = {};
  collection.forEach((entry) => {
    const entryKey = entry.id;
    keyedCollection[entryKey] = entry;
  });
  return keyedCollection;
}

/**
 * Get the about page data from the CMS
 */
export async function getAboutPageData(): Promise<PortfolioAboutPageData | null> {
  try {
    const collection = await getCollection('portfolioAboutPage');
    console.log(
      'Available entries:',
      collection.map((entry) => entry.id)
    );
    const aboutPage = collection.find((entry) => entry.id === 'about');
    console.log('Found about page:', aboutPage ? 'yes' : 'no');
    if (aboutPage) {
      console.log('About page data keys:', Object.keys(aboutPage.data));
    }

    return aboutPage ? aboutPage.data : null;
  } catch (error) {
    console.warn('Failed to load about page data:', error);
    return null;
  }
}

// Re-export renderMarkdoc for convenience
export { renderMarkdoc };
