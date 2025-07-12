import React from 'react';

interface GlowListItemProps {
  children: React.ReactNode;
  color?: 'brand-red' | 'brand-orange' | 'brand-blue' | 'brand-green' | 'brand-purple' | 'brand-yellow';
  className?: string;
}

const colorMap = {
  'brand-red': '#bb4430',
  'brand-orange': '#ffc15e',
  'brand-blue': '#7ebdc2',
  'brand-green': '#98CE00',
  'brand-purple': '#B185A7',
  'brand-yellow': '#f3dfa2',
};

export const GlowListItem: React.FC<GlowListItemProps> = ({
  children,
  color = 'brand-orange',
  className = '',
}) => {
  const hexColor = colorMap[color];
  
  return (
    <li
      className={`flex items-center transition-all duration-300 ${className}`}
    >
      <span
        className="mr-2 h-2 w-2 rounded-full transition-all duration-300 hover:shadow-lg"
        style={{
          backgroundColor: hexColor,
          boxShadow: `0 0 8px ${hexColor}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = `0 0 16px ${hexColor}, 0 0 24px ${hexColor}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = `0 0 8px ${hexColor}`;
        }}
      />
      <span className="transition-all duration-300 hover:translate-x-1 hover:font-bold">
        {children}
      </span>
    </li>
  );
};
