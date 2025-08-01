import { z } from 'astro:content';
import { makePageSchema } from './page';

// --- New sub–section schemas ---
const narrativeSectionSchema = z.object({
  title: z.string(),
  paragraphs: z.array(z.string()),
});

const skillsSchema = z.object({
  coreStrengths: z.array(z.string()), // 3-4 punchy bullets
  technicalExpertise: z.array(z.string()), // short tech / domain labels
  beyondTech: z.array(z.string()), // leadership, design, biz, etc.
});

const valuesCardSchema = z.object({
  title: z.string(),
  items: z.array(
    z.object({
      // max 3 bullets per card
      text: z.string(),
      number: z.string().optional(), // "01", "02", …
    })
  ),
});

// --- Revised page schema ---
export const portfolioAboutPageSchema = makePageSchema({
  /** Hero / intro block */
  hero: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    showParticleBackground: z.boolean().default(true),
  }),

  /** Story + philosophy merged into one narrative */
  narrative: narrativeSectionSchema,

  /** Clustered skill highlights */
  skills: skillsSchema,

  /** Work-style cards (formerly What I Do / How I Work) */
  workStyle: z.object({
    whatIDo: valuesCardSchema,
    howIWork: valuesCardSchema,
  }),

  /** Optional fun-facts / personal bits */
  funFacts: z.array(z.string()).optional(),

  /** CTA footer */
  contactCTA: z.object({
    text: z.string(),
    buttonText: z.string().default('Reach Out'),
    buttonLink: z.string().default('/reach-out'),
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
