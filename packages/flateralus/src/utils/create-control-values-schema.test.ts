import { describe, it, expect } from 'vitest';
import { createControlValuesSchema } from './create-control-values-schema';
import { createManifest } from './create-manifest';
import type { AnimationManifest } from '../types';

const manifest = createManifest({
  id: 'test',
  name: 'Test Animation',
  description: 'A test animation manifest',
  controls: [
    {
      name: 'num',
      type: 'number',
      label: 'Num',
      defaultValue: 5,
      min: 0,
      max: 10,
      debug: false,
    },
    {
      name: 'flag',
      type: 'boolean',
      label: 'Flag',
      defaultValue: true,
      debug: false,
    },
    {
      name: 'color',
      type: 'color',
      label: 'Color',
      defaultValue: '#fff',
      debug: false,
    },
    {
      name: 'choice',
      type: 'select',
      label: 'Choice',
      defaultValue: 'a',
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ],
      debug: false,
    },
    {
      name: 'group',
      type: 'group' as const,
      label: 'Group',
      defaultValue: [],
      items: [
        {
          name: 'gnum',
          type: 'number',
          label: 'GNum',
          defaultValue: 1,
          min: 0,
          max: 2,
          debug: false,
        },
        {
          name: 'gflag',
          type: 'boolean',
          label: 'GFlag',
          defaultValue: false,
          debug: false,
        },
      ],
      minItems: 1,
      maxItems: 2,
      debug: false,
    },
    {
      name: 'nestedGroup',
      type: 'group' as const,
      label: 'NestedGroup',
      defaultValue: [],
      items: [
        {
          name: 'inner',
          type: 'group' as const,
          label: 'Inner',
          defaultValue: [],
          items: [
            {
              name: 'x',
              type: 'number',
              label: 'X',
              defaultValue: 0,
              min: 0,
              max: 1,
              debug: false,
            },
          ],
          minItems: 1,
          maxItems: 1,
          debug: false,
        },
      ],
      minItems: 1,
      maxItems: 1,
      debug: false,
    },
  ],
} as AnimationManifest);

describe('createControlValuesSchema', () => {
  const schema = createControlValuesSchema(manifest);

  const valid = {
    num: 7,
    flag: false,
    color: '#123456',
    choice: 'b',
    group: [{ gnum: 2, gflag: true }],
    nestedGroup: [{ inner: [{ x: 1 }] }],
  };

  it('validates correct values', () => {
    const result = schema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects invalid number (out of range)', () => {
    const invalid = { ...valid, num: 20 };
    const result = schema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects invalid select value', () => {
    const invalid = { ...valid, choice: 'z' };
    const result = schema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects group with too few items', () => {
    const invalid = { ...valid, group: [] };
    const result = schema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects group with too many items', () => {
    const invalid = {
      ...valid,
      group: [
        { gnum: 1, gflag: true },
        { gnum: 2, gflag: false },
        { gnum: 0, gflag: false },
      ],
    };
    const result = schema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects nested group with invalid inner value', () => {
    const invalid = {
      ...valid,
      nestedGroup: [{ inner: [{ x: 2 }] }],
    };
    const result = schema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
