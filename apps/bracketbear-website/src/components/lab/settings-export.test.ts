import { describe, it, expect } from 'vitest';
import { createManifest } from '@bracketbear/flateralus';
import { buildSettingsFile } from './settings-export';

const manifest = createManifest({
  id: 'molten-mark',
  name: 'Molten Mark (GLSL)',
  description: 'Domain-warped fbm melt.',
  controls: [
    {
      name: 'heat',
      type: 'number',
      label: 'Heat',
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: 0.4,
    },
    { name: 'grain', type: 'boolean', label: 'Grain', defaultValue: true },
  ],
});

describe('buildSettingsFile', () => {
  it('records the animation and theme alongside the values', () => {
    const file = buildSettingsFile({
      animationId: 'molten-mark',
      theme: 'sunset',
      manifest,
      values: { heat: 0.9, grain: true },
    });
    expect(file.animation).toBe('molten-mark');
    expect(file.theme).toBe('sunset');
    expect(file.values).toEqual({ heat: 0.9, grain: true });
  });

  it('fills untouched controls from the manifest defaults', () => {
    const file = buildSettingsFile({
      animationId: 'molten-mark',
      theme: 'sunset',
      manifest,
      values: { heat: 0.9 },
    });
    expect(file.values).toEqual({ heat: 0.9, grain: true });
  });
});
