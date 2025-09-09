import type { Meta, StoryObj } from '@storybook/react';
import { HeroContent } from './HeroContent';

const meta: Meta<typeof HeroContent> = {
  title: 'HeroContent',
  component: HeroContent,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
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
    onGetWeird: {
      action: 'getWeird',
    },
    onRandomizeAll: {
      action: 'randomizeAll',
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

export const Minimal: Story = {
  args: {
    title: 'Portfolio',
  },
};

export const LongContent: Story = {
  args: {
    title: 'Interactive Experiences & Digital Innovation',
    subtitle:
      'Crafting immersive solutions that bridge technology and creativity',
    description:
      'Specializing in full-stack development, interactive installations, and cutting-edge web experiences',
    showActions: true,
  },
};

export const WithBackground: Story = {
  render: () => (
    <div className="bg-gradient-radial from-brand-orange via-brand-yellow to-brand-red min-h-screen">
      <HeroContent
        title="Creative Developer"
        subtitle="Turning ideas into digital reality"
        description="Let's create something extraordinary"
        showActions={true}
      />
    </div>
  ),
};

export const DarkBackground: Story = {
  render: () => (
    <div className="bg-brand-dark min-h-screen">
      <HeroContent
        title="Innovation Through Code"
        subtitle="Building tomorrow's experiences today"
        description="Full-stack development with a creative twist"
        showActions={true}
      />
    </div>
  ),
};
