import type { Meta, StoryObj } from '@storybook/react';
import { SkillPill, type SkillPillProps } from '@bracketbear/bear-ui-react';

const meta: Meta<typeof SkillPill> = {
  title: 'SkillPill',
  component: SkillPill,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'] satisfies NonNullable<
        SkillPillProps['size']
      >[],
    },
    selected: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'React',
  },
};

export const Selected: Story = {
  args: {
    children: 'TypeScript',
    selected: true,
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Node.js',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Figma',
  },
};

export const Interactive: Story = {
  args: {
    children: 'Clickable Skill',
    onClick: () => console.log('Skill clicked!'),
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <SkillPill size="sm">Small</SkillPill>
      <SkillPill size="md">Medium</SkillPill>
      <SkillPill size="lg">Large</SkillPill>
    </div>
  ),
};

export const SkillVariations: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <SkillPill>React</SkillPill>
      <SkillPill selected>TypeScript</SkillPill>
      <SkillPill>Node.js</SkillPill>
      <SkillPill selected>Next.js</SkillPill>
      <SkillPill>Figma</SkillPill>
      <SkillPill>Docker</SkillPill>
    </div>
  ),
};
