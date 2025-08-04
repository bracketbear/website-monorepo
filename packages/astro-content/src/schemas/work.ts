import { z } from 'zod';

/**
 * Work-related content schemas for professional experience, projects, and skills
 *
 * These schemas define the structure and validation rules for work-related content
 * including companies, jobs, skills, and projects. They are used to ensure data
 * consistency and provide TypeScript types for content management.
 */

/**
 * Schema for company information
 *
 * Defines the structure for company data including basic information like
 * name, logo, website, and location.
 *
 * @example
 * ```typescript
 * const companyData = {
 *   title: "DeepLocal",
 *   logo: "deeplocal-logo.svg",
 *   website: "https://deeplocal.com",
 *   location: "Pittsburgh, PA"
 * };
 * ```
 */
export const workCompanySchema = z.object({
  title: z.string(),
  logo: z.string().optional(),
  website: z.string().optional(),
  location: z.string().optional(),
});

/**
 * Schema for job/employment information
 *
 * Defines the structure for job data including position details, company
 * reference, dates, and associated skills.
 *
 * @example
 * ```typescript
 * const jobData = {
 *   title: "Full Stack Software Engineer",
 *   company: "deeplocal",
 *   description: "Developed interactive experiences...",
 *   highlights: ["Led team of 3 developers", "Improved performance by 40%"],
 *   startDate: "2022-01-15",
 *   endDate: "2023-06-30",
 *   workSkills: ["react", "node", "typescript"],
 *   isCurrentJob: false
 * };
 * ```
 */
export const workJobSchema = z.object({
  title: z.string(),
  company: z.string(), // references "workCompanies"
  description: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  workSkills: z.array(z.string()).optional(), // references "workSkills"
  isCurrentJob: z.boolean().default(false),
});

/**
 * Schema for skill information
 *
 * Defines the structure for individual skills including title, description,
 * category, and whether it should be featured prominently.
 *
 * @example
 * ```typescript
 * const skillData = {
 *   title: "React",
 *   description: "Modern JavaScript library for building user interfaces",
 *   isFeatured: true,
 *   category: "front-end"
 * };
 * ```
 */
export const workSkillSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  isFeatured: z.boolean().default(false),
  category: z.string(), // references "workSkillCategories"
});

/**
 * Schema for skill category information
 *
 * Defines the structure for skill categories that group related skills
 * together (e.g., "Front-end", "Back-end", "Design Tools").
 *
 * @example
 * ```typescript
 * const categoryData = {
 *   title: "Front-end Development",
 *   description: "Technologies and tools for client-side development"
 * };
 * ```
 */
export const workSkillCategorySchema = z.object({
  title: z.string(),
  description: z.string().optional(),
});

/**
 * Schema for project category information
 *
 * Defines the structure for project categories that group related projects
 * together (e.g., "Web Development", "Experiential Engineering").
 *
 * @example
 * ```typescript
 * const categoryData = {
 *   title: "Full Stack Engineering"
 * };
 * ```
 */
export const workProjectCategorySchema = z.object({
  title: z.string(),
});

/**
 * Schema for project information
 *
 * Defines the structure for project data including details about the work
 * performed, associated job, media, and skills used.
 *
 * @example
 * ```typescript
 * const projectData = {
 *   title: "Interactive Museum Experience",
 *   job: "dl-full-stack-software-engineer",
 *   duration: "6 months",
 *   coverImage: "coverImage.jpg",
 *   summary: "Created an immersive museum experience...",
 *   description: "Detailed project description...",
 *   challengesAndSolutions: "Faced performance challenges...",
 *   resultsAchieved: "Increased visitor engagement by 60%",
 *   mediaDescription: "Screenshots and videos of the experience",
 *   media: [
 *     { image: "screenshot1.jpg", caption: "Main interface" },
 *     { image: "screenshot2.jpg", caption: "Interactive elements" }
 *   ],
 *   isFeatured: true,
 *   category: "experiential-engineering",
 *   skills: ["react", "node", "threejs"]
 * };
 * ```
 */
export const workProjectSchema = z.object({
  title: z.string(),
  job: z.string(), // references "workJobs"
  duration: z.string(),
  coverImage: z.string().optional(),
  summary: z.string().optional(), // Brief project overview
  description: z.string().optional(),
  challengesAndSolutions: z.string().optional(),
  resultsAchieved: z.string().optional(),
  mediaDescription: z.string().optional(),
  media: z
    .array(
      z
        .object({
          image: z.string(),
          caption: z.string().optional(),
        })
        .optional()
    )
    .optional(),
  isFeatured: z.boolean().default(false),
  category: z.string().optional(), // references "workProjectCategory"
  skills: z.array(z.string()).optional(), // references "workSkills"
  cta: z
    .object({
      text: z.string().optional(),
      buttonText: z.string().optional(),
      buttonLink: z.string().optional(),
    })
    .optional(),
});
