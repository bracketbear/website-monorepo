import type { Meta, StoryObj } from '@storybook/react';
import type { CollectionEntry } from 'astro:content';
import WorkHistory from './WorkHistory';

// Mock data for stories
const mockSkills: CollectionEntry<'workSkills'>[] = [
  {
    id: 'react',
    slug: 'react',
    body: '',
    collection: 'workSkills',
    data: {
      title: 'React',
      description: 'Modern JavaScript library for building user interfaces',
      isFeatured: true,
      category: 'front-end',
      order: 1,
      isActive: true,
      proficiency: 'Expert',
    },
  },
  {
    id: 'typescript',
    slug: 'typescript',
    body: '',
    collection: 'workSkills',
    data: {
      title: 'TypeScript',
      description: 'Typed superset of JavaScript',
      isFeatured: true,
      category: 'front-end',
      order: 2,
      isActive: true,
      proficiency: 'Expert',
    },
  },
  {
    id: 'node',
    slug: 'node',
    body: '',
    collection: 'workSkills',
    data: {
      title: 'Node.js',
      description: 'JavaScript runtime for server-side development',
      isFeatured: false,
      category: 'back-end',
      order: 3,
      isActive: true,
      proficiency: 'Advanced',
    },
  },
  {
    id: 'python',
    slug: 'python',
    body: '',
    collection: 'workSkills',
    data: {
      title: 'Python',
      description: 'Versatile programming language',
      isFeatured: false,
      category: 'back-end',
      order: 4,
      isActive: true,
      proficiency: 'Advanced',
    },
  },
];

const mockCompanies: CollectionEntry<'workCompany'>[] = [
  {
    id: 'bracketbear',
    slug: 'bracketbear',
    body: '',
    collection: 'workCompany',
    data: {
      title: 'BracketBear',
      logo: 'bracketbear-logo.svg',
      website: 'https://bracketbear.com',
      location: 'Remote',
    },
  },
  {
    id: 'freelance',
    slug: 'freelance',
    body: '',
    collection: 'workCompany',
    data: {
      title: 'Freelance',
      location: 'Remote',
    },
  },
];

const mockJobs: CollectionEntry<'workJobs'>[] = [
  {
    id: 'bb-full-stack-engineer',
    slug: 'bb-full-stack-engineer',
    body: '',
    collection: 'workJobs',
    data: {
      title: 'Full Stack Software Engineer',
      company: 'bracketbear',
      description:
        'Developed interactive experiences and web applications for major brands.',
      highlights: [
        'Led development of interactive museum installations',
        'Improved application performance by 40%',
        'Mentored junior developers',
      ],
      startDate: new Date('2022-01-15'),
      endDate: new Date('2023-06-30'),
      workSkills: ['react', 'typescript', 'node'],
      isCurrentJob: false,
    },
  },
  {
    id: 'freelance-developer',
    slug: 'freelance-developer',
    body: '',
    collection: 'workJobs',
    data: {
      title: 'Freelance Developer',
      company: 'freelance',
      description:
        'Provided full-stack development services to various clients.',
      highlights: [
        'Built custom web applications',
        'Implemented responsive designs',
        'Optimized database queries',
      ],
      startDate: new Date('2021-06-01'),
      endDate: new Date('2021-12-31'),
      workSkills: ['react', 'python'],
      isCurrentJob: false,
    },
  },
];

const mockProjects: CollectionEntry<'workProject'>[] = [
  {
    id: 'interactive-museum',
    slug: 'interactive-museum',
    body: '',
    collection: 'workProject',
    data: {
      title: 'Interactive Museum Experience',
      job: 'bb-full-stack-engineer',
      duration: '6 months',
      summary:
        'Created an immersive museum experience using cutting-edge technology.',
      isFeatured: true,
      skills: ['react', 'typescript'],
    },
  },
  {
    id: 'client-portal',
    slug: 'client-portal',
    body: '',
    collection: 'workProject',
    data: {
      title: 'Client Portal',
      job: 'freelance-developer',
      duration: '3 months',
      summary: 'Built a comprehensive client management portal.',
      isFeatured: false,
      skills: ['react', 'python'],
    },
  },
];

const meta: Meta<typeof WorkHistory> = {
  title: 'WorkHistory',
  component: WorkHistory,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    showFilteredPlaceholder: {
      control: { type: 'boolean' },
    },
    selectedSkills: {
      control: { type: 'object' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    jobs: mockJobs,
    companies: mockCompanies,
    projects: mockProjects,
    skills: mockSkills,
  },
};

export const WithSelectedSkills: Story = {
  args: {
    jobs: mockJobs,
    companies: mockCompanies,
    projects: mockProjects,
    skills: mockSkills,
    selectedSkills: ['react', 'typescript'],
  },
};

export const WithFilteredPlaceholder: Story = {
  args: {
    jobs: [],
    companies: mockCompanies,
    projects: mockProjects,
    skills: mockSkills,
    showFilteredPlaceholder: true,
  },
};

export const SingleJob: Story = {
  args: {
    jobs: [mockJobs[0]],
    companies: mockCompanies,
    projects: mockProjects,
    skills: mockSkills,
  },
};

export const JobsWithoutProjects: Story = {
  args: {
    jobs: mockJobs,
    companies: mockCompanies,
    projects: [],
    skills: mockSkills,
  },
};

export const JobsWithoutSkills: Story = {
  args: {
    jobs: mockJobs.map((job) => ({
      ...job,
      data: {
        ...job.data,
        workSkills: [],
      },
    })),
    companies: mockCompanies,
    projects: mockProjects,
    skills: mockSkills,
  },
};

export const InContainer: Story = {
  render: () => (
    <div className="mx-auto w-full max-w-6xl p-4">
      <div className="bg-gradient-radial from-brand-orange via-brand-yellow to-brand-red rounded-2xl p-8">
        <h2 className="mb-8 text-center text-3xl font-bold text-white">
          Work History
        </h2>
        <WorkHistory
          jobs={mockJobs}
          companies={mockCompanies}
          projects={mockProjects}
          skills={mockSkills}
        />
      </div>
    </div>
  ),
};
