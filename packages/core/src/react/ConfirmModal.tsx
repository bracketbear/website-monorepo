import { forwardRef } from 'react';
import { Modal, type ModalProps } from './Modal';
import { Button } from './Button';

export interface ConfirmModalProps
  extends Omit<ModalProps, 'children' | 'title'> {
  /** Confirmation title */
  title: string;
  /** Confirmation message */
  message: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Confirm button variant */
  confirmVariant?: 'primary' | 'secondary' | 'error';
  /** Cancel button variant */
  cancelVariant?: 'primary' | 'secondary';
  /** Callback when confirmed */
  onConfirm: () => void;
  /** Callback when cancelled */
  onCancel?: () => void;
  /** Whether this is a destructive action */
  isDestructive?: boolean;
}

export const ConfirmModal = forwardRef<HTMLDivElement, ConfirmModalProps>(
  (
    {
      title,
      message,
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      confirmVariant = 'primary',
      cancelVariant = 'secondary',
      onConfirm,
      onCancel,
      isDestructive = false,
      onClose,
      ...modalProps
    },
    ref
  ) => {
    const handleConfirm = () => {
      onConfirm();
      onClose();
    };

    const handleCancel = () => {
      onCancel?.();
      onClose();
    };

    // Override variants for destructive actions
    const finalConfirmVariant = isDestructive ? 'danger' : confirmVariant;

    return (
      <Modal
        ref={ref}
        title={title}
        onClose={onClose}
        size="sm"
        showCloseButton={false}
        {...modalProps}
      >
        <div className="space-y-6">
          <p className="text-brand-dark text-lg">{message}</p>
          <div className="flex justify-end gap-3">
            <Button variant={cancelVariant} size="md" onClick={handleCancel}>
              {cancelText}
            </Button>
            <Button
              variant={finalConfirmVariant}
              size="md"
              onClick={handleConfirm}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }
);

ConfirmModal.displayName = 'ConfirmModal';
