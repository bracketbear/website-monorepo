import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SelectControl } from './SelectControl';
import type { SelectControl as SelectControlType } from '@bracketbear/flateralus';

const meta: Meta<typeof SelectControl> = {
  title: 'Controls/SelectControl',
  component: SelectControl,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A control component for selecting from predefined options.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockSelectControl: SelectControlType = {
  name: 'style',
  type: 'select',
  label: 'Animation Style',
  description: 'The visual style of the animation',
  defaultValue: 'smooth',
  options: [
    { value: 'smooth', label: 'Smooth' },
    { value: 'bouncy', label: 'Bouncy' },
    { value: 'sharp', label: 'Sharp' },
  ],
  debug: true,
  resetsAnimation: true,
};

export const Default: Story = {
  args: {
    control: mockSelectControl,
    value: 'smooth',
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

export const AnimationMode: Story = {
  args: {
    control: {
      name: 'animationMode',
      type: 'select',
      label: 'Animation Mode',
      description: 'The type of animation to play',
      defaultValue: 'continuous',
      options: [
        { value: 'continuous', label: 'Continuous' },
        { value: 'pulse', label: 'Pulse' },
        { value: 'wave', label: 'Wave' },
        { value: 'random', label: 'Random' },
      ],
      debug: true,
      resetsAnimation: true,
    } as SelectControlType,
    value: 'continuous',
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
    const [value, setValue] = useState('continuous');

    return (
      <div className="rounded-lg bg-black p-6">
        <div className="space-y-4">
          <SelectControl
            control={
              {
                name: 'animationMode',
                type: 'select',
                label: 'Animation Mode',
                description: 'The type of animation to play',
                defaultValue: 'continuous',
                options: [
                  { value: 'continuous', label: 'Continuous' },
                  { value: 'pulse', label: 'Pulse' },
                  { value: 'wave', label: 'Wave' },
                  { value: 'random', label: 'Random' },
                ],
                debug: true,
                resetsAnimation: true,
              } as SelectControlType
            }
            value={value}
            onControlChange={(key, newValue) => setValue(newValue as string)}
          />
          <div className="text-sm text-white/50">Current value: {value}</div>
        </div>
      </div>
    );
  },
};
