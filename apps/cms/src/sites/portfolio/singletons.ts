import { singleton } from '@keystatic/core';
import {
  portfolioAboutPageSchema,
  portfolioContactPageSchema,
  portfolioIndexPageSchema,
} from './schemas';

const siteSingletonPath = (singletonName: string) =>
  `content/sites/portfolio/${singletonName}` as const;

/**
 * Portfolio site singletons
 *
 * Each singleton represents a page on the portfolio site with its own
 * content structure and schema.
 */

export const portfolioSingletons = {
  portfolioIndexPage: singleton({
    label: 'Portfolio Homepage',
    path: siteSingletonPath('index-page'),
    schema: portfolioIndexPageSchema,
    format: 'json',
  }),
  portfolioContactPage: singleton({
    label: 'Portfolio Contact Page',
    path: siteSingletonPath('contact-page'),
    schema: portfolioContactPageSchema,
    format: 'json',
  }),
  portfolioAboutPage: singleton({
    label: 'Portfolio About Page',
    path: siteSingletonPath('about-page'),
    schema: portfolioAboutPageSchema,
    format: 'json',
  }),
};
