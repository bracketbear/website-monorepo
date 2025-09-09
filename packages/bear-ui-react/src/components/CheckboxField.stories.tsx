import type { Meta, StoryObj } from '@storybook/react';
import { CheckboxField } from '@bracketbear/bear-ui-react';
import { useState } from 'react';

const meta: Meta<typeof CheckboxField> = {
  title: 'CheckboxField',
  component: CheckboxField,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    checked: {
      control: { type: 'boolean' },
    },
    disabled: {
      control: { type: 'boolean' },
    },
    required: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component to handle checkbox state
const CheckboxFieldWrapper = (
  args: Omit<React.ComponentProps<typeof CheckboxField>, 'onChange'>
) => {
  const [checked, setChecked] = useState(args.checked || false);

  return (
    <CheckboxField
      {...args}
      checked={checked}
      onChange={(e) => setChecked(e.target.checked)}
    />
  );
};

export const Default: Story = {
  render: (args) => <CheckboxFieldWrapper {...args} />,
  args: {
    id: 'checkbox-1',
    label: 'I agree to the terms and conditions',
    checked: false,
  },
};

export const Checked: Story = {
  render: (args) => <CheckboxFieldWrapper {...args} />,
  args: {
    id: 'checkbox-2',
    label: 'Subscribe to newsletter',
    checked: true,
  },
};

export const WithError: Story = {
  render: (args) => <CheckboxFieldWrapper {...args} />,
  args: {
    id: 'checkbox-3',
    label: 'Accept privacy policy',
    checked: false,
    error: 'This field is required',
  },
};

export const Disabled: Story = {
  render: (args) => <CheckboxFieldWrapper {...args} />,
  args: {
    id: 'checkbox-4',
    label: 'This option is disabled',
    checked: false,
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  render: (args) => <CheckboxFieldWrapper {...args} />,
  args: {
    id: 'checkbox-5',
    label: 'This option is disabled and checked',
    checked: true,
    disabled: true,
  },
};

export const Required: Story = {
  render: (args) => <CheckboxFieldWrapper {...args} />,
  args: {
    id: 'checkbox-6',
    label: 'Required checkbox',
    checked: false,
    required: true,
  },
};

export const LongLabel: Story = {
  render: (args) => <CheckboxFieldWrapper {...args} />,
  args: {
    id: 'checkbox-7',
    label:
      'I understand and agree to the terms of service, privacy policy, and all other legal documents that govern the use of this application.',
    checked: false,
  },
};

export const FormExample: Story = {
  render: () => (
    <div className="w-80 space-y-4">
      <CheckboxField
        id="terms"
        label="I agree to the terms and conditions"
        required
      />
      <CheckboxField
        id="newsletter"
        label="Subscribe to our newsletter"
        checked={true}
      />
      <CheckboxField
        id="marketing"
        label="Receive marketing communications"
        checked={false}
      />
      <CheckboxField
        id="privacy"
        label="I have read and understood the privacy policy"
        error="Please accept the privacy policy to continue"
      />
    </div>
  ),
};
