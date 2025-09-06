import type { Meta, StoryObj } from '@storybook/react';
import { ContactSection } from './ContactSection';

const meta: Meta<typeof ContactSection> = {
  title: 'ContactSection',
  component: ContactSection,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: { type: 'text' },
    },
    text: {
      control: { type: 'text' },
    },
    className: {
      control: { type: 'text' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Get In Touch',
    text: "Ready to work together? Send me a message and let's discuss your next project.",
  },
};

export const WithHTMLText: Story = {
  args: {
    title: "Let's Connect",
    text: "<p>I'm always interested in <strong>exciting new projects</strong> and opportunities to collaborate.</p><p>Whether you're looking for:</p><ul><li>Full-stack development</li><li>Interactive experiences</li><li>Technical consulting</li></ul><p>I'd love to hear from you!</p>",
  },
};

export const Minimal: Story = {
  args: {
    title: 'Contact',
  },
};

export const LongText: Story = {
  args: {
    title: 'Start a Conversation',
    text: "<p>I believe great projects start with great conversations. Whether you have a clear vision or just an idea, I'm here to help bring it to life.</p><p>My approach combines technical expertise with creative problem-solving, ensuring that every project not only meets your requirements but exceeds your expectations.</p><p>Let's discuss how we can work together to create something amazing.</p>",
  },
};

export const CustomStyling: Story = {
  args: {
    title: 'Custom Styled Contact',
    text: 'This section has custom styling applied.',
    className: 'bg-brand-dark text-white',
  },
};
