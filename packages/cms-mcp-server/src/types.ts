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
   * Enhanced search across all content with fuzzy matching and semantic understanding
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
    const searchTerms = this.extractSearchTerms(query);
    const originalQuery = query.toLowerCase();

    const companies = this.searchAndRankCompanies(searchTerms, originalQuery);
    const jobs = this.searchAndRankJobs(searchTerms, originalQuery);
    const projects = this.searchAndRankProjects(searchTerms, originalQuery);
    const skills = this.searchAndRankSkills(searchTerms, originalQuery);
    const blogPosts = this.searchAndRankBlogPosts(searchTerms, originalQuery);
    const services = this.searchAndRankServices(searchTerms, originalQuery);
    const portfolioPages = this.searchAndRankPortfolioPages(
      searchTerms,
      originalQuery
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

  /**
   * Extract and normalize search terms from query with semantic expansion
   */
  private extractSearchTerms(query: string): string[] {
    const baseTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 0)
      .map((term) => term.replace(/[^\w-]/g, '')); // Remove punctuation

    // Add semantic synonyms and related terms
    const expandedTerms = [...baseTerms];

    // Add synonyms for common terms
    const synonyms: Record<string, string[]> = {
      portfolio: ['projects', 'work', 'experience', 'case-studies'],
      project: ['portfolio', 'work', 'case-study', 'experience'],
      category: ['categories', 'type', 'section', 'group'],
      subheading: ['subheadings', 'heading', 'headings', 'title', 'titles'],
      saas: ['software', 'platform', 'application', 'service'],
      experiential: ['interactive', 'immersive', 'digital-experience'],
      cms: ['content-management', 'content-management-system'],
      'full-stack': ['fullstack', 'full-stack-development', 'web-development'],
      frontend: ['front-end', 'frontend-development', 'ui-development'],
      backend: ['back-end', 'backend-development', 'server-development'],
    };

    // Add related terms
    baseTerms.forEach((term) => {
      if (synonyms[term]) {
        expandedTerms.push(...synonyms[term]);
      }
    });

    // Remove duplicates and return
    return [...new Set(expandedTerms)];
  }

  /**
   * Check if text matches any search term with fuzzy matching
   */
  private matchesSearchTerms(text: string, searchTerms: string[]): boolean {
    if (!text) return false;

    const lowerText = text.toLowerCase();

    // Exact match gets highest priority
    const fullQuery = searchTerms.join(' ');
    if (lowerText.includes(fullQuery)) return true;

    // Check if all search terms are present (in any order)
    const allTermsMatch = searchTerms.every(
      (term) => lowerText.includes(term) || this.fuzzyMatch(lowerText, term)
    );

    if (allTermsMatch) return true;

    // Check individual terms for partial matches
    return searchTerms.some(
      (term) => lowerText.includes(term) || this.fuzzyMatch(lowerText, term)
    );
  }

  /**
   * Simple fuzzy matching based on Levenshtein distance
   */
  private fuzzyMatch(text: string, term: string): boolean {
    if (term.length < 3) return text.includes(term);

    // Check if term is contained in text with some tolerance
    for (let i = 0; i <= text.length - term.length; i++) {
      const substring = text.substring(i, i + term.length);
      if (this.levenshteinDistance(substring, term) <= 1) {
        return true;
      }
    }

    // Check if term contains text (for abbreviations)
    if (term.length > text.length && term.includes(text)) {
      return true;
    }

    return false;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate relevance score for a match
   */
  private calculateRelevanceScore(
    text: string,
    searchTerms: string[],
    originalQuery: string
  ): number {
    if (!text) return 0;

    const lowerText = text.toLowerCase();
    const lowerOriginal = originalQuery.toLowerCase();

    let score = 0;

    // Exact match gets highest score
    if (lowerText.includes(lowerOriginal)) {
      score += 100;
    }

    // All terms present gets high score
    const allTermsMatch = searchTerms.every((term) => lowerText.includes(term));
    if (allTermsMatch) {
      score += 50;
    }

    // Individual term matches
    searchTerms.forEach((term) => {
      if (lowerText.includes(term)) {
        score += 10;
      }
    });

    // Bonus for matches at the beginning of text
    searchTerms.forEach((term) => {
      if (lowerText.startsWith(term)) {
        score += 20;
      }
    });

    return score;
  }

  /**
   * Search and rank companies with enhanced matching
   */
  private searchAndRankCompanies(
    searchTerms: string[],
    originalQuery: string
  ): Company[] {
    const companies = this.getCompanies();
    const scoredCompanies = companies
      .map((company) => ({
        company,
        score: Math.max(
          this.calculateRelevanceScore(
            company.title,
            searchTerms,
            originalQuery
          ),
          this.calculateRelevanceScore(
            company.location || '',
            searchTerms,
            originalQuery
          ),
          this.calculateRelevanceScore(
            company.website || '',
            searchTerms,
            originalQuery
          )
        ),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.company);

    return scoredCompanies;
  }

  /**
   * Search and rank jobs with enhanced matching
   */
  private searchAndRankJobs(
    searchTerms: string[],
    originalQuery: string
  ): Job[] {
    const jobs = this.getJobs();
    const scoredJobs = jobs
      .map((job) => {
        const titleScore = this.calculateRelevanceScore(
          job.title,
          searchTerms,
          originalQuery
        );
        const companyScore = this.calculateRelevanceScore(
          job.company,
          searchTerms,
          originalQuery
        );
        const descScore = this.calculateRelevanceScore(
          job.description || '',
          searchTerms,
          originalQuery
        );
        const highlightsScore =
          job.highlights?.reduce(
            (max, highlight) =>
              Math.max(
                max,
                this.calculateRelevanceScore(
                  highlight,
                  searchTerms,
                  originalQuery
                )
              ),
            0
          ) || 0;
        const skillsScore =
          job.workSkills?.reduce(
            (max, skill) =>
              Math.max(
                max,
                this.calculateRelevanceScore(skill, searchTerms, originalQuery)
              ),
            0
          ) || 0;

        return {
          job,
          score: Math.max(
            titleScore,
            companyScore,
            descScore,
            highlightsScore,
            skillsScore
          ),
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.job);

    return scoredJobs;
  }

  /**
   * Search and rank projects with enhanced matching
   */
  private searchAndRankProjects(
    searchTerms: string[],
    originalQuery: string
  ): Project[] {
    const projects = this.getProjects();
    const scoredProjects = projects
      .map((project) => {
        const titleScore = this.calculateRelevanceScore(
          project.title,
          searchTerms,
          originalQuery
        );
        const summaryScore = this.calculateRelevanceScore(
          project.summary,
          searchTerms,
          originalQuery
        );
        const descScore = this.calculateRelevanceScore(
          project.description || '',
          searchTerms,
          originalQuery
        );
        const problemScore = this.calculateRelevanceScore(
          project.problem || '',
          searchTerms,
          originalQuery
        );
        const outcomeScore = this.calculateRelevanceScore(
          project.outcome || '',
          searchTerms,
          originalQuery
        );
        const oneLinerScore = this.calculateRelevanceScore(
          project.oneLiner || '',
          searchTerms,
          originalQuery
        );
        const categoryScore = this.calculateRelevanceScore(
          project.category || '',
          searchTerms,
          originalQuery
        );
        const scopeScore =
          project.scope?.reduce(
            (max, item) =>
              Math.max(
                max,
                this.calculateRelevanceScore(item, searchTerms, originalQuery)
              ),
            0
          ) || 0;
        const decisionsScore =
          project.decisions?.reduce(
            (max, decision) =>
              Math.max(
                max,
                this.calculateRelevanceScore(
                  decision,
                  searchTerms,
                  originalQuery
                )
              ),
            0
          ) || 0;
        const impactScore =
          project.impactTags?.reduce(
            (max, tag) =>
              Math.max(
                max,
                this.calculateRelevanceScore(tag, searchTerms, originalQuery)
              ),
            0
          ) || 0;
        const skillsScore =
          project.skills?.reduce(
            (max, skill) =>
              Math.max(
                max,
                this.calculateRelevanceScore(skill, searchTerms, originalQuery)
              ),
            0
          ) || 0;

        return {
          project,
          score: Math.max(
            titleScore,
            summaryScore,
            descScore,
            problemScore,
            outcomeScore,
            oneLinerScore,
            categoryScore,
            scopeScore,
            decisionsScore,
            impactScore,
            skillsScore
          ),
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.project);

    return scoredProjects;
  }

  /**
   * Search and rank skills with enhanced matching
   */
  private searchAndRankSkills(
    searchTerms: string[],
    originalQuery: string
  ): Skill[] {
    const skills = this.getSkills();
    const scoredSkills = skills
      .map((skill) => ({
        skill,
        score: Math.max(
          this.calculateRelevanceScore(skill.title, searchTerms, originalQuery),
          this.calculateRelevanceScore(
            skill.description || '',
            searchTerms,
            originalQuery
          ),
          this.calculateRelevanceScore(
            skill.category,
            searchTerms,
            originalQuery
          )
        ),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.skill);

    return scoredSkills;
  }

  /**
   * Search and rank blog posts with enhanced matching
   */
  private searchAndRankBlogPosts(
    searchTerms: string[],
    originalQuery: string
  ): BlogPost[] {
    const blogPosts = this.getBlogPosts();
    const scoredPosts = blogPosts
      .map((post) => {
        const titleScore = this.calculateRelevanceScore(
          post.title,
          searchTerms,
          originalQuery
        );
        const excerptScore = this.calculateRelevanceScore(
          post.excerpt || '',
          searchTerms,
          originalQuery
        );
        const contentScore = this.calculateRelevanceScore(
          post.content || '',
          searchTerms,
          originalQuery
        );
        const tagsScore =
          post.tags?.reduce(
            (max, tag) =>
              Math.max(
                max,
                this.calculateRelevanceScore(tag, searchTerms, originalQuery)
              ),
            0
          ) || 0;

        return {
          post,
          score: Math.max(titleScore, excerptScore, contentScore, tagsScore),
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.post);

    return scoredPosts;
  }

  /**
   * Search and rank services with enhanced matching
   */
  private searchAndRankServices(
    searchTerms: string[],
    originalQuery: string
  ): Service[] {
    const services = this.getServices();
    const scoredServices = services
      .map((service) => ({
        service,
        score: Math.max(
          this.calculateRelevanceScore(
            service.title,
            searchTerms,
            originalQuery
          ),
          this.calculateRelevanceScore(
            service.description || '',
            searchTerms,
            originalQuery
          )
        ),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.service);

    return scoredServices;
  }

  /**
   * Search and rank portfolio pages with enhanced matching including nested content
   */
  private searchAndRankPortfolioPages(
    searchTerms: string[],
    originalQuery: string
  ): PortfolioPage[] {
    const portfolioPages = this.getPortfolioPages();
    const scoredPages = portfolioPages
      .map((page) => {
        const titleScore = this.calculateRelevanceScore(
          page.title,
          searchTerms,
          originalQuery
        );
        const contentScore = this.calculateRelevanceScore(
          page.content || '',
          searchTerms,
          originalQuery
        );
        const metaScore = this.calculateRelevanceScore(
          page.metaDescription || '',
          searchTerms,
          originalQuery
        );

        let nestedScore = 0;
        try {
          const pageData = this.readJsonFile<any>(
            `sites/portfolio/${page.title.toLowerCase().replace(/\s+/g, '-')}.json`
          );
          if (pageData) {
            nestedScore = this.calculateNestedContentScore(
              pageData,
              searchTerms,
              originalQuery
            );
          }
        } catch (error: unknown) {
          console.error('Error reading portfolio page data:', error);
          // Ignore errors and continue with basic matching
        }

        return {
          page,
          score: Math.max(titleScore, contentScore, metaScore, nestedScore),
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.page);

    return scoredPages;
  }

  /**
   * Calculate score for nested content structures
   */
  private calculateNestedContentScore(
    obj: any,
    searchTerms: string[],
    originalQuery: string
  ): number {
    let maxScore = 0;

    if (typeof obj === 'string') {
      return this.calculateRelevanceScore(obj, searchTerms, originalQuery);
    }

    if (Array.isArray(obj)) {
      obj.forEach((item) => {
        maxScore = Math.max(
          maxScore,
          this.calculateNestedContentScore(item, searchTerms, originalQuery)
        );
      });
    }

    if (obj && typeof obj === 'object') {
      Object.values(obj).forEach((value) => {
        maxScore = Math.max(
          maxScore,
          this.calculateNestedContentScore(value, searchTerms, originalQuery)
        );
      });
    }

    return maxScore;
  }

  /**
   * Recursively search nested content structures
   */
  private searchNestedContent(obj: any, searchTerms: string[]): boolean {
    if (typeof obj === 'string') {
      return this.matchesSearchTerms(obj, searchTerms);
    }

    if (Array.isArray(obj)) {
      return obj.some((item) => this.searchNestedContent(item, searchTerms));
    }

    if (obj && typeof obj === 'object') {
      return Object.values(obj).some((value) =>
        this.searchNestedContent(value, searchTerms)
      );
    }

    return false;
  }
}
