import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRandomControlValues } from './randomize-controls';
import type { AnimationManifest } from '../types';
import { createManifest } from './create-manifest';

// Mock Math.random to make tests deterministic
const mockRandom = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  // Set up a predictable sequence of random values
  let counter = 0;
  mockRandom.mockImplementation(() => {
    const values = [0.1, 0.5, 0.9, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.0];
    return values[counter++ % values.length];
  });
  vi.spyOn(Math, 'random').mockImplementation(mockRandom);
});

describe('randomize-controls', () => {
  describe('getRandomControlValues', () => {
    it('should generate random values for number controls', () => {
      const manifest: AnimationManifest = {
        id: 'test',
        name: 'Test Animation',
        description: 'Test description',
        controls: [
          {
            name: 'testNumber',
            type: 'number',
            label: 'Test Number',
            description: 'A test number',
            min: 0,
            max: 100,
            step: 5,
            defaultValue: 50,
            debug: true,
          },
        ],
      };

      const result = getRandomControlValues(manifest);

      expect(result).toHaveProperty('testNumber');
      expect(typeof result.testNumber).toBe('number');
      expect(result.testNumber).toBeGreaterThanOrEqual(0);
      expect(result.testNumber).toBeLessThanOrEqual(100);
      expect((result.testNumber as number) % 5).toBe(0); // Should respect step
    });

    it('should generate random boolean values', () => {
      const manifest: AnimationManifest = {
        id: 'test',
        name: 'Test Animation',
        description: 'Test description',
        controls: [
          {
            name: 'testBoolean',
            type: 'boolean',
            label: 'Test Boolean',
            description: 'A test boolean',
            defaultValue: false,
            debug: true,
          },
        ],
      };

      const result = getRandomControlValues(manifest);

      expect(result).toHaveProperty('testBoolean');
      expect(typeof result.testBoolean).toBe('boolean');
    });

    it('should generate random hex color values', () => {
      const manifest: AnimationManifest = {
        id: 'test',
        name: 'Test Animation',
        description: 'Test description',
        controls: [
          {
            name: 'testColor',
            type: 'color',
            label: 'Test Color',
            description: 'A test color',
            defaultValue: '#ffffff',
            debug: true,
          },
        ],
      };

      const result = getRandomControlValues(manifest);

      expect(result).toHaveProperty('testColor');
      expect(typeof result.testColor).toBe('string');
      expect(result.testColor).toMatch(/^#[0-9a-f]{6}$/i); // Hex color format
    });

    it('should generate random select values from string options', () => {
      const manifest: AnimationManifest = {
        id: 'test',
        name: 'Test Animation',
        description: 'Test description',
        controls: [
          {
            name: 'testSelect',
            type: 'select',
            label: 'Test Select',
            description: 'A test select',
            options: [
              { value: 'option1', label: 'Option 1' },
              { value: 'option2', label: 'Option 2' },
              { value: 'option3', label: 'Option 3' },
            ],
            defaultValue: 'option1',
            debug: true,
          },
        ],
      };

      const result = getRandomControlValues(manifest);

      expect(result).toHaveProperty('testSelect');
      expect(typeof result.testSelect).toBe('string');
      expect(['option1', 'option2', 'option3']).toContain(result.testSelect);
    });

    it('should generate random select values from object options', () => {
      const manifest: AnimationManifest = {
        id: 'test',
        name: 'Test Animation',
        description: 'Test description',
        controls: [
          {
            name: 'testSelect',
            type: 'select',
            label: 'Test Select',
            description: 'A test select',
            options: [
              { value: 'val1', label: 'Option 1' },
              { value: 'val2', label: 'Option 2' },
            ],
            defaultValue: 'val1',
            debug: true,
          },
        ],
      };

      const result = getRandomControlValues(manifest);

      expect(result).toHaveProperty('testSelect');
      expect(typeof result.testSelect).toBe('string');
      expect(['val1', 'val2']).toContain(result.testSelect);
    });

    it('should generate random group values', () => {
      const manifest = createManifest({
        id: 'group-test',
        name: 'Group Test',
        description: 'Test group controls',
        controls: [
          {
            name: 'group',
            type: 'group',
            value: 'number',
            label: 'Number Group',
            items: [
              {
                name: 'groupNumber',
                type: 'number',
                label: 'Group Number',
                defaultValue: 0,
                min: 0,
                max: 100,
                step: 1,
                debug: false,
              },
            ],
            defaultValue: [
              { type: 'number', value: 0, metadata: { min: 0, max: 100 } },
            ],
            minItems: 1,
            maxItems: 3,
            debug: false,
          },
        ],
      });

      const result = getRandomControlValues(manifest);
      expect(result).toBeDefined();
      expect(result.group).toBeDefined();

      const groupArray = result.group as any[];
      expect(Array.isArray(groupArray)).toBe(true);
      expect(groupArray.length).toBeGreaterThanOrEqual(1);
      expect(groupArray.length).toBeLessThanOrEqual(3);

      // Check that each group item is a discriminated object with number value
      groupArray.forEach((item: any) => {
        expect(typeof item).toBe('object');
        expect(item.type).toBe('number');
        expect(typeof item.value).toBe('number');
        expect(item.value).toBeGreaterThanOrEqual(0);
        expect(item.value).toBeLessThanOrEqual(100); // Based on our randomization logic
        expect(item.metadata).toBeDefined();
      });
    });

    it('should handle empty manifest', () => {
      const manifest: AnimationManifest = {
        id: 'test',
        name: 'Test Animation',
        description: 'Test description',
        controls: [],
      };

      const result = getRandomControlValues(manifest);

      expect(result).toEqual({});
    });

    it('should handle manifest with mixed control types', () => {
      const manifest: AnimationManifest = {
        id: 'test',
        name: 'Test Animation',
        description: 'Test description',
        controls: [
          {
            name: 'number1',
            type: 'number',
            label: 'Number 1',
            min: 0,
            max: 10,
            step: 1,
            defaultValue: 5,
            debug: true,
          },
          {
            name: 'boolean1',
            type: 'boolean',
            label: 'Boolean 1',
            defaultValue: false,
            debug: true,
          },
          {
            name: 'color1',
            type: 'color',
            label: 'Color 1',
            defaultValue: '#ffffff',
            debug: true,
          },
          {
            name: 'select1',
            type: 'select',
            label: 'Select 1',
            options: [
              { value: 'a', label: 'a' },
              { value: 'b', label: 'b' },
              { value: 'c', label: 'c' },
            ],
            defaultValue: 'a',
            debug: true,
          },
        ],
      };

      const result = getRandomControlValues(manifest);

      expect(result).toHaveProperty('number1');
      expect(result).toHaveProperty('boolean1');
      expect(result).toHaveProperty('color1');
      expect(result).toHaveProperty('select1');

      expect(typeof result.number1).toBe('number');
      expect(typeof result.boolean1).toBe('boolean');
      expect(typeof result.color1).toBe('string');
      expect(typeof result.select1).toBe('string');
    });

    it('should handle controls with undefined step values', () => {
      const manifest: AnimationManifest = {
        id: 'test',
        name: 'Test Animation',
        description: 'Test description',
        controls: [
          {
            name: 'testNumber',
            type: 'number',
            label: 'Test Number',
            min: 0,
            max: 10,
            defaultValue: 5,
            debug: true,
          },
        ],
      };

      const result = getRandomControlValues(manifest);

      expect(result).toHaveProperty('testNumber');
      expect(typeof result.testNumber).toBe('number');
      expect(result.testNumber).toBeGreaterThanOrEqual(0);
      expect(result.testNumber).toBeLessThanOrEqual(10);
    });

    it('should handle group controls with undefined minItems/maxItems', () => {
      const manifest: AnimationManifest = {
        id: 'test',
        name: 'Test Animation',
        description: 'Test description',
        controls: [
          {
            name: 'testGroup',
            type: 'group',
            value: 'number',
            label: 'Test Group',
            items: [
              {
                name: 'item1',
                type: 'number',
                label: 'Item 1',
                min: 0,
                max: 10,
                defaultValue: 5,
                debug: true,
              },
            ],
            defaultValue: [],
            debug: true,
          },
        ],
      };

      const result = getRandomControlValues(manifest);

      expect(result).toHaveProperty('testGroup');
      expect(Array.isArray(result.testGroup)).toBe(true);
      const groupArray = result.testGroup as any;
      expect(groupArray.length).toBeGreaterThan(0);
    });

    it('should handle select controls with empty options', () => {
      const manifest: AnimationManifest = {
        id: 'test',
        name: 'Test Animation',
        description: 'Test description',
        controls: [
          {
            name: 'testSelect',
            type: 'select',
            label: 'Test Select',
            options: [],
            defaultValue: '',
            debug: true,
          },
        ],
      };

      const result = getRandomControlValues(manifest);

      expect(result).toHaveProperty('testSelect');
      expect(result.testSelect).toBe('');
    });

    it('should handle group controls with empty items', () => {
      const manifest: AnimationManifest = {
        id: 'test',
        name: 'Test Animation',
        description: 'Test description',
        controls: [
          {
            name: 'testGroup',
            type: 'group',
            value: 'number',
            label: 'Test Group',
            items: [],
            defaultValue: [],
            debug: true,
          },
        ],
      };

      const result = getRandomControlValues(manifest);

      expect(result).toHaveProperty('testGroup');
      expect(Array.isArray(result.testGroup)).toBe(true);
      expect((result.testGroup as unknown[]).length).toBe(1);
    });

    it('should generate different values on multiple calls', () => {
      const manifest: AnimationManifest = {
        id: 'test',
        name: 'Test Animation',
        description: 'Test description',
        controls: [
          {
            name: 'testNumber',
            type: 'number',
            label: 'Test Number',
            min: 0,
            max: 100,
            step: 1,
            defaultValue: 50,
            debug: true,
          },
        ],
      };

      // Reset mock to use different random values
      let counter = 0;
      mockRandom.mockImplementation(() => {
        const values = [0.1, 0.5, 0.9, 0.2, 0.7];
        return values[counter++ % values.length];
      });

      const result1 = getRandomControlValues(manifest);
      const result2 = getRandomControlValues(manifest);

      // With our mock, we should get different values
      expect(result1.testNumber).not.toBe(result2.testNumber);
    });
  });
});
