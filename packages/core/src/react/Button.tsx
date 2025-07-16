import { forwardRef } from 'react';
import { clsx } from 'clsx';
import {
  buttonVariantClasses,
  buttonSizeClasses,
  type ButtonVariant,
  type ButtonSize,
} from '../utils/button-classes';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

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
          'button',
          // Disabled state overrides hover effects
          disabled ? 'button-disabled' : 'button-interactive',
          buttonVariantClasses[variant],
          buttonSizeClasses[size],
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
