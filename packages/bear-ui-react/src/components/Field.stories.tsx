import type { Meta, StoryObj } from '@storybook/react';
import { Field, TextInput } from '@bracketbear/bear-ui-react';

const meta: Meta<typeof Field> = {
  title: 'Field',
  component: Field,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    required: {
      control: { type: 'boolean' },
    },
    errorSpace: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Field {...args}>
      <TextInput placeholder="Enter text..." />
    </Field>
  ),
  args: {
    id: 'field-1',
    label: 'Name',
  },
};

export const WithError: Story = {
  render: (args) => (
    <Field {...args}>
      <TextInput placeholder="Enter email..." />
    </Field>
  ),
  args: {
    id: 'field-2',
    label: 'Email',
    error: 'Please enter a valid email address',
  },
};

export const Required: Story = {
  render: (args) => (
    <Field {...args}>
      <TextInput placeholder="Enter password..." type="password" />
    </Field>
  ),
  args: {
    id: 'field-3',
    label: 'Password',
    required: true,
  },
};

export const RequiredWithError: Story = {
  render: (args) => (
    <Field {...args}>
      <TextInput placeholder="Enter phone..." type="tel" />
    </Field>
  ),
  args: {
    id: 'field-4',
    label: 'Phone Number',
    required: true,
    error: 'Phone number is required',
  },
};

export const NoErrorSpace: Story = {
  render: (args) => (
    <Field {...args}>
      <TextInput placeholder="Enter text..." />
    </Field>
  ),
  args: {
    id: 'field-5',
    label: 'Optional Field',
    errorSpace: false,
  },
};

export const LongLabel: Story = {
  render: (args) => (
    <Field {...args}>
      <TextInput placeholder="Enter your full name..." />
    </Field>
  ),
  args: {
    id: 'field-6',
    label: 'Full Legal Name (as it appears on official documents)',
  },
};

export const FormExample: Story = {
  render: () => (
    <form className="w-80 space-y-6">
      <Field id="name" label="Full Name" required>
        <TextInput placeholder="Enter your full name" />
      </Field>

      <Field id="email" label="Email Address" required>
        <TextInput type="email" placeholder="Enter your email" />
      </Field>

      <Field id="phone" label="Phone Number">
        <TextInput type="tel" placeholder="Enter your phone number" />
      </Field>

      <Field
        id="password"
        label="Password"
        required
        error="Password must be at least 8 characters"
      >
        <TextInput type="password" placeholder="Enter your password" />
      </Field>

      <Field id="confirm" label="Confirm Password" required>
        <TextInput type="password" placeholder="Confirm your password" />
      </Field>
    </form>
  ),
};

export const CustomStyling: Story = {
  render: (args) => (
    <Field {...args}>
      <TextInput placeholder="Custom styled field..." />
    </Field>
  ),
  args: {
    id: 'field-7',
    label: 'Custom Field',
    className: 'border-2 border-blue-500 p-4 rounded-lg',
  },
};
