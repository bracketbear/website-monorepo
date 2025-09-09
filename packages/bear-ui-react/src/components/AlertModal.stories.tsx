import type { Meta, StoryObj } from '@storybook/react';
import { AlertModal } from '@bracketbear/bear-ui-react';
import { useState } from 'react';

const meta: Meta<typeof AlertModal> = {
  title: 'AlertModal',
  component: AlertModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['info', 'success', 'warning', 'error'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component to handle modal state
const AlertModalWrapper = (args: React.ComponentProps<typeof AlertModal>) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(true)}
        className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        Open Alert Modal
      </button>
      {isOpen && (
        <AlertModal
          {...args}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onConfirm={() => {
            console.log('Confirmed!');
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
};

export const Info: Story = {
  render: (args) => <AlertModalWrapper {...args} />,
  args: {
    title: 'Information',
    message:
      'This is an informational message. Please review the details carefully.',
    type: 'info',
    buttonText: 'Got it',
  },
};

export const Success: Story = {
  render: (args) => <AlertModalWrapper {...args} />,
  args: {
    title: 'Success!',
    message:
      'Your action has been completed successfully. All changes have been saved.',
    type: 'success',
    buttonText: 'Continue',
  },
};

export const Warning: Story = {
  render: (args) => <AlertModalWrapper {...args} />,
  args: {
    title: 'Warning',
    message: 'This action cannot be undone. Are you sure you want to proceed?',
    type: 'warning',
    buttonText: 'Proceed',
  },
};

export const Error: Story = {
  render: (args) => <AlertModalWrapper {...args} />,
  args: {
    title: 'Error',
    message:
      'Something went wrong. Please try again or contact support if the problem persists.',
    type: 'error',
    buttonText: 'Try Again',
  },
};

export const LongMessage: Story = {
  render: (args) => <AlertModalWrapper {...args} />,
  args: {
    title: 'Important Notice',
    message:
      'This is a longer message that demonstrates how the AlertModal handles extended content. It should wrap properly and maintain good readability. The modal will adjust its height accordingly to accommodate the content while maintaining proper spacing and visual hierarchy.',
    type: 'info',
    buttonText: 'I Understand',
  },
};

export const CustomButtonText: Story = {
  render: (args) => <AlertModalWrapper {...args} />,
  args: {
    title: 'Custom Action',
    message: 'This modal has a custom button text to demonstrate flexibility.',
    type: 'success',
    buttonText: 'Awesome!',
  },
};
