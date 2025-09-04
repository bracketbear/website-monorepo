import { Fragment, useEffect, useState, useCallback } from 'react';
import { Transition } from '@headlessui/react';
import { clsx } from 'clsx';

export interface ToastProps {
  /** Whether the toast is visible */
  isVisible: boolean;
  /** Toast message content */
  message: string;
  /** Toast type for styling */
  type?: 'info' | 'success' | 'warning' | 'error';
  /** Duration in milliseconds before auto-hiding (0 = no auto-hide) */
  duration?: number;
  /** Callback when toast should close */
  onClose: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show an icon */
  showIcon?: boolean;
}

/**
 * Toast Component
 *
 * A notification component that appears temporarily to show status messages.
 * Built on Headless UI for smooth animations and accessibility.
 */
export function Toast({
  isVisible,
  message,
  type = 'info',
  duration = 4000,
  onClose,
  className,
  showIcon = true,
}: ToastProps) {
  // Auto-hide after duration with pause on hover/focus
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (duration > 0 && isVisible && !isPaused) {
      const newTimer = setTimeout(() => {
        onClose();
      }, duration);
      setTimer(newTimer);
      return () => {
        if (newTimer) clearTimeout(newTimer);
      };
    }
  }, [duration, isVisible, onClose, isPaused]);

  const pauseTimer = useCallback(() => {
    setIsPaused(true);
    if (timer) {
      clearTimeout(timer);
      setTimer(null);
    }
  }, [timer]);

  const resumeTimer = useCallback(() => {
    setIsPaused(false);
  }, []);

  const getIcon = () => {
    if (!showIcon) return null;

    switch (type) {
      case 'success':
        return (
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
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case 'warning':
        return (
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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        );
      case 'error':
        return (
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
        );
      case 'info':
      default:
        return (
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
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  return (
    <Transition
      show={isVisible}
      as={Fragment}
      enter="transform ease-out duration-300 transition"
      enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enterTo="translate-y-0 opacity-100 sm:translate-x-0"
      leave="transition ease-in duration-100"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div
        className={clsx(
          'pointer-events-auto w-full max-w-[90vw] min-w-[280px] overflow-hidden rounded-lg sm:max-w-md',
          'border border-white/20 bg-black/80 backdrop-blur-md',
          'shadow-2xl shadow-black/50',
          className
        )}
        onMouseEnter={pauseTimer}
        onMouseLeave={resumeTimer}
        onFocus={pauseTimer}
        onBlur={resumeTimer}
      >
        <div className="flex items-start p-3">
          {showIcon && (
            <div className="mr-2 flex-shrink-0 text-white">{getIcon()}</div>
          )}
          <div className="min-w-0 flex-1">
            {message.split('\n').map((line, index) => (
              <p
                key={index}
                className={`text-base font-medium text-white ${index > 0 ? 'mt-0.5' : ''}`}
              >
                {line}
              </p>
            ))}
          </div>
          <div className="ml-2 flex-shrink-0">
            <button
              onClick={onClose}
              className="inline-flex rounded p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus:ring-2 focus:ring-white/50 focus:ring-offset-1 focus:ring-offset-black/80 focus:outline-none"
            >
              <span className="sr-only">Close</span>
              <svg
                className="h-3.5 w-3.5"
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
            </button>
          </div>
        </div>
      </div>
    </Transition>
  );
}
