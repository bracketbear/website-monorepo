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
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          target={target}
          rel={rel}
          className={buttonClasses}
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
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
