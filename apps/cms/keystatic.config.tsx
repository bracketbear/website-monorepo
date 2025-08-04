import { config } from '@keystatic/core';
import { workCollections } from './src/collections/work';
import { contentCollections } from './src/collections/content';
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
      'Portfolio Site': [
        'portfolioIndexPage',
        'portfolioContactPage',
        'portfolioAboutPage',
        'portfolioWorkPage',
        'portfolioProjectsPage',
      ],
      'Work Content': [
        'workCompany',
        'workJobs',
        'workProject',
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
  },
  singletons,
});
