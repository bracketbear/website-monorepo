import { generateMetaTitle, generatePageMetaTitle } from '@bracketbear/core';

/**
 * Portfolio site meta title configuration
 *
 * This configuration provides site-specific meta title generation
 * for the portfolio site with consistent branding.
 */

// Site configuration
const PORTFOLIO_SITE_CONFIG = {
  websiteTitle: 'Harrison Callahan',
  separator: ' - ',
} as const;

/**
 * Generates a meta title for portfolio pages
 *
 * @param pageTitle - The title of the specific page
 * @returns A formatted meta title for the portfolio site
 *
 * @example
 * ```typescript
 * generatePortfolioMetaTitle('My Projects')
 * // "My Projects - Harrison Callahan"
 * ```
 */
export function generatePortfolioMetaTitle(pageTitle: string): string {
  return generateMetaTitle(
    pageTitle,
    PORTFOLIO_SITE_CONFIG.websiteTitle,
    PORTFOLIO_SITE_CONFIG.separator
  );
}

/**
 * Generates a meta title from portfolio page data
 *
 * @param pageData - The page data object containing title
 * @returns The meta title to use for the portfolio site
 *
 * @example
 * ```typescript
 * const metaTitle = generatePortfolioPageMetaTitle({
 *   title: 'My Projects'
 * });
 * ```
 */
export function generatePortfolioPageMetaTitle(pageData: {
  title?: string;
}): string {
  return generatePageMetaTitle(
    pageData,
    PORTFOLIO_SITE_CONFIG.websiteTitle,
    PORTFOLIO_SITE_CONFIG.separator
  );
}

/**
 * Portfolio site configuration
 */
export const portfolioMetaConfig = PORTFOLIO_SITE_CONFIG;
