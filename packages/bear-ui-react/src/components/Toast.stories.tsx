import type { Meta, StoryObj } from '@storybook/react';
import { Toast } from '@bracketbear/bear-ui-react';
import { useState } from 'react';

const meta: Meta<typeof Toast> = {
  title: 'Toast',
  component: Toast,
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
    type: {
      control: { type: 'select' },
      options: ['info', 'success', 'warning', 'error'],
    },
    showIcon: {
      control: { type: 'boolean' },
    },
    duration: {
      control: { type: 'number' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component to handle toast state
const ToastWrapper = (
  args: Omit<React.ComponentProps<typeof Toast>, 'isVisible' | 'onClose'>
) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="space-y-4">
      <button
        onClick={() => setIsVisible(true)}
        className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        Show Toast
      </button>
      {isVisible && (
        <Toast
          {...args}
          isVisible={isVisible}
          onClose={() => setIsVisible(false)}
        />
      )}
    </div>
  );
};

export const Info: Story = {
  render: (args) => <ToastWrapper {...args} />,
  args: {
    message: 'This is an informational message.',
    type: 'info',
    duration: 4000,
  },
};

export const Success: Story = {
  render: (args) => <ToastWrapper {...args} />,
  args: {
    message: 'Operation completed successfully!',
    type: 'success',
    duration: 4000,
  },
};

export const Warning: Story = {
  render: (args) => <ToastWrapper {...args} />,
  args: {
    message: 'Please review your input before proceeding.',
    type: 'warning',
    duration: 4000,
  },
};

export const Error: Story = {
  render: (args) => <ToastWrapper {...args} />,
  args: {
    message: 'Something went wrong. Please try again.',
    type: 'error',
    duration: 4000,
  },
};

export const WithoutIcon: Story = {
  render: (args) => <ToastWrapper {...args} />,
  args: {
    message: 'This toast has no icon.',
    type: 'info',
    showIcon: false,
    duration: 4000,
  },
};

export const LongMessage: Story = {
  render: (args) => <ToastWrapper {...args} />,
  args: {
    message:
      'This is a longer message that demonstrates how the toast handles extended content. It should wrap properly and maintain good readability.',
    type: 'info',
    duration: 4000,
  },
};

export const MultiLineMessage: Story = {
  render: (args) => <ToastWrapper {...args} />,
  args: {
    message:
      'First line of the message.\nSecond line with more details.\nThird line for additional information.',
    type: 'success',
    duration: 4000,
  },
};

export const NoAutoHide: Story = {
  render: (args) => <ToastWrapper {...args} />,
  args: {
    message: 'This toast will not auto-hide. Click the X to close it.',
    type: 'info',
    duration: 0,
  },
};

export const ShortDuration: Story = {
  render: (args) => <ToastWrapper {...args} />,
  args: {
    message: 'This toast will disappear quickly.',
    type: 'success',
    duration: 1000,
  },
};

export const LongDuration: Story = {
  render: (args) => <ToastWrapper {...args} />,
  args: {
    message: 'This toast will stay visible for a long time.',
    type: 'warning',
    duration: 10000,
  },
};

export const CustomStyling: Story = {
  render: (args) => <ToastWrapper {...args} />,
  args: {
    message: 'This toast has custom styling.',
    type: 'info',
    duration: 4000,
    className: 'border-purple-500 bg-purple-900/80',
  },
};

export const ToastDemo: Story = {
  render: () => {
    const [toasts, setToasts] = useState<
      Array<{
        id: string;
        type: React.ComponentProps<typeof Toast>['type'];
        message: string;
      }>
    >([]);

    const addToast = (
      type: React.ComponentProps<typeof Toast>['type'],
      message: string
    ) => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts((prev) => [...prev, { id, type, message }]);
    };

    const removeToast = (id: string) => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    return (
      <div className="p-8">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Toast Demo</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => addToast('info', 'Info message')}
              className="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
            >
              Info
            </button>
            <button
              onClick={() => addToast('success', 'Success message')}
              className="rounded bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600"
            >
              Success
            </button>
            <button
              onClick={() => addToast('warning', 'Warning message')}
              className="rounded bg-yellow-500 px-3 py-1 text-sm text-white hover:bg-yellow-600"
            >
              Warning
            </button>
            <button
              onClick={() => addToast('error', 'Error message')}
              className="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
            >
              Error
            </button>
          </div>
        </div>

        <div className="fixed top-4 right-4 z-50 max-w-sm space-y-2">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              isVisible={true}
              message={toast.message}
              type={toast.type}
              duration={4000}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </div>
      </div>
    );
  },
};
