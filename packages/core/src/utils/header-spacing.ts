/**
 * Utility for dynamically adjusting header spacing based on breadcrumb presence
 */

export interface HeaderSpacingOptions {
  /** Default spacing when no breadcrumbs are present (default: 6rem) */
  defaultSpacing?: string;
  /** Spacing when breadcrumbs are present (default: 7rem) */
  withBreadcrumbsSpacing?: string;
  /** Whether to use responsive spacing (default: true) */
  responsive?: boolean;
  /** Custom CSS property name for the spacing variable (default: --header-spacing) */
  cssProperty?: string;
}

/**
 * Automatically adjusts header spacing based on breadcrumb presence
 * @param element - The header element to adjust
 * @param options - Configuration options for spacing
 */
export function adjustHeaderSpacing(
  element: HTMLElement,
  options: HeaderSpacingOptions = {}
): void {
  const {
    defaultSpacing = '6rem',
    withBreadcrumbsSpacing = '7rem',
    responsive = true,
    cssProperty = '--header-spacing',
  } = options;

  // Check if breadcrumbs are present
  const hasBreadcrumbs =
    document.querySelector('[data-has-breadcrumbs="true"]') !== null;

  // Calculate spacing
  let spacing: string;
  if (hasBreadcrumbs) {
    spacing = withBreadcrumbsSpacing;
  } else {
    spacing = defaultSpacing;
  }

  // Apply responsive scaling if enabled
  if (responsive) {
    const baseValue = parseFloat(spacing);
    const unit = spacing.replace(/[\d.]/g, '');
    const responsiveSpacing = `clamp(${baseValue * 0.8}${unit}, ${baseValue * 1.2}vw, ${baseValue * 1.3}${unit})`;
    spacing = responsiveSpacing;
  }

  // Apply the spacing
  element.style.setProperty(cssProperty, spacing);
  element.style.paddingTop = spacing;
}

/**
 * Creates a CSS custom property for header spacing that updates automatically
 * @param options - Configuration options for spacing
 * @returns CSS string that can be used in :root or component styles
 */
export function createHeaderSpacingCSS(
  options: HeaderSpacingOptions = {}
): string {
  const {
    defaultSpacing = '6rem',
    withBreadcrumbsSpacing = '7rem',
    responsive = true,
    cssProperty = '--header-spacing',
  } = options;

  if (responsive) {
    const baseDefault = parseFloat(defaultSpacing);
    const baseWithBreadcrumbs = parseFloat(withBreadcrumbsSpacing);
    const unit = defaultSpacing.replace(/[\d.]/g, '');

    return `
      ${cssProperty}: ${baseDefault}${unit};
      ${cssProperty}-with-breadcrumbs: ${baseWithBreadcrumbs}${unit};
      ${cssProperty}-responsive: clamp(${baseDefault * 0.8}${unit}, ${baseDefault * 1.2}vw, ${baseDefault * 1.3}${unit});
      ${cssProperty}-responsive-with-breadcrumbs: clamp(${baseWithBreadcrumbs * 0.8}${unit}, ${baseWithBreadcrumbs * 1.2}vw, ${baseWithBreadcrumbs * 1.3}${unit});
    `;
  }

  return `
    ${cssProperty}: ${defaultSpacing};
    ${cssProperty}-with-breadcrumbs: ${withBreadcrumbsSpacing};
  `;
}

/**
 * React hook for automatic header spacing adjustment
 * @param options - Configuration options for spacing
 * @returns Object with spacing values and adjustment function
 */
export function useHeaderSpacing(options: HeaderSpacingOptions = {}) {
  const {
    defaultSpacing = '6rem',
    withBreadcrumbsSpacing = '7rem',
    responsive = true,
  } = options;

  const adjustSpacing = (element: HTMLElement) => {
    adjustHeaderSpacing(element, options);
  };

  const getSpacingClass = () => {
    if (responsive) {
      return 'header-spacing-responsive-with-breadcrumbs';
    }
    return 'header-spacing-with-breadcrumbs';
  };

  return {
    adjustSpacing,
    getSpacingClass,
    defaultSpacing,
    withBreadcrumbsSpacing,
    responsive,
  };
}

