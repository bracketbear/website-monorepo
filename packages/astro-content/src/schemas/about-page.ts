import { z } from 'zod';
import { makePageSchema } from './page';

// --- New sub-section schemas ---
const richSection = z.object({
  title: z.string(),
  content: z.string(), // markdown
});

const bulletSection = z.object({
  title: z.string(),
  items: z.array(z.string()),
});

const storyItem = z.object({
  headline: z.string(),
  content: z.string(), // 1–3 short paragraphs, markdown
});

// Timeline and Testimonials
const timelineItem = z.object({
  label: z.string(), // e.g., "Polich Art Works"
  sublabel: z.string().optional(), // e.g., "first real break"
  description: z.string(), // 1–2 sentences
});

const testimonialItem = z.object({
  quote: z.string(),
  name: z.string(),
  role: z.string().optional(),
  org: z.string().optional(),
  avatar: z.string().optional(), // path or URL if you have one
});

export const portfolioAboutPageSchema = makePageSchema({
  // Core narrative
  narrative: richSection, // "Story"
  whatIDoNow: richSection, // "What I do now"
  howIPartner: bulletSection, // bullets

  // Two short vignettes
  stories: z.array(storyItem).min(2).max(3),

  // Principles
  principles: bulletSection, // "What I care about"

  // NEW: Timeline and Testimonials
  timeline: z.array(timelineItem).min(3).max(6),
  testimonials: z.array(testimonialItem).max(3).optional(),

  // Fit (single plain-text block)
  fit: z.object({
    bestFit: z.string(),
  }),

  // NEW: How to start
  howToStart: bulletSection,

  // Footer CTA (keep existing shape)
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
    subtitle: z.string(),
    description: z.string().optional(),
    showParticleBackground: z.boolean().default(true),
  }),

  // About/What I Do section
  about: z.object({
    title: z.string().default('What I Do'),
    content: z.string(), // Markdoc content
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

  // Layout and styling options
  layout: z.object({
    hideContactForm: z.boolean().default(true),
    showHeroSection: z.boolean().default(true),
    showAboutSection: z.boolean().default(true),
    showFeaturedProjects: z.boolean().default(true),
    showRecentExperience: z.boolean().default(true),
    showContactSection: z.boolean().default(true),
  }),

  // Contact CTA section
  contactCTA: z.object({
    text: z.string(),
    buttonText: z.string().default('Get in touch'),
    buttonLink: z.string().default('/contact'),
  }),
});
