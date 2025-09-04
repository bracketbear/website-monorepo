import { Fragment } from 'react';
import { Popover as HeadlessPopover, Transition } from '@headlessui/react';
import { clsx } from '@bracketbear/core';

export interface PopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  placement?:
    | 'top'
    | 'top-start'
    | 'top-end'
    | 'bottom'
    | 'bottom-start'
    | 'bottom-end'
    | 'left'
    | 'left-start'
    | 'left-end'
    | 'right'
    | 'right-start'
    | 'right-end';
  offset?: number;
  disabled?: boolean;
  /** Whether to show an arrow pointing to the trigger */
  showArrow?: boolean;
}

/**
 * Popover Component
 *
 * A floating panel component that appears relative to a trigger element.
 * Built on Headless UI for accessibility and positioning.
 */
export function Popover({
  trigger,
  children,
  className,
  placement = 'bottom-start',
  offset = 8,
  disabled = false,
  showArrow = false,
}: PopoverProps) {
  const baseClasses = clsx('relative inline-block', className);

  const panelClasses = clsx(
    'z-50 rounded-lg border border-neutral-600 bg-neutral-900/95 shadow-2xl shadow-black/60 backdrop-blur-md',
    'min-w-64 max-w-md'
  );

  const getPlacementClasses = () => {
    const baseOffset = `mt-${offset}`;

    switch (placement) {
      case 'top':
        return `${baseOffset} bottom-full left-1/2 -translate-x-1/2`;
      case 'top-start':
        return `${baseOffset} bottom-full left-0`;
      case 'top-end':
        return `${baseOffset} bottom-full right-0`;
      case 'bottom':
        return `${baseOffset} top-full left-1/2 -translate-x-1/2`;
      case 'bottom-start':
        return `${baseOffset} top-full left-0`;
      case 'bottom-end':
        return `${baseOffset} top-full right-0`;
      case 'left':
        return `${baseOffset} right-full top-1/2 -translate-y-1/2`;
      case 'left-start':
        return `${baseOffset} right-full top-0`;
      case 'left-end':
        return `${baseOffset} right-full bottom-0`;
      case 'right':
        return `${baseOffset} left-full top-1/2 -translate-y-1/2`;
      case 'right-start':
        return `${baseOffset} left-full top-0`;
      case 'right-end':
        return `${baseOffset} left-full bottom-0`;
      default:
        return `${baseOffset} top-full left-0`;
    }
  };

  const getArrowClasses = () => {
    switch (placement) {
      case 'top':
        return 'top-full left-1/2 -translate-x-1/2 border-t-neutral-600 border-l-transparent border-r-transparent border-b-transparent';
      case 'top-start':
        return 'top-full left-6 border-t-neutral-600 border-l-transparent border-r-transparent border-b-transparent';
      case 'top-end':
        return 'top-full right-6 border-t-neutral-600 border-l-transparent border-r-transparent border-b-transparent';
      case 'bottom':
        return 'bottom-full left-1/2 -translate-x-1/2 border-b-neutral-600 border-l-transparent border-r-transparent border-t-transparent';
      case 'bottom-start':
        return 'bottom-full left-6 border-b-neutral-600 border-l-transparent border-r-transparent border-t-transparent';
      case 'bottom-end':
        return 'bottom-full right-2 border-b-neutral-600 border-l-transparent border-r-transparent border-t-transparent';
      case 'left':
        return 'left-full top-1/2 -translate-y-1/2 border-l-neutral-600 border-t-transparent border-b-transparent border-r-transparent';
      case 'left-start':
        return 'left-full top-6 border-l-neutral-600 border-t-transparent border-b-transparent border-r-transparent';
      case 'left-end':
        return 'left-full bottom-6 border-l-neutral-600 border-t-transparent border-b-transparent border-r-transparent';
      case 'right':
        return 'right-full top-1/2 -translate-y-1/2 border-r-neutral-600 border-t-transparent border-b-transparent border-l-transparent';
      case 'right-start':
        return 'right-full top-6 border-r-neutral-600 border-t-transparent border-b-transparent border-l-transparent';
      case 'right-end':
        return 'right-full bottom-6 border-r-neutral-600 border-t-transparent border-b-transparent border-l-transparent';
      default:
        return 'top-full left-1/2 -translate-x-1/2 border-t-neutral-600 border-l-transparent border-r-transparent border-b-transparent';
    }
  };

  return (
    <div className={baseClasses}>
      <HeadlessPopover className="relative">
        <HeadlessPopover.Button
          as="div"
          className={clsx(
            'cursor-pointer',
            disabled && 'cursor-not-allowed opacity-50'
          )}
          disabled={disabled}
        >
          {trigger}
        </HeadlessPopover.Button>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="opacity-0 translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-1"
        >
          <HeadlessPopover.Panel
            className={clsx('absolute', getPlacementClasses())}
          >
            <div className={panelClasses}>
              {showArrow && (
                <div
                  className={clsx(
                    'absolute h-0 w-0 border-6',
                    getArrowClasses()
                  )}
                />
              )}
              <div>{children}</div>
            </div>
          </HeadlessPopover.Panel>
        </Transition>
      </HeadlessPopover>
    </div>
  );
}
