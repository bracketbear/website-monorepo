import React from 'react';
import clsx from 'clsx';

export interface SkillPillProps {
  children: React.ReactNode;
  variant?: 'default' | 'selected' | 'interactive';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function SkillPill({
  children,
  variant = 'default',
  size = 'md',
  className,
  onClick,
  disabled = false,
}: SkillPillProps) {
  const baseClasses = [
    'font-bold uppercase border-2 border-foreground transition-all duration-300',
    'halftone-shadow',
    'max-w-[120px] truncate',
  ];

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const variantClasses = {
    default: ['bg-primary text-primary-foreground'],
    selected: [
      'bg-foreground text-background',
      'scale-105',
      'halftone-shadow-dark',
    ],
    interactive: [
      'bg-background text-foreground',
      'hover:translate-x-[-2px] hover:translate-y-[-2px]',
      'cursor-pointer',
    ],
  };

  const interactiveClasses = ['transform-gpu hover:scale-105 active:scale-95'];

  const classes = clsx(
    ...baseClasses,
    sizeClasses[size],
    ...variantClasses[variant],
    disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
    ...(onClick ? interactiveClasses : []),
    className
  );

  // Character limit for display
  const CHAR_LIMIT = 20;
  let displayText = String(children);
  const isTruncated = displayText.length > CHAR_LIMIT;
  if (isTruncated) {
    displayText = displayText.slice(0, CHAR_LIMIT - 1) + '…';
  }

  if (onClick) {
    return (
      <button
        type="button"
        className={classes}
        onClick={onClick}
        disabled={disabled}
        title={String(children)}
      >
        {displayText}
      </button>
    );
  }

  return (
    <span className={classes} title={String(children)}>
      {displayText}
    </span>
  );
}
