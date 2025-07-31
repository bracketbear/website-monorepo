import clsx from 'clsx';
import type { FC, ReactNode } from 'react';

export interface FieldProps {
  label: string;
  id: string;
  error?: string;
  className?: string;
  children: ReactNode;
  errorSpace?: boolean; // If true, always reserve space for error
}

export const Field: FC<FieldProps> = ({
  label,
  id,
  error,
  className = '',
  children,
  errorSpace = true,
}) => {
  return (
    <div className={`relative mt-6 ${className}`}>
      <span
        className={`absolute -top-6 left-0 z-10 flex h-6 items-center rounded-t-sm px-4 text-sm font-bold tracking-wide transition-colors duration-200 ${
          error
            ? 'bg-brand-red text-brand-light'
            : 'bg-brand-dark text-brand-light'
        }`}
      >
        {label}
      </span>
      {children}
      <div
        className={clsx(
          'mt-1',
          error ? 'h-6' : 'h-0',
          errorSpace ? 'min-h-6' : 'min-h-0'
        )}
      >
        {error && (
          <div id={`${id}-error`} className="text-brand-red mt-1 font-bold">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
