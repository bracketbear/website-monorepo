import { forwardRef, type InputHTMLAttributes } from 'react';

export interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  error?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ error, className = '', size = 'md', ...props }, ref) => {
    const sizeClasses = size === 'sm' ? 'p-1 text-xs rounded' : 'p-2 font-mono';
    return (
      <input
        ref={ref}
        className={`tangible tangible-input border-brand-dark/30 focus:ring-brand-orange text-brand-dark w-full rounded border bg-white transition-all focus:ring-2 focus:outline-none ${
          error ? 'animate-shake border-error' : ''
        } ${sizeClasses} ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id || props.name}-error` : undefined}
        {...props}
      />
    );
  }
);

TextInput.displayName = 'TextInput';
