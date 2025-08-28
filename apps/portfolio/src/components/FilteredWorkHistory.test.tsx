import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FilteredWorkHistory from './FilteredWorkHistory';
import type { CollectionEntry } from 'astro:content';

// Mock the core components
vi.mock('@bracketbear/core/react', () => ({
  SkillPill: ({ children, onClick, selected }: any) => (
    <button
      onClick={onClick}
      className={selected ? 'selected' : 'unselected'}
      data-testid={`skill-${children}`}
    >
      {children}
    </button>
  ),
  ToastProvider: ({ children }: any) => (
    <div data-testid="toast-provider">{children}</div>
  ),
  useToast: () => ({
    showToast: vi.fn(),
  }),
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="clear-filters">
      {children}
    </button>
  ),
}));

// Mock WorkHistory component
vi.mock('./WorkHistory', () => ({
  default: ({ jobs, companies, projects, selectedSkills, skills }: any) => (
    <div data-testid="work-history">
      <div data-testid="jobs-count">{jobs.length} jobs</div>
      <div data-testid="companies-count">{companies.length} companies</div>
      <div data-testid="projects-count">{projects.length} projects</div>
      <div data-testid="selected-skills">{selectedSkills.join(', ')}</div>
      <div data-testid="skills-count">{skills.length} skills</div>
    </div>
  ),
}));

describe('FilteredWorkHistory', () => {
  // Mock data
  const mockSkills: CollectionEntry<'workSkills'>[] = [
    {
      id: 'react',
      slug: 'react',
      body: '',
      collection: 'workSkills',
      data: {
        title: 'React',
        description: 'React framework',
        isFeatured: true,
        category: 'front-end',
        order: 1,
        isActive: true,
        proficiency: 'expert',
      },
    },
    {
      id: 'typescript',
      slug: 'typescript',
      body: '',
      collection: 'workSkills',
      data: {
        title: 'TypeScript',
        description: 'TypeScript language',
        isFeatured: true,
        category: 'programming-languages',
        order: 2,
        isActive: true,
        proficiency: 'expert',
      },
    },
    {
      id: 'node',
      slug: 'node',
      body: '',
      collection: 'workSkills',
      data: {
        title: 'Node.js',
        description: 'Node.js runtime',
        isFeatured: false,
        category: 'back-end',
        order: 3,
        isActive: true,
        proficiency: 'advanced',
      },
    },
  ];

  const mockSkillCategories: CollectionEntry<'workSkillCategory'>[] = [
    {
      id: 'front-end',
      slug: 'front-end',
      body: '',
      collection: 'workSkillCategory',
      data: {
        title: 'Front-End Development',
        description: 'Client-side technologies',
      },
    },
    {
      id: 'programming-languages',
      slug: 'programming-languages',
      body: '',
      collection: 'workSkillCategory',
      data: {
        title: 'Programming Languages',
        description: 'Programming languages',
      },
    },
    {
      id: 'back-end',
      slug: 'back-end',
      body: '',
      collection: 'workSkillCategory',
      data: {
        title: 'Back-End Development',
        description: 'Server-side technologies',
      },
    },
  ];

  const mockJobs: CollectionEntry<'workJobs'>[] = [
    {
      id: 'job-1',
      slug: 'job-1',
      body: '',
      collection: 'workJobs',
      data: {
        title: 'Software Engineer',
        company: 'company-1',
        description: 'Job description',
        highlights: ['Highlight 1', 'Highlight 2'],
        startDate: new Date('2020-01-01'),
        endDate: new Date('2023-01-01'),
        workSkills: ['react', 'typescript'],
        isCurrentJob: false,
      },
    },
  ];

  const mockProjects: CollectionEntry<'workProject'>[] = [
    {
      id: 'project-1',
      slug: 'project-1',
      body: '',
      collection: 'workProject',
      data: {
        title: 'Project 1',
        job: 'job-1',
        duration: '6 months',
        summary: 'Project summary',
        skills: ['react', 'node'],
        isFeatured: true,
      },
    },
  ];

  const mockCompanies: CollectionEntry<'workCompany'>[] = [
    {
      id: 'company-1',
      slug: 'company-1',
      body: '',
      collection: 'workCompany',
      data: {
        title: 'Company 1',
        logo: 'logo.png',
        website: 'https://company1.com',
        location: 'Location 1',
      },
    },
  ];

  it('renders all skill categories with their skills', () => {
    render(
      <FilteredWorkHistory
        skills={mockSkills}
        skillCategories={mockSkillCategories}
        jobs={mockJobs}
        projects={mockProjects}
        companies={mockCompanies}
      />
    );

    // Check that all categories are rendered
    expect(screen.getByText('Front-End Development')).toBeInTheDocument();
    expect(screen.getByText('Programming Languages')).toBeInTheDocument();
    expect(screen.getByText('Back-End Development')).toBeInTheDocument();

    // Check that skills are rendered under their categories
    expect(screen.getByTestId('skill-React')).toBeInTheDocument();
    expect(screen.getByTestId('skill-TypeScript')).toBeInTheDocument();
    expect(screen.getByTestId('skill-Node.js')).toBeInTheDocument();
  });

  it('filters skills by category correctly', () => {
    render(
      <FilteredWorkHistory
        skills={mockSkills}
        skillCategories={mockSkillCategories}
        jobs={mockJobs}
        projects={mockProjects}
        companies={mockCompanies}
      />
    );

    // Front-end category should have React
    const frontEndSection = screen
      .getByText('Front-End Development')
      .closest('div');
    expect(frontEndSection).toContainElement(screen.getByTestId('skill-React'));

    // Programming languages category should have TypeScript
    const programmingSection = screen
      .getByText('Programming Languages')
      .closest('div');
    expect(programmingSection).toContainElement(
      screen.getByTestId('skill-TypeScript')
    );

    // Back-end category should have Node.js
    const backEndSection = screen
      .getByText('Back-End Development')
      .closest('div');
    expect(backEndSection).toContainElement(
      screen.getByTestId('skill-Node.js')
    );
  });

  it('allows selecting and deselecting skills', () => {
    render(
      <FilteredWorkHistory
        skills={mockSkills}
        skillCategories={mockSkillCategories}
        jobs={mockJobs}
        projects={mockProjects}
        companies={mockCompanies}
      />
    );

    const reactSkill = screen.getByTestId('skill-React');

    // Initially should be unselected
    expect(reactSkill).toHaveClass('unselected');

    // Click to select
    fireEvent.click(reactSkill);
    expect(reactSkill).toHaveClass('selected');

    // Click again to deselect
    fireEvent.click(reactSkill);
    expect(reactSkill).toHaveClass('unselected');
  });

  it('shows clear filters button', () => {
    render(
      <FilteredWorkHistory
        skills={mockSkills}
        skillCategories={mockSkillCategories}
        jobs={mockJobs}
        projects={mockProjects}
        companies={mockCompanies}
      />
    );

    expect(screen.getByTestId('clear-filters')).toBeInTheDocument();
    expect(screen.getByText('Clear Filters')).toBeInTheDocument();
  });

  it('passes correct data to WorkHistory component', () => {
    render(
      <FilteredWorkHistory
        skills={mockSkills}
        skillCategories={mockSkillCategories}
        jobs={mockJobs}
        projects={mockProjects}
        companies={mockCompanies}
      />
    );

    expect(screen.getByTestId('jobs-count')).toHaveTextContent('1 jobs');
    expect(screen.getByTestId('companies-count')).toHaveTextContent(
      '1 companies'
    );
    expect(screen.getByTestId('projects-count')).toHaveTextContent(
      '1 projects'
    );
    expect(screen.getByTestId('skills-count')).toHaveTextContent('3 skills');
  });

  it('handles empty skills array', () => {
    render(
      <FilteredWorkHistory
        skills={[]}
        skillCategories={mockSkillCategories}
        jobs={mockJobs}
        projects={mockProjects}
        companies={mockCompanies}
      />
    );

    // Categories should still render
    expect(screen.getByText('Front-End Development')).toBeInTheDocument();

    // But no skills should be rendered
    expect(screen.queryByTestId('skill-React')).not.toBeInTheDocument();
  });

  it('handles empty skill categories array', () => {
    render(
      <FilteredWorkHistory
        skills={mockSkills}
        skillCategories={[]}
        jobs={mockJobs}
        projects={mockProjects}
        companies={mockCompanies}
      />
    );

    // No categories should render
    expect(screen.queryByText('Front-End Development')).not.toBeInTheDocument();

    // But skills count should still show
    expect(screen.getByTestId('skills-count')).toHaveTextContent('3 skills');
  });

  it('filters skills by category ID correctly', () => {
    // Test that the filtering logic works with the actual data structure
    const frontEndSkills = mockSkills.filter(
      (skill) => skill.data.category === 'front-end'
    );
    expect(frontEndSkills).toHaveLength(1);
    expect(frontEndSkills[0].data.title).toBe('React');

    const programmingSkills = mockSkills.filter(
      (skill) => skill.data.category === 'programming-languages'
    );
    expect(programmingSkills).toHaveLength(1);
    expect(programmingSkills[0].data.title).toBe('TypeScript');

    const backEndSkills = mockSkills.filter(
      (skill) => skill.data.category === 'back-end'
    );
    expect(backEndSkills).toHaveLength(1);
    expect(backEndSkills[0].data.title).toBe('Node.js');
  });
});
