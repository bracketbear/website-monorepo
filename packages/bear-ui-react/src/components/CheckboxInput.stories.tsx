import type { Meta, StoryObj } from '@storybook/react';
import { CheckboxInput } from '@bracketbear/bear-ui-react';

const meta: Meta<typeof CheckboxInput> = {
  title: 'CheckboxInput',
  component: CheckboxInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: 'checkbox-1',
  },
};

export const Checked: Story = {
  args: {
    id: 'checkbox-2',
    checked: true,
  },
};

export const WithError: Story = {
  args: {
    id: 'checkbox-3',
    error: 'This field is required',
  },
};

export const Disabled: Story = {
  args: {
    id: 'checkbox-4',
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    id: 'checkbox-5',
    checked: true,
    disabled: true,
  },
};

export const Small: Story = {
  args: {
    id: 'checkbox-6',
    size: 'sm',
  },
};

export const SmallChecked: Story = {
  args: {
    id: 'checkbox-7',
    size: 'sm',
    checked: true,
  },
};

export const Required: Story = {
  args: {
    id: 'checkbox-8',
    required: true,
  },
};

export const WithLabel: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <CheckboxInput {...args} />
      <label htmlFor={args.id} className="text-sm font-medium text-gray-700">
        Accept terms and conditions
      </label>
    </div>
  ),
  args: {
    id: 'checkbox-9',
  },
};

export const FormExample: Story = {
  render: () => (
    <div className="w-80 space-y-4">
      <div className="flex items-center gap-2">
        <CheckboxInput id="terms" required />
        <label htmlFor="terms" className="text-sm font-medium text-gray-700">
          I agree to the terms and conditions
        </label>
      </div>

      <div className="flex items-center gap-2">
        <CheckboxInput id="newsletter" checked={true} />
        <label
          htmlFor="newsletter"
          className="text-sm font-medium text-gray-700"
        >
          Subscribe to newsletter
        </label>
      </div>

      <div className="flex items-center gap-2">
        <CheckboxInput id="marketing" />
        <label
          htmlFor="marketing"
          className="text-sm font-medium text-gray-700"
        >
          Receive marketing communications
        </label>
      </div>

      <div className="flex items-center gap-2">
        <CheckboxInput id="privacy" error="Please accept the privacy policy" />
        <label htmlFor="privacy" className="text-sm font-medium text-gray-700">
          I have read the privacy policy
        </label>
      </div>
    </div>
  ),
};
