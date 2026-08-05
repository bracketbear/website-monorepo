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
  personalProjectSchema,
  blogSchema,
  pageSchema,
  serviceSchema,
  contactMethodSchema,
  portfolioAboutPageSchema,
  portfolioContactPageSchema,
  portfolioIndexPageSchema,
  portfolioWorkPageSchema,
  portfolioProjectsPageSchema,
  portfolioProjectPageSchema,
  sourceCodePageSchema,
  makePageSchema,
} from '@bracketbear/schemas';

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
  personalProject: {
    base: workPath('personal-projects'),
    schema: personalProjectSchema,
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
  portfolioSourceCodePage: {
    base: join(contentPath, 'sites/portfolio'),
    schema: sourceCodePageSchema,
    pattern: 'source-code-page.json',
  },
  // Portfolio site collections
  portfolioContactMethods: {
    base: join(contentPath, 'sites/portfolio/contact-methods'),
    schema: contactMethodSchema,
  },
  // Bracket Bear site singletons
  bracketbearIndexPage: {
    base: join(contentPath, 'sites/bracketbear'),
    schema: makePageSchema(
      {
        statusTicker: z.object({
          beats: z.array(z.string()),
        }),
        hero: z.object({
          kicker: z.string(),
          eyebrow: z.string(),
          punchLine1: z.string(),
          lede: z.string(),
          ctaPrimary: z.object({
            label: z.string(),
            href: z.string(),
          }),
          ctaGhost: z.object({
            label: z.string(),
            href: z.string(),
          }),
        }),
        intro: z.object({
          aside: z.string(),
          leadBlock: z.string(),
          closingLine: z.string(),
        }),
        offerings: z.object({
          eyebrow: z.string(),
          title: z.string(),
          meta: z.string(),
          items: z.array(
            z.object({
              number: z.string(),
              title: z.string(),
              body: z.string(),
              tag: z.string(),
            })
          ),
          platformLayers: z.object({
            eyebrow: z.string(),
            items: z.array(
              z.object({
                title: z.string(),
                body: z.string(),
              })
            ),
          }),
        }),
        receipts: z.object({
          eyebrow: z.string(),
          title: z.string(),
          meta: z.string(),
          pullQuoteStamp: z.string(),
          pullQuoteBody: z.string(),
          demoBody: z.string(),
          demoCtaLabel: z.string(),
          demoCtaHref: z.string(),
          operatorCredit: z.object({
            eyebrow: z.string(),
            body: z.string(),
          }),
          hyperquake: z.object({
            eyebrow: z.string(),
            body: z.string(),
          }),
        }),
        commitments: z.object({
          eyebrow: z.string(),
          title: z.string(),
          meta: z.string(),
          items: z.array(
            z.object({
              tag: z.string(),
              title: z.string(),
              body: z.string(),
            })
          ),
        }),
        manifesto: z.object({
          banner: z.string(),
          lines: z.array(z.string()),
        }),
        closingCta: z.object({
          eyebrow: z.string(),
          title: z.string(),
          body: z.string(),
          contactLines: z.array(z.string()),
          ctaLabel: z.string(),
          ctaHref: z.string(),
          bookendLine1: z.string(),
          bookendLine2: z.string(),
        }),
      },
      { showCta: false }
    ),
    pattern: 'index-page.json',
  },
  bracketbearAboutPage: {
    base: join(contentPath, 'sites/bracketbear'),
    schema: makePageSchema({
      hero: z.object({
        title: z.string(),
        subtitle: z.string(),
      }),
      ourStory: z.object({
        title: z.string(),
        content: z.string(),
      }),
      philosophy: z.object({
        title: z.string(),
        subtitle: z.string(),
        content: z.string(),
      }),
      coreValues: z.object({
        title: z.string(),
        subtitle: z.string(),
        values: z.array(
          z.object({
            title: z.string(),
            description: z.string(),
          })
        ),
      }),
      whoWeAre: z.object({
        title: z.string(),
        content: z.string(),
      }),
    }),
    pattern: 'about-page.json',
  },
  bracketbearServicesPage: {
    base: join(contentPath, 'sites/bracketbear'),
    schema: makePageSchema({
      hero: z.object({
        title: z.string(),
        subtitle: z.string(),
      }),
      intro: z.object({
        title: z.string(),
        content: z.string(),
      }),
      serviceModes: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
        })
      ),
    }),
    pattern: 'services-page.json',
  },
  bracketbearContactPage: {
    base: join(contentPath, 'sites/bracketbear'),
    schema: makePageSchema(
      {
        hero: z.object({
          title: z.string(),
          subtitle: z.string(),
        }),
        introduction: z.string(),
        contactMethods: z.array(z.string()),
        contactForm: z.object({
          title: z.string(),
          description: z.string(),
        }),
      },
      { showCta: false }
    ),
    pattern: 'contact-page.json',
  },
  // Bracket Bear site collections
  bracketbearContactMethods: {
    base: join(contentPath, 'sites/bracketbear/contact-methods'),
    schema: contactMethodSchema,
  },
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
