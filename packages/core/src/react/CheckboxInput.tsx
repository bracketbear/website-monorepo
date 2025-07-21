import { forwardRef, type InputHTMLAttributes } from 'react';

export interface CheckboxInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  error?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const CheckboxInput = forwardRef<HTMLInputElement, CheckboxInputProps>(
  ({ error, className = '', size = 'md', ...props }, ref) => {
    const sizeClasses = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    return (
      <input
        ref={ref}
        type="checkbox"
        className={`accent-brand-orange border-2 border-brand-dark rounded text-brand-dark ${sizeClasses} ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id || props.name}-error` : undefined}
        {...props}
      />
    );
  }
);

CheckboxInput.displayName = 'CheckboxInput';
