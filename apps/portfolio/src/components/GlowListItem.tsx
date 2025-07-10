import React from 'react';

interface GlowListItemProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
}

export const GlowListItem: React.FC<GlowListItemProps> = ({
  children,
  color = '#ff6b35',
  className = '',
}) => {
  return (
    <li
      className={`flex items-center transition-all duration-300 ${className}`}
    >
      <span
        className="mr-2 h-2 w-2 rounded-full transition-all duration-300 hover:shadow-lg"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 8px ${color}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = `0 0 16px ${color}, 0 0 24px ${color}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = `0 0 8px ${color}`;
        }}
      />
      <span className="transition-all duration-300 hover:translate-x-1 hover:font-bold">
        {children}
      </span>
    </li>
  );
};
