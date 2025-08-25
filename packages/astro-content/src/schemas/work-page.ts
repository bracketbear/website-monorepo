import { z } from 'astro:content';
import { makePageSchema } from './page';

/**
 * Portfolio Work Page Schema
 *
 * This schema defines the work page structure for the portfolio site.
 * It includes sections for introducing the work history and filtering tools.
 */
export const portfolioWorkPageSchema = makePageSchema({
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

  // Contact CTA section
  contactCTA: z.object({
    text: z.string(),
    buttonText: z.string().default('Get In Touch'),
    buttonLink: z.string().default('/contact'),
  }),

  // Skill Categories section
  skillCategories: z.array(z.string()).optional(),
});

/**
 * Types for work page data
 */
export type PortfolioWorkPageData = z.infer<typeof portfolioWorkPageSchema>;
