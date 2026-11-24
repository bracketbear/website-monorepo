import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LabInspector from './LabInspector';
import { createManifest } from '@bracketbear/flateralus';
import type { LabEntry } from './registry';

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
    {
      name: 'stage',
      type: 'select',
      label: 'Stage',
      options: [
        { value: 1, label: 'Ink stage' },
        { value: 0, label: 'Orange stage' },
      ],
      defaultValue: 1,
      resetsAnimation: true,
    },
  ],
});

const entry = {
  id: 'molten-mark',
  section: 'hero',
  name: 'Molten Mark (GLSL)',
  blurb: 'Domain-warped fbm melt.',
  tag: 'glsl shader',
  create: () => {
    throw new Error('not used');
  },
} as unknown as LabEntry;

const values = { heat: 0.4, grain: true, stage: 1 };

describe('LabInspector', () => {
  it('renders the kicker, title, and blurb', () => {
    render(
      <LabInspector
        entry={entry}
        manifest={manifest}
        values={values}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Manifest / molten-mark')).toBeInTheDocument();
    expect(screen.getByText('Molten Mark (GLSL)')).toBeInTheDocument();
    expect(screen.getByText('Domain-warped fbm melt.')).toBeInTheDocument();
  });

  it('marks controls that rebuild the scene', () => {
    render(
      <LabInspector
        entry={entry}
        manifest={manifest}
        values={values}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Ink stage ⟲')).toBeInTheDocument();
  });

  it('reports number changes by control name', () => {
    const onChange = vi.fn();
    render(
      <LabInspector
        entry={entry}
        manifest={manifest}
        values={values}
        onChange={onChange}
      />
    );
    fireEvent.change(screen.getByLabelText('Heat'), {
      target: { value: '0.75' },
    });
    expect(onChange).toHaveBeenCalledWith('heat', 0.75);
  });

  it('reports boolean and select changes', () => {
    const onChange = vi.fn();
    render(
      <LabInspector
        entry={entry}
        manifest={manifest}
        values={values}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Off' }));
    expect(onChange).toHaveBeenCalledWith('grain', false);
    fireEvent.click(screen.getByRole('button', { name: /Orange stage/ }));
    expect(onChange).toHaveBeenCalledWith('stage', 0);
  });

  it('renders a swatch for numeric select options', () => {
    const palette = createManifest({
      id: 'p',
      name: 'P',
      description: 'p',
      controls: [
        {
          name: 'tint',
          type: 'select',
          label: 'Tint',
          options: [{ value: 0xff5f1f, label: 'Orange' }],
          defaultValue: 0xff5f1f,
        },
      ],
    });
    render(
      <LabInspector
        entry={entry}
        manifest={palette}
        values={{ tint: 0xff5f1f }}
        onChange={() => {}}
      />
    );
    // 0xff5f1f is 16736031 in decimal.
    expect(screen.getByTestId('swatch-tint-16736031')).toHaveStyle({
      backgroundColor: '#ff5f1f',
    });
  });
});
