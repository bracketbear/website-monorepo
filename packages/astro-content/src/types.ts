import type { CollectionEntry } from 'astro:content';
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
} from './schemas';

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

// Export collection entry types
export type WorkCompanyEntry = CollectionEntry<'workCompany'>;
export type WorkJobEntry = CollectionEntry<'workJobs'>;
export type WorkSkillEntry = CollectionEntry<'workSkills'>;
export type WorkSkillCategoryEntry = CollectionEntry<'workSkillCategory'>;
export type WorkProjectCategoryEntry = CollectionEntry<'workProjectCategory'>;
export type WorkProjectEntry = CollectionEntry<'workProject'>;
export type BlogEntry = CollectionEntry<'blog'>;
export type PageEntry = CollectionEntry<'pages'>;
export type ServiceEntry = CollectionEntry<'services'>;

// Helper types for common patterns
export type WorkJobWithCompany = WorkJobEntry & {
  companyData?: WorkCompanyEntry;
};

export type WorkProjectWithJob = WorkProjectEntry & {
  jobData?: WorkJobEntry;
};

export type WorkSkillWithCategory = WorkSkillEntry & {
  categoryData?: WorkSkillCategoryEntry;
};

// Re-export CollectionEntry for convenience
export type { CollectionEntry } from 'astro:content';
