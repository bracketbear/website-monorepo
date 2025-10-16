import { singleton } from '@keystatic/core';
import {
  bracketbearIndexPageSchema,
  bracketbearAboutPageSchema,
  bracketbearServicesPageSchema,
} from './schemas';

const siteSingletonPath = (singletonName: string) =>
  `content/sites/bracketbear/${singletonName}` as const;

/**
 * Bracket Bear site singletons
 *
 * Each singleton represents a page on the Bracket Bear website with its own
 * content structure and schema.
 */
export const bracketbearSingletons = {
  bracketbearIndexPage: singleton({
    label: 'Bracket Bear Homepage',
    path: siteSingletonPath('index-page'),
    schema: bracketbearIndexPageSchema,
    format: 'json',
  }),
  bracketbearAboutPage: singleton({
    label: 'Bracket Bear About Page',
    path: siteSingletonPath('about-page'),
    schema: bracketbearAboutPageSchema,
    format: 'json',
  }),
  bracketbearServicesPage: singleton({
    label: 'Bracket Bear Services Page',
    path: siteSingletonPath('services-page'),
    schema: bracketbearServicesPageSchema,
    format: 'json',
  }),
};
