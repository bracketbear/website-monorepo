import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { GroupControl } from './GroupControl';
import type { GroupControl as GroupControlType } from '@bracketbear/flateralus';

const meta: Meta<typeof GroupControl> = {
  title: 'Controls/GroupControl',
  component: GroupControl,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A control component for grouping related controls together.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockGroupControl: GroupControlType = {
  name: 'particleSettings',
  type: 'group',
  label: 'Particle Settings',
  description: 'Settings for particle behavior',
  value: 'number', // This tells the group what type of controls to create
  items: [
    {
      name: 'particleCount',
      type: 'number',
      label: 'Particle Count',
      description: 'Number of particles',
      defaultValue: 50,
      min: 10,
      max: 200,
      debug: true,
      resetsAnimation: false,
    },
    {
      name: 'speed',
      type: 'number',
      label: 'Animation Speed',
      description: 'Speed of the animation',
      defaultValue: 2.0,
      min: 0.1,
      max: 5.0,
      step: 0.1,
      debug: true,
      resetsAnimation: false,
    },
    {
      name: 'size',
      type: 'number',
      label: 'Particle Size',
      description: 'Size of particles',
      defaultValue: 1.0,
      min: 0.5,
      max: 3.0,
      step: 0.1,
      debug: true,
      resetsAnimation: false,
    },
  ],
  defaultValue: [
    { type: 'number', value: 50 },
    { type: 'number', value: 2.0 },
    { type: 'number', value: 1.0 },
  ],
  debug: true,
  resetsAnimation: false,
};

export const Default: Story = {
  args: {
    control: mockGroupControl,
    value: [
      { type: 'number' as const, value: 50 },
      { type: 'number' as const, value: 2.0 },
      { type: 'number' as const, value: 1.0 },
    ],
    onControlChange: (key, value) => console.log(`${key}:`, value),
  },
  decorators: [
    (Story) => (
      <div className="rounded-lg bg-black p-6">
        <Story />
      </div>
    ),
  ],
};

export const MixedTypes: Story = {
  render: () => {
    const [value, setValue] = useState([
      { type: 'color' as const, value: '#ff6b6b' },
      { type: 'number' as const, value: 75 },
      { type: 'boolean' as const, value: true },
    ]);

    return (
      <div className="rounded-lg bg-black p-6">
        <div className="space-y-4">
          <GroupControl
            control={
              {
                name: 'mixedSettings',
                type: 'group',
                label: 'Mixed Settings',
                description: 'A group with different control types',
                value: 'mixed',
                items: [
                  { controlType: 'color', defaultValue: '#ff6b6b' },
                  { controlType: 'number', defaultValue: 75 },
                  { controlType: 'boolean', defaultValue: true },
                ],
                defaultValue: [
                  { type: 'color', value: '#ff6b6b' },
                  { type: 'number', value: 75 },
                  { type: 'boolean', value: true },
                ],
                debug: true,
                resetsAnimation: false,
              } as GroupControlType
            }
            value={value}
            onControlChange={(key, newValue) => setValue(newValue as any)}
          />
          <div className="text-sm text-white/50">
            <h4 className="mb-2 font-bold">Current Values:</h4>
            <div>Color: {value[0]?.value}</div>
            <div>Number: {value[1]?.value}</div>
            <div>Boolean: {value[2]?.value ? 'True' : 'False'}</div>
          </div>
        </div>
      </div>
    );
  },
};
