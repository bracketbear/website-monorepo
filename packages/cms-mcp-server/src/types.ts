import {
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  mkdirSync,
} from 'fs';
import { join, resolve, dirname } from 'path';

/**
 * Content types for the CMS MCP server
 */
export interface Company {
  title: string;
  logo?: string;
  website?: string;
  location?: string;
}

export interface Job {
  title: string;
  company: string;
  description?: string;
  highlights: string[];
  startDate: string;
  endDate?: string;
  workSkills: string[];
  isCurrentJob: boolean;
}

export interface Project {
  title: string;
  job: string;
  duration: string;
  coverImage?: string;
  summary: string;
  description?: string;
  challengesAndSolutions?: string;
  resultsAchieved?: string;
  mediaDescription?: string;
  media: Array<{
    image: string;
    caption?: string;
    alt?: string;
  }>;
  isFeatured: boolean;
  category?: string;
  skills: string[];
  cta?: {
    text?: string;
    buttonText?: string;
    buttonLink?: string;
  };
  oneLiner?: string;
  problem?: string;
  scope: string[];
  decisions: string[];
  outcome?: string;
  notes?: string;
  status: 'shipped' | 'prototype' | 'retired' | 'paused';
  links: Array<{
    label: string;
    href: string;
  }>;
  a11y?: {
    coverAlt?: string;
  };
  teaser?: {
    headline?: string;
    subline?: string;
  };
  impactTags: string[];
}

export interface Skill {
  title: string;
  description?: string;
  category: string;
  isFeatured: boolean;
}

export interface SkillCategory {
  title: string;
  description?: string;
  isActive: boolean;
  icon?: string;
  color: 'default' | 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

export interface BlogPost {
  title: string;
  excerpt?: string;
  content?: string;
  publishedAt?: string;
  isPublished: boolean;
  tags: string[];
  featuredImage?: string;
}

export interface Service {
  title: string;
  description?: string;
  icon?: string;
  isFeatured: boolean;
}

export interface PortfolioPage {
  title: string;
  content?: string;
  metaDescription?: string;
  isPublished: boolean;
}

/**
 * Content access utilities for reading CMS files
 */
export class ContentReader {
  private contentPath: string;

  constructor(
    contentPath: string = process.env.CMS_CONTENT_PATH ||
      '../../../apps/cms/content'
  ) {
    this.contentPath = resolve(contentPath);
  }

  /**
   * Read a JSON file from the content directory
   */
  private readJsonFile<T>(filePath: string): T | null {
    try {
      const fullPath = join(this.contentPath, filePath);
      const content = readFileSync(fullPath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      console.warn(`Failed to read ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Write a JSON file to the content directory
   */
  private writeJsonFile<T>(filePath: string, data: T): boolean {
    try {
      const fullPath = join(this.contentPath, filePath);
      const dir = dirname(fullPath);

      // Ensure directory exists
      mkdirSync(dir, { recursive: true });

      // Write the file with pretty formatting
      writeFileSync(fullPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
      return true;
    } catch (error) {
      console.error(`Failed to write ${filePath}:`, error);
      return false;
    }
  }

  /**
   * List all files in a directory
   */
  private listFiles(dirPath: string): string[] {
    try {
      const fullPath = join(this.contentPath, dirPath);
      return readdirSync(fullPath).filter((file) => {
        const filePath = join(fullPath, file);
        return statSync(filePath).isFile() && file.endsWith('.json');
      });
    } catch (error) {
      console.warn(`Failed to list files in ${dirPath}:`, error);
      return [];
    }
  }

  /**
   * Get all companies
   */
  getCompanies(): Company[] {
    const files = this.listFiles('work/companies');
    return files
      .map((file) => this.readJsonFile<Company>(`work/companies/${file}`))
      .filter((company): company is Company => company !== null);
  }

  /**
   * Get all jobs
   */
  getJobs(): Job[] {
    const files = this.listFiles('work/jobs');
    return files
      .map((file) => this.readJsonFile<Job>(`work/jobs/${file}`))
      .filter((job): job is Job => job !== null);
  }

  /**
   * Get all projects
   */
  getProjects(): Project[] {
    const files = this.listFiles('work/projects');
    return files
      .map((file) => this.readJsonFile<Project>(`work/projects/${file}`))
      .filter((project): project is Project => project !== null);
  }

  /**
   * Get all skills
   */
  getSkills(): Skill[] {
    const files = this.listFiles('work/skills');
    return files
      .map((file) => this.readJsonFile<Skill>(`work/skills/${file}`))
      .filter((skill): skill is Skill => skill !== null);
  }

  /**
   * Get all skill categories
   */
  getSkillCategories(): SkillCategory[] {
    const files = this.listFiles('work/skill-categories');
    return files
      .map((file) =>
        this.readJsonFile<SkillCategory>(`work/skill-categories/${file}`)
      )
      .filter((category): category is SkillCategory => category !== null);
  }

  /**
   * Get all blog posts
   */
  getBlogPosts(): BlogPost[] {
    const files = this.listFiles('blog');
    return files
      .map((file) => this.readJsonFile<BlogPost>(`blog/${file}`))
      .filter((post): post is BlogPost => post !== null);
  }

  /**
   * Get all services
   */
  getServices(): Service[] {
    const files = this.listFiles('services');
    return files
      .map((file) => this.readJsonFile<Service>(`services/${file}`))
      .filter((service): service is Service => service !== null);
  }

  /**
   * Get portfolio pages
   */
  getPortfolioPages(): PortfolioPage[] {
    const files = this.listFiles('sites/portfolio');
    return files
      .map((file) =>
        this.readJsonFile<PortfolioPage>(`sites/portfolio/${file}`)
      )
      .filter((page): page is PortfolioPage => page !== null);
  }

  /**
   * Update a job by filename
   */
  updateJob(filename: string, jobData: Partial<Job>): boolean {
    const existingJob = this.readJsonFile<Job>(`work/jobs/${filename}`);
    if (!existingJob) {
      return false;
    }

    const updatedJob = { ...existingJob, ...jobData };
    return this.writeJsonFile(`work/jobs/${filename}`, updatedJob);
  }

  /**
   * Update a project by filename
   */
  updateProject(filename: string, projectData: Partial<Project>): boolean {
    const existingProject = this.readJsonFile<Project>(
      `work/projects/${filename}`
    );
    if (!existingProject) {
      return false;
    }

    const updatedProject = { ...existingProject, ...projectData };
    return this.writeJsonFile(`work/projects/${filename}`, updatedProject);
  }

  /**
   * Update a company by filename
   */
  updateCompany(filename: string, companyData: Partial<Company>): boolean {
    const existingCompany = this.readJsonFile<Company>(
      `work/companies/${filename}`
    );
    if (!existingCompany) {
      return false;
    }

    const updatedCompany = { ...existingCompany, ...companyData };
    return this.writeJsonFile(`work/companies/${filename}`, updatedCompany);
  }

  /**
   * Update a skill by filename
   */
  updateSkill(filename: string, skillData: Partial<Skill>): boolean {
    const existingSkill = this.readJsonFile<Skill>(`work/skills/${filename}`);
    if (!existingSkill) {
      return false;
    }

    const updatedSkill = { ...existingSkill, ...skillData };
    return this.writeJsonFile(`work/skills/${filename}`, updatedSkill);
  }

  /**
   * Update a blog post by filename
   */
  updateBlogPost(filename: string, postData: Partial<BlogPost>): boolean {
    const existingPost = this.readJsonFile<BlogPost>(`blog/${filename}`);
    if (!existingPost) {
      return false;
    }

    const updatedPost = { ...existingPost, ...postData };
    return this.writeJsonFile(`blog/${filename}`, updatedPost);
  }

  /**
   * Update a service by filename
   */
  updateService(filename: string, serviceData: Partial<Service>): boolean {
    const existingService = this.readJsonFile<Service>(`services/${filename}`);
    if (!existingService) {
      return false;
    }

    const updatedService = { ...existingService, ...serviceData };
    return this.writeJsonFile(`services/${filename}`, updatedService);
  }

  /**
   * Search across all content
   */
  searchContent(query: string): {
    companies: Company[];
    jobs: Job[];
    projects: Project[];
    skills: Skill[];
    blogPosts: BlogPost[];
    services: Service[];
    portfolioPages: PortfolioPage[];
  } {
    const lowerQuery = query.toLowerCase();

    const companies = this.getCompanies().filter(
      (company) =>
        company.title.toLowerCase().includes(lowerQuery) ||
        company.location?.toLowerCase().includes(lowerQuery)
    );

    const jobs = this.getJobs().filter(
      (job) =>
        job.title.toLowerCase().includes(lowerQuery) ||
        job.company.toLowerCase().includes(lowerQuery) ||
        job.description?.toLowerCase().includes(lowerQuery) ||
        job.highlights?.some((highlight) =>
          highlight.toLowerCase().includes(lowerQuery)
        )
    );

    const projects = this.getProjects().filter(
      (project) =>
        project.title.toLowerCase().includes(lowerQuery) ||
        project.summary.toLowerCase().includes(lowerQuery) ||
        project.description?.toLowerCase().includes(lowerQuery) ||
        project.problem?.toLowerCase().includes(lowerQuery) ||
        project.outcome?.toLowerCase().includes(lowerQuery) ||
        project.scope?.some((item) =>
          item.toLowerCase().includes(lowerQuery)
        ) ||
        project.decisions?.some((decision) =>
          decision.toLowerCase().includes(lowerQuery)
        ) ||
        project.impactTags?.some((tag) =>
          tag.toLowerCase().includes(lowerQuery)
        )
    );

    const skills = this.getSkills().filter(
      (skill) =>
        skill.title.toLowerCase().includes(lowerQuery) ||
        skill.description?.toLowerCase().includes(lowerQuery)
    );

    const blogPosts = this.getBlogPosts().filter(
      (post) =>
        post.title.toLowerCase().includes(lowerQuery) ||
        post.excerpt?.toLowerCase().includes(lowerQuery) ||
        post.content?.toLowerCase().includes(lowerQuery) ||
        post.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );

    const services = this.getServices().filter(
      (service) =>
        service.title.toLowerCase().includes(lowerQuery) ||
        service.description?.toLowerCase().includes(lowerQuery)
    );

    const portfolioPages = this.getPortfolioPages().filter(
      (page) =>
        page.title.toLowerCase().includes(lowerQuery) ||
        page.content?.toLowerCase().includes(lowerQuery) ||
        page.metaDescription?.toLowerCase().includes(lowerQuery)
    );

    return {
      companies,
      jobs,
      projects,
      skills,
      blogPosts,
      services,
      portfolioPages,
    };
  }
}
