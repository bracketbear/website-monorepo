import React, { forwardRef, type TextareaHTMLAttributes } from 'react';

export interface TextareaInputProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  className?: string;
}

export const TextareaInput = forwardRef<
  HTMLTextAreaElement,
  TextareaInputProps
>(({ error, className = '', ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={`tangible tangible-input border-brand-dark/30 focus:ring-brand-orange w-full rounded border bg-white p-2 font-mono transition-all focus:ring-2 focus:outline-none ${
        error ? 'animate-shake border-error' : ''
      } ${className}`}
      aria-invalid={!!error}
      aria-describedby={error ? `${props.id || props.name}-error` : undefined}
      {...props}
    />
  );
});

TextareaInput.displayName = 'TextareaInput';
