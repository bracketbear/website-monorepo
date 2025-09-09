import type { Meta, StoryObj } from '@storybook/react';
import { Pill, type PillProps } from '@bracketbear/bear-ui-react';

const meta: Meta<typeof Pill> = {
  title: 'Pill',
  component: Pill,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: [
        'default',
        'skill',
        'selected',
        'brand-orange',
        'brand-red',
        'brand-green',
        'brand-blue',
        'brand-purple',
        'dark',
        'light',
        'outline-dark',
        'featured',
        'category',
        'flat',
        'outline',
        'glass',
        'glass-frosted',
      ] satisfies NonNullable<PillProps['variant']>[],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'] satisfies NonNullable<PillProps['size']>[],
    },
    interactive: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Default Pill',
  },
};

export const Skill: Story = {
  args: {
    variant: 'skill',
    children: 'Skill Pill',
  },
};

export const Selected: Story = {
  args: {
    variant: 'selected',
    children: 'Selected Pill',
  },
};

export const BrandOrange: Story = {
  args: {
    variant: 'brand-orange',
    children: 'Brand Orange Pill',
  },
};

export const BrandRed: Story = {
  args: {
    variant: 'brand-red',
    children: 'Brand Red Pill',
  },
};

export const BrandGreen: Story = {
  args: {
    variant: 'brand-green',
    children: 'Brand Green Pill',
  },
};

export const BrandBlue: Story = {
  args: {
    variant: 'brand-blue',
    children: 'Brand Blue Pill',
  },
};

export const BrandPurple: Story = {
  args: {
    variant: 'brand-purple',
    children: 'Brand Purple Pill',
  },
};

export const Dark: Story = {
  args: {
    variant: 'dark',
    children: 'Dark Pill',
  },
};

export const Light: Story = {
  args: {
    variant: 'light',
    children: 'Light Pill',
  },
};

export const Featured: Story = {
  args: {
    variant: 'featured',
    children: 'Featured Pill',
  },
};

export const Category: Story = {
  args: {
    variant: 'category',
    children: 'Category Pill',
  },
};

export const Glass: Story = {
  args: {
    variant: 'glass',
    children: 'Glass Pill',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small Pill',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large Pill',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Pill variant="default">Default</Pill>
      <Pill variant="skill">Skill</Pill>
      <Pill variant="selected">Selected</Pill>
      <Pill variant="brand-orange">Brand Orange</Pill>
      <Pill variant="brand-red">Brand Red</Pill>
      <Pill variant="brand-green">Brand Green</Pill>
      <Pill variant="brand-blue">Brand Blue</Pill>
      <Pill variant="brand-purple">Brand Purple</Pill>
      <Pill variant="dark">Dark</Pill>
      <Pill variant="light">Light</Pill>
      <Pill variant="outline-dark">Outline Dark</Pill>
      <Pill variant="featured">Featured</Pill>
      <Pill variant="category">Category</Pill>
      <Pill variant="flat">Flat</Pill>
      <Pill variant="outline">Outline</Pill>
      <Pill variant="glass">Glass</Pill>
      <Pill variant="glass-frosted">Glass Frosted</Pill>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Pill size="sm">Small</Pill>
      <Pill size="md">Medium</Pill>
      <Pill size="lg">Large</Pill>
    </div>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Pill variant="brand-green">
        <svg className="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        Success
      </Pill>
      <Pill variant="brand-orange">
        <svg className="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        Warning
      </Pill>
    </div>
  ),
};
