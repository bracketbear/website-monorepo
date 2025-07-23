import { forwardRef, type InputHTMLAttributes } from 'react';

export interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  error?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ error, className = '', size = 'md', ...props }, ref) => {
    const sizeClasses =
      size === 'sm'
        ? 'p-1 text-xs border rounded border-2'
        : 'p-2 font-mono border-2';
    return (
      <input
        ref={ref}
        className={`border-brand-dark focus:ring-brand-orange text-brand-dark w-full rounded rounded-tl-none bg-white transition-all focus:ring-2 focus:outline-none ${
          error ? 'animate-shake border-brand-red' : ''
        } ${sizeClasses} ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id || props.name}-error` : undefined}
        {...props}
      />
    );
  }
);

TextInput.displayName = 'TextInput';
