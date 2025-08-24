/**
 * Example component demonstrating header spacing utilities
 * This shows how to automatically adjust header spacing based on breadcrumb presence
 */

import React, { useEffect, useRef } from 'react';
import { adjustHeaderSpacing, useHeaderSpacing } from './header-spacing';

interface HeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  /** Whether to use automatic spacing adjustment */
  autoSpacing?: boolean;
  /** Custom spacing options */
  spacingOptions?: {
    defaultSpacing?: string;
    withBreadcrumbsSpacing?: string;
    responsive?: boolean;
  };
}

export function Header({
  title,
  subtitle,
  description,
  autoSpacing = true,
  spacingOptions = {}
}: HeaderProps) {
  const headerRef = useRef<HTMLElement>(null);
  const { adjustSpacing, getSpacingClass } = useHeaderSpacing(spacingOptions);

  useEffect(() => {
    if (autoSpacing && headerRef.current) {
      // Automatically adjust spacing on mount
      adjustSpacing(headerRef.current);
      
      // Also adjust on window resize for responsive behavior
      const handleResize = () => adjustSpacing(headerRef.current!);
      window.addEventListener('resize', handleResize);
      
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [autoSpacing, adjustSpacing]);

  if (autoSpacing) {
    // Use automatic spacing adjustment
    return (
      <header
        ref={headerRef}
        className="header-content-responsive-with-breadcrumbs"
        style={{
          // CSS custom properties will be set automatically
          '--header-spacing': '6rem',
          '--header-spacing-with-breadcrumbs': '7rem'
        } as React.CSSProperties}
      >
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-heading text-5xl md:text-7xl font-bold tracking-tight mb-6">
            {title}
          </h1>
          {subtitle && (
            <h2 className="font-heading text-2xl md:text-3xl font-semibold tracking-wide mb-4 text-muted-foreground">
              {subtitle}
            </h2>
          )}
          {description && (
            <p className="text-lg md:text-xl text-muted-foreground/80 max-w-3xl mx-auto leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </header>
    );
  }

  // Use manual spacing classes
  return (
    <header className={getSpacingClass()}>
      <div className="container mx-auto px-4 text-center">
        <h1 className="font-heading text-5xl md:text-7xl font-bold tracking-tight mb-6">
          {title}
        </h1>
        {subtitle && (
          <h2 className="font-heading text-2xl md:text-3xl font-semibold tracking-wide mb-4 text-muted-foreground">
            {subtitle}
          </h2>
        )}
        {description && (
          <p className="text-lg md:text-xl text-muted-foreground/80 max-w-3xl mx-auto leading-relaxed">
            {description}
          </p>
          )}
      </div>
    </header>
  );
}

/**
 * Alternative approach using CSS-only utilities
 * This is simpler but less flexible
 */
export function HeaderCSSOnly({
  title,
  subtitle,
  description
}: Omit<HeaderProps, 'autoSpacing' | 'spacingOptions'>) {
  return (
    <header className="header-content-responsive-with-breadcrumbs">
      <div className="container mx-auto px-4 text-center">
        <h1 className="font-heading text-5xl md:text-7xl font-bold tracking-tight mb-6">
          {title}
        </h1>
        {subtitle && (
          <h2 className="font-heading text-2xl md:text-3xl font-semibold tracking-wide mb-4 text-muted-foreground">
            {subtitle}
          </h2>
        )}
        {description && (
          <p className="text-lg md:text-xl text-muted-foreground/80 max-w-3xl mx-auto leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </header>
  );
}

