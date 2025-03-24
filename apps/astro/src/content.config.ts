import { defineCollection, z } from 'astro:content';
import { file, glob } from 'astro/loaders';
import type { ZodSchema } from 'astro:schema';

interface CreateJsonCollectionArgs<T> {
  base: string;
  schema: ZodSchema<T>;
}

/**
 * Creates a typed JSON-based collection using Astro's defineCollection and glob loaders.
 */
export function createJsonCollection<T>({
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

const workCompany = createJsonCollection({
  base: './content/work/companies',
  schema: z.object({
    title: z.string(),
    logo: z.string().optional(),
    website: z.string().optional(),
    location: z.string().optional(),
  }),
});

const workJobs = createJsonCollection({
  base: './content/work/jobs',
  schema: z.object({
    title: z.string(),
    // In Keystatic this is a relationship, but JSON stores it as a string:
    company: z.string(),
    description: z.string().optional(),
    highlights: z.array(z.string()).optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    isCurrentJob: z.boolean().default(false),
  }),
});

const workSkills = createJsonCollection({
  base: './src/content/work/skills',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    isFeatured: z.boolean().default(false),
    // Because you used a child block in Keystatic, it may be more complex than a simple array/string:
    categories: z.any().optional(),
  }),
});

const workSkillCategory = createJsonCollection({
  base: './src/content/work/skill-categories',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    // multi-relationship in Keystatic => array of strings in JSON
    skills: z.array(z.string()).optional(),
  }),
});

const workProjectCategory = createJsonCollection({
  base: './src/content/work/project-categories',
  schema: z.object({
    title: z.string(),
  }),
});

const workProject = createJsonCollection({
  base: './src/content/work/projects',
  schema: z.object({
    title: z.string(),
    job: z.string(), // references "workJobs"
    duration: z.string(),
    description: z.string().optional(),
    challengesAndSolutions: z.string().optional(),
    resultsAchieved: z.string().optional(),
    mediaDescription: z.string().optional(),
    media: z.array(z.string()).optional(),
    isFeatured: z.boolean().default(false),
    category: z.string().optional(), // references "workProjectCategory"
    skills: z.array(z.string()).optional(), // references "workSkills"
  }),
});

// const contactInfo = defineCollection({
//   type: 'content_layer',
//   loader: file('./src/content/contact-info.json', {
//     parser: (text) => JSON.parse(text),
//   }),
//   schema: z.object({
//     email: z.string().email(),
//     linkedin: z.string().optional(),
//     github: z.string().optional(),
//   }),
// });

export const collections = {
  workCompany,
  workJobs,
  workSkills,
  workSkillCategory,
  workProjectCategory,
  workProject,
  // contactInfo,
};