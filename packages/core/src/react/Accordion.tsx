import { Disclosure, Transition } from '@headlessui/react';
import { clsx } from '@bracketbear/core';

export interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
  defaultOpen?: boolean;
}

export interface AccordionProps {
  items: AccordionItem[];
  className?: string;
  variant?: 'default' | 'bordered' | 'minimal';
}

/**
 * Accordion Component
 *
 * A collapsible content component built on Headless UI.
 * Supports multiple variants and customizable styling.
 */
export function Accordion({
  items,
  className,
  variant = 'default',
}: AccordionProps) {
  const baseClasses = clsx(
    'w-full',
    variant === 'bordered' && 'space-y-2',
    className
  );

  const itemClasses = clsx(
    'overflow-hidden',
    variant === 'bordered' &&
      'rounded-lg border border-neutral-600 bg-neutral-800/50',
    variant === 'minimal' && 'border-b border-neutral-700 last:border-b-0'
  );

  const buttonClasses = clsx(
    'flex w-full items-center justify-between p-3 text-left text-sm font-medium text-white/90 transition-colors',
    variant === 'bordered' && 'hover:bg-neutral-700/50',
    variant === 'minimal' && 'py-2 hover:text-white'
  );

  const contentClasses = clsx(
    'transition-all duration-200 ease-in-out',
    variant === 'bordered' &&
      'border-t border-neutral-600 bg-neutral-800/30 p-3',
    variant === 'minimal' && 'pb-2'
  );

  return (
    <div className={baseClasses}>
      {items.map((item) => (
        <Disclosure key={item.id} defaultOpen={item.defaultOpen}>
          {({ open }) => (
            <div className={itemClasses}>
              <Disclosure.Button className={buttonClasses}>
                <span>{item.title}</span>
                <svg
                  className={clsx(
                    'h-4 w-4 text-white/60 transition-transform duration-200',
                    open && 'rotate-180'
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </Disclosure.Button>

              <Transition
                enter="transition duration-200 ease-out"
                enterFrom="transform scale-95 opacity-0"
                enterTo="transform scale-100 opacity-100"
                leave="transition duration-150 ease-in"
                leaveFrom="transform scale-100 opacity-100"
                leaveTo="transform scale-95 opacity-0"
              >
                <Disclosure.Panel className={contentClasses}>
                  {item.content}
                </Disclosure.Panel>
              </Transition>
            </div>
          )}
        </Disclosure>
      ))}
    </div>
  );
}
