import { join } from 'node:path';
import { z } from 'zod';
import { contentPath, workPath } from './utils';
import {
  workCompanySchema,
  workJobSchema,
  workSkillSchema,
  workSkillCategorySchema,
  workProjectCategorySchema,
  workProjectSchema,
  blogSchema,
  pageSchema,
  serviceSchema,
  contactMethodSchema,
  makePageSchema,
  portfolioAboutPageSchema,
  portfolioContactPageSchema,
  portfolioIndexPageSchema,
  portfolioWorkPageSchema,
  portfolioProjectsPageSchema,
  portfolioProjectPageSchema,
} from './schemas';

/**
 * Collection configuration for work-related content
 */
export const workCollections = {
  workCompany: {
    base: workPath('companies'),
    schema: workCompanySchema,
  },
  workJobs: {
    base: workPath('jobs'),
    schema: workJobSchema,
  },
  workSkills: {
    base: workPath('skills'),
    schema: workSkillSchema,
  },
  workSkillCategory: {
    base: workPath('skill-categories'),
    schema: workSkillCategorySchema,
  },
  workProjectCategory: {
    base: workPath('project-categories'),
    schema: workProjectCategorySchema,
  },
  workProject: {
    base: workPath('projects'),
    schema: workProjectSchema,
  },
};

/**
 * Collection configuration for general content
 */
export const contentCollections = {
  blog: {
    base: join(contentPath, 'blog'),
    schema: blogSchema,
  },
  pages: {
    base: join(contentPath, 'pages'),
    schema: pageSchema,
  },
  services: {
    base: join(contentPath, 'services'),
    schema: serviceSchema,
  },
};

/**
 * Site-specific singleton page collections
 * Each site gets its own singleton collections to avoid conflicts
 */
export const siteSpecificCollections = {
  // Portfolio site singletons
  portfolioIndexPage: {
    base: join(contentPath, 'sites/portfolio'),
    schema: portfolioIndexPageSchema,
    pattern: 'index-page.json',
  },
  portfolioContactPage: {
    base: join(contentPath, 'sites/portfolio'),
    schema: portfolioContactPageSchema,
    pattern: 'contact-page.json',
  },
  portfolioAboutPage: {
    base: join(contentPath, 'sites/portfolio'),
    schema: portfolioAboutPageSchema,
    pattern: 'about-page.json',
  },
  portfolioWorkPage: {
    base: join(contentPath, 'sites/portfolio'),
    schema: portfolioWorkPageSchema,
    pattern: 'work-page.json',
  },
  portfolioProjectsPage: {
    base: join(contentPath, 'sites/portfolio'),
    schema: portfolioProjectsPageSchema,
    pattern: 'projects-page.json',
  },
  portfolioProjectPage: {
    base: join(contentPath, 'sites/portfolio'),
    schema: portfolioProjectPageSchema,
    pattern: 'project-page.json',
  },
  // Portfolio site collections
  portfolioContactMethods: {
    base: join(contentPath, 'sites/portfolio/contact-methods'),
    schema: contactMethodSchema,
  },
  // TODO: Add Bracket Bear collections when Bracket Bear site is implemented
  // bracketBearAboutPage: {
  //   base: join(contentPath, 'sites/bracketbear'),
  //   schema: bracketBearAboutPageSchema,
  // },
  // bracketbearIndexPage: {
  //   base: join(contentPath, 'sites/bracketbear'),
  //   schema: indexPageSchema,
  // },
  // bracketbearContactPage: {
  //   base: join(contentPath, 'sites/bracketbear'),
  //   schema: makePageSchema({
  //     phone: z.string().optional(),
  //     address: z.string().optional(),
  //     contactFormId: z.string().optional(),
  //     officeHours: z.string().optional(),
  //   }),
  // },
  // bracketbearAboutPage: {
  //   base: join(contentPath, 'sites/bracketbear'),
  //   schema: makePageSchema({
  //     teamMembers: z
  //       .array(
  //         z.object({
  //           name: z.string(),
  //           role: z.string(),
  //           bio: z.string().optional(),
  //           image: z.string().optional(),
  //         })
  //       )
  //       .optional(),
  //     companyValues: z.array(z.string()).optional(),
  //     foundedYear: z.number().optional(),
  //   }),
  // },
};

/**
 * All collection configurations
 */
export const allCollections = {
  ...workCollections,
  ...contentCollections,
  ...siteSpecificCollections,
};

/**
 * Creates collections with automatic image handling using the content image loader
 * This function should be called from within an Astro app context where astro:content is available
 */
export function createCollectionsWithImageHandling() {
  // This function should be called from within an Astro app context
  // where astro:content is available
  throw new Error(
    'createCollectionsWithImageHandling should be called from within an Astro app context. ' +
      'Import the collection configurations and use them with defineCollection in your content.config.ts'
  );
}
