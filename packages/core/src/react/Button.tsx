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
  href?: string;
  target?: string;
  rel?: string;
}

export const Button = forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ButtonProps
>(
  (
    {
      type = 'button',
      variant = 'primary',
      size = 'md',
      className,
      disabled = false,
      children,
      href,
      target,
      rel,
      ...props
    },
    ref
  ) => {
    const buttonClasses = clsx(
      'button',
      // Disabled state overrides hover effects
      disabled ? 'button-disabled' : 'button-interactive',
      buttonVariantClasses[variant],
      buttonSizeClasses[size],
      className
    );

    // If href is provided, render as anchor tag
    if (href) {
      // For anchor tags, we can't use disabled attribute, but we can apply disabled styling
      const anchorClasses = clsx(
        buttonClasses,
        disabled && 'pointer-events-none opacity-50'
      );

      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={disabled ? undefined : href}
          target={target}
          rel={rel}
          className={anchorClasses}
          aria-disabled={disabled}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {children}
        </a>
      );
    }

    // Otherwise render as button
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={type}
        disabled={disabled}
        className={buttonClasses}
        aria-disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
