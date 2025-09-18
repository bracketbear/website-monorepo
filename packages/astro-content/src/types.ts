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
export type WorkCompany = typeof workCompanySchema._type;
export type WorkJob = typeof workJobSchema._type;
export type WorkSkill = typeof workSkillSchema._type;
export type WorkSkillCategory = typeof workSkillCategorySchema._type;
export type WorkProjectCategory = typeof workProjectCategorySchema._type;
export type WorkProject = typeof workProjectSchema._type;
export type Blog = typeof blogSchema._type;
export type Page = typeof pageSchema._type;
export type Service = typeof serviceSchema._type;

// Note: CollectionEntry types are Astro-specific and should be defined
// in Astro applications that use this package, not in the package itself.
// This keeps the package framework-agnostic.
