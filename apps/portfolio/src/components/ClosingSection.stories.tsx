import type { Meta, StoryObj } from '@storybook/react';
import { ClosingSection } from './ClosingSection';

const meta: Meta<typeof ClosingSection> = {
  title: 'Portfolio/ClosingSection',
  component: ClosingSection,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A closing section component that displays a repository link with acknowledgment modal. Users must agree that coding is a journey before being redirected to the repository.',
      },
    },
  },
  argTypes: {
    intro: {
      control: 'text',
      description: 'Intro content for the closing section',
    },
    modalTitle: {
      control: 'text',
      description: 'Modal title',
    },
    modalHeading: {
      control: 'text',
      description: 'Modal heading text',
    },
    modalIntro: {
      control: 'text',
      description: 'Modal introduction content',
    },
    modalAcknowledgment: {
      control: 'text',
      description: 'Modal acknowledgment text',
    },
    modalPoints: {
      control: 'object',
      description: 'List of acknowledgment points',
    },
    modalCheckboxLabel: {
      control: 'text',
      description: 'Checkbox label text',
    },
    modalCancelButton: {
      control: 'text',
      description: 'Cancel button text',
    },
    modalAgreeButton: {
      control: 'text',
      description: 'Agree button text',
    },
    repositoryUrl: {
      control: 'text',
      description: 'Repository URL to link to',
    },
    buttonTitle: {
      control: 'text',
      description: 'Button section title',
    },
    buttonDescription: {
      control: 'text',
      description: 'Button section description',
    },
    buttonText: {
      control: 'text',
      description: 'Button text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ClosingSection>;

export const Default: Story = {
  args: {
    intro:
      "If you want to see something specific—content shapes, token usage, or animation controls—reach out and I'll point you to a tight, focused example.",
    modalTitle: 'Before you dive in...',
    modalHeading: 'Coding is a journey, not a destination.',
    modalIntro:
      "This repository represents a snapshot in time of my learning and growth as a developer. The code you'll find here reflects my current understanding, preferences, and the tools I've chosen to work with.",
    modalAcknowledgment: 'By accessing this code, you acknowledge that:',
    modalPoints: [
      'This code is a work in progress and may contain imperfections',
      "Best practices evolve, and what's shown here represents my current approach",
      "You're viewing this as inspiration and learning material, not production-ready code",
      'The journey of learning to code never ends',
    ],
    modalCheckboxLabel:
      'I understand that coding is a journey and agree to view this code as learning material',
    modalCancelButton: 'Cancel',
    modalAgreeButton: 'I Agree - Take me to the code',
    repositoryUrl: 'https://github.com/bracketbear/website-monorepo',
    buttonTitle: 'Ready to explore the code?',
    buttonDescription:
      'This repository contains the complete source code for this portfolio and all related projects.',
    buttonText: 'View Source Code',
  },
};

export const Minimal: Story = {
  args: {
    modalTitle: 'Quick Access',
    modalHeading: 'Repository Access',
    modalIntro: 'This is a simple repository link.',
    modalAcknowledgment: 'Please confirm:',
    modalPoints: [
      'You understand this is example code',
      'You will use it responsibly',
    ],
    modalCheckboxLabel: 'I agree to the terms',
    modalCancelButton: 'No Thanks',
    modalAgreeButton: 'Continue',
    repositoryUrl: 'https://github.com/example/repo',
    buttonTitle: 'Access Repository',
    buttonDescription: 'Click to view the source code.',
    buttonText: 'View Code',
  },
};

export const CustomContent: Story = {
  args: {
    intro:
      '<p>This is a <strong>custom</strong> closing section with <em>markdown</em> support.</p>',
    modalTitle: 'Custom Modal Title',
    modalHeading: 'Custom heading with different text',
    modalIntro:
      '<p>This modal has <strong>custom HTML content</strong> and different styling.</p>',
    modalAcknowledgment: 'Custom acknowledgment text:',
    modalPoints: ['Custom point one', 'Custom point two', 'Custom point three'],
    modalCheckboxLabel: 'Custom checkbox agreement text',
    modalCancelButton: 'Custom Cancel',
    modalAgreeButton: 'Custom Agree',
    repositoryUrl: 'https://github.com/custom/repo',
    buttonTitle: 'Custom Button Title',
    buttonDescription: 'Custom button description with different text.',
    buttonText: 'Custom Button',
  },
};
