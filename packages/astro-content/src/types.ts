import type { z } from 'zod';
import type {
  workCompanySchema,
  workJobSchema,
  workSkillSchema,
  workSkillCategorySchema,
  workProjectCategorySchema,
  workProjectSchema,
  blogSchema,
  pageSchema,
  serviceSchema,
} from '@bracketbear/schemas';

// Export the raw schema types (inferred from Zod schemas)
export type WorkCompany = z.infer<typeof workCompanySchema>;
export type WorkJob = z.infer<typeof workJobSchema>;
export type WorkSkill = z.infer<typeof workSkillSchema>;
export type WorkSkillCategory = z.infer<typeof workSkillCategorySchema>;
export type WorkProjectCategory = z.infer<typeof workProjectCategorySchema>;
export type WorkProject = z.infer<typeof workProjectSchema>;
export type Blog = z.infer<typeof blogSchema>;
export type Page = z.infer<typeof pageSchema>;
export type Service = z.infer<typeof serviceSchema>;

// Note: CollectionEntry types are Astro-specific and should be defined
// in Astro applications that use this package, not in the package itself.
// This keeps the package framework-agnostic.
