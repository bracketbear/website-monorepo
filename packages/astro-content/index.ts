import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import type { ZodSchema } from 'astro:schema';
import { dirname, join } from 'node:path';

interface CreateJsonCollectionArgs<T> {
  base: string;
  schema: ZodSchema<T>;
}

// Point to the CMS content directory
const contentPath = join(dirname(import.meta.url), '../../apps/cms/content');

const workPath = (...paths: string[]) => join(contentPath, 'work', ...paths);

/**
 * Creates a typed JSON-based collection using Astro's defineCollection and glob loaders.
 */
function createJsonCollection<T>({
  base,
  schema,
}: CreateJsonCollectionArgs<T>) {
  return defineCollection({
    type: 'content_layer',
    loader: glob({
      base,
      pattern: '**/*.json',
      generateId: (entry) => `${entry.entry.replace(/\.json$/, '')}`, // Generate ID from the entry path
    }),
    schema,
  });
}

const workCompanies = createJsonCollection({
  base: workPath('companies'),
  schema: z.object({
    title: z.string(),
    logo: z.string().optional(),
    website: z.string().optional(),
    location: z.string().optional(),
  }),
});

const workJobs = createJsonCollection({
  base: workPath('jobs'),
  schema: z.object({
    title: z.string(),
    company: z.string(),
    description: z.string().optional(),
    highlights: z.array(z.string()).optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    workSkills: z.array(z.string()).optional(), // references "workSkills"
    isCurrentJob: z.boolean().default(false),
  }),
});

const workSkills = createJsonCollection({
  base: workPath('skills'),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    isFeatured: z.boolean().default(false),
    categories: z.array(z.string()).optional(),
  }),
});

const workSkillCategories = createJsonCollection({
  base: workPath('skill-categories'),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    skills: z.array(z.string()).optional(),
  }),
});

const workProjectCategories = createJsonCollection({
  base: workPath('project-categories'),
  schema: z.object({
    title: z.string(),
  }),
});

const workProjects = createJsonCollection({
  base: workPath('projects'),
  schema: z.object({
    title: z.string(),
    job: z.string(), // references "workJobs"
    duration: z.string(),
    description: z.string().optional(),
    challengesAndSolutions: z.string().optional(),
    resultsAchieved: z.string().optional(),
    mediaDescription: z.string().optional(),
    media: z
      .array(
        z.object({
          image: z.string(),
          caption: z.string().optional(),
        })
      )
      .optional(),
    isFeatured: z.boolean().default(false),
    category: z.string().optional(), // references "workProjectCategory"
    skills: z.array(z.string()).optional(), // references "workSkills"
  }),
});

// Shared content collections from CMS
const blog = createJsonCollection({
  base: join(contentPath, 'blog'),
  schema: z.object({
    title: z.string(),
    excerpt: z.string().optional(),
    content: z.string(), // This will be the rich text content
    publishedAt: z.coerce.date().optional(),
    isPublished: z.boolean().default(false),
    tags: z.array(z.string()).optional(),
    featuredImage: z.string().optional(),
  }),
});

const pages = createJsonCollection({
  base: join(contentPath, 'pages'),
  schema: z.object({
    title: z.string(),
    content: z.string(), // This will be the rich text content
    metaDescription: z.string().optional(),
    isPublished: z.boolean().default(true),
  }),
});

console.log({ workPath: workPath('companies') });

export const collections = {
  workCompany: workCompanies,
  workJobs,
  workSkills,
  workSkillCategory: workSkillCategories,
  workProjectCategory: workProjectCategories,
  workProject: workProjects,
  blog,
  pages,
};
