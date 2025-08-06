import { z } from 'zod';
import { makePageSchema } from './page';

/**
 * Portfolio Contact Page Schema
 *
 * This schema defines the contact page structure for the portfolio site.
 * It includes fields relevant to a developer portfolio contact page.
 */
export const portfolioContactPageSchema = makePageSchema(
  {
    // Introduction section
    introduction: z.object({
      title: z.string(),
      content: z.string(),
    }),

    // Contact methods section - now using relationship field
    contactMethods: z.array(z.string()), // Array of contact method IDs

    // Quick info section
    quickInfo: z.array(
      z.object({
        label: z.string(),
        value: z.string(),
      })
    ),

    // Contact form section
    contactForm: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
    }),

    // Legacy fields (kept for backward compatibility)
    phone: z.string().optional(),
    address: z.string().optional(),
    contactFormId: z.string().optional(),
    officeHours: z.string().optional(),
    availability: z.string().optional(),
    responseTime: z.string().optional(),
  },
  { showCta: false }
); // Disable CTA for contact page since they're already on the contact page

/**
 * Types for contact page data
 */
export type PortfolioContactPageData = z.infer<
  typeof portfolioContactPageSchema
>;
