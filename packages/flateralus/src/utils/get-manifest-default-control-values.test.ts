import { describe, it, expect } from 'vitest';
import { getManifestDefaultControlValues } from './get-manifest-default-control-values';
import { createManifest } from './create-manifest';
import type { AnimationManifest } from '../types';

describe('getDefaultControlValues', () => {
  it('should return the default control values', () => {
    const manifest = {
      id: 'test',
      name: 'test',
      description: 'test',
      controls: [],
    };

    const defaultValues = getManifestDefaultControlValues(manifest);
    expect(defaultValues).toEqual({});
  });

  it('should return the default control values for a manifest with controls', () => {
    const manifest = createManifest({
      id: 'test',
      name: 'test',
      description: 'test',
      controls: [
        {
          name: 'test',
          type: 'number',
          label: 'Test',
          debug: false,
          defaultValue: 0,
          description: 'Test description',
          resetsAnimation: false,
        },
      ],
    });

    const defaultValues = getManifestDefaultControlValues(manifest);
    expect(defaultValues).toEqual({
      test: 0,
    });
  });

  it('should return the default control values for a manifest with multiple controls and initial values', () => {
    const manifest = createManifest({
      id: 'test',
      name: 'test',
      description: 'test',
      controls: [
        {
          name: 'test',
          type: 'number',
          label: 'Test',
          debug: false,
          defaultValue: 0,
          description: 'Test description',
          resetsAnimation: false,
        },
        {
          name: 'test2',
          type: 'number',
          label: 'Test 2',
          debug: false,
          defaultValue: 1,
          description: 'Test 2 description',
          resetsAnimation: false,
        },
      ],
    });

    const defaultValues = getManifestDefaultControlValues(manifest);
    expect(defaultValues).toEqual({
      test: 0,
      test2: 1,
    });
  });

  it('should return the default control values for a manifest with all control types', () => {
    const manifest: AnimationManifest = createManifest({
      id: 'test',
      name: 'test',
      description: 'test',
      controls: [
        {
          name: 'test',
          type: 'color',
          label: 'Test',
          debug: false,
          defaultValue: '#000000',
        },
        {
          name: 'test2',
          type: 'number',
          label: 'Test 2',
          debug: false,
          defaultValue: 1,
        },
        {
          name: 'test3',
          type: 'boolean',
          label: 'Test 3',
          debug: false,
          defaultValue: false,
        },
        {
          name: 'test4',
          type: 'select',
          label: 'Test 4',
          debug: false,
          defaultValue: 'option1',
          options: [
            {
              value: 'option1',
              label: 'Option 1',
            },
            {
              value: 'option2',
              label: 'Option 2',
            },
          ],
        },
      ],
    } as const);

    const defaultValues = getManifestDefaultControlValues(manifest);
    expect(defaultValues).toEqual({
      test: '#000000',
      test2: 1,
      test3: false,
      test4: 'option1',
    });
  });
});
