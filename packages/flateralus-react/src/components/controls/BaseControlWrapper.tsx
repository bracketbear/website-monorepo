import React from 'react';

interface BaseControlWrapperProps {
  label: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * BaseControlWrapper
 *
 * Provides consistent layout, label, and description for all controls.
 */
const BaseControlWrapper: React.FC<BaseControlWrapperProps> = ({
  label,
  description,
  className = '',
  children,
}) => (
  <div className={`flex flex-col gap-0.5 py-2 ${className}`}>
    <div className="flex items-center gap-2">
      <label className="w-32 shrink-0 text-xs text-white/70">{label}</label>
      {children}
    </div>
    {description && (
      <div className="mt-0.5 ml-0.5 text-xs leading-tight text-white/40">
        {description}
      </div>
    )}
  </div>
);

export default BaseControlWrapper;
