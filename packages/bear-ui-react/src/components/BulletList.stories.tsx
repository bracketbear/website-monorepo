import type { Meta, StoryObj } from '@storybook/react';
import { BulletList } from '@bracketbear/bear-ui-react';

const meta: Meta<typeof BulletList> = {
  title: 'BulletList',
  component: BulletList,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['numbered', 'bulleted'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleItems = [
  {
    title: 'Research & Discovery',
    content:
      'We start by understanding your business goals, target audience, and technical requirements through comprehensive research and stakeholder interviews.',
  },
  {
    title: 'Design & Prototyping',
    content:
      'Our design team creates wireframes, mockups, and interactive prototypes to visualize the user experience before development begins.',
  },
  {
    title: 'Development & Testing',
    content:
      'We build your solution using modern technologies and best practices, with continuous testing to ensure quality and performance.',
  },
  {
    title: 'Launch & Support',
    content:
      'We handle deployment and provide ongoing support to ensure your solution continues to meet your evolving needs.',
  },
];

export const Numbered: Story = {
  args: {
    title: 'How We Work',
    items: sampleItems,
    variant: 'numbered',
  },
};

export const Bulleted: Story = {
  args: {
    title: 'Our Values',
    items: [
      {
        title: 'Quality First',
        content:
          'We never compromise on quality. Every project receives the same attention to detail and commitment to excellence.',
      },
      {
        title: 'Client Focused',
        content:
          'Your success is our success. We work closely with you to understand your needs and deliver solutions that exceed expectations.',
      },
      {
        title: 'Innovation Driven',
        content:
          'We stay at the forefront of technology and design trends to deliver cutting-edge solutions that give you a competitive advantage.',
      },
    ],
    variant: 'bulleted',
  },
};

export const ShortList: Story = {
  args: {
    title: 'Quick Steps',
    items: [
      {
        title: 'Contact Us',
        content:
          'Reach out through our contact form or email to start the conversation.',
      },
      {
        title: 'Get Started',
        content:
          "We'll schedule a consultation to discuss your project and create a custom plan.",
      },
    ],
    variant: 'numbered',
  },
};

export const LongContent: Story = {
  args: {
    title: 'Detailed Process',
    items: [
      {
        title: 'Initial Consultation',
        content:
          "During our initial consultation, we take the time to understand your business, your goals, and your vision. This is where we establish the foundation for our partnership and ensure we're aligned on objectives. We discuss your current challenges, desired outcomes, and any constraints we need to consider.",
      },
      {
        title: 'Project Planning',
        content:
          'Based on our consultation, we develop a comprehensive project plan that includes timelines, milestones, deliverables, and resource allocation. We present this plan to you for review and make any necessary adjustments to ensure it meets your expectations and requirements.',
      },
      {
        title: 'Execution & Delivery',
        content:
          "With the plan approved, we move into the execution phase. Our team works diligently to deliver each milestone on time and within budget. We maintain regular communication throughout this process, providing updates and seeking feedback to ensure we're on track.",
      },
    ],
    variant: 'numbered',
  },
};

export const MarkdownContent: Story = {
  args: {
    title: 'Features & Benefits',
    items: [
      {
        title: 'Modern Technology Stack',
        content:
          'We use **cutting-edge technologies** including React, TypeScript, and modern CSS frameworks to build fast, scalable applications.',
      },
      {
        title: 'Responsive Design',
        content:
          'All our solutions are *mobile-first* and work seamlessly across all devices and screen sizes.',
      },
      {
        title: 'SEO Optimized',
        content:
          'We implement best practices for search engine optimization to help your site rank higher and reach more customers.',
      },
    ],
    variant: 'numbered',
  },
};
