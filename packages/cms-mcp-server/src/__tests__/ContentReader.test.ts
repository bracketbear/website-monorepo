import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
}));

vi.mock('path', () => ({
  join: (...args: string[]) => args.join('/'),
  resolve: (...args: string[]) => args.join('/'),
}));

import { ContentReader } from '../types.js';
import { readFileSync, readdirSync, statSync } from 'fs';

// Get the mocked functions
const mockReadFileSync = vi.mocked(readFileSync);
const mockReaddirSync = vi.mocked(readdirSync);
const mockStatSync = vi.mocked(statSync);

describe('ContentReader', () => {
  let contentReader: ContentReader;

  beforeEach(() => {
    vi.clearAllMocks();
    contentReader = new ContentReader('test-content');
  });

  describe('getCompanies', () => {
    it('should return companies from JSON files', () => {
      const mockFiles = ['company1.json', 'company2.json'];
      const mockCompany1 = { title: 'Company 1', location: 'NYC' };
      const mockCompany2 = { title: 'Company 2', location: 'SF' };

      mockReaddirSync.mockReturnValue(mockFiles as any);
      mockStatSync.mockReturnValue({ isFile: () => true } as any);
      mockReadFileSync
        .mockReturnValueOnce(JSON.stringify(mockCompany1))
        .mockReturnValueOnce(JSON.stringify(mockCompany2));

      const companies = contentReader.getCompanies();

      expect(companies).toHaveLength(2);
      expect(companies[0]).toEqual(mockCompany1);
      expect(companies[1]).toEqual(mockCompany2);
    });

    it('should filter out non-JSON files', () => {
      const mockFiles = ['company1.json', 'company2.txt', 'company3.json'];
      const mockCompany1 = { title: 'Company 1' };
      const mockCompany3 = { title: 'Company 3' };

      mockReaddirSync.mockReturnValue(mockFiles as any);
      mockStatSync.mockReturnValue({ isFile: () => true } as any);
      mockReadFileSync
        .mockReturnValueOnce(JSON.stringify(mockCompany1))
        .mockReturnValueOnce(JSON.stringify(mockCompany3));

      const companies = contentReader.getCompanies();

      expect(companies).toHaveLength(2);
      expect(companies[0]).toEqual(mockCompany1);
      expect(companies[1]).toEqual(mockCompany3);
    });

    it('should handle file read errors gracefully', () => {
      const mockFiles = ['company1.json', 'invalid.json'];
      const mockCompany1 = { title: 'Company 1' };

      mockReaddirSync.mockReturnValue(mockFiles as any);
      mockStatSync.mockReturnValue({ isFile: () => true } as any);
      mockReadFileSync
        .mockReturnValueOnce(JSON.stringify(mockCompany1))
        .mockImplementationOnce(() => {
          throw new Error('File read error');
        });

      const companies = contentReader.getCompanies();

      expect(companies).toHaveLength(1);
      expect(companies[0]).toEqual(mockCompany1);
    });
  });

  describe('getJobs', () => {
    it('should return jobs from JSON files', () => {
      const mockFiles = ['job1.json'];
      const mockJob = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        startDate: '2023-01-01',
        highlights: ['Built amazing features'],
        workSkills: ['typescript', 'react'],
        isCurrentJob: false,
      };

      mockReaddirSync.mockReturnValue(mockFiles as any);
      mockStatSync.mockReturnValue({ isFile: () => true } as any);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockJob));

      const jobs = contentReader.getJobs();

      expect(jobs).toHaveLength(1);
      expect(jobs[0]).toEqual(mockJob);
    });
  });

  describe('getProjects', () => {
    it('should return projects from JSON files', () => {
      const mockFiles = ['project1.json'];
      const mockProject = {
        title: 'Amazing Project',
        job: 'software-engineer',
        duration: '6 months',
        summary: 'Built something cool',
        isFeatured: true,
        skills: ['typescript', 'react'],
        scope: ['Frontend development'],
        decisions: ['Used React for UI'],
        status: 'shipped' as const,
        links: [],
        impactTags: ['performance'],
      };

      mockReaddirSync.mockReturnValue(mockFiles as any);
      mockStatSync.mockReturnValue({ isFile: () => true } as any);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockProject));

      const projects = contentReader.getProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0]).toEqual(mockProject);
    });
  });

  describe('getSkills', () => {
    it('should return skills from JSON files', () => {
      const mockFiles = ['skill1.json'];
      const mockSkill = {
        title: 'TypeScript',
        description: 'Strongly typed JavaScript',
        category: 'programming-languages',
        isFeatured: true,
      };

      mockReaddirSync.mockReturnValue(mockFiles as any);
      mockStatSync.mockReturnValue({ isFile: () => true } as any);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockSkill));

      const skills = contentReader.getSkills();

      expect(skills).toHaveLength(1);
      expect(skills[0]).toEqual(mockSkill);
    });
  });

  describe('searchContent', () => {
    beforeEach(() => {
      // Mock all the getter methods
      vi.spyOn(contentReader, 'getCompanies').mockReturnValue([
        { title: 'Tech Corp', location: 'San Francisco' },
        { title: 'Design Studio', location: 'New York' },
      ]);

      vi.spyOn(contentReader, 'getJobs').mockReturnValue([
        {
          title: 'Frontend Developer',
          company: 'Tech Corp',
          description: 'Built React applications',
          highlights: ['Improved performance'],
          startDate: '2023-01-01',
          workSkills: ['react', 'typescript'],
          isCurrentJob: false,
        },
      ]);

      vi.spyOn(contentReader, 'getProjects').mockReturnValue([
        {
          title: 'E-commerce Platform',
          job: 'frontend-developer',
          duration: '6 months',
          summary: 'Built with React and TypeScript',
          description: 'Modern e-commerce solution',
          problem: 'Need better user experience',
          outcome: 'Improved conversion rates',
          scope: ['Frontend development'],
          decisions: ['Chose React over Vue'],
          status: 'shipped' as const,
          skills: ['react', 'typescript'],
          isFeatured: true,
          links: [],
          impactTags: ['performance'],
          media: [],
        },
      ]);

      vi.spyOn(contentReader, 'getSkills').mockReturnValue([
        {
          title: 'React',
          description: 'UI library',
          category: 'front-end',
          isFeatured: true,
        },
        {
          title: 'TypeScript',
          description: 'Typed JavaScript',
          category: 'programming-languages',
          isFeatured: false,
        },
      ]);

      vi.spyOn(contentReader, 'getBlogPosts').mockReturnValue([
        {
          title: 'Building with React',
          excerpt: 'Learn React best practices',
          content: 'React is awesome',
          publishedAt: '2023-01-01',
          isPublished: true,
          tags: ['react', 'frontend'],
        },
      ]);

      vi.spyOn(contentReader, 'getServices').mockReturnValue([
        {
          title: 'Web Development',
          description: 'Custom web applications',
          icon: 'code',
          isFeatured: true,
        },
      ]);
    });

    it('should search across all content types', () => {
      const results = contentReader.searchContent('React');

      expect(results.companies).toHaveLength(0);
      expect(results.jobs).toHaveLength(1);
      expect(results.projects).toHaveLength(1);
      expect(results.skills).toHaveLength(1);
      expect(results.blogPosts).toHaveLength(1);
      expect(results.services).toHaveLength(0);
    });

    it('should be case insensitive', () => {
      const results = contentReader.searchContent('react');

      expect(results.jobs).toHaveLength(1);
      expect(results.projects).toHaveLength(1);
      expect(results.skills).toHaveLength(1);
      expect(results.blogPosts).toHaveLength(1);
    });

    it('should search in arrays and nested fields', () => {
      const results = contentReader.searchContent('performance');

      expect(results.jobs).toHaveLength(1); // Found in highlights
      expect(results.projects).toHaveLength(1); // Found in impactTags
    });

    it('should return empty results for no matches', () => {
      const results = contentReader.searchContent('nonexistent');

      expect(results.companies).toHaveLength(0);
      expect(results.jobs).toHaveLength(0);
      expect(results.projects).toHaveLength(0);
      expect(results.skills).toHaveLength(0);
      expect(results.blogPosts).toHaveLength(0);
      expect(results.services).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle directory read errors gracefully', () => {
      mockReaddirSync.mockImplementation(() => {
        throw new Error('Directory not found');
      });

      const companies = contentReader.getCompanies();

      expect(companies).toHaveLength(0);
    });

    it('should handle invalid JSON gracefully', () => {
      const mockFiles = ['invalid.json'];

      mockReaddirSync.mockReturnValue(mockFiles as any);
      mockStatSync.mockReturnValue({ isFile: () => true } as any);
      mockReadFileSync.mockReturnValue('invalid json content');

      const companies = contentReader.getCompanies();

      expect(companies).toHaveLength(0);
    });
  });
});
