import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ColorControl } from './ColorControl';
import type { ColorControl as ColorControlType } from '@bracketbear/flateralus';

const meta: Meta<typeof ColorControl> = {
  title: 'Controls/ColorControl',
  component: ColorControl,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A control component for color values with a color picker.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockColorControl: ColorControlType = {
  name: 'primaryColor',
  type: 'color',
  label: 'Primary Color',
  description: 'The main color of the animation',
  defaultValue: '#ff6b6b',
  debug: true,
  resetsAnimation: false,
};

export const Default: Story = {
  args: {
    control: mockColorControl,
    value: '#ff6b6b',
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

export const Blue: Story = {
  args: {
    control: {
      ...mockColorControl,
      label: 'Background Color',
      description: 'The background color of the stage',
      defaultValue: '#4ecdc4',
    },
    value: '#4ecdc4',
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
    const [value, setValue] = useState('#4ecdc4');

    return (
      <div className="rounded-lg bg-black p-6">
        <div className="space-y-4">
          <ColorControl
            control={
              {
                name: 'backgroundColor',
                type: 'color',
                label: 'Background Color',
                description: 'The background color of the stage',
                defaultValue: '#4ecdc4',
                debug: true,
                resetsAnimation: false,
              } as ColorControlType
            }
            value={value}
            onControlChange={(key, newValue) => setValue(newValue as string)}
          />
          <div className="text-sm text-white/50">Current value: {value}</div>
          <div
            className="h-16 w-16 rounded border-2 border-white/20"
            style={{ backgroundColor: value }}
          />
        </div>
      </div>
    );
  },
};
