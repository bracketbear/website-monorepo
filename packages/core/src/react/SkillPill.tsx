import { type ReactNode } from 'react';
import { Pill } from './Pill';

interface SkillPillProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  selected?: boolean;
  onClick?: () => void;
}

export function SkillPill({
  children,
  size = 'md',
  className,
  selected,
  onClick,
}: SkillPillProps) {
  return (
    <Pill
      size={size}
      className={className}
      variant={selected ? 'selected' : 'skill'}
      interactive={!!onClick}
      onClick={onClick}
    >
      {children}
    </Pill>
  );
}
