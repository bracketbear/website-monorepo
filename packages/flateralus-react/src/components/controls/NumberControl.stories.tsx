import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { NumberControl } from './NumberControl';
import type { NumberControl as NumberControlType } from '@bracketbear/flateralus';

const meta: Meta<typeof NumberControl> = {
  title: 'Controls/NumberControl',
  component: NumberControl,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A control component for numeric values with min/max constraints and step increments.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockNumberControl: NumberControlType = {
  name: 'speed',
  type: 'number',
  label: 'Animation Speed',
  description: 'Controls how fast the animation runs',
  defaultValue: 1.0,
  min: 0.1,
  max: 3.0,
  step: 0.1,
  debug: true,
  resetsAnimation: false,
};

export const Default: Story = {
  args: {
    control: mockNumberControl,
    value: 1.0,
    onControlChange: (key, value) => console.log(`${key}: ${value}`),
  },
  decorators: [
    (Story) => (
      <div className="rounded-lg bg-black p-6">
        <Story />
      </div>
    ),
  ],
};

export const WithConstraints: Story = {
  args: {
    control: {
      ...mockNumberControl,
      min: 0,
      max: 10,
      step: 1,
      label: 'Particle Count',
      description: 'Number of particles (0-10)',
    },
    value: 5,
    onControlChange: (key, value) => console.log(`${key}: ${value}`),
  },
  decorators: [
    (Story) => (
      <div className="rounded-lg bg-black p-6">
        <Story />
      </div>
    ),
  ],
};

export const DecimalStep: Story = {
  args: {
    control: {
      ...mockNumberControl,
      min: 0,
      max: 1,
      step: 0.01,
      label: 'Opacity',
      description: 'Opacity value (0.00-1.00)',
    },
    value: 0.75,
    onControlChange: (key, value) => console.log(`${key}: ${value}`),
  },
  decorators: [
    (Story) => (
      <div className="rounded-lg bg-black p-6">
        <Story />
      </div>
    ),
  ],
};

export const Interactive: Story = {
  render: () => {
    const [value, setValue] = useState(1.5);

    return (
      <div className="rounded-lg bg-black p-6">
        <div className="space-y-4">
          <NumberControl
            control={mockNumberControl}
            value={value}
            onControlChange={(key, newValue) => setValue(newValue as number)}
          />
          <div className="text-sm text-white/50">Current value: {value}</div>
        </div>
      </div>
    );
  },
};
