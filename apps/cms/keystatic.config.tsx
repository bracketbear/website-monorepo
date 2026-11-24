import { config } from '@keystatic/core';
import { workCollections } from './src/collections/work';
import { contentCollections } from './src/collections/content';
import { portfolioCollections } from './src/sites/portfolio/collections';
import { bracketbearCollections } from './src/sites/bracketbear/collections';
import { singletons } from './src/singletons';

export default config({
  storage: {
    kind: 'local',
  },
  locale: 'en-US',
  ui: {
    brand: {
      name: 'Bracket Bear CMS',
      mark: () => {
        let path = '/bracket-bear-logo.svg';
        return <img src={path} width={24} />;
      },
    },
    navigation: {
      'Bracket Bear Site': [
        'bracketbearIndexPage',
        'bracketbearAboutPage',
        'bracketbearServicesPage',
      ],
      'Portfolio Site': [
        'portfolioIndexPage',
        'portfolioContactPage',
        'portfolioAboutPage',
        'portfolioWorkPage',
        'portfolioProjectsPage',
        'portfolioProjectPage',
        'portfolioSourceCodePage',
        'portfolioContactMethods',
      ],
      'Work Content': [
        'workCompany',
        'workJobs',
        'workProject',
        'personalProject',
        'workSkills',
        'workSkillCategory',
        'workProjectCategory',
      ],
      'General Content': ['blog', 'pages', 'services'],
      // TODO: Add site settings when needed
      // 'Site Settings': ['siteSettings'],
    },
  },
  collections: {
    ...workCollections,
    ...contentCollections,
    ...portfolioCollections,
    ...bracketbearCollections,
  },
  singletons,
});
