import React, { forwardRef, InputHTMLAttributes } from 'react';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  className?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ error, className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`border-brand-dark focus:ring-brand-orange w-full rounded rounded-tl-none border-2 bg-white p-2 font-mono transition-all focus:ring-2 focus:outline-none ${
          error ? 'animate-shake border-brand-red' : ''
        } ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id || props.name}-error` : undefined}
        {...props}
      />
    );
  }
);

TextInput.displayName = 'TextInput';
