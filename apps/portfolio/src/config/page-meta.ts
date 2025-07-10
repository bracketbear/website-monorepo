export const SITE_TITLE = 'Harrison Callahan' as const;
export const TITLE_SEPARATOR = ' | ' as const;

export type PageTitle =
  | `${string}${typeof TITLE_SEPARATOR}${typeof SITE_TITLE}`
  | typeof SITE_TITLE;

export const makeTitle = (title?: string): PageTitle => {
  if (!title) return SITE_TITLE;
  return `${title}${TITLE_SEPARATOR}${SITE_TITLE}` as const;
};
