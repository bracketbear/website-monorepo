export const breadcrumbMap = {
  home: { label: 'Home', href: '/' },
  work: { label: 'Work History', href: '/work' },
  // Add more as needed
};

export function getWorkBreadcrumbs(extra?: { label: string; href?: string }) {
  const base = [breadcrumbMap.home, breadcrumbMap.work];
  return extra ? [...base, extra] : base;
}
