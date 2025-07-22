import type { DeepReadonly } from '@bracketbear/core/utils';
import type { AnimationManifest } from '../types';

/**
 * Create a manifest for an animation. Helps with type inference.
 *
 * @param manifest - The manifest to create.
 * @returns A readonly manifest.
 */
export function createManifest<const T extends AnimationManifest>(
  manifest: T
): DeepReadonly<T> {
  return Object.freeze(manifest) as DeepReadonly<T>;
}
