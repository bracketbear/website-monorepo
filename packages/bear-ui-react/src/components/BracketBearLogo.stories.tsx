import type { Meta, StoryObj } from '@storybook/react';
import { BracketBearLogo } from '@bracketbear/bear-ui-react';

const meta: Meta<typeof BracketBearLogo> = {
  title: 'BracketBearLogo',
  component: BracketBearLogo,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Small: Story = {
  args: {
    className: 'w-16 h-10',
  },
};

export const Medium: Story = {
  args: {
    className: 'w-32 h-20',
  },
};

export const Large: Story = {
  args: {
    className: 'w-48 h-30',
  },
};

export const ExtraLarge: Story = {
  args: {
    className: 'w-64 h-40',
  },
};

export const Monochrome: Story = {
  args: {
    className: 'w-32 h-20 text-gray-600',
  },
};

export const Inverted: Story = {
  args: {
    className: 'w-32 h-20 text-white',
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="text-center">
        <BracketBearLogo className="h-10 w-16" />
        <p className="mt-2 text-sm text-gray-600">Small</p>
      </div>
      <div className="text-center">
        <BracketBearLogo className="h-20 w-32" />
        <p className="mt-2 text-sm text-gray-600">Medium</p>
      </div>
      <div className="text-center">
        <BracketBearLogo className="h-30 w-48" />
        <p className="mt-2 text-sm text-gray-600">Large</p>
      </div>
      <div className="text-center">
        <BracketBearLogo className="h-40 w-64" />
        <p className="mt-2 text-sm text-gray-600">Extra Large</p>
      </div>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="text-center">
        <BracketBearLogo className="h-20 w-32 text-gray-900" />
        <p className="mt-2 text-sm text-gray-600">Default</p>
      </div>
      <div className="text-center">
        <BracketBearLogo className="h-20 w-32 text-gray-600" />
        <p className="mt-2 text-sm text-gray-600">Monochrome</p>
      </div>
      <div className="rounded bg-gray-800 p-4 text-center">
        <BracketBearLogo className="h-20 w-32 text-white" />
        <p className="mt-2 text-sm text-white">Inverted</p>
      </div>
    </div>
  ),
};

export const WithBackground: Story = {
  render: () => (
    <div className="space-y-8">
      <div className="rounded-lg bg-white p-8 shadow-lg">
        <BracketBearLogo className="h-30 w-48 text-gray-900" />
      </div>
      <div className="rounded-lg bg-gray-800 p-8">
        <BracketBearLogo className="h-30 w-48 text-white" />
      </div>
      <div className="from-brand-orange to-brand-yellow rounded-lg bg-gradient-to-r p-8">
        <BracketBearLogo className="h-30 w-48 text-white" />
      </div>
    </div>
  ),
};
