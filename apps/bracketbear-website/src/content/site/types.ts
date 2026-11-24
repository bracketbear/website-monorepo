export type Link = { label: string; href: string };

export type Meta = { title: string; description: string };

export type Section = {
  label?: string;
  headline: string;
  body?: string | string[];
  links?: Link[];
};
