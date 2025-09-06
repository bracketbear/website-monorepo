import type { Meta, StoryObj } from '@storybook/react';
import { TextInput } from '@bracketbear/bear-ui-react';

const meta: Meta<typeof TextInput> = {
  title: 'TextInput',
  component: TextInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md'],
    },
    type: {
      control: { type: 'select' },
      options: ['text', 'email', 'password', 'number', 'tel', 'url'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const WithValue: Story = {
  args: {
    value: 'Hello World',
    placeholder: 'Enter text...',
  },
};

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'Enter your email...',
  },
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter your password...',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    placeholder: 'Small input...',
  },
};

export const WithError: Story = {
  args: {
    placeholder: 'Enter text...',
    error: 'This field is required',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled input...',
    disabled: true,
  },
};

export const ReadOnly: Story = {
  args: {
    value: 'Read-only value',
    readOnly: true,
  },
};

export const Required: Story = {
  args: {
    placeholder: 'Required field...',
    required: true,
  },
};

export const WithLabel: Story = {
  render: (args) => (
    <div className="space-y-2">
      <label
        htmlFor="text-input"
        className="block text-sm font-medium text-gray-700"
      >
        Text Input
      </label>
      <TextInput {...args} id="text-input" />
    </div>
  ),
  args: {
    placeholder: 'Enter text...',
  },
};

export const FormExample: Story = {
  render: () => (
    <form className="w-80 space-y-4">
      <div>
        <label
          htmlFor="name"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Name
        </label>
        <TextInput id="name" placeholder="Enter your name" required />
      </div>
      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <TextInput
          id="email"
          type="email"
          placeholder="Enter your email"
          required
        />
      </div>
      <div>
        <label
          htmlFor="phone"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Phone
        </label>
        <TextInput
          id="phone"
          type="tel"
          placeholder="Enter your phone number"
        />
      </div>
    </form>
  ),
};
