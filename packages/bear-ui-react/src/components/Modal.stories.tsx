import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Modal } from '@bracketbear/bear-ui-react';
import { Button } from '@bracketbear/bear-ui-react';

const meta: Meta<typeof Modal> = {
  title: 'Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'xl', 'full'],
    },
    showCloseButton: {
      control: { type: 'boolean' },
    },
    closeOnOutsideClick: {
      control: { type: 'boolean' },
    },
    showBackdrop: {
      control: { type: 'boolean' },
    },
    glass: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Helper component to manage modal state
const ModalWrapper = ({ children, ...props }: any) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal {...props} isOpen={isOpen} onClose={() => setIsOpen(false)}>
        {children}
      </Modal>
    </>
  );
};

export const Default: Story = {
  render: (args) => (
    <ModalWrapper {...args}>
      <div className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Modal Title</h3>
        <p className="mb-4 text-gray-600">
          This is the default modal content. It can contain any React elements.
        </p>
        <div className="flex gap-2">
          <Button variant="primary">Save</Button>
          <Button variant="secondary">Cancel</Button>
        </div>
      </div>
    </ModalWrapper>
  ),
};

export const WithTitle: Story = {
  render: (args) => (
    <ModalWrapper {...args} title="Modal with Title">
      <div className="p-6">
        <p className="mb-4 text-gray-600">
          This modal has a title in the header.
        </p>
        <div className="flex gap-2">
          <Button variant="primary">Confirm</Button>
          <Button variant="secondary">Cancel</Button>
        </div>
      </div>
    </ModalWrapper>
  ),
};

export const Small: Story = {
  render: (args) => (
    <ModalWrapper {...args} size="sm" title="Small Modal">
      <div className="p-6">
        <p className="text-gray-600">This is a small modal.</p>
      </div>
    </ModalWrapper>
  ),
};

export const Large: Story = {
  render: (args) => (
    <ModalWrapper {...args} size="lg" title="Large Modal">
      <div className="p-6">
        <p className="mb-4 text-gray-600">
          This is a large modal with more space for content.
        </p>
        <div className="space-y-4">
          <div className="flex h-32 items-center justify-center rounded bg-gray-100">
            Content Area 1
          </div>
          <div className="flex h-32 items-center justify-center rounded bg-gray-100">
            Content Area 2
          </div>
        </div>
      </div>
    </ModalWrapper>
  ),
};

export const FullScreen: Story = {
  render: (args) => (
    <ModalWrapper {...args} size="full" title="Full Screen Modal">
      <div className="p-6">
        <p className="mb-4 text-gray-600">
          This modal takes up the full screen width.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex h-48 items-center justify-center rounded bg-gray-100">
            Left Column
          </div>
          <div className="flex h-48 items-center justify-center rounded bg-gray-100">
            Right Column
          </div>
        </div>
      </div>
    </ModalWrapper>
  ),
};

export const Glass: Story = {
  render: (args) => (
    <ModalWrapper {...args} glass title="Glass Modal">
      <div className="p-6">
        <p className="mb-4 text-gray-600">
          This modal uses glass styling with backdrop blur.
        </p>
        <div className="flex gap-2">
          <Button variant="primary">Save</Button>
          <Button variant="secondary">Cancel</Button>
        </div>
      </div>
    </ModalWrapper>
  ),
};

export const NoCloseButton: Story = {
  render: (args) => (
    <ModalWrapper {...args} showCloseButton={false} title="No Close Button">
      <div className="p-6">
        <p className="mb-4 text-gray-600">
          This modal doesn't have a close button in the header.
        </p>
        <div className="flex gap-2">
          <Button variant="primary">Save</Button>
          <Button variant="secondary">Cancel</Button>
        </div>
      </div>
    </ModalWrapper>
  ),
};

export const NoBackdrop: Story = {
  render: (args) => (
    <ModalWrapper {...args} showBackdrop={false} title="No Backdrop">
      <div className="p-6">
        <p className="mb-4 text-gray-600">
          This modal doesn't have a backdrop.
        </p>
        <div className="flex gap-2">
          <Button variant="primary">Save</Button>
          <Button variant="secondary">Cancel</Button>
        </div>
      </div>
    </ModalWrapper>
  ),
};

export const LongContent: Story = {
  render: (args) => (
    <ModalWrapper {...args} title="Long Content Modal">
      <div className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Long Content Example</h3>
        <div className="space-y-4">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="rounded bg-gray-50 p-4">
              <h4 className="mb-2 font-medium">Section {i + 1}</h4>
              <p className="text-gray-600">
                This is some content for section {i + 1}. The modal should
                handle scrolling properly for long content.
              </p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex gap-2">
          <Button variant="primary">Save</Button>
          <Button variant="secondary">Cancel</Button>
        </div>
      </div>
    </ModalWrapper>
  ),
};
