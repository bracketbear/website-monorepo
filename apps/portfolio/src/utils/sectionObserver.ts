/**
 * Section Observer Utility
 *
 * Provides intersection observer functionality for tracking active sections
 * in a page with a table of contents. Prioritizes section order over visibility percentage.
 */

export interface Section {
  id: string;
  title: string;
  eyebrow?: string;
}

export interface SectionObserverOptions {
  rootMargin?: string;
  threshold?: number;
}

/**
 * Initializes an intersection observer to track active sections
 * @param sections - Array of section objects with id, title, and optional eyebrow
 * @param options - Optional configuration for the intersection observer
 * @returns Cleanup function to disconnect the observer
 */
export function initSectionObserver(
  sections: Section[],
  options: SectionObserverOptions = {}
): (() => void) | undefined {
  const { rootMargin = '-20% 0px -60% 0px', threshold = 0.1 } = options;

  // Extract section IDs from the sections array
  const sectionIds: string[] = sections
    .filter((section: Section) => section?.id)
    .map((section: Section) => section.id);

  if (sectionIds.length === 0) {
    console.warn('No sections found for intersection observer');
    return;
  }

  // Get DOM elements for each section
  const sectionElements: HTMLElement[] = sectionIds
    .map((id: string) => document.getElementById(id))
    .filter((el): el is HTMLElement => el !== null);

  if (sectionElements.length === 0) {
    console.warn('No section elements found in DOM');
    return;
  }

  const observer = new IntersectionObserver(
    (entries: IntersectionObserverEntry[]) => {
      // Find all currently visible sections
      const visibleSections: string[] = entries
        .filter((entry: IntersectionObserverEntry) => entry.isIntersecting)
        .map((entry: IntersectionObserverEntry) => entry.target.id);

      if (visibleSections.length === 0) return;

      // Find the first visible section based on order priority
      let activeSectionId: string | null = null;
      for (const sectionId of sectionIds) {
        if (visibleSections.includes(sectionId)) {
          activeSectionId = sectionId;
          break;
        }
      }

      if (activeSectionId) {
        // Update the active section in the TOC
        const tocLinks: NodeListOf<Element> =
          document.querySelectorAll('[data-section-id]');
        tocLinks.forEach((link: Element) => {
          const isActive =
            link.getAttribute('data-section-id') === activeSectionId;
          link.classList.toggle('active', isActive);
          link.setAttribute('aria-current', isActive ? 'true' : 'false');
        });

        // Update URL hash without scrolling
        if (window.location.hash !== `#${activeSectionId}`) {
          history.replaceState(null, '', `#${activeSectionId}`);
        }
      }
    },
    {
      rootMargin,
      threshold,
    }
  );

  // Observe all sections
  sectionElements.forEach((section: HTMLElement) => {
    observer.observe(section);
  });

  // Return cleanup function
  return (): void => {
    observer.disconnect();
  };
}

/**
 * Convenience function to initialize section observer with default settings
 * @param sections - Array of section objects
 * @returns Cleanup function to disconnect the observer
 */
export function setupSectionObserver(
  sections: Section[]
): (() => void) | undefined {
  return initSectionObserver(sections);
}

/**
 * Auto-initialize section observer when script is loaded
 * Looks for sections data on window object
 */
function autoInitSectionObserver(): void {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeFromWindow();
    });
  } else {
    initializeFromWindow();
  }
}

function initializeFromWindow(): void {
  // Get sections from window object (set by Astro)
  const sections = (window as any).sections;

  if (!sections || !Array.isArray(sections)) {
    console.warn('No sections data found on window object');
    return;
  }

  // Initialize the observer
  const cleanup = initSectionObserver(sections);

  if (cleanup) {
    // Store cleanup function for potential future use
    window.addEventListener('beforeunload', cleanup);
  }
}

// Auto-initialize when script loads
autoInitSectionObserver();
