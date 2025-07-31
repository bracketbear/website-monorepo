import { forwardRef, type TextareaHTMLAttributes } from 'react';

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
      className={`border-brand-dark focus:ring-brand-orange w-full rounded rounded-tl-none border-2 bg-white p-2 font-mono transition-all focus:ring-2 focus:outline-none ${
        error ? 'animate-shake border-brand-red' : ''
      } ${className}`}
      aria-invalid={!!error}
      aria-describedby={error ? `${props.id || props.name}-error` : undefined}
      {...props}
    />
  );
});

TextareaInput.displayName = 'TextareaInput';
