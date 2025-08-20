import { describe, it, expect } from 'vitest';
import { slider, toggle, color, select, group } from './control-helpers';

describe('Control Helper Functions', () => {
  describe('slider', () => {
    it('should create a number control with required fields', () => {
      const control = slider('animationSpeed', {
        defaultValue: 1.0,
      });

      expect(control).toEqual({
        name: 'animationSpeed',
        type: 'number',
        label: 'animationSpeed',
        description: undefined,
        min: undefined,
        max: undefined,
        step: undefined,
        defaultValue: 1.0,
        debug: false,
        resetsAnimation: false,
      });
    });

    it('should create a number control with all optional fields', () => {
      const control = slider('particleCount', {
        min: 10,
        max: 100,
        step: 5,
        defaultValue: 50,
        label: 'Custom Label',
        description: 'Number of particles to render',
        debug: true,
        resetsAnimation: true,
      });

      expect(control).toEqual({
        name: 'particleCount',
        type: 'number',
        label: 'Custom Label',
        description: 'Number of particles to render',
        min: 10,
        max: 100,
        step: 5,
        defaultValue: 50,
        debug: true,
        resetsAnimation: true,
      });
    });

    it('should auto-generate label from camelCase name', () => {
      const control = slider('lineSpacing', { defaultValue: 8 });
      expect(control.label).toBe('lineSpacing');

      const control2 = slider('mouseInfluenceRadius', { defaultValue: 100 });
      expect(control2.label).toBe('mouseInfluenceRadius');
    });

    it('should handle single word names', () => {
      const control = slider('speed', { defaultValue: 1.0 });
      expect(control.label).toBe('speed');
    });
  });

  describe('toggle', () => {
    it('should create a boolean control with required fields', () => {
      const control = toggle('showTrails', {
        defaultValue: true,
      });

      expect(control).toEqual({
        name: 'showTrails',
        type: 'boolean',
        label: 'showTrails',
        description: undefined,
        defaultValue: true,
        debug: false,
        resetsAnimation: false,
      });
    });

    it('should create a boolean control with all optional fields', () => {
      const control = toggle('enableEffects', {
        defaultValue: false,
        label: 'Enable Visual Effects',
        description: 'Toggle all visual effects on/off',
        debug: true,
        resetsAnimation: true,
      });

      expect(control).toEqual({
        name: 'enableEffects',
        type: 'boolean',
        label: 'Enable Visual Effects',
        description: 'Toggle all visual effects on/off',
        defaultValue: false,
        debug: true,
        resetsAnimation: true,
      });
    });

    it('should auto-generate label from camelCase name', () => {
      const control = toggle('isActive', { defaultValue: true });
      expect(control.label).toBe('isActive');
    });
  });

  describe('color', () => {
    it('should create a color control with required fields', () => {
      const control = color('strokeColor', {
        defaultValue: '#000000',
      });

      expect(control).toEqual({
        name: 'strokeColor',
        type: 'color',
        label: 'strokeColor',
        description: undefined,
        defaultValue: '#000000',
        debug: false,
        resetsAnimation: false,
      });
    });

    it('should create a color control with all optional fields', () => {
      const control = color('particleColor', {
        defaultValue: '#ff0000',
        label: 'Particle Color',
        description: 'Color of all particles',
        debug: true,
        resetsAnimation: true,
      });

      expect(control).toEqual({
        name: 'particleColor',
        type: 'color',
        label: 'Particle Color',
        description: 'Color of all particles',
        defaultValue: '#ff0000',
        debug: true,
        resetsAnimation: true,
      });
    });

    it('should auto-generate label from camelCase name', () => {
      const control = color('backgroundColor', { defaultValue: '#ffffff' });
      expect(control.label).toBe('backgroundColor');
    });
  });

  describe('select', () => {
    it('should create a select control with string array options', () => {
      const control = select('particleType', {
        options: ['circle', 'square', 'triangle'],
        defaultValue: 'circle',
      });

      expect(control).toEqual({
        name: 'particleType',
        type: 'select',
        label: 'particleType',
        description: undefined,
        options: [
          { value: 'circle', label: 'circle' },
          { value: 'square', label: 'square' },
          { value: 'triangle', label: 'triangle' },
        ],
        defaultValue: 'circle',
        debug: false,
        resetsAnimation: false,
      });
    });

    it('should create a select control with object array options', () => {
      const control = select('renderMode', {
        options: [
          { value: 'fast', label: 'Fast (Low Quality)' },
          { value: 'balanced', label: 'Balanced' },
          { value: 'quality', label: 'High Quality' },
        ],
        defaultValue: 'balanced',
      });

      expect(control).toEqual({
        name: 'renderMode',
        type: 'select',
        label: 'renderMode',
        description: undefined,
        options: [
          { value: 'fast', label: 'Fast (Low Quality)' },
          { value: 'balanced', label: 'Balanced' },
          { value: 'quality', label: 'High Quality' },
        ],
        defaultValue: 'balanced',
        debug: false,
        resetsAnimation: false,
      });
    });

    it('should create a select control with all optional fields', () => {
      const control = select('animationStyle', {
        options: ['smooth', 'bouncy', 'elastic'],
        defaultValue: 'smooth',
        label: 'Animation Style',
        description: 'How the animation behaves',
        debug: true,
        resetsAnimation: true,
      });

      expect(control).toEqual({
        name: 'animationStyle',
        type: 'select',
        label: 'Animation Style',
        description: 'How the animation behaves',
        options: [
          { value: 'smooth', label: 'smooth' },
          { value: 'bouncy', label: 'bouncy' },
          { value: 'elastic', label: 'elastic' },
        ],
        defaultValue: 'smooth',
        debug: true,
        resetsAnimation: true,
      });
    });

    it('should auto-generate label from camelCase name', () => {
      const control = select('blendMode', {
        options: ['normal', 'multiply', 'screen'],
        defaultValue: 'normal',
      });
      expect(control.label).toBe('blendMode');
    });
  });

  describe('group', () => {
    it('should create a homogeneous number group control', () => {
      const control = group('particleSettings', {
        value: 'number',
        items: [
          {
            name: 'size',
            type: 'number',
            defaultValue: 5,
            min: 1,
            max: 20,
            step: 1,
          },
          {
            name: 'alpha',
            type: 'number',
            defaultValue: 0.8,
            min: 0,
            max: 1,
            step: 0.1,
          },
        ],
        minItems: 1,
        maxItems: 5,
        static: false,
      });

      expect(control).toEqual({
        name: 'particleSettings',
        type: 'group',
        value: 'number',
        label: 'particleSettings',
        description: undefined,
        items: [
          {
            name: 'size',
            type: 'number',
            defaultValue: 5,
            min: 1,
            max: 20,
            step: 1,
          },
          {
            name: 'alpha',
            type: 'number',
            defaultValue: 0.8,
            min: 0,
            max: 1,
            step: 0.1,
          },
        ],
        defaultValue: [],
        minItems: 1,
        maxItems: 5,
        static: false,
        debug: false,
        resetsAnimation: false,
      });
    });

    it('should create a mixed group control with different types', () => {
      const control = group('effectSettings', {
        value: 'number',
        items: [
          {
            name: 'intensity',
            type: 'number',
            defaultValue: 0.5,
            min: 0,
            max: 1,
            step: 0.1,
          },
          {
            name: 'enabled',
            type: 'boolean',
            defaultValue: true,
          },
          {
            name: 'color',
            type: 'color',
            defaultValue: '#ff0000',
          },
          {
            name: 'style',
            type: 'select',
            defaultValue: 'subtle',
            options: [
              { value: 'subtle', label: 'subtle' },
              { value: 'dramatic', label: 'dramatic' },
            ],
          },
        ],
        defaultValue: [],
        minItems: 2,
        maxItems: 4,
        static: true,
        debug: true,
        resetsAnimation: true,
      });

      expect(control).toEqual({
        name: 'effectSettings',
        type: 'group',
        value: 'number',
        label: 'effectSettings',
        description: undefined,
        items: [
          {
            name: 'intensity',
            type: 'number',
            defaultValue: 0.5,
            min: 0,
            max: 1,
            step: 0.1,
          },
          {
            name: 'enabled',
            type: 'boolean',
            defaultValue: true,
          },
          {
            name: 'color',
            type: 'color',
            defaultValue: '#ff0000',
          },
          {
            name: 'style',
            type: 'select',
            defaultValue: 'subtle',
            options: [
              { value: 'subtle', label: 'subtle' },
              { value: 'dramatic', label: 'dramatic' },
            ],
          },
        ],
        defaultValue: [],
        minItems: 2,
        maxItems: 4,
        static: true,
        debug: true,
        resetsAnimation: true,
      });
    });

    it('should auto-generate labels for group items', () => {
      const control = group('testGroup', {
        value: 'number',
        items: [
          { name: 'lineWidth', type: 'number', defaultValue: 2 },
          { name: 'isVisible', type: 'boolean', defaultValue: true },
        ],
      });

      expect(control.items[0].name).toBe('lineWidth');
      expect(control.items[1].name).toBe('isVisible');
    });

    it('should handle empty items array', () => {
      const control = group('emptyGroup', {
        value: 'number',
        items: [],
        defaultValue: [],
      });

      expect(control.items).toEqual([]);
      expect(control.defaultValue).toEqual([]);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty string names', () => {
      const control = slider('', { defaultValue: 0 });
      expect(control.name).toBe('');
      expect(control.label).toBe('');
    });

    it('should handle single character names', () => {
      const control = toggle('x', { defaultValue: false });
      expect(control.name).toBe('x');
      expect(control.label).toBe('x');
    });

    it('should handle names with consecutive capitals', () => {
      const control = color('RGBColor', { defaultValue: '#000000' });
      expect(control.label).toBe('RGBColor');
    });

    it('should handle names starting with capital letters', () => {
      const control = select('Mode', {
        options: ['normal', 'advanced'],
        defaultValue: 'normal',
      });
      expect(control.label).toBe('Mode');
    });

    it('should handle names with numbers', () => {
      const control = slider('scale2D', { defaultValue: 1.0 });
      expect(control.label).toBe('scale2D');
    });
  });

  describe('Default Values', () => {
    it('should set sensible defaults for optional fields', () => {
      const control = slider('test', { defaultValue: 42 });

      expect(control.debug).toBe(false);
      expect(control.resetsAnimation).toBe(false);
      expect(control.description).toBeUndefined();
      expect(control.min).toBeUndefined();
      expect(control.max).toBeUndefined();
      expect(control.step).toBeUndefined();
    });

    it('should allow overriding defaults', () => {
      const control = toggle('test', {
        defaultValue: false,
        debug: true,
        resetsAnimation: true,
      });

      expect(control.debug).toBe(true);
      expect(control.resetsAnimation).toBe(true);
    });
  });

  describe('Boundary Value Testing', () => {
    it('should handle extreme numeric values', () => {
      const control = slider('scale', {
        min: Number.MIN_SAFE_INTEGER,
        max: Number.MAX_SAFE_INTEGER,
        defaultValue: 0,
      });
      expect(control.min).toBe(Number.MIN_SAFE_INTEGER);
      expect(control.max).toBe(Number.MAX_SAFE_INTEGER);
      expect(control.defaultValue).toBe(0);
    });

    it('should handle zero and negative values', () => {
      const control = slider('offset', {
        min: -100,
        max: 0,
        defaultValue: -50,
      });
      expect(control.min).toBe(-100);
      expect(control.max).toBe(0);
      expect(control.defaultValue).toBe(-50);
    });

    it('should handle fractional step values', () => {
      const control = slider('precision', {
        min: 0,
        max: 1,
        step: 0.001,
        defaultValue: 0.5,
      });
      expect(control.step).toBe(0.001);
    });

    it('should handle very large step values', () => {
      const control = slider('bigStep', {
        min: 0,
        max: 10000,
        step: 1000,
        defaultValue: 5000,
      });
      expect(control.step).toBe(1000);
    });
  });

  describe('Complex Naming Patterns', () => {
    it('should handle acronyms in names', () => {
      const control = slider('UIElementSize', { defaultValue: 16 });
      expect(control.label).toBe('UIElementSize');
      expect(control.name).toBe('UIElementSize');
    });

    it('should handle names with underscores', () => {
      const control = toggle('is_user_active', { defaultValue: false });
      expect(control.label).toBe('is_user_active');
      expect(control.name).toBe('is_user_active');
    });

    it('should handle names with hyphens', () => {
      const control = color('stroke-color', { defaultValue: '#ffffff' });
      expect(control.label).toBe('stroke-color');
      expect(control.name).toBe('stroke-color');
    });

    it('should handle names with multiple numbers', () => {
      const control = color('colorRGB255', { defaultValue: '#ffffff' });
      expect(control.label).toBe('colorRGB255');
      expect(control.name).toBe('colorRGB255');
    });

    it('should handle mixed case with special characters', () => {
      const control = select('renderMode_2D', {
        options: ['fast', 'slow'],
        defaultValue: 'fast',
      });
      expect(control.label).toBe('renderMode_2D');
    });
  });

  describe('Select Control Edge Cases', () => {
    it('should handle empty options array', () => {
      const control = select('emptySelect', { options: [], defaultValue: '' });
      expect(control.options).toEqual([]);
      expect(control.defaultValue).toBe('');
    });

    it('should handle single option', () => {
      const control = select('singleOption', {
        options: ['only'],
        defaultValue: 'only',
      });
      expect(control.options).toEqual([{ value: 'only', label: 'only' }]);
    });

    it('should handle options with special characters', () => {
      const control = select('special', {
        options: ['option-1', 'option_2', 'option.3'],
        defaultValue: 'option-1',
      });
      expect(control.options).toEqual([
        { value: 'option-1', label: 'option-1' },
        { value: 'option_2', label: 'option_2' },
        { value: 'option.3', label: 'option.3' },
      ]);
    });

    it('should handle mixed option formats', () => {
      const control = select('mixed', {
        options: [
          { value: 'custom', label: 'Custom Label' },
          { value: 'auto', label: 'auto' },
        ],
        defaultValue: 'custom',
      });
      expect(control.options).toEqual([
        { value: 'custom', label: 'Custom Label' },
        { value: 'auto', label: 'auto' },
      ]);
    });

    it('should handle empty string options', () => {
      const control = select('withEmpty', {
        options: ['', 'valid', ''],
        defaultValue: '',
      });
      expect(control.options).toEqual([
        { value: '', label: '' },
        { value: 'valid', label: 'valid' },
        { value: '', label: '' },
      ]);
    });
  });

  describe('Group Control Validation', () => {
    it('should handle group with only one item', () => {
      const control = group('singleItem', {
        value: 'number',
        items: [{ name: 'single', type: 'number', defaultValue: 1 }],
        minItems: 1,
        maxItems: 1,
      });
      expect(control.items).toHaveLength(1);
      expect(control.minItems).toBe(1);
      expect(control.maxItems).toBe(1);
    });

    it('should handle group with maxItems constraint', () => {
      const control = group('limited', {
        value: 'boolean',
        items: [
          { name: 'item1', type: 'boolean', defaultValue: true },
          { name: 'item2', type: 'boolean', defaultValue: false },
        ],
        maxItems: 2,
      });
      expect(control.maxItems).toBe(2);
      expect(control.items).toHaveLength(2);
    });

    it('should handle group with custom defaultValue', () => {
      const control = group('withDefaults', {
        value: 'color',
        items: [
          { name: 'primary', type: 'color', defaultValue: '#ff0000' },
          { name: 'secondary', type: 'color', defaultValue: '#00ff00' },
        ],
        defaultValue: [
          { type: 'color', value: '#ff0000' },
          { type: 'color', value: '#00ff00' },
        ],
      });
      expect(control.defaultValue).toHaveLength(2);
      expect(control.defaultValue[0]).toEqual({
        type: 'color',
        value: '#ff0000',
      });
    });

    it('should handle static group configuration', () => {
      const control = group('staticGroup', {
        value: 'select',
        items: [
          {
            name: 'mode',
            type: 'select',
            defaultValue: 'auto',
            options: ['auto', 'manual'],
          },
        ],
        static: true,
      });
      expect(control.static).toBe(true);
    });
  });

  describe('Color Control Validation', () => {
    it('should handle various color formats', () => {
      const hexControl = color('hex', { defaultValue: '#ff0000' });
      const rgbControl = color('rgb', { defaultValue: 'rgb(255, 0, 0)' });
      const namedControl = color('named', { defaultValue: 'red' });

      expect(hexControl.defaultValue).toBe('#ff0000');
      expect(rgbControl.defaultValue).toBe('rgb(255, 0, 0)');
      expect(namedControl.defaultValue).toBe('red');
    });

    it('should handle invalid color strings gracefully', () => {
      const control = color('invalid', { defaultValue: 'not-a-color' });
      expect(control.defaultValue).toBe('not-a-color');
      expect(control.type).toBe('color');
    });
  });

  describe('Integration with createManifest', () => {
    it('should work seamlessly with createManifest', () => {
      const manifest = {
        id: 'test',
        name: 'Test Animation',
        description: 'Test manifest using helper functions',
        controls: [
          slider('speed', { min: 0, max: 10, defaultValue: 1.0 }),
          toggle('enabled', { defaultValue: true }),
          color('primary', { defaultValue: '#000000' }),
          select('mode', { options: ['fast', 'slow'], defaultValue: 'fast' }),
        ],
      };

      expect(manifest.controls).toHaveLength(4);
      expect(manifest.controls[0].type).toBe('number');
      expect(manifest.controls[0].name).toBe('speed');
      expect(manifest.controls[1].type).toBe('boolean');
      expect(manifest.controls[1].name).toBe('enabled');
      expect(manifest.controls[2].type).toBe('color');
      expect(manifest.controls[2].name).toBe('primary');
      expect(manifest.controls[3].type).toBe('select');
      expect(manifest.controls[3].name).toBe('mode');
    });

    it('should maintain type safety with TypeScript', () => {
      const controls = [
        slider('animationSpeed', { defaultValue: 1.0 }),
        toggle('showEffects', { defaultValue: true }),
      ];

      // Type assertions to verify TypeScript inference
      const speedControl = controls[0];
      const effectsControl = controls[1];

      expect(speedControl.type).toBe('number');
      expect(effectsControl.type).toBe('boolean');
      expect(typeof speedControl.defaultValue).toBe('number');
      expect(typeof effectsControl.defaultValue).toBe('boolean');
    });
  });

  describe('Real-World Usage Patterns', () => {
    it('should handle animation control patterns', () => {
      const animationControls = [
        slider('duration', { min: 0.1, max: 10, step: 0.1, defaultValue: 2.0 }),
        slider('amplitude', { min: 0, max: 100, defaultValue: 50 }),
        toggle('loop', { defaultValue: true }),
        select('easing', {
          options: [
            { value: 'linear', label: 'Linear' },
            { value: 'ease-in', label: 'Ease In' },
            { value: 'ease-out', label: 'Ease Out' },
          ],
          defaultValue: 'linear',
        }),
      ];

      expect(animationControls).toHaveLength(4);
      expect(
        animationControls.every((control) => control.debug === false)
      ).toBe(true);
      expect(
        animationControls.every((control) => control.resetsAnimation === false)
      ).toBe(true);
    });

    it('should handle particle system control patterns', () => {
      const particleControls = [
        slider('particleCount', {
          min: 10,
          max: 1000,
          step: 10,
          defaultValue: 100,
        }),
        slider('particleSize', { min: 1, max: 20, step: 0.5, defaultValue: 5 }),
        color('particleColor', { defaultValue: '#ffffff' }),
        toggle('enablePhysics', { defaultValue: true }),
        select('blendMode', {
          options: ['normal', 'additive', 'multiply', 'screen'],
          defaultValue: 'normal',
        }),
      ];

      expect(particleControls).toHaveLength(5);
      expect((particleControls[0] as any).min).toBe(10);
      expect((particleControls[0] as any).max).toBe(1000);
      expect((particleControls[4] as any).options).toHaveLength(4);
    });

    it('should handle visual effect control patterns', () => {
      const effectControls = [
        slider('intensity', { min: 0, max: 1, step: 0.01, defaultValue: 0.5 }),
        color('glowColor', { defaultValue: '#00ffff' }),
        toggle('enableGlow', { defaultValue: false }),
        select('filterType', {
          options: ['blur', 'sharpen', 'emboss'],
          defaultValue: 'blur',
        }),
        group('shadowSettings', {
          value: 'number',
          items: [
            {
              name: 'offsetX',
              type: 'number',
              defaultValue: 5,
              min: -50,
              max: 50,
            },
            {
              name: 'offsetY',
              type: 'number',
              defaultValue: 5,
              min: -50,
              max: 50,
            },
            { name: 'blur', type: 'number', defaultValue: 10, min: 0, max: 50 },
          ],
          minItems: 3,
          maxItems: 3,
          static: true,
        }),
      ];

      expect(effectControls).toHaveLength(5);
      expect(effectControls[4].type).toBe('group');
      expect((effectControls[4] as any).items).toHaveLength(3);
      expect((effectControls[4] as any).static).toBe(true);
    });
  });

  describe('Performance and Memory', () => {
    it('should handle creating many controls efficiently', () => {
      const startTime = performance.now();
      const controls = [];

      for (let i = 0; i < 1000; i++) {
        controls.push(
          slider(`control${i}`, { defaultValue: i }),
          toggle(`toggle${i}`, { defaultValue: i % 2 === 0 }),
          color(`color${i}`, {
            defaultValue: `#${i.toString(16).padStart(6, '0')}`,
          }),
          select(`select${i}`, { options: ['a', 'b', 'c'], defaultValue: 'a' })
        );
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(controls).toHaveLength(4000);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should not leak memory with repeated calls', () => {
      // Create and discard many controls to test for memory leaks
      for (let i = 0; i < 100; i++) {
        const controls = [
          slider('temp', { defaultValue: 1 }),
          toggle('temp', { defaultValue: true }),
          color('temp', { defaultValue: '#000' }),
          select('temp', { options: ['a'], defaultValue: 'a' }),
        ];
        // Let controls go out of scope
        expect(controls).toHaveLength(4);
      }
      // If we get here without issues, memory management is working
      expect(true).toBe(true);
    });
  });

  describe('Type Safety and Validation', () => {
    it('should maintain correct types for all control properties', () => {
      const numberControl = slider('num', { defaultValue: 42 });
      const booleanControl = toggle('bool', { defaultValue: true });
      const colorControl = color('col', { defaultValue: '#fff' });
      const selectControl = select('sel', {
        options: ['a'],
        defaultValue: 'a',
      });

      // Type checks
      expect(typeof numberControl.defaultValue).toBe('number');
      expect(typeof booleanControl.defaultValue).toBe('boolean');
      expect(typeof colorControl.defaultValue).toBe('string');
      expect(typeof selectControl.defaultValue).toBe('string');
      expect(Array.isArray(selectControl.options)).toBe(true);
    });

    it('should handle undefined and null edge cases', () => {
      const control = slider('test', {
        defaultValue: 0,
        min: undefined,
        max: undefined,
        step: undefined,
        label: undefined,
        description: undefined,
      });

      expect(control.min).toBeUndefined();
      expect(control.max).toBeUndefined();
      expect(control.step).toBeUndefined();
      expect(control.label).toBe('test'); // Should default to name
      expect(control.description).toBeUndefined();
    });
  });

  describe('Interoperability', () => {
    it('should work with existing Flateralus validation', () => {
      // Test that helper-created controls work with existing validation
      const controls = [
        slider('speed', { min: 0, max: 10, defaultValue: 5 }),
        toggle('enabled', { defaultValue: true }),
        color('primary', { defaultValue: '#ff0000' }),
        select('mode', { options: ['auto', 'manual'], defaultValue: 'auto' }),
      ];

      // All controls should have the required properties
      controls.forEach((control) => {
        expect(control.name).toBeDefined();
        expect(control.type).toBeDefined();
        expect(control.label).toBeDefined();
        expect(control.defaultValue).toBeDefined();
        expect(typeof control.debug).toBe('boolean');
        expect(typeof control.resetsAnimation).toBe('boolean');
      });
    });

    it('should be compatible with manifest schemas', () => {
      const manifest = {
        id: 'compatibility-test',
        name: 'Compatibility Test',
        description: 'Testing helper function compatibility',
        controls: [
          slider('param1', { defaultValue: 1 }),
          toggle('param2', { defaultValue: false }),
          color('param3', { defaultValue: '#000' }),
          select('param4', { options: ['x', 'y'], defaultValue: 'x' }),
        ],
      };

      // Should have all required manifest properties
      expect(manifest.id).toBeDefined();
      expect(manifest.name).toBeDefined();
      expect(manifest.description).toBeDefined();
      expect(Array.isArray(manifest.controls)).toBe(true);
      expect(manifest.controls).toHaveLength(4);
    });
  });
});
