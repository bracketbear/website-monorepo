import type { Meta, StoryObj } from '@storybook/react';
import type { CollectionEntry } from 'astro:content';
import FilteredWorkHistory from './FilteredWorkHistory';

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
  {
    id: 'nextjs',
    slug: 'nextjs',
    body: '',
    collection: 'workSkills',
    data: {
      title: 'Next.js',
      description: 'React framework for production',
      isFeatured: true,
      category: 'front-end',
      order: 5,
      isActive: true,
      proficiency: 'Expert',
    },
  },
  {
    id: 'tailwind',
    slug: 'tailwind',
    body: '',
    collection: 'workSkills',
    data: {
      title: 'Tailwind CSS',
      description: 'Utility-first CSS framework',
      isFeatured: true,
      category: 'front-end',
      order: 6,
      isActive: true,
      proficiency: 'Expert',
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
      title: 'Front-end Development',
      description: 'Client-side technologies and frameworks',
    },
  },
  {
    id: 'back-end',
    slug: 'back-end',
    body: '',
    collection: 'workSkillCategory',
    data: {
      title: 'Back-end Development',
      description: 'Server-side technologies and databases',
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
  {
    id: 'current-position',
    slug: 'current-position',
    body: '',
    collection: 'workJobs',
    data: {
      title: 'Senior Full Stack Developer',
      company: 'bracketbear',
      description:
        'Leading development of next-generation interactive experiences.',
      highlights: [
        'Architected scalable web applications',
        'Implemented advanced animation systems',
        'Led cross-functional teams',
      ],
      startDate: new Date('2023-07-01'),
      workSkills: ['react', 'typescript', 'nextjs', 'tailwind'],
      isCurrentJob: true,
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
  {
    id: 'modern-web-app',
    slug: 'modern-web-app',
    body: '',
    collection: 'workProject',
    data: {
      title: 'Modern Web Application',
      job: 'current-position',
      duration: '4 months',
      summary:
        'Developed a cutting-edge web application with advanced features.',
      isFeatured: true,
      skills: ['react', 'typescript', 'nextjs', 'tailwind'],
    },
  },
];

const meta: Meta<typeof FilteredWorkHistory> = {
  title: 'FilteredWorkHistory',
  component: FilteredWorkHistory,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    skills: mockSkills,
    skillCategories: mockSkillCategories,
    jobs: mockJobs,
    projects: mockProjects,
    companies: mockCompanies,
  },
};

export const FewSkills: Story = {
  args: {
    skills: mockSkills.slice(0, 3),
    skillCategories: mockSkillCategories.slice(0, 1),
    jobs: mockJobs.slice(0, 2),
    projects: mockProjects.slice(0, 2),
    companies: mockCompanies,
  },
};

export const SingleCategory: Story = {
  args: {
    skills: mockSkills.filter((skill) => skill.data.category === 'front-end'),
    skillCategories: mockSkillCategories.filter(
      (cat) => cat.id === 'front-end'
    ),
    jobs: mockJobs,
    projects: mockProjects,
    companies: mockCompanies,
  },
};

export const ManySkills: Story = {
  args: {
    skills: [
      ...mockSkills,
      {
        id: 'docker',
        slug: 'docker',
        body: '',
        collection: 'workSkills',
        data: {
          title: 'Docker',
          description: 'Containerization platform',
          isFeatured: false,
          category: 'back-end',
          order: 7,
          isActive: true,
          proficiency: 'Intermediate',
        },
      },
      {
        id: 'aws',
        slug: 'aws',
        body: '',
        collection: 'workSkills',
        data: {
          title: 'AWS',
          description: 'Cloud computing platform',
          isFeatured: false,
          category: 'back-end',
          order: 8,
          isActive: true,
          proficiency: 'Intermediate',
        },
      },
    ],
    skillCategories: mockSkillCategories,
    jobs: mockJobs,
    projects: mockProjects,
    companies: mockCompanies,
  },
};

export const InContainer: Story = {
  render: () => (
    <div className="mx-auto w-full max-w-7xl p-4">
      <div className="bg-gradient-radial from-brand-orange via-brand-yellow to-brand-red rounded-2xl p-8">
        <h2 className="mb-8 text-center text-3xl font-bold text-white">
          Filtered Work History
        </h2>
        <FilteredWorkHistory
          skills={mockSkills}
          skillCategories={mockSkillCategories}
          jobs={mockJobs}
          projects={mockProjects}
          companies={mockCompanies}
        />
      </div>
    </div>
  ),
};
