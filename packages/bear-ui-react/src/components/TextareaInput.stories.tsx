import type { Meta, StoryObj } from '@storybook/react';
import { TextareaInput } from '@bracketbear/bear-ui-react';

const meta: Meta<typeof TextareaInput> = {
  title: 'TextareaInput',
  component: TextareaInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter your message...',
    rows: 4,
  },
};

export const WithValue: Story = {
  args: {
    value: 'This is a sample textarea with some content already filled in.',
    rows: 4,
  },
};

export const WithError: Story = {
  args: {
    placeholder: 'Enter your message...',
    rows: 4,
    error: 'Message is required',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'This textarea is disabled...',
    rows: 4,
    disabled: true,
  },
};

export const ReadOnly: Story = {
  args: {
    value: 'This textarea is read-only and cannot be edited.',
    rows: 4,
    readOnly: true,
  },
};

export const Required: Story = {
  args: {
    placeholder: 'Required field...',
    rows: 4,
    required: true,
  },
};

export const Large: Story = {
  args: {
    placeholder: 'Enter a longer message...',
    rows: 8,
    cols: 50,
  },
};

export const Small: Story = {
  args: {
    placeholder: 'Short message...',
    rows: 2,
    cols: 30,
  },
};

export const WithLabel: Story = {
  render: (args) => (
    <div className="space-y-2">
      <label
        htmlFor="textarea-input"
        className="block text-sm font-medium text-gray-700"
      >
        Message
      </label>
      <TextareaInput {...args} id="textarea-input" />
    </div>
  ),
  args: {
    placeholder: 'Enter your message...',
    rows: 4,
  },
};

export const FormExample: Story = {
  render: () => (
    <form className="w-80 space-y-4">
      <div>
        <label
          htmlFor="subject"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Subject
        </label>
        <input
          id="subject"
          type="text"
          placeholder="Enter subject..."
          className="w-full rounded border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label
          htmlFor="message"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Message
        </label>
        <TextareaInput
          id="message"
          placeholder="Enter your message..."
          rows={6}
          required
        />
      </div>
      <div>
        <label
          htmlFor="notes"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Additional Notes (Optional)
        </label>
        <TextareaInput
          id="notes"
          placeholder="Any additional information..."
          rows={3}
        />
      </div>
    </form>
  ),
};
