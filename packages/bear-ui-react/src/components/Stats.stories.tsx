import type { Meta, StoryObj } from '@storybook/react';
import { Stats } from '@bracketbear/bear-ui-react';

const meta: Meta<typeof Stats> = {
  title: 'Stats',
  component: Stats,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['dark', 'light', 'glass'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleStats = [
  { label: 'Projects', value: '50+' },
  { label: 'Clients', value: '25+' },
  { label: 'Years', value: '5+' },
  { label: 'Technologies', value: '20+' },
];

export const Default: Story = {
  args: {
    stats: sampleStats,
  },
};

export const Light: Story = {
  args: {
    stats: sampleStats,
    variant: 'light',
  },
};

export const Glass: Story = {
  args: {
    stats: sampleStats,
    variant: 'glass',
  },
};

export const TwoStats: Story = {
  args: {
    stats: [
      { label: 'Projects', value: '50+' },
      { label: 'Clients', value: '25+' },
    ],
  },
};

export const ThreeStats: Story = {
  args: {
    stats: [
      { label: 'Projects', value: '50+' },
      { label: 'Clients', value: '25+' },
      { label: 'Years', value: '5+' },
    ],
  },
};

export const SixStats: Story = {
  args: {
    stats: [
      { label: 'Projects', value: '50+' },
      { label: 'Clients', value: '25+' },
      { label: 'Years', value: '5+' },
      { label: 'Technologies', value: '20+' },
      { label: 'Awards', value: '3' },
      { label: 'Team Members', value: '8' },
    ],
  },
};

export const LongLabels: Story = {
  args: {
    stats: [
      { label: 'Completed Projects', value: '50+' },
      { label: 'Satisfied Clients', value: '25+' },
      { label: 'Years of Experience', value: '5+' },
      { label: 'Technologies Mastered', value: '20+' },
    ],
  },
};

export const LongValues: Story = {
  args: {
    stats: [
      { label: 'Projects', value: '50+ Completed' },
      { label: 'Clients', value: '25+ Satisfied' },
      { label: 'Years', value: '5+ Experience' },
      { label: 'Technologies', value: '20+ Mastered' },
    ],
  },
};

export const ResponsiveLayout: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="mb-4 text-lg font-semibold">Mobile (Vertical)</h3>
        <div className="w-64">
          <Stats stats={sampleStats} variant="dark" />
        </div>
      </div>
      <div>
        <h3 className="mb-4 text-lg font-semibold">Desktop (Horizontal)</h3>
        <div className="w-full">
          <Stats stats={sampleStats} variant="dark" />
        </div>
      </div>
    </div>
  ),
};

export const WithCustomStyling: Story = {
  args: {
    stats: sampleStats,
    className:
      'bg-gradient-to-r from-brand-orange to-brand-yellow p-6 rounded-lg',
  },
};
