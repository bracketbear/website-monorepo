import { forwardRef, Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { clsx } from 'clsx';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  /** The selected value */
  value?: string;
  /** Callback when selection changes */
  onChange?: (value: string) => void;
  /** Array of options */
  options: SelectOption[];
  /** Placeholder text */
  placeholder?: string;
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Whether the select has an error */
  error?: string;
  /** Additional CSS classes */
  className?: string;
  /** ID for the select */
  id?: string;
  /** Name for the select */
  name?: string;
  /** Whether the select is required */
  required?: boolean;
  /** ARIA label */
  'aria-label'?: string;
  /** ARIA described by */
  'aria-describedby'?: string;
  /** ARIA invalid */
  'aria-invalid'?: boolean;
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      value,
      onChange,
      options,
      placeholder = 'Select an option',
      disabled = false,
      error,
      className,
      id,
      name,
      required = false,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
      ...props
    },
    ref
  ) => {
    const selectedOption = options.find((option) => option.value === value);

    return (
      <div className={clsx('relative', className)}>
        <Listbox
          value={value}
          onChange={onChange}
          disabled={disabled}
          name={name}
        >
          <div className="relative">
            <Listbox.Button
              ref={ref}
              id={id}
              className={clsx(
                'tangible tangible-input border-brand-dark/30 focus:ring-brand-orange text-brand-dark w-full cursor-default rounded border bg-white py-2 pr-10 pl-3 text-left transition-all focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                error ? 'animate-shake border-error' : ''
              )}
              aria-label={ariaLabel}
              aria-describedby={ariaDescribedBy}
              aria-invalid={ariaInvalid}
              aria-required={required}
              {...props}
            >
              <span className="block truncate">
                {selectedOption ? selectedOption.label : placeholder}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon
                  className="h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
              </span>
            </Listbox.Button>
            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="border-brand-dark/30 absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded border bg-white py-1 text-left text-base shadow-lg focus:outline-none sm:text-sm">
                {options.map((option) => (
                  <Listbox.Option
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className={({ active, disabled }) =>
                      clsx(
                        'text-brand-dark relative cursor-default py-2 pr-4 pl-3 select-none',
                        active && !disabled ? 'bg-brand-orange/10' : '',
                        disabled && 'cursor-not-allowed opacity-50'
                      )
                    }
                  >
                    {({ selected }) => (
                      <>
                        <span
                          className={clsx(
                            'block truncate text-left',
                            selected ? 'font-medium' : 'font-normal'
                          )}
                        >
                          {option.label}
                        </span>
                        {selected ? (
                          <span className="text-brand-orange absolute inset-y-0 right-0 flex items-center pr-3">
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </Listbox>
        {error && (
          <p
            id={ariaDescribedBy}
            className="text-brand-red mt-1 text-left text-sm"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
