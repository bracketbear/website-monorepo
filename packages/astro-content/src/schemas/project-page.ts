import { z } from 'astro:content';
import { makePageSchema } from './page';

/**
 * Portfolio Project Page Schema
 *
 * This schema defines the individual project page structure for the portfolio site.
 * It includes customizable section headings and CTAs while allowing dynamic content
 * from the project data.
 */
export const portfolioProjectPageSchema = makePageSchema({
  // Section headings that can be customized
  sectionHeadings: z.object({
    // Top info bar labels
    company: z.string().default('Company'),
    duration: z.string().default('Duration'),
    role: z.string().default('Role'),
    technologies: z.string().default('Technologies'),
    // Main content section headings
    overview: z.string().default('About This Project'),
    challenges: z.string().default('Challenges & Solutions'),
    results: z.string().default('Results Achieved'),
    gallery: z.string().default('Project Gallery'),
  }),

  // Default CTA (can be overridden by project-specific CTA)
  defaultCTA: z.object({
    text: z
      .string()
      .default("I'd love to discuss how I can help with your project."),
    buttonText: z.string().default('Get in Touch'),
    buttonLink: z.string().default('/contact'),
  }),
});

/**
 * Types for project page data
 */
export type PortfolioProjectPageData = z.infer<
  typeof portfolioProjectPageSchema
>;
