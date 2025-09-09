import type { Meta, StoryObj } from '@storybook/react';
import { HeroSection } from './HeroSection';

const meta: Meta<typeof HeroSection> = {
  title: 'HeroSection',
  component: HeroSection,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    preset: {
      control: { type: 'select' },
      options: [
        'curious-particle-network',
        'particle-wave',
        'blob',
        'enhanced-wave',
        'retro-grid',
      ],
    },
    title: {
      control: { type: 'text' },
    },
    subtitle: {
      control: { type: 'text' },
    },
    description: {
      control: { type: 'text' },
    },
    showActions: {
      control: { type: 'boolean' },
    },
    showDebugControls: {
      control: { type: 'boolean' },
    },
    isIndexPage: {
      control: { type: 'boolean' },
    },
    accountForNavigation: {
      control: { type: 'boolean' },
    },
    accountForBreadcrumbs: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Harrison Callahan',
    subtitle: 'Full Stack Developer',
    description: 'Building the future, one line of code at a time',
  },
};

export const WithActions: Story = {
  args: {
    title: 'Welcome',
    subtitle: "Let's build something amazing together",
    description: 'Ready to get started?',
    showActions: true,
  },
};

export const CuriousParticleNetwork: Story = {
  args: {
    preset: 'curious-particle-network',
    title: 'Interactive Network',
    subtitle: 'Connected particles create dynamic patterns',
    showActions: true,
  },
};

export const ParticleWave: Story = {
  args: {
    preset: 'particle-wave',
    title: 'Wave Animation',
    subtitle: 'Flowing particles in wave patterns',
    showActions: true,
  },
};

export const Blob: Story = {
  args: {
    preset: 'blob',
    title: 'Blob Animation',
    subtitle: 'Organic, fluid particle movement',
    showActions: true,
  },
};

export const EnhancedWave: Story = {
  args: {
    preset: 'enhanced-wave',
    title: 'Enhanced Wave',
    subtitle: 'Advanced wave patterns with depth',
    showActions: true,
  },
};

export const RetroGrid: Story = {
  args: {
    preset: 'retro-grid',
    title: 'Retro Grid',
    subtitle: 'Classic grid-based animation',
    showActions: true,
  },
};

export const IndexPage: Story = {
  args: {
    title: 'Portfolio Home',
    subtitle: 'Welcome to my creative space',
    description: 'Explore my work and get in touch',
    showActions: true,
    isIndexPage: true,
  },
};

export const WithStats: Story = {
  args: {
    title: 'Portfolio Stats',
    subtitle: 'Key metrics and achievements',
    showActions: true,
    stats: [
      { label: 'Projects Completed', value: '25+' },
      { label: 'Years Experience', value: '5+' },
      { label: 'Technologies', value: '30+' },
    ],
  },
};

export const WithoutDebugControls: Story = {
  args: {
    title: 'Clean Interface',
    subtitle: 'No debug controls visible',
    showActions: true,
    showDebugControls: false,
  },
};

export const CustomContent: Story = {
  args: {
    title: 'Custom Content',
    subtitle: 'Using children prop for custom rendering',
    children: (
      <div className="text-center">
        <h1 className="font-heading mb-4 text-6xl font-black">Custom Hero</h1>
        <p className="mb-8 text-xl">
          This content is rendered via the children prop
        </p>
        <button className="bg-brand-red rounded-lg px-6 py-3 font-bold text-white">
          Custom Action
        </button>
      </div>
    ),
  },
};
