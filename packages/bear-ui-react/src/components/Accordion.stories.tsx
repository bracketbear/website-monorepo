import type { Meta, StoryObj } from '@storybook/react';
import { Accordion } from '@bracketbear/bear-ui-react';

const meta: Meta<typeof Accordion> = {
  title: 'Accordion',
  component: Accordion,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'bordered', 'minimal'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleItems = [
  {
    id: '1',
    title: 'What is Bracket Bear?',
    content: (
      <div className="space-y-2">
        <p>
          Bracket Bear is a creative development studio specializing in
          interactive experiences, web applications, and digital solutions.
        </p>
        <p>
          We combine technical expertise with creative vision to deliver
          exceptional results for our clients.
        </p>
      </div>
    ),
  },
  {
    id: '2',
    title: 'What services do you offer?',
    content: (
      <div className="space-y-2">
        <p>Our services include:</p>
        <ul className="ml-4 list-inside list-disc space-y-1">
          <li>Web Development</li>
          <li>Interactive Experiences</li>
          <li>UI/UX Design</li>
          <li>Digital Strategy</li>
        </ul>
      </div>
    ),
  },
  {
    id: '3',
    title: 'How do I get started?',
    content: (
      <div className="space-y-2">
        <p>
          Getting started is easy! Simply reach out to us through our contact
          form or email, and we'll schedule a consultation to discuss your
          project needs.
        </p>
        <p>
          We'll work with you to understand your goals and create a custom
          solution that fits your budget and timeline.
        </p>
      </div>
    ),
    defaultOpen: true,
  },
];

export const Default: Story = {
  args: {
    items: sampleItems,
  },
  decorators: [
    (Story) => (
      <div className="rounded-lg bg-gray-900 p-6">
        <Story />
      </div>
    ),
  ],
};

export const Bordered: Story = {
  args: {
    items: sampleItems,
    variant: 'bordered',
  },
  decorators: [
    (Story) => (
      <div className="rounded-lg bg-gray-900 p-6">
        <Story />
      </div>
    ),
  ],
};

export const Minimal: Story = {
  args: {
    items: sampleItems,
    variant: 'minimal',
  },
  decorators: [
    (Story) => (
      <div className="rounded-lg bg-gray-900 p-6">
        <Story />
      </div>
    ),
  ],
};

export const SingleItem: Story = {
  args: {
    items: [
      {
        id: '1',
        title: 'Single Item',
        content: <p>This is a single accordion item for testing purposes.</p>,
      },
    ],
  },
  decorators: [
    (Story) => (
      <div className="rounded-lg bg-gray-900 p-6">
        <Story />
      </div>
    ),
  ],
};

export const LongContent: Story = {
  args: {
    items: [
      {
        id: '1',
        title: 'Long Content Example',
        content: (
          <div className="space-y-4">
            <p>
              This accordion item contains a lot of content to demonstrate how
              the component handles longer text and multiple paragraphs.
            </p>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam, quis nostrud exercitation ullamco laboris
              nisi ut aliquip ex ea commodo consequat.
            </p>
            <p>
              Duis aute irure dolor in reprehenderit in voluptate velit esse
              cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
              cupidatat non proident, sunt in culpa qui officia deserunt mollit
              anim id est laborum.
            </p>
            <div className="rounded bg-neutral-800 p-4">
              <h4 className="mb-2 font-semibold">Code Example</h4>
              <pre className="text-sm text-neutral-300">
                <code>{`function example() {
  return "Hello World";
}`}</code>
              </pre>
            </div>
          </div>
        ),
      },
    ],
  },
  decorators: [
    (Story) => (
      <div className="rounded-lg bg-gray-900 p-6">
        <Story />
      </div>
    ),
  ],
};

export const CustomStyling: Story = {
  args: {
    items: sampleItems,
    className: 'max-w-2xl mx-auto',
  },
  decorators: [
    (Story) => (
      <div className="rounded-lg bg-gray-900 p-6">
        <Story />
      </div>
    ),
  ],
};
