// Navigation styling constants
export const NAVIGATION_CONSTANTS = {
  BACKGROUND_COLOR: 'bg-brand-orange dark:bg-dark',
  TEXT_COLOR: 'text-foreground',
  MOBILE_MENU_TRANSITION: 'translate-x-full',
} as const;

// Layout constants
export const LAYOUT_CONSTANTS = {
  CONTAINER_CLASS: 'container mx-auto py-4',
  BRUTALIST_BORDER: 'border-default',
} as const;

// Spacing constants for consistent padding across components
export const SPACING_CONSTANTS = {
  CONTENT_PADDING: 'px-content',
  SECTION_PADDING: 'px-4',
  MOBILE_PADDING: 'px-4',
  DESKTOP_PADDING: 'lg:px-6',
  // Utility class names for consistent usage
  UTILITIES: {
    PX_CONTENT: 'px-content',
    SECTION_CONTENT: 'section-content',
    CONTAINER_CONTENT: 'container-content',
    PX_CONTENT_TIGHT: 'px-content-tight',
    PX_CONTENT_WIDE: 'px-content-wide',
  },
} as const;
