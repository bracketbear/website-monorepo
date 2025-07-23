import type { ZodSchema } from 'zod';
import { join } from 'node:path';
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
 * All collection configurations
 */
export const allCollections = {
  ...workCollections,
  ...contentCollections,
};

/**
 * Utility function to create a JSON collection using Astro's defineCollection
 * This should be used in the individual Astro apps, not in this shared package
 */
export function createJsonCollection<T>({
  base,
  schema,
}: {
  base: string;
  schema: ZodSchema<T>;
}) {
  // This function should be called from within an Astro app context
  // where astro:content is available
  throw new Error(
    'createJsonCollection should be called from within an Astro app context. ' +
      'Import the collection configurations and use them with defineCollection in your content.config.ts'
  );
}

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
