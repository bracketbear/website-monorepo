import { forwardRef } from 'react';
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';
import { clsx } from 'clsx';
import { Button } from './Button';

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when the modal should close */
  onClose: () => void;
  /** Modal title */
  title?: React.ReactNode;
  /** Modal content */
  children: React.ReactNode;
  /** Whether to show a close button */
  showCloseButton?: boolean;
  /** Whether clicking outside closes the modal */
  closeOnOutsideClick?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Whether to show backdrop */
  showBackdrop?: boolean;
}

const sizeClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-2xl',
  full: 'sm:max-w-full sm:mx-4',
};

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      children,
      showCloseButton = true,
      closeOnOutsideClick = true,
      className,
      size = 'md',
      showBackdrop = true,
    },
    ref
  ) => {
    // Don't render anything when closed
    if (!isOpen) return null;

    return (
      <Dialog
        open={isOpen}
        onClose={closeOnOutsideClick ? onClose : () => {}}
        className="relative z-[9999]"
        ref={ref}
      >
        {/* Backdrop */}
        {showBackdrop && (
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
          />
        )}

        {/* Modal Container */}
        <div className="fixed inset-0 z-[9999] w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className={clsx(
                'card tangible relative transform overflow-hidden p-0 transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full data-closed:sm:translate-y-0 data-closed:sm:scale-95',
                // Max height constraints for tall content
                'max-h-[90vh] sm:max-h-[85vh]',
                sizeClasses[size],
                className
              )}
            >
              {/* Sticky Header */}
              {(title || showCloseButton) && (
                <div className="border-brand-dark bg-brand-orange sticky top-0 z-10 flex items-center justify-between border-b-2 p-4">
                  {title && (
                    <DialogTitle
                      as="h2"
                      className="text-brand-dark font-heading text-xl font-bold"
                    >
                      {title}
                    </DialogTitle>
                  )}
                  {showCloseButton && (
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={onClose}
                      aria-label="Close modal"
                      className="rounded-full"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </Button>
                  )}
                </div>
              )}

              {/* Scrollable Content Area */}
              <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-0 sm:max-h-[calc(85vh-120px)]">
                {children}
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    );
  }
);

Modal.displayName = 'Modal';
