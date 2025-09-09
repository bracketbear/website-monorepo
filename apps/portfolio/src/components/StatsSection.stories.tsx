import type { Meta, StoryObj } from '@storybook/react';
import StatsSection from './StatsSection';

const meta: Meta<typeof StatsSection> = {
  title: 'StatsSection',
  component: StatsSection,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    className: {
      control: { type: 'text' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockStats = [
  {
    label: 'Projects Completed',
    value: '25+',
    description: 'Successfully delivered',
  },
  {
    label: 'Years Experience',
    value: '5+',
    description: 'Professional development',
  },
  { label: 'Technologies', value: '30+', description: 'Skills mastered' },
];

const mockStatsExtended = [
  {
    label: 'Total Projects',
    value: '25+',
    description: 'Successfully delivered',
  },
  { label: 'Featured Projects', value: '8', description: 'Highlighted work' },
  { label: 'Technologies Used', value: '30+', description: 'Skills mastered' },
  {
    label: 'Years Experience',
    value: '5+',
    description: 'Professional development',
  },
  { label: 'Client Satisfaction', value: '100%', description: 'Happy clients' },
  {
    label: 'Code Quality',
    value: 'A+',
    description: 'Clean, maintainable code',
  },
];

export const Default: Story = {
  args: {
    stats: mockStats,
  },
};

export const ExtendedStats: Story = {
  args: {
    stats: mockStatsExtended,
  },
};

export const TwoStats: Story = {
  args: {
    stats: [
      { label: 'Projects', value: '25+' },
      { label: 'Experience', value: '5+ years' },
    ],
  },
};

export const SingleStat: Story = {
  args: {
    stats: [
      {
        label: 'Total Projects',
        value: '25+',
        description: 'Successfully delivered',
      },
    ],
  },
};

export const WithoutDescriptions: Story = {
  args: {
    stats: [
      { label: 'Projects Completed', value: '25+' },
      { label: 'Years Experience', value: '5+' },
      { label: 'Technologies', value: '30+' },
    ],
  },
};

export const CustomStyling: Story = {
  args: {
    stats: mockStats,
    className: 'bg-brand-dark text-white rounded-2xl p-8',
  },
};

export const InContainer: Story = {
  render: () => (
    <div className="mx-auto w-full max-w-4xl p-4">
      <div className="bg-gradient-radial from-brand-orange via-brand-yellow to-brand-red rounded-2xl p-8">
        <h2 className="mb-8 text-center text-3xl font-bold text-white">
          Portfolio Statistics
        </h2>
        <StatsSection stats={mockStats} />
      </div>
    </div>
  ),
};

export const DifferentSizes: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="mb-4 text-lg font-semibold">3 Stats (Default)</h3>
        <StatsSection stats={mockStats} />
      </div>
      <div>
        <h3 className="mb-4 text-lg font-semibold">6 Stats (Extended)</h3>
        <StatsSection stats={mockStatsExtended} />
      </div>
      <div>
        <h3 className="mb-4 text-lg font-semibold">2 Stats</h3>
        <StatsSection stats={mockStats.slice(0, 2)} />
      </div>
    </div>
  ),
};
