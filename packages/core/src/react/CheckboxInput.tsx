import React, { forwardRef, InputHTMLAttributes } from 'react';

export interface CheckboxInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  className?: string;
}

export const CheckboxInput = forwardRef<HTMLInputElement, CheckboxInputProps>(
  ({ error, className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="checkbox"
        className={`accent-brand-orange border-2 border-brand-dark rounded w-5 h-5 ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id || props.name}-error` : undefined}
        {...props}
      />
    );
  }
);

CheckboxInput.displayName = 'CheckboxInput'; 