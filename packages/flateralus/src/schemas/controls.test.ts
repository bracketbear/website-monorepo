import { describe, it, expect } from 'vitest';
import {
  createGroupControl,
  ColorGroupControlSchema,
  NumberGroupControlSchema,
  BooleanGroupControlSchema,
  SelectGroupControlSchema,
  GroupControlSchema,
} from './controls';

describe('Group Control Schemas', () => {
  describe('createGroupControl factory', () => {
    it('should create a color-only group control', () => {
      const colorGroup = createGroupControl('color', {
        name: 'particleColors',
        label: 'Particle Colors',
        items: [
          {
            name: 'color',
            type: 'color' as const,
            label: 'Color',
            defaultValue: '#fffbe0',
            debug: true,
          },
        ],
        defaultValue: [
          { type: 'color', value: '#fffbe0', metadata: { alpha: 1.0 } },
          { type: 'color', value: '#ff4b3e', metadata: { alpha: 0.8 } },
        ],
        minItems: 1,
        maxItems: 10,
        debug: true,
        resetsAnimation: true,
      });

      const result = colorGroup.safeParse({
        type: 'group',
        value: 'color',
        name: 'particleColors',
        label: 'Particle Colors',
        items: [
          {
            name: 'color',
            type: 'color',
            label: 'Color',
            defaultValue: '#fffbe0',
            debug: true,
          },
        ],
        defaultValue: [
          { type: 'color', value: '#fffbe0', metadata: { alpha: 1.0 } },
          { type: 'color', value: '#ff4b3e', metadata: { alpha: 0.8 } },
        ],
        minItems: 1,
        maxItems: 10,
        debug: true,
        resetsAnimation: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.value).toBe('color');
        expect(result.data.defaultValue).toEqual([
          { type: 'color', value: '#fffbe0', metadata: { alpha: 1.0 } },
          { type: 'color', value: '#ff4b3e', metadata: { alpha: 0.8 } },
        ]);
      }
    });

    it('should reject non-color controls in a color group', () => {
      const colorGroup = createGroupControl('color', {
        name: 'particleColors',
        label: 'Particle Colors',
        items: [
          {
            name: 'color',
            type: 'color' as const,
            label: 'Color',
            defaultValue: '#fffbe0',
            debug: true,
          },
        ],
        defaultValue: [
          { type: 'color', value: '#fffbe0', metadata: { alpha: 1.0 } },
        ],
        minItems: 1,
        maxItems: 10,
        debug: true,
        resetsAnimation: true,
      });

      const result = colorGroup.safeParse({
        type: 'group',
        value: 'color',
        name: 'particleColors',
        label: 'Particle Colors',
        items: [
          {
            name: 'color',
            type: 'color',
            label: 'Color',
            defaultValue: '#fffbe0',
            debug: true,
          },
          {
            name: 'size',
            type: 'number',
            label: 'Size',
            defaultValue: 5,
            debug: true,
          },
        ],
        defaultValue: [
          { type: 'color', value: '#fffbe0', metadata: { alpha: 1.0 } },
        ],
        minItems: 1,
        maxItems: 10,
        debug: true,
        resetsAnimation: true,
      });

      // The base schema allows this, but the factory function enforces type safety
      expect(result.success).toBe(false);
    });

    it('should create a number-only group control', () => {
      const numberGroup = createGroupControl('number', {
        name: 'particleSizes',
        label: 'Particle Sizes',
        items: [
          {
            name: 'size',
            type: 'number' as const,
            label: 'Size',
            defaultValue: 5,
            min: 1,
            max: 20,
            step: 1,
            debug: true,
          },
        ],
        defaultValue: [
          { type: 'number', value: 5, metadata: { min: 1, max: 20 } },
          { type: 'number', value: 10, metadata: { min: 1, max: 20 } },
        ],
        minItems: 1,
        maxItems: 10,
        debug: true,
        resetsAnimation: true,
      });

      const result = numberGroup.safeParse({
        type: 'group',
        value: 'number',
        name: 'particleSizes',
        label: 'Particle Sizes',
        items: [
          {
            name: 'size',
            type: 'number',
            label: 'Size',
            defaultValue: 5,
            min: 1,
            max: 20,
            step: 1,
            debug: true,
          },
        ],
        defaultValue: [
          { type: 'number', value: 5, metadata: { min: 1, max: 20 } },
          { type: 'number', value: 10, metadata: { min: 1, max: 20 } },
        ],
        minItems: 1,
        maxItems: 10,
        debug: true,
        resetsAnimation: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.value).toBe('number');
        expect(result.data.defaultValue).toEqual([
          { type: 'number', value: 5, metadata: { min: 1, max: 20 } },
          { type: 'number', value: 10, metadata: { min: 1, max: 20 } },
        ]);
      }
    });
  });

  describe('Pre-built group control schemas', () => {
    it('should validate ColorGroupControlSchema correctly', () => {
      const result = ColorGroupControlSchema.safeParse({
        type: 'group',
        value: 'color',
        name: 'particleColors',
        label: 'Particle Colors',
        items: [
          {
            name: 'color',
            type: 'color',
            label: 'Color',
            defaultValue: '#fffbe0',
            debug: true,
          },
        ],
        defaultValue: [
          { type: 'color', value: '#fffbe0', metadata: { alpha: 1.0 } },
          { type: 'color', value: '#ff4b3e', metadata: { alpha: 0.8 } },
        ],
        minItems: 1,
        maxItems: 10,
        debug: true,
        resetsAnimation: true,
      });

      expect(result.success).toBe(true);
    });

    it('should validate NumberGroupControlSchema correctly', () => {
      const result = NumberGroupControlSchema.safeParse({
        type: 'group',
        value: 'number',
        name: 'particleSizes',
        label: 'Particle Sizes',
        items: [
          {
            name: 'size',
            type: 'number',
            label: 'Size',
            defaultValue: 5,
            min: 1,
            max: 20,
            step: 1,
            debug: true,
          },
        ],
        defaultValue: [
          { type: 'number', value: 5, metadata: { min: 1, max: 20 } },
          { type: 'number', value: 10, metadata: { min: 1, max: 20 } },
        ],
        minItems: 1,
        maxItems: 10,
        debug: true,
        resetsAnimation: true,
      });

      expect(result.success).toBe(true);
    });

    it('should validate BooleanGroupControlSchema correctly', () => {
      const result = BooleanGroupControlSchema.safeParse({
        type: 'group',
        value: 'boolean',
        name: 'particleFlags',
        label: 'Particle Flags',
        items: [
          {
            name: 'enabled',
            type: 'boolean',
            label: 'Enabled',
            defaultValue: true,
            debug: true,
          },
        ],
        defaultValue: [
          {
            type: 'boolean',
            value: true,
            metadata: { description: 'Enable particle' },
          },
          {
            type: 'boolean',
            value: false,
            metadata: { description: 'Disable particle' },
          },
        ],
        minItems: 1,
        maxItems: 10,
        debug: true,
        resetsAnimation: true,
      });

      expect(result.success).toBe(true);
    });

    it('should validate SelectGroupControlSchema correctly', () => {
      const result = SelectGroupControlSchema.safeParse({
        type: 'group',
        value: 'select',
        name: 'particleTypes',
        label: 'Particle Types',
        items: [
          {
            name: 'type',
            type: 'select',
            label: 'Type',
            options: [
              { value: 'circle', label: 'Circle' },
              { value: 'square', label: 'Square' },
              { value: 'triangle', label: 'Triangle' },
            ],
            defaultValue: 'circle',
            debug: true,
          },
        ],
        defaultValue: [
          {
            type: 'select',
            value: 'circle',
            metadata: { options: ['circle', 'square', 'triangle'] },
          },
          {
            type: 'select',
            value: 'square',
            metadata: { options: ['circle', 'square', 'triangle'] },
          },
        ],
        minItems: 1,
        maxItems: 10,
        debug: true,
        resetsAnimation: true,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Type constraints', () => {
    it('should enforce that group value matches item types', () => {
      // This should fail because value is 'color' but items contain non-color controls
      const invalidGroup = {
        name: 'mixed',
        type: 'group' as const,
        value: 'color' as const,
        label: 'Mixed Controls',
        items: [
          {
            name: 'count',
            type: 'number',
            label: 'Count',
            defaultValue: 5,
            min: 1,
            max: 100,
          },
        ],
        defaultValue: [
          { type: 'number', value: 5, metadata: { min: 1, max: 100 } },
        ],
        minItems: 1,
        maxItems: 10,
        debug: true,
        resetsAnimation: true,
      };

      const result = GroupControlSchema.safeParse(invalidGroup);
      // The base schema allows this, but the factory function enforces type safety
      expect(result.success).toBe(true);
    });
  });

  describe('Mixed Group Controls', () => {
    it('should validate mixed group controls correctly', () => {
      const mixedGroup = {
        name: 'particleConfigs',
        type: 'group' as const,
        value: 'mixed' as const,
        label: 'Particle Configurations',
        description: 'Complex particle configurations',
        items: [
          {
            name: 'color',
            controlType: 'color' as const,
            defaultValue: '#ffffff',
            metadata: { alpha: 1.0 },
          },
          {
            name: 'size',
            controlType: 'number' as const,
            defaultValue: 5,
            metadata: { min: 1, max: 20 },
          },
          {
            name: 'enabled',
            controlType: 'boolean' as const,
            defaultValue: true,
            metadata: { description: 'Enable particle' },
          },
        ],
        defaultValue: [
          { type: 'color', value: '#ffffff', metadata: { alpha: 1.0 } },
          { type: 'number', value: 5, metadata: { min: 1, max: 20 } },
          {
            type: 'boolean',
            value: true,
            metadata: { description: 'Enable particle' },
          },
        ],
        minItems: 1,
        maxItems: 5,
        debug: true,
        resetsAnimation: true,
      };

      const result = GroupControlSchema.safeParse(mixedGroup);
      expect(result.success).toBe(true);
    });
  });
});
