import type { Meta, StoryObj } from '@storybook/react';
import { Popover, Button } from '@bracketbear/bear-ui-react';

const meta: Meta<typeof Popover> = {
  title: 'Popover',
  component: Popover,
  parameters: {
    layout: 'padded',
    viewport: {
      defaultViewport: 'desktop',
    },
    docs: {
      canvas: {
        layout: 'fullscreen',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    placement: {
      control: { type: 'select' },
      options: [
        'top',
        'top-start',
        'top-end',
        'bottom',
        'bottom-start',
        'bottom-end',
        'left',
        'left-start',
        'left-end',
        'right',
        'right-start',
        'right-end',
      ],
    },
    showArrow: {
      control: { type: 'boolean' },
    },
    disabled: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleContent = (
  <div className="p-4">
    <h3 className="mb-2 text-lg font-semibold text-white">Popover Content</h3>
    <p className="mb-3 text-sm text-gray-300">
      This is a sample popover with some content. You can put anything here!
    </p>
    <div className="flex gap-2">
      <button className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700">
        Action
      </button>
      <button className="rounded bg-gray-600 px-3 py-1 text-sm text-white hover:bg-gray-700">
        Cancel
      </button>
    </div>
  </div>
);

export const Default: Story = {
  render: (args) => <Popover {...args}>{sampleContent}</Popover>,
  args: {
    trigger: <Button>Click me</Button>,
    placement: 'bottom-start',
  },
};

export const WithArrow: Story = {
  render: (args) => <Popover {...args}>{sampleContent}</Popover>,
  args: {
    trigger: <Button>Show with Arrow</Button>,
    placement: 'bottom',
    showArrow: true,
  },
};

export const TopPlacement: Story = {
  render: (args) => <Popover {...args}>{sampleContent}</Popover>,
  args: {
    trigger: <Button>Top Placement</Button>,
    placement: 'top',
    showArrow: true,
  },
};

export const RightPlacement: Story = {
  render: (args) => (
    <div className="flex justify-start p-8">
      <Popover {...args}>{sampleContent}</Popover>
    </div>
  ),
  args: {
    trigger: <Button>Right Placement</Button>,
    placement: 'right',
    showArrow: true,
  },
};

export const LeftPlacement: Story = {
  render: (args) => (
    <div className="flex justify-end p-8">
      <Popover {...args}>{sampleContent}</Popover>
    </div>
  ),
  args: {
    trigger: <Button>Left Placement</Button>,
    placement: 'left',
    showArrow: true,
  },
};

export const Disabled: Story = {
  render: (args) => <Popover {...args}>{sampleContent}</Popover>,
  args: {
    trigger: <Button disabled>Disabled Popover</Button>,
    placement: 'bottom-start',
    disabled: true,
  },
};

export const CustomTrigger: Story = {
  render: (args) => (
    <Popover {...args}>
      <div className="p-4">
        <h3 className="mb-2 text-lg font-semibold text-white">
          Custom Trigger
        </h3>
        <p className="text-sm text-gray-300">
          This popover uses a custom trigger element instead of a button.
        </p>
      </div>
    </Popover>
  ),
  args: {
    trigger: (
      <div className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700">
        <span>Custom Trigger</span>
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    ),
    placement: 'bottom-start',
    showArrow: true,
  },
};

export const MenuExample: Story = {
  render: (args) => (
    <Popover {...args}>
      <div className="py-2">
        <button className="w-full px-4 py-2 text-left text-white hover:bg-gray-700">
          Profile
        </button>
        <button className="w-full px-4 py-2 text-left text-white hover:bg-gray-700">
          Settings
        </button>
        <button className="w-full px-4 py-2 text-left text-white hover:bg-gray-700">
          Help
        </button>
        <hr className="my-2 border-gray-600" />
        <button className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700">
          Sign Out
        </button>
      </div>
    </Popover>
  ),
  args: {
    trigger: (
      <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-gray-600">
        <span className="text-sm text-white">U</span>
      </div>
    ),
    placement: 'bottom-end',
    showArrow: true,
  },
};

export const TooltipExample: Story = {
  render: (args) => (
    <Popover {...args}>
      <div className="p-3">
        <p className="text-sm text-white">
          This is a tooltip-style popover with helpful information.
        </p>
      </div>
    </Popover>
  ),
  args: {
    trigger: (
      <div className="inline-flex cursor-pointer items-center gap-1 rounded bg-gray-200 px-2 py-1 text-sm text-gray-800 hover:bg-gray-300">
        Click me
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    ),
    placement: 'top',
    showArrow: true,
  },
};
