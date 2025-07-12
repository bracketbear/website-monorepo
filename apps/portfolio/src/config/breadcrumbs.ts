import type { Breadcrumb } from '@bracketbear/core';

export const breadcrumbMap: Record<string, Breadcrumb> = {
  about: { label: 'About Me', href: '/about' },
  contact: { label: 'Reach Out', href: '/contact' },
  home: { label: 'Home', href: '/' },
  projects: { label: 'Projects', href: '/projects' },
  work: { label: 'Work History', href: '/work' },
};

export function getBreadcrumbs(...extra: Breadcrumb[]) {
  return [breadcrumbMap.home, ...extra];
}
export function getWorkBreadcrumbs(...extra: Breadcrumb[]) {
  return getBreadcrumbs(breadcrumbMap.work, ...extra);
}

export function getAboutBreadcrumbs(...extra: Breadcrumb[]) {
  return getBreadcrumbs(breadcrumbMap.about, ...extra);
}

export function getContactBreadcrumbs(...extra: Breadcrumb[]) {
  return getBreadcrumbs(breadcrumbMap.contact, ...extra);
}
