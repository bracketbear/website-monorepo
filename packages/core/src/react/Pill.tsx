import { type ReactNode } from 'react';
import { clsx } from 'clsx';
import { Button } from './Button';

interface PillProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  variant?: 'default' | 'skill' | 'selected';
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
  const buttonSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md';

  return (
    <Button
      onClick={onClick}
      size={buttonSize}
      variant="unstyled"
      className={clsx(
        'pill',
        variant === 'skill' && 'pill-skill',
        variant === 'selected' && 'pill-selected',
        isInteractive && 'pill-skill-interactive',
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
