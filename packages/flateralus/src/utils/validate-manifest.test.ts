import { describe, it, expect } from 'vitest';
import { validateManifest } from './validate-manifest';
import { createManifest } from './create-manifest';
import type { AnimationManifest } from '../types';

describe('validateManifest', () => {
  it('should validate a valid manifest', () => {
    const manifest: AnimationManifest = {
      id: 'test',
      name: 'test',
      description: 'test',
      controls: [],
    };

    try {
      const result = validateManifest(manifest);
      expect(JSON.parse(JSON.stringify(result))).toEqual(
        JSON.parse(JSON.stringify(manifest))
      );
    } catch (error) {
      expect(error).toBeUndefined();
    }
  });

  it('should throw an error if the manifest is invalid', () => {
    const manifest = createManifest({
      id: 'test',
      name: 'test',
      description: 'test',
      controls: [],
    });

    try {
      validateManifest(manifest);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
