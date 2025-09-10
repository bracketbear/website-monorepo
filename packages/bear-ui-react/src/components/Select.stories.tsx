import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Select, SelectOption } from './Select';

const meta: Meta<typeof Select> = {
  title: 'Select',
  component: Select,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A customizable select component built with Headless UI.',
      },
    },
  },
  argTypes: {
    value: {
      control: 'text',
      description: 'The selected value',
    },
    onChange: {
      action: 'changed',
      description: 'Callback when selection changes',
    },
    options: {
      control: 'object',
      description: 'Array of options',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the select is disabled',
    },
    error: {
      control: 'text',
      description: 'Error message',
    },
    required: {
      control: 'boolean',
      description: 'Whether the select is required',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const basicOptions: SelectOption[] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
  { value: 'option4', label: 'Option 4' },
];

const contactSubjectOptions: SelectOption[] = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'collaboration', label: 'Collaboration Opportunity' },
  { value: 'freelance', label: 'Freelance Project' },
  { value: 'employment', label: 'Employment Opportunity' },
  { value: 'speaking', label: 'Speaking Engagement' },
  { value: 'other', label: 'Other' },
];

const longOptions: SelectOption[] = [
  {
    value: 'very-long-option-1',
    label: 'This is a very long option that might wrap or get truncated',
  },
  {
    value: 'very-long-option-2',
    label:
      'Another extremely long option with lots of text that demonstrates how the component handles overflow',
  },
  { value: 'short', label: 'Short' },
  { value: 'medium-length', label: 'Medium length option' },
];

const disabledOptions: SelectOption[] = [
  { value: 'enabled1', label: 'Enabled Option 1' },
  { value: 'disabled1', label: 'Disabled Option 1', disabled: true },
  { value: 'enabled2', label: 'Enabled Option 2' },
  { value: 'disabled2', label: 'Disabled Option 2', disabled: true },
  { value: 'enabled3', label: 'Enabled Option 3' },
];

// Controlled component wrapper for stories
const ControlledSelect = (args: any) => {
  const [value, setValue] = useState(args.value || '');

  return (
    <div className="w-80">
      <Select
        {...args}
        value={value}
        onChange={(newValue) => {
          setValue(newValue);
          args.onChange?.(newValue);
        }}
      />
    </div>
  );
};

export const Default: Story = {
  render: ControlledSelect,
  args: {
    options: basicOptions,
    placeholder: 'Select an option',
  },
};

export const WithValue: Story = {
  render: ControlledSelect,
  args: {
    options: basicOptions,
    value: 'option2',
    placeholder: 'Select an option',
  },
};

export const WithPlaceholder: Story = {
  render: ControlledSelect,
  args: {
    options: basicOptions,
    placeholder: 'Choose your option',
  },
};

export const Disabled: Story = {
  render: ControlledSelect,
  args: {
    options: basicOptions,
    disabled: true,
    placeholder: 'This is disabled',
  },
};

export const WithError: Story = {
  render: ControlledSelect,
  args: {
    options: basicOptions,
    error: 'This field is required',
    placeholder: 'Select an option',
  },
};

export const Required: Story = {
  render: ControlledSelect,
  args: {
    options: basicOptions,
    required: true,
    placeholder: 'Select an option',
    'aria-label': 'Required select field',
  },
};

export const ContactSubject: Story = {
  render: ControlledSelect,
  args: {
    options: contactSubjectOptions,
    placeholder: 'What can I help you with?',
    'aria-label': 'Contact subject',
  },
};

export const LongOptions: Story = {
  render: ControlledSelect,
  args: {
    options: longOptions,
    placeholder: 'Select from long options',
  },
};

export const WithDisabledOptions: Story = {
  render: ControlledSelect,
  args: {
    options: disabledOptions,
    placeholder: 'Some options are disabled',
  },
};

export const CustomStyling: Story = {
  render: ControlledSelect,
  args: {
    options: basicOptions,
    placeholder: 'Custom styled select',
    className: 'border-brand-red',
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="w-80 space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium">Default</label>
        <ControlledSelect
          options={basicOptions}
          placeholder="Select an option"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">With Value</label>
        <ControlledSelect
          options={basicOptions}
          value="option2"
          placeholder="Select an option"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">With Error</label>
        <ControlledSelect
          options={basicOptions}
          error="This field is required"
          placeholder="Select an option"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Disabled</label>
        <ControlledSelect
          options={basicOptions}
          disabled
          placeholder="This is disabled"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Required</label>
        <ControlledSelect
          options={basicOptions}
          required
          placeholder="Select an option"
        />
      </div>
    </div>
  ),
};
