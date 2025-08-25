import clsx from 'clsx';
import React from 'react';

export interface FieldProps {
  label: string;
  id: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
  errorSpace?: boolean; // If true, always reserve space for error
  required?: boolean; // Whether the field is required
}

export const Field: React.FC<FieldProps> = ({
  label,
  id,
  error,
  className = '',
  children,
  errorSpace = true,
  required = false,
}) => {
  return (
    <div className={`relative mt-6 ${className}`}>
      <label
        htmlFor={id}
        className={`absolute -top-6 left-0 z-10 flex h-6 items-center rounded-t-sm text-sm font-bold tracking-wide transition-colors duration-200 ${
          error ? 'text-error' : 'text-brand-dark'
        }`}
      >
        {label}
        {required && (
          <span className="text-error ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
      {children}
      <div
        className={clsx(
          'mt-1',
          error ? 'h-6' : 'h-0',
          errorSpace ? 'min-h-6' : 'min-h-0'
        )}
      >
        {error && (
          <div
            id={`${id}-error`}
            className="text-error mt-1 text-xs font-bold"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
