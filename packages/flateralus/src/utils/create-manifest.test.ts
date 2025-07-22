import { describe, it, expect } from 'vitest';
import { createManifest } from './create-manifest';

// Example manifest type
const manifest = createManifest({
  id: 'test',
  name: 'Test Animation',
  description: 'A test animation manifest',
  controls: [
    {
      name: 'foo',
      type: 'number',
      label: 'Foo',
      defaultValue: 1,
      debug: false,
    },
    {
      name: 'bar',
      type: 'boolean',
      label: 'Bar',
      defaultValue: true,
      debug: true,
    },
    {
      name: 'baz',
      type: 'color',
      label: 'Baz',
      defaultValue: '#fff',
      debug: false,
    },
  ] as const,
} as const);

describe('createManifest', () => {
  it('returns a deeply readonly object', () => {
    expect(Object.isFrozen(manifest)).toBe(true);
    expect(() => {
      // @ts-expect-error: should not allow mutation
      manifest.id = 'nope';
    }).toThrowError();
  });

  it('preserves literal types for manifest properties', () => {
    // Type-level test: should infer literal types
    type M = typeof manifest;
    // @ts-expect-error: id should be "test"
    const _wrongId: Extract<M['id'], 'nope'> = 'nope';
    // Should allow 'test'
    const correctId: Extract<M['id'], 'test'> = 'test';
    expect(correctId).toBe('test');
  });

  it('preserves literal types for controls', () => {
    // Type-level test: should infer literal types for controls
    type Controls = typeof manifest.controls;
    // Type assertion: Controls should be readonly
    type _AssertReadonly = Controls extends readonly any[] ? true : false;
    const isReadonly: _AssertReadonly = true;
    expect(isReadonly).toBe(true);
    // Should allow reading
    expect(manifest.controls[0].name).toBe('foo');
  });

  it('works with various manifest shapes', () => {
    const m2 = createManifest({
      id: 'other',
      name: 'Other',
      description: 'Other manifest',
      controls: [] as const,
    } as const);
    expect(m2.id).toBe('other');
    expect(Array.isArray(m2.controls)).toBe(true);
  });
});
