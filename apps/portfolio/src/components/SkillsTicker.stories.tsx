import type { Meta, StoryObj } from '@storybook/react';
import type { CollectionEntry } from 'astro:content';
import SkillsTicker from './SkillsTicker';
import { BracketBearLogo } from '@bracketbear/bear-ui-react';

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
    id: 'nextjs',
    slug: 'nextjs',
    body: '',
    collection: 'workSkills',
    data: {
      title: 'Next.js',
      description: 'React framework for production',
      isFeatured: true,
      category: 'front-end',
      order: 4,
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
      order: 5,
      isActive: true,
      proficiency: 'Expert',
    },
  },
  {
    id: 'figma',
    slug: 'figma',
    body: '',
    collection: 'workSkills',
    data: {
      title: 'Figma',
      description: 'Collaborative design tool',
      isFeatured: false,
      category: 'design',
      order: 6,
      isActive: true,
      proficiency: 'Advanced',
    },
  },
];

const mockSkillsExtended: CollectionEntry<'workSkills'>[] = [
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
      category: 'devops',
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
      category: 'devops',
      order: 8,
      isActive: true,
      proficiency: 'Intermediate',
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
      order: 9,
      isActive: true,
      proficiency: 'Advanced',
    },
  },
];

// Custom logo component for testing
const CustomLogo = ({ className }: { className?: string }) => (
  <div className={`bg-brand-red h-6 w-6 rounded ${className}`} />
);

const meta: Meta<typeof SkillsTicker> = {
  title: 'SkillsTicker',
  component: SkillsTicker,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    LogoComponent: {
      control: false,
      description: 'Custom logo component to display for each skill',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    skills: mockSkills,
  },
};

export const WithDefaultLogo: Story = {
  args: {
    skills: mockSkills,
    LogoComponent: BracketBearLogo,
  },
};

export const WithCustomLogo: Story = {
  args: {
    skills: mockSkills,
    LogoComponent: CustomLogo,
  },
};

export const ExtendedSkills: Story = {
  args: {
    skills: mockSkillsExtended,
  },
};

export const FewSkills: Story = {
  args: {
    skills: mockSkills.slice(0, 3),
  },
};

export const SingleSkill: Story = {
  args: {
    skills: [mockSkills[0]],
  },
};

export const InContainer: Story = {
  render: () => (
    <div className="mx-auto w-full max-w-4xl p-4">
      <div className="bg-gradient-radial from-brand-orange via-brand-yellow to-brand-red rounded-2xl p-6">
        <h2 className="mb-6 text-center text-2xl font-bold text-white">
          Featured Skills
        </h2>
        <SkillsTicker skills={mockSkills} />
      </div>
    </div>
  ),
};

export const WithBackground: Story = {
  render: () => (
    <div className="bg-brand-dark min-h-screen p-8">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-8 text-center text-3xl font-bold text-white">
          Technology Stack
        </h2>
        <SkillsTicker
          skills={mockSkillsExtended}
          LogoComponent={BracketBearLogo}
        />
      </div>
    </div>
  ),
};

export const DifferentSizes: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="mb-4 text-lg font-semibold">Small Set (3 skills)</h3>
        <SkillsTicker skills={mockSkills.slice(0, 3)} />
      </div>
      <div>
        <h3 className="mb-4 text-lg font-semibold">Medium Set (6 skills)</h3>
        <SkillsTicker skills={mockSkills} />
      </div>
      <div>
        <h3 className="mb-4 text-lg font-semibold">Large Set (9 skills)</h3>
        <SkillsTicker skills={mockSkillsExtended} />
      </div>
    </div>
  ),
};
