import { Fragment, isValidElement, useRef, useEffect, useState } from 'react';
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
  /** Whether to automatically adjust placement based on viewport boundaries */
  autoPlacement?: boolean;
  /** Maximum width of the popover panel */
  maxWidth?: string | number;
  /** Maximum height of the popover panel */
  maxHeight?: string | number;
}

/**
 * Calculate optimal placement based on viewport boundaries
 */
function calculateOptimalPlacement(
  triggerRect: DOMRect,
  panelRect: DOMRect,
  preferredPlacement: PopoverProps['placement'],
  offset: number
): NonNullable<PopoverProps['placement']> {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Calculate available space in each direction
  const spaceAbove = triggerRect.top;
  const spaceBelow = viewportHeight - triggerRect.bottom;
  const spaceLeft = triggerRect.left;
  const spaceRight = viewportWidth - triggerRect.right;

  // Calculate required space for panel
  const panelWidth = panelRect.width || 256; // fallback width
  const panelHeight = panelRect.height || 200; // fallback height

  // Check if preferred placement fits
  const fitsAbove = spaceAbove >= panelHeight + offset;
  const fitsBelow = spaceBelow >= panelHeight + offset;
  const fitsLeft = spaceLeft >= panelWidth + offset;
  const fitsRight = spaceRight >= panelWidth + offset;

  // Determine best placement based on available space
  if (preferredPlacement?.startsWith('bottom') && fitsBelow) {
    return preferredPlacement;
  }
  if (preferredPlacement?.startsWith('top') && fitsAbove) {
    return preferredPlacement;
  }
  if (preferredPlacement?.startsWith('right') && fitsRight) {
    return preferredPlacement;
  }
  if (preferredPlacement?.startsWith('left') && fitsLeft) {
    return preferredPlacement;
  }

  // Fallback to best available space
  if (fitsBelow) return 'bottom-start';
  if (fitsAbove) return 'top-start';
  if (fitsRight) return 'right-start';
  if (fitsLeft) return 'left-start';

  // If nothing fits well, use the preferred placement anyway
  return preferredPlacement || 'bottom-start';
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
  autoPlacement = true,
  maxWidth = '90vw',
  maxHeight = '80vh',
}: PopoverProps) {
  const baseClasses = clsx('relative inline-block', className);
  const [actualPlacement, setActualPlacement] = useState(placement);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const panelClasses = clsx(
    'z-50 rounded-lg border border-neutral-600 bg-neutral-900/95 shadow-2xl shadow-black/60 backdrop-blur-md',
    'min-w-64',
    // Apply max width and height constraints
    typeof maxWidth === 'number'
      ? `max-w-[${maxWidth}px]`
      : `max-w-[${maxWidth}]`,
    typeof maxHeight === 'number'
      ? `max-h-[${maxHeight}px]`
      : `max-h-[${maxHeight}]`,
    'overflow-auto' // Allow scrolling if content exceeds max dimensions
  );

  // Calculate optimal placement when popover opens
  useEffect(() => {
    if (autoPlacement && triggerRef.current && panelRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const panelRect = panelRef.current.getBoundingClientRect();
      const optimalPlacement = calculateOptimalPlacement(
        triggerRect,
        panelRect,
        placement,
        offset
      );
      setActualPlacement(optimalPlacement);
    } else {
      setActualPlacement(placement);
    }
  }, [autoPlacement, placement, offset]);

  const getPlacementClasses = () => {
    const baseOffset = `mt-${offset}`;

    switch (actualPlacement) {
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
    switch (actualPlacement) {
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

  // Check if the trigger is already a button element to avoid nesting
  const isTriggerButton =
    isValidElement(trigger) &&
    (trigger.type === 'button' ||
      (typeof trigger.type === 'function' &&
        'displayName' in trigger.type &&
        (trigger.type as any).displayName === 'Button') ||
      (typeof trigger.type === 'object' &&
        trigger.type !== null &&
        'displayName' in trigger.type &&
        (trigger.type as any).displayName === 'Button'));

  return (
    <div className={baseClasses}>
      <HeadlessPopover className="relative">
        {isTriggerButton ? (
          <HeadlessPopover.Button as={Fragment} disabled={disabled}>
            <div ref={triggerRef}>{trigger}</div>
          </HeadlessPopover.Button>
        ) : (
          <HeadlessPopover.Button
            className={clsx(
              'cursor-pointer',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            disabled={disabled}
          >
            <div ref={triggerRef}>{trigger}</div>
          </HeadlessPopover.Button>
        )}

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
            <div ref={panelRef} className={panelClasses}>
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
