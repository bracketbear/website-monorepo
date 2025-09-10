import { type ReactNode } from 'react';
import { clsx } from 'clsx';
import { Button } from './Button';

export interface PillProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  variant?:
    | 'default'
    | 'skill'
    | 'selected'
    | 'brand-orange'
    | 'brand-red'
    | 'brand-green'
    | 'brand-blue'
    | 'brand-purple'
    | 'dark'
    | 'light'
    | 'outline-dark'
    | 'featured'
    | 'category'
    | 'flat'
    | 'outline'
    | 'glass'
    | 'glass-frosted';
  interactive?: boolean;
  onClick?: () => void;
}

export function Pill({
  children,
  size = 'md',
  className,
  variant = 'default',
  interactive = false,
  onClick,
}: PillProps) {
  // Automatically set interactive to true if onClick is provided
  const isInteractive = interactive || !!onClick;

  // Map pill sizes to button sizes
  const buttonSize = size === 'sm' ? 'xs' : size === 'lg' ? 'lg' : 'md';

  return (
    <Button
      onClick={onClick}
      size={buttonSize}
      variant="unstyled"
      className={clsx(
        'pill',
        // Base variants
        variant === 'default' && 'pill',
        variant === 'skill' && 'pill-skill',
        variant === 'selected' && 'pill-selected',
        variant === 'brand-orange' && 'pill-brand-orange',
        variant === 'brand-red' && 'pill-brand-red',
        variant === 'brand-green' && 'pill-brand-green',
        variant === 'brand-blue' && 'pill-brand-blue',
        variant === 'brand-purple' && 'pill-brand-purple',
        variant === 'dark' && 'pill-dark',
        variant === 'light' && 'pill-light',
        variant === 'outline-dark' && 'pill-outline-dark',
        variant === 'featured' && 'pill-featured',
        variant === 'category' && 'pill-category',
        variant === 'flat' && 'pill-flat',
        variant === 'outline' && 'pill-outline',
        variant === 'glass' && 'pill-glass',
        variant === 'glass-frosted' && 'pill-glass-frosted',
        // Interactive states
        isInteractive && 'pill-hover',
        // Size variants
        size === 'sm' && 'pill-sm',
        size === 'md' && 'pill-md',
        size === 'lg' && 'pill-lg',
        className
      )}
    >
      {children}
    </Button>
  );
}
