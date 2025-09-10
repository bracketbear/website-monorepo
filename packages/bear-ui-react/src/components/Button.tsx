import { forwardRef } from 'react';
import { clsx } from 'clsx';
import {
  buttonVariantClasses,
  buttonSizeClasses,
  type ButtonVariant,
  type ButtonSize,
} from '@bracketbear/bear-ui';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  target?: string;
  rel?: string;
  /** Icon to display on the left side of the button */
  leftIcon?: React.ReactNode;
  /** Icon to display on the right side of the button */
  rightIcon?: React.ReactNode;
  /** Icon to display when this is an icon-only button */
  icon?: React.ReactNode;
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
      leftIcon,
      rightIcon,
      icon,
      ...props
    },
    ref
  ) => {
    // Determine if this is an icon-only button
    const isIconOnly = Boolean(icon) && !children && !leftIcon && !rightIcon;

    // Determine the actual size to use
    const actualSize =
      isIconOnly && size !== 'icon' && size !== 'iconRounded' ? 'icon' : size;

    const buttonClasses = clsx(
      'button',
      // Disabled state overrides hover effects
      disabled ? 'button-disabled' : 'button-interactive',
      buttonVariantClasses[variant],
      buttonSizeClasses[actualSize],
      className
    );

    // Render the button content
    const renderContent = () => {
      if (isIconOnly) {
        return icon;
      }

      return (
        <>
          {leftIcon && <span className="mr-2 flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="ml-2 flex-shrink-0">{rightIcon}</span>}
        </>
      );
    };

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
          {renderContent()}
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
        {renderContent()}
      </button>
    );
  }
);

Button.displayName = 'Button';
