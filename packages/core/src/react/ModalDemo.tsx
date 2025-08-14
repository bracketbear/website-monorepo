import { useState } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';
import { AlertModal } from './AlertModal';
import { ConfirmModal } from './ConfirmModal';
import { ImageViewerModal } from './ImageViewerModal';
import { useModal } from './hooks/useModal';

export function ModalDemo() {
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const { showAlert, showConfirm, showImageViewer } = useModal();

  const demoImages = [
    {
      src: 'https://picsum.photos/800/600?random=1',
      alt: 'Demo Image 1',
      caption: 'This is a beautiful demo image',
    },
    {
      src: 'https://picsum.photos/800/600?random=2',
      alt: 'Demo Image 2',
      caption: 'Another stunning demo image',
    },
    {
      src: 'https://picsum.photos/800/600?random=3',
      alt: 'Demo Image 3',
      caption: 'The final demo image',
    },
  ];

  const handleShowAlert = (type: 'info' | 'success' | 'warning' | 'error') => {
    showAlert(
      `${type.charAt(0).toUpperCase() + type.slice(1)} Alert`,
      `This is a ${type} alert message.`,
      {
        type,
        buttonText: 'Got it!',
        onConfirm: () => console.log(`${type} alert confirmed`),
      }
    );
  };

  const handleShowConfirm = (isDestructive = false) => {
    showConfirm(
      isDestructive ? 'Delete Item' : 'Confirm Action',
      isDestructive
        ? 'Are you sure you want to delete this item? This action cannot be undone.'
        : 'Are you sure you want to proceed with this action?',
      {
        confirmText: isDestructive ? 'Delete Forever' : 'Proceed',
        cancelText: 'Cancel',
        confirmVariant: isDestructive ? 'danger' : 'primary',
        isDestructive,
        onConfirm: () => console.log('Action confirmed'),
        onCancel: () => console.log('Action cancelled'),
      }
    );
  };

  const handleShowImageGallery = () => {
    showImageViewer(demoImages, {
      title: 'Demo Image Gallery',
    });
  };

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-brand-dark font-heading mb-4">
          Modal System Demo
        </h1>
        <p className="text-lg text-brand-dark/80">
          Explore the different types of modals available in the Bracket Bear design system
        </p>
      </div>

      {/* Alert Modals */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-brand-dark font-heading">
          Alert Modals
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            onClick={() => handleShowAlert('info')}
          >
            Info Alert
          </Button>
          <Button
            variant="primary"
            onClick={() => handleShowAlert('success')}
          >
            Success Alert
          </Button>
          <Button
            variant="primary"
            onClick={() => handleShowAlert('warning')}
          >
            Warning Alert
          </Button>
          <Button
            variant="primary"
            onClick={() => handleShowAlert('error')}
          >
            Error Alert
          </Button>
        </div>
      </div>

      {/* Confirmation Modals */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-brand-dark font-heading">
          Confirmation Modals
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => handleShowConfirm(false)}
          >
            Standard Confirm
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleShowConfirm(true)}
          >
            Destructive Confirm
          </Button>
        </div>
      </div>

      {/* Image Viewer Modal */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-brand-dark font-heading">
          Image Viewer Modal
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="tertiary"
            onClick={handleShowImageGallery}
          >
            Open Image Gallery
          </Button>
        </div>
      </div>

      {/* Custom Modal */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-brand-dark font-heading">
          Custom Modal
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            onClick={() => setCustomModalOpen(true)}
          >
            Open Custom Modal
          </Button>
        </div>
      </div>

      {/* Custom Modal */}
      <Modal
        isOpen={customModalOpen}
        onClose={() => setCustomModalOpen(false)}
        title="Custom Modal"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-brand-dark">
            This is a custom modal with your own content. You can put anything you want here!
          </p>
          <div className="bg-brand-light p-4 rounded-lg border-2 border-brand-dark">
            <h3 className="font-bold text-brand-dark mb-2">Custom Content</h3>
            <p className="text-brand-dark/80">
              This could be a form, a list, or any other React component you need.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setCustomModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => setCustomModalOpen(false)}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
