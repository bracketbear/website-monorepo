import { z } from 'astro:content';
import { makePageSchema } from './page';

/**
 * Portfolio Work Page Schema
 *
 * This schema defines the work page structure for the portfolio site.
 * It includes sections for introducing the work history and filtering tools.
 */
export const portfolioWorkPageSchema = makePageSchema({

  // Introduction section
  introduction: z.object({
    title: z.string(),
    content: z.string(),
  }),

  // Tool description section
  toolDescription: z.object({
    title: z.string(),
    content: z.string(),
  }),

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
});

/**
 * Types for work page data
 */
export type PortfolioWorkPageData = z.infer<typeof portfolioWorkPageSchema>;
