import { z } from 'astro:content';
import { makePageSchema } from './page';

/**
 * Schema for the portfolio homepage (index.astro)
 *
 * This schema defines the structure for the homepage content including
 * hero section, about section, featured projects, recent experience,
 * and contact sections.
 *
 * @example
 * ```typescript
 * const indexPageData = {
 *   title: "Harrison Callahan - Portfolio",
 *   content: "# Welcome to my portfolio...",
 *   metaTitle: "Harrison Callahan - Full Stack Developer Portfolio",
 *   metaDescription: "Professional portfolio showcasing web development projects and experience",
 *   hero: {
 *     title: "Harrison Callahan",
 *     subtitle: "Full Stack Developer",
 *     description: "Building amazing web experiences for over two decades"
 *   },
 *   about: {
 *     title: "What I Do",
 *     introduction: "I can tell you that I'm a full-stack developer...",
 *     description: "I've been working on the web for so long...",
 *     experience: "Throughout my career, I've worked on...",
 *     additional: "Beyond my technical skills, I've also collected..."
 *   },
 *   featuredProjects: {
 *     title: "Featured Projects",
 *     subtitle: "I've been fortunate to work on some really cool projects...",
 *     maxDisplay: 3
 *   },
 *   recentExperience: {
 *     title: "Recent Experience",
 *     subtitle: "My journey spans from agency work...",
 *     maxDisplay: 3
 *   },
 *   contact: {
 *     title: "Let's Work Together",
 *     subtitle: "Ready to build something amazing?",
 *     showContactForm: true
 *   }
 * };
 * ```
 */
export const indexPageSchema = makePageSchema({
  // Hero section content
  hero: z
    .object({
      title: z.string(),
      subtitle: z.string().optional(),
      description: z.string().optional(),
      showParticleBackground: z.boolean().default(true),
    })
    .optional(),

  // About/What I Do section
  about: z
    .object({
      title: z.string().default('What I Do'),
      introduction: z.string(),
      description: z.string(),
      experience: z.string(),
      additional: z.string(),
      showSkillsTicker: z.boolean().default(true),
    })
    .optional(),

  // Featured Projects section
  featuredProjects: z
    .object({
      title: z.string().default('Featured Projects'),
      subtitle: z.string(),
      maxDisplay: z.number().default(3),
      showViewAllButton: z.boolean().default(true),
      viewAllButtonText: z.string().default('View All Projects →'),
      viewAllButtonLink: z.string().default('/projects'),
    })
    .optional(),

  // Recent Experience section
  recentExperience: z
    .object({
      title: z.string().default('Recent Experience'),
      subtitle: z.string(),
      maxDisplay: z.number().default(3),
      showViewAllButton: z.boolean().default(true),
      viewAllButtonText: z.string().default('View Full Work History →'),
      viewAllButtonLink: z.string().default('/work'),
    })
    .optional(),

  // Contact section
  contact: z
    .object({
      title: z.string().default("Let's Work Together"),
      subtitle: z.string(),
      showContactForm: z.boolean().default(true),
    })
    .optional(),

  // Layout and styling options
  layout: z
    .object({
      hideContactForm: z.boolean().default(true),
      showHeroSection: z.boolean().default(true),
      showAboutSection: z.boolean().default(true),
      showFeaturedProjects: z.boolean().default(true),
      showRecentExperience: z.boolean().default(true),
      showContactSection: z.boolean().default(true),
    })
    .optional(),

  // SEO and performance options
  seo: z
    .object({
      structuredData: z.boolean().default(true),
      enableAnalytics: z.boolean().default(true),
      preloadCriticalAssets: z.boolean().default(true),
    })
    .optional(),
});

/**
 * Type for the index page data
 */
export type IndexPageData = z.infer<typeof indexPageSchema>;
