import React from 'react';

interface BrutalistCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'gradient' | 'dark';
  hoverEffect?: boolean;
}

export const BrutalistCard: React.FC<BrutalistCardProps> = ({
  children,
  className = '',
  variant = 'default',
  hoverEffect = false, // Changed default to false
}) => {
  const baseClasses =
    'border-2 border-brand-dark p-6 shadow-[3px_3px_0_var(--color-brand-dark)] transition-all duration-200';

  const variantClasses = {
    default: 'bg-brand-light',
    gradient: 'bg-gradient-to-br from-brand-light to-brand-yellow',
    dark: 'bg-brand-dark text-brand-light',
  };

  const hoverClasses = hoverEffect
    ? 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_var(--color-brand-dark)]'
    : '';

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${hoverClasses} ${className}`}
    >
      {children}
    </div>
  );
};
