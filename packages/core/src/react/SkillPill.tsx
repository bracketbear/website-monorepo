import { type ReactNode } from 'react';
import { clsx } from 'clsx';

interface SkillPillProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  selected?: boolean;
  onClick?: () => void;
}

export default function SkillPill({
  children,
  size = 'md',
  className,
  selected,
  onClick,
}: SkillPillProps) {
  return (
    <button
      onClick={() => onClick?.()}
      className={clsx(
        'pill',
        selected ? 'pill-selected' : 'pill-skill',
        onClick && 'pill-skill-interactive',
        size === 'sm' && 'pill-sm',
        size === 'md' && 'pill-md',
        size === 'lg' && 'pill-lg',
        className
      )}
    >
      {children}
    </button>
  );
}
