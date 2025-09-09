import type { Meta, StoryObj } from '@storybook/react';
import { ToastWrapper } from './ToastWrapper';
import { Button } from '@bracketbear/bear-ui-react';
import { useToast } from '@bracketbear/bear-ui-react';

// Component that demonstrates toast functionality
function ToastDemo() {
  const { toast } = useToast();

  const showSuccessToast = () => {
    toast({
      title: 'Success!',
      description: 'Your action was completed successfully.',
      type: 'success',
    });
  };

  const showErrorToast = () => {
    toast({
      title: 'Error',
      description: 'Something went wrong. Please try again.',
      type: 'error',
    });
  };

  const showWarningToast = () => {
    toast({
      title: 'Warning',
      description: 'Please review your input before proceeding.',
      type: 'warning',
    });
  };

  const showInfoToast = () => {
    toast({
      title: 'Information',
      description: 'Here is some useful information for you.',
      type: 'info',
    });
  };

  const showCustomToast = () => {
    toast({
      title: 'Custom Toast',
      description: 'This is a custom toast with a longer duration.',
      duration: 5000,
    });
  };

  return (
    <div className="space-y-4 p-8">
      <h2 className="mb-6 text-2xl font-bold">Toast Demo</h2>
      <div className="flex flex-wrap gap-4">
        <Button onClick={showSuccessToast} variant="primary">
          Success Toast
        </Button>
        <Button onClick={showErrorToast} variant="danger">
          Error Toast
        </Button>
        <Button onClick={showWarningToast} variant="secondary">
          Warning Toast
        </Button>
        <Button onClick={showInfoToast} variant="ghost">
          Info Toast
        </Button>
        <Button onClick={showCustomToast} variant="trippy">
          Custom Toast
        </Button>
      </div>
    </div>
  );
}

const meta: Meta<typeof ToastWrapper> = {
  title: 'ToastWrapper',
  component: ToastWrapper,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: false,
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ToastWrapper>
      <ToastDemo />
    </ToastWrapper>
  ),
};

export const WithCustomContent: Story = {
  render: () => (
    <ToastWrapper>
      <div className="bg-gradient-radial from-brand-orange via-brand-yellow to-brand-red rounded-2xl p-8">
        <h2 className="mb-6 text-2xl font-bold text-white">
          Toast Provider Demo
        </h2>
        <p className="mb-4 text-white">
          This component provides toast functionality throughout the
          application.
        </p>
        <ToastDemo />
      </div>
    </ToastWrapper>
  ),
};

export const MultipleToasts: Story = {
  render: () => {
    function MultipleToastDemo() {
      const { toast } = useToast();

      const showMultipleToasts = () => {
        toast({
          title: 'First Toast',
          description: 'This is the first toast.',
        });
        setTimeout(() => {
          toast({
            title: 'Second Toast',
            description: 'This is the second toast.',
          });
        }, 500);
        setTimeout(() => {
          toast({
            title: 'Third Toast',
            description: 'This is the third toast.',
          });
        }, 1000);
      };

      return (
        <div className="space-y-4 p-8">
          <h2 className="mb-6 text-2xl font-bold">Multiple Toasts Demo</h2>
          <Button onClick={showMultipleToasts} variant="primary">
            Show Multiple Toasts
          </Button>
        </div>
      );
    }

    return (
      <ToastWrapper>
        <MultipleToastDemo />
      </ToastWrapper>
    );
  },
};
