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
  /** Whether to use glass styling */
  glass?: boolean;
}

const sizeClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-2xl',
  lg: 'sm:max-w-4xl',
  xl: 'sm:max-w-6xl',
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
      glass = false,
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
            className={clsx(
              'fixed inset-0 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in',
              glass
                ? 'bg-black/60 backdrop-blur-md'
                : 'bg-black/50 backdrop-blur-sm'
            )}
          />
        )}

        {/* Modal Container */}
        <div className="fixed inset-0 z-[9999] w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className={clsx(
                'relative transform overflow-hidden p-0 transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full data-closed:sm:translate-y-0 data-closed:sm:scale-95',
                // Max height constraints for tall content
                'max-h-[90vh] sm:max-h-[85vh]',
                sizeClasses[size],
                // Glass or card styling
                glass ? 'card-neutral tangible' : 'card-neutral tangible',
                className
              )}
            >
              {/* Sticky Header */}
              {(title || showCloseButton) && (
                <div
                  className={clsx(
                    'sticky top-0 z-10 flex items-center justify-between border-b-2 p-4',
                    'border-brand-dark bg-card-neutral'
                  )}
                >
                  {title && (
                    <DialogTitle
                      as="h2"
                      className="font-heading text-foreground text-xl font-bold"
                    >
                      {title}
                    </DialogTitle>
                  )}
                  {showCloseButton && (
                    <Button
                      variant="ghost"
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
              <div className="max-h-[calc(90vh-7.5rem)] overflow-y-auto p-0 sm:max-h-[calc(85vh-7.5rem)]">
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
