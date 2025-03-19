import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Define the "workJobs" collection to load all JSON files from keystatic’s jobs folder.
const workJobs = defineCollection({
  loader: glob({ 
    pattern: '**/*.json', 
    base: './content/work/jobs'  // path matching your keystatic output
  }),
  schema: z.object({
    title: z.string(),
    company: z.string(),
    logo: z.string().optional(),
    description: z.string(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    isCurrentJob: z.boolean().default(false),
  }),
});

// Similarly, define other collections for your skills, project categories, etc.
const workSkills = defineCollection({
  loader: glob({
    pattern: '**/*.json',
    base: './src/content/work/skills',
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    isFeatured: z.boolean().default(false),
    // TODO: Define the relationship to categories
    categories: z.any(),
  }),
});

// Define additional collections as needed…
export const collections = {
  workJobs,
  workSkills,
  // workSkillCategory, workProjectCategory, workProject, etc.
};