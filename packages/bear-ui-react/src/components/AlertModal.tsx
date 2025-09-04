import { forwardRef } from 'react';
import { Modal, type ModalProps } from './Modal';
import { Button } from './Button';

export interface AlertModalProps
  extends Omit<ModalProps, 'children' | 'title'> {
  /** Alert title */
  title: string;
  /** Alert message */
  message: string;
  /** Alert type for styling */
  type?: 'info' | 'success' | 'warning' | 'error';
  /** Custom button text */
  buttonText?: string;
  /** Callback when button is clicked */
  onConfirm?: () => void;
}

export const AlertModal = forwardRef<HTMLDivElement, AlertModalProps>(
  (
    {
      title,
      message,
      type = 'info',
      buttonText = 'OK',
      onConfirm,
      onClose,
      ...modalProps
    },
    ref
  ) => {
    const handleConfirm = () => {
      onConfirm?.();
      onClose();
    };

    return (
      <Modal
        ref={ref}
        title={
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {type === 'info' && 'ℹ️'}
              {type === 'success' && '✅'}
              {type === 'warning' && '⚠️'}
              {type === 'error' && '❌'}
            </span>
            <span>{title}</span>
          </div>
        }
        onClose={onClose}
        size="sm"
        showCloseButton={false}
        {...modalProps}
      >
        <div className="space-y-6 text-center">
          <p className="text-brand-dark text-lg">{message}</p>
          <div className="flex justify-center">
            <Button
              variant={type === 'error' ? 'secondary' : 'primary'}
              size="lg"
              onClick={handleConfirm}
            >
              {buttonText}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }
);

AlertModal.displayName = 'AlertModal';
