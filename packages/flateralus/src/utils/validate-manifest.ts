import type { AnimationManifest } from '../types';
import { manifestSchema } from '../schemas/manifest';

/**
 * Validate a manifest.
 *
 * @param manifest - The manifest to validate.
 * @throws {Error} - If the manifest is invalid.
 * @returns The validated manifest.
 */
export const validateManifest = (manifest: AnimationManifest) => {
  const result = manifestSchema.safeParse(manifest);

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
};
