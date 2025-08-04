/**
 * Auto-generates meta titles from hero titles
 * 
 * This utility function creates SEO-friendly meta titles by combining
 * the hero title with a site suffix. This reduces redundancy in the CMS
 * and ensures consistent SEO titles across the site.
 * 
 * @param heroTitle - The hero title from the page content
 * @param siteName - The site name to append (default: "Harrison Callahan")
 * @returns A formatted meta title
 * 
 * @example
 * ```typescript
 * generateMetaTitle("My Projects") // "My Projects - Harrison Callahan"
 * generateMetaTitle("About Me") // "About Me - Harrison Callahan"
 * generateMetaTitle("Work History") // "Work History - Harrison Callahan"
 * ```
 */
export function generateMetaTitle(
  heroTitle: string,
  siteName: string = "Harrison Callahan"
): string {
  if (!heroTitle) {
    return siteName;
  }
  
  return `${heroTitle} - ${siteName}`;
}

/**
 * Generates a meta title from page data
 * 
 * This function extracts the hero title from page data and generates
 * a meta title. If a custom meta title is provided, it uses that instead.
 * 
 * @param pageData - The page data object containing hero and meta fields
 * @param siteName - The site name to append (default: "Harrison Callahan")
 * @returns The meta title to use
 * 
 * @example
 * ```typescript
 * const metaTitle = generatePageMetaTitle({
 *   hero: { title: "My Projects" },
 *   metaTitle: "Custom SEO Title" // This would override auto-generation
 * });
 * ```
 */
export function generatePageMetaTitle(
  pageData: {
    hero?: { title?: string };
    metaTitle?: string;
  },
  siteName: string = "Harrison Callahan"
): string {
  // If a custom meta title is provided, use it
  if (pageData.metaTitle) {
    return pageData.metaTitle;
  }
  
  // Otherwise, auto-generate from hero title
  const heroTitle = pageData.hero?.title;
  return generateMetaTitle(heroTitle || "", siteName);
} 