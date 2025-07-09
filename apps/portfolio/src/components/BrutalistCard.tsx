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
    'border-2 border-[#111] p-6 shadow-[3px_3px_0_#111] transition-all duration-200';

  const variantClasses = {
    default: 'bg-[#fdf0d5]',
    gradient: 'bg-gradient-to-br from-[#fdf0d5] to-[#ffe8b3]',
    dark: 'bg-[#111] text-[#fdf0d5]',
  };

  const hoverClasses = hoverEffect
    ? 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#111]'
    : '';

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${hoverClasses} ${className}`}
    >
      {children}
    </div>
  );
};
