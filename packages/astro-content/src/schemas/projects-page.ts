import { z } from 'astro:content';
import { makePageSchema } from './page';

/**
 * Portfolio Projects Page Schema
 *
 * This schema defines the projects page structure for the portfolio site.
 * It includes sections for introducing the projects and displaying them by category.
 */
export const portfolioProjectsPageSchema = makePageSchema({

  // Introduction section - now a single markdown field
  introduction: z.string(), // Markdown content with title and content combined

  // Optional stats section
  stats: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
        description: z.string().optional(),
      })
    )
    .optional(),

  // Project Categories section
  projectCategories: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        projects: z.array(z.string()), // Array of project IDs
      })
    )
    .optional(),

  // Contact CTA section
  contactCTA: z.object({
    text: z.string(),
    buttonText: z.string().default('Get In Touch'),
    buttonLink: z.string().default('/contact'),
  }),
});

/**
 * Types for projects page data
 */
export type PortfolioProjectsPageData = z.infer<
  typeof portfolioProjectsPageSchema
>;
