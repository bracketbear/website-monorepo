import { type ReactNode } from 'react';
import { clsx } from 'clsx';

interface SkillPillProps {
  children: ReactNode;
  variant?: 'default' | 'selected';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function SkillPill({
  children,
  variant = 'default',
  size = 'md',
  className,
}: SkillPillProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border-2 font-medium',
        {
          // Variants
          'border-brand-dark bg-brand-yellow text-brand-dark':
            variant === 'default',
          'border-brand-red bg-brand-red text-white': variant === 'selected',
          // Sizes
          'px-2 py-1 text-xs': size === 'sm',
          'px-3 py-1.5 text-sm': size === 'md',
          'px-4 py-2 text-base': size === 'lg',
        },
        className
      )}
    >
      {children}
    </span>
  );
} 