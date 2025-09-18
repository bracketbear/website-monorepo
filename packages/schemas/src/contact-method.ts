import { z } from 'zod';

/**
 * Contact Method Schema
 *
 * This schema defines the structure for contact methods that can be reused
 * across different pages and sites. Each contact method has a label, value,
 * and an optional icon.
 */
export const contactMethodSchema = z.object({
  title: z.string(),
  label: z.string(),
  value: z.string(),
  icon: z
    .enum(['mail', 'github', 'linkedin', 'phone', 'twitter', 'website'])
    .default('mail'),
  isActive: z.boolean().default(true),
});

/**
 * Contact Method Type
 */
export type ContactMethod = z.infer<typeof contactMethodSchema>;
