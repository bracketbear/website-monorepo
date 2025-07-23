import {
  getCollection,
  type AnyEntryMap,
  type CollectionEntry,
} from 'astro:content';

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
