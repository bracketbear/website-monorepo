import { z } from 'astro:content';
import { makePageSchema } from './page';

/**
 * Schema for detail block items used in about pages
 *
 * Represents a labeled list of values, typically used for qualifications,
 * skills, or other categorized information.
 */
export const detailBlockSchema = z.object({
  label: z.string(),
  value: z.array(z.string()),
});

/**
 * Schema for work philosophy items
 *
 * Represents numbered list items with optional custom numbering.
 */
export const workPhilosophyItemSchema = z.object({
  text: z.string(),
  number: z.string().optional(), // Custom number like "01", "02", etc.
});

/**
 * Schema for work philosophy sections
 *
 * Represents a section with a title and numbered list of items.
 */
export const workPhilosophySectionSchema = z.object({
  title: z.string(),
  items: z.array(workPhilosophyItemSchema),
});

/**
 * Portfolio about page schema
 *
 * This schema captures the portfolio about page structure with:
 * - Detail blocks for qualifications and experience
 * - Personal story section
 * - Mission statement section
 * - Work philosophy with two sections (What I Do, How I Work)
 *
 * @example
 * ```typescript
 * const portfolioAboutData = {
 *   title: "About Me",
 *   detailBlocks: [
 *     {
 *       label: "Specialties & Services",
 *       value: ["Full Stack Software Engineering", "..."],
 *     },
 *   ],
 *   personalStory: {
 *     title: "MY STORY",
 *     paragraphs: ["I started coding because...", "..."],
 *   },
 *   missionStatement: {
 *     title: "MISSION STATEMENT",
 *     paragraphs: ["I build digital solutions...", "..."],
 *   },
 *   workPhilosophy: {
 *     whatIDo: {
 *       title: "WHAT I DO",
 *       items: [
 *         { text: "Build scalable web applications...", number: "01" },
 *       ],
 *     },
 *     howIWork: {
 *       title: "HOW I WORK",
 *       items: [
 *         { text: "Listen to your needs...", number: "01" },
 *       ],
 *     },
 *   },
 * };
 * ```
 */
export const portfolioAboutPageSchema = makePageSchema({
  detailBlocks: z.array(detailBlockSchema),
  personalStory: z.object({
    title: z.string(),
    paragraphs: z.array(z.string()),
  }),
  missionStatement: z.object({
    title: z.string(),
    paragraphs: z.array(z.string()),
  }),
  workPhilosophy: z.object({
    whatIDo: workPhilosophySectionSchema,
    howIWork: workPhilosophySectionSchema,
  }),
});

// TODO: Add Bracket Bear about page schema when Bracket Bear site is implemented
// export const bracketBearAboutPageSchema = makePageSchema({
//   teamMembers: z.array(
//     z.object({
//       name: z.string(),
//       role: z.string(),
//       bio: z.string().optional(),
//       image: z.string().optional(),
//     })
//   ),
//   companyValues: z.array(z.string()),
//   foundedYear: z.number().optional(),
// });

/**
 * Legacy about page schema (for backward compatibility)
 * @deprecated Use portfolioAboutPageSchema or bracketBearAboutPageSchema instead
 */
export const aboutPageSchema = portfolioAboutPageSchema;

/**
 * Types for about page data
 */
export type PortfolioAboutPageData = z.infer<typeof portfolioAboutPageSchema>;
export type AboutPageData = PortfolioAboutPageData; // Legacy type alias

/**
 * Portfolio Index Page Schema
 *
 * This schema defines the complete structure for the portfolio homepage.
 * It includes all sections: hero, about, featured projects, recent experience,
 * contact, and layout controls.
 */
export const portfolioIndexPageSchema = makePageSchema({
  // Hero section content
  hero: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    showParticleBackground: z.boolean().default(true),
  }),

  // About/What I Do section
  about: z.object({
    title: z.string().default('What I Do'),
    introduction: z.string(),
    description: z.string(),
    experience: z.string(),
    additional: z.string(),
    showSkillsTicker: z.boolean().default(true),
    featuredSkills: z.array(z.string()),
  }),

  // Featured Projects section
  featuredProjects: z.object({
    title: z.string().default('Featured Projects'),
    subtitle: z.string(),
    maxDisplay: z.number().default(3),
    showViewAllButton: z.boolean().default(true),
    viewAllButtonText: z.string().default('View All Projects →'),
    viewAllButtonLink: z.string().default('/projects'),
    selectedProjects: z.array(z.string()),
  }),

  // Recent Experience section
  recentExperience: z.object({
    title: z.string().default('Recent Experience'),
    subtitle: z.string(),
    maxDisplay: z.number().default(3),
    showViewAllButton: z.boolean().default(true),
    viewAllButtonText: z.string().default('View Full Work History →'),
    viewAllButtonLink: z.string().default('/work'),
    selectedJobs: z.array(z.string()),
  }),

  // Contact section
  contact: z.object({
    title: z.string().default("Let's Work Together"),
    subtitle: z.string(),
    showContactForm: z.boolean().default(true),
  }),

  // Layout and styling options
  layout: z.object({
    hideContactForm: z.boolean().default(true),
    showHeroSection: z.boolean().default(true),
    showAboutSection: z.boolean().default(true),
    showFeaturedProjects: z.boolean().default(true),
    showRecentExperience: z.boolean().default(true),
    showContactSection: z.boolean().default(true),
  }),
});
