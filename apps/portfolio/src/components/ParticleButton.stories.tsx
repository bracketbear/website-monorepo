import type { Meta, StoryObj } from '@storybook/react';
import { ParticleButton } from './ParticleButton';

const meta: Meta<typeof ParticleButton> = {
  title: 'ParticleButton',
  component: ParticleButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    particleCount: {
      control: { type: 'number', min: 10, max: 200 },
    },
    particleSize: {
      control: { type: 'number', min: 1, max: 20 },
    },
    particleSpeed: {
      control: { type: 'number', min: 0.5, max: 10 },
    },
    disabled: {
      control: { type: 'boolean' },
    },
    type: {
      control: { type: 'select' },
      options: ['button', 'submit', 'reset'],
    },
    onClick: {
      action: 'clicked',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Click Me',
  },
};

export const SubmitButton: Story = {
  args: {
    children: 'Submit Form',
    type: 'submit',
  },
};

export const ResetButton: Story = {
  args: {
    children: 'Reset',
    type: 'reset',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    disabled: true,
  },
};

export const HighParticleCount: Story = {
  args: {
    children: 'High Density',
    particleCount: 150,
    particleSize: 4,
    particleSpeed: 3,
  },
};

export const LowParticleCount: Story = {
  args: {
    children: 'Low Density',
    particleCount: 20,
    particleSize: 8,
    particleSpeed: 1,
  },
};

export const FastParticles: Story = {
  args: {
    children: 'Fast Particles',
    particleCount: 80,
    particleSize: 6,
    particleSpeed: 8,
  },
};

export const LargeParticles: Story = {
  args: {
    children: 'Large Particles',
    particleCount: 50,
    particleSize: 15,
    particleSpeed: 2,
  },
};

export const CustomStyling: Story = {
  args: {
    children: 'Custom Style',
    className: 'px-8 py-4 text-xl font-bold',
    particleCount: 100,
    particleSize: 5,
    particleSpeed: 2.5,
  },
};

export const MultipleButtons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <ParticleButton particleCount={30} particleSize={4}>
        Small
      </ParticleButton>
      <ParticleButton particleCount={60} particleSize={6}>
        Medium
      </ParticleButton>
      <ParticleButton particleCount={100} particleSize={8}>
        Large
      </ParticleButton>
    </div>
  ),
};

export const WithBackground: Story = {
  render: () => (
    <div className="bg-gradient-radial from-brand-orange via-brand-yellow to-brand-red rounded-2xl p-8">
      <ParticleButton
        particleCount={80}
        particleSize={6}
        particleSpeed={3}
        className="px-6 py-3 text-lg"
      >
        Interactive Button
      </ParticleButton>
    </div>
  ),
};
