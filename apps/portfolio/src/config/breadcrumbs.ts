import type { Breadcrumb } from '@bracketbear/core';

export const breadcrumbMap: Record<string, Breadcrumb> = {
  home: { label: 'Home', href: '/' },
  work: { label: 'Work History', href: '/work' },
  about: { label: 'About Me', href: '/about' },
  contact: { label: 'Reach Out', href: '/contact' },
};

export function getBreadcrumbs(extra?: Breadcrumb) {
  const base = [breadcrumbMap.home];
  return extra ? [...base, extra] : base;
}

export function getWorkBreadcrumbs(extra?: Breadcrumb) {
  return getBreadcrumbs({ ...breadcrumbMap.work, ...extra });
}

export function getAboutBreadcrumbs(extra?: Breadcrumb) {
  return getBreadcrumbs({ ...breadcrumbMap.about, ...extra });
}

export function getContactBreadcrumbs(extra?: Breadcrumb) {
  return getBreadcrumbs({ ...breadcrumbMap.contact, ...extra });
}
