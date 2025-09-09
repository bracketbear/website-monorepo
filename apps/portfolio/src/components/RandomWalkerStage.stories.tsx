import type { Meta, StoryObj } from '@storybook/react';
import RandomWalkerStage from './RandomWalkerStage';

const meta: Meta<typeof RandomWalkerStage> = {
  title: 'RandomWalkerStage',
  component: RandomWalkerStage,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const InContainer: Story = {
  render: () => (
    <div className="mx-auto w-full max-w-4xl p-4">
      <div className="bg-gradient-radial from-brand-orange via-brand-yellow to-brand-red rounded-2xl p-6">
        <h2 className="mb-6 text-center text-2xl font-bold text-white">
          Random Walker Animation
        </h2>
        <div className="h-96 w-full">
          <RandomWalkerStage />
        </div>
      </div>
    </div>
  ),
};

export const LargeSize: Story = {
  render: () => (
    <div className="h-screen w-full">
      <RandomWalkerStage />
    </div>
  ),
};

export const WithBackground: Story = {
  render: () => (
    <div className="bg-brand-dark min-h-screen p-8">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-8 text-center text-3xl font-bold text-white">
          Interactive Random Walker
        </h2>
        <div className="h-96 w-full overflow-hidden rounded-2xl">
          <RandomWalkerStage />
        </div>
      </div>
    </div>
  ),
};

export const MultipleInstances: Story = {
  render: () => (
    <div className="grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2">
      <div className="h-64">
        <RandomWalkerStage />
      </div>
      <div className="h-64">
        <RandomWalkerStage />
      </div>
    </div>
  ),
};
