import type { Meta, StoryObj } from '@storybook/react';
import { BracketBearLogo } from '@bracketbear/bear-ui-react';

const meta: Meta<typeof BracketBearLogo> = {
  title: 'BracketBearLogo',
  component: BracketBearLogo,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'xl'],
    },
    variant: {
      control: { type: 'select' },
      options: ['default', 'monochrome', 'inverted'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Small: Story = {
  args: {
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
  },
};

export const ExtraLarge: Story = {
  args: {
    size: 'xl',
  },
};

export const Monochrome: Story = {
  args: {
    variant: 'monochrome',
  },
};

export const Inverted: Story = {
  args: {
    variant: 'inverted',
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="text-center">
        <BracketBearLogo size="sm" />
        <p className="mt-2 text-sm text-gray-600">Small</p>
      </div>
      <div className="text-center">
        <BracketBearLogo size="md" />
        <p className="mt-2 text-sm text-gray-600">Medium</p>
      </div>
      <div className="text-center">
        <BracketBearLogo size="lg" />
        <p className="mt-2 text-sm text-gray-600">Large</p>
      </div>
      <div className="text-center">
        <BracketBearLogo size="xl" />
        <p className="mt-2 text-sm text-gray-600">Extra Large</p>
      </div>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <div className="text-center">
        <BracketBearLogo variant="default" />
        <p className="mt-2 text-sm text-gray-600">Default</p>
      </div>
      <div className="text-center">
        <BracketBearLogo variant="monochrome" />
        <p className="mt-2 text-sm text-gray-600">Monochrome</p>
      </div>
      <div className="rounded bg-gray-800 p-4 text-center">
        <BracketBearLogo variant="inverted" />
        <p className="mt-2 text-sm text-white">Inverted</p>
      </div>
    </div>
  ),
};

export const WithBackground: Story = {
  render: () => (
    <div className="space-y-8">
      <div className="rounded-lg bg-white p-8 shadow-lg">
        <BracketBearLogo size="lg" />
      </div>
      <div className="rounded-lg bg-gray-800 p-8">
        <BracketBearLogo size="lg" variant="inverted" />
      </div>
      <div className="from-brand-orange to-brand-yellow rounded-lg bg-gradient-to-r p-8">
        <BracketBearLogo size="lg" variant="inverted" />
      </div>
    </div>
  ),
};
