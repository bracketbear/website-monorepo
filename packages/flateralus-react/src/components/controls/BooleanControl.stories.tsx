import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { BooleanControl } from './BooleanControl';
import type { BooleanControl as BooleanControlType } from '@bracketbear/flateralus';

const meta: Meta<typeof BooleanControl> = {
  title: 'Controls/BooleanControl',
  component: BooleanControl,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A control component for boolean (true/false) values.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockBooleanControl: BooleanControlType = {
  name: 'enableEffects',
  type: 'boolean',
  label: 'Enable Effects',
  description: 'Whether to show visual effects',
  defaultValue: true,
  debug: true,
  resetsAnimation: false,
};

export const Default: Story = {
  args: {
    control: mockBooleanControl,
    value: true,
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

export const Disabled: Story = {
  args: {
    control: {
      ...mockBooleanControl,
      label: 'Enable Shadows',
      description: 'Whether to render shadows',
      defaultValue: false,
    },
    value: false,
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
    const [value, setValue] = useState(false);

    return (
      <div className="rounded-lg bg-black p-6">
        <div className="space-y-4">
          <BooleanControl
            control={
              {
                name: 'enableShadows',
                type: 'boolean',
                label: 'Enable Shadows',
                description: 'Whether to render shadows',
                defaultValue: false,
                debug: true,
                resetsAnimation: false,
              } as BooleanControlType
            }
            value={value}
            onControlChange={(key, newValue) => setValue(newValue as boolean)}
          />
          <div className="text-sm text-white/50">
            Current value: {value ? 'Enabled' : 'Disabled'}
          </div>
        </div>
      </div>
    );
  },
};
