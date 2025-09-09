/**
 * Core utility for generating meta titles
 *
 * This function creates SEO-friendly meta titles by combining a page title
 * with a website title using a configurable separator.
 */

/**
 * Generates a meta title from page title and website title
 *
 * @param pageTitle - The title of the specific page
 * @param websiteTitle - The title of the website/brand
 * @param separator - The separator to use between page and website title (default: " - ")
 * @returns A formatted meta title
 *
 * @example
 * ```typescript
 * generateMetaTitle("My Projects", "Harrison Callahan")
 * // "My Projects - Harrison Callahan"
 *
 * generateMetaTitle("About", "Bracket Bear", " | ")
 * // "About | Bracket Bear"
 *
 * generateMetaTitle("", "Harrison Callahan")
 * // "Harrison Callahan"
 * ```
 */
export function generateMetaTitle(
  pageTitle: string,
  websiteTitle: string,
  separator: string = ' - '
): string {
  const trimmedPageTitle = pageTitle.trim();
  const trimmedWebsiteTitle = websiteTitle.trim();

  // If no page title, just return the website title
  if (!trimmedPageTitle) {
    return trimmedWebsiteTitle;
  }

  // If no website title, just return the page title
  if (!trimmedWebsiteTitle) {
    return trimmedPageTitle;
  }

  // Combine page title and website title with separator
  return `${trimmedPageTitle}${separator}${trimmedWebsiteTitle}`;
}

/**
 * Generates a meta title from page data
 *
 * This function extracts the page title from page data and generates
 * a meta title. Meta titles are now always auto-generated from page titles.
 *
 * @param pageData - The page data object containing title
 * @param websiteTitle - The title of the website/brand
 * @param separator - The separator to use between page and website title (default: " - ")
 * @returns The meta title to use
 *
 * @example
 * ```typescript
 * const metaTitle = generatePageMetaTitle({
 *   title: "My Projects"
 * }, "Harrison Callahan");
 * ```
 */
export function generatePageMetaTitle(
  pageData: {
    title?: string;
  },
  websiteTitle: string,
  separator: string = ' - '
): string {
  // Auto-generate from page title
  const pageTitle = pageData.title || '';
  return generateMetaTitle(pageTitle, websiteTitle, separator);
}
