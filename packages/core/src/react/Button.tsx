import { forwardRef } from 'react';
import { clsx } from 'clsx';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const variantClasses = {
  primary: 'bg-foreground text-background',
  secondary: 'bg-background text-foreground border-foreground',
  ghost: 'bg-transparent text-foreground',
};

const sizeClasses = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      type = 'button',
      variant = 'primary',
      size = 'md',
      className,
      disabled = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={clsx(
          'border-default halftone-shadow transform font-black uppercase transition-all',
          // Disabled state overrides hover effects
          disabled
            ? 'cursor-not-allowed opacity-50 hover:scale-100 hover:rotate-0 active:scale-100'
            : 'hover:scale-105 hover:rotate-1 active:scale-95',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
