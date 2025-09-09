import type { Meta, StoryObj } from '@storybook/react';
import type { CollectionEntry } from 'astro:content';
import ProjectCard from './ProjectCard';

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
];

const mockProject: CollectionEntry<'workProject'> = {
  id: 'sample-project',
  slug: 'sample-project',
  body: '',
  collection: 'workProject',
  data: {
    title: 'Interactive Museum Experience',
    job: 'sample-job',
    duration: '6 months',
    coverImage: 'cover-image.jpg',
    summary:
      'Created an immersive museum experience using cutting-edge technology to engage visitors in a unique way.',
    description:
      'Detailed project description with technical implementation details and user experience considerations.',
    challengesAndSolutions:
      'Faced performance challenges with real-time rendering, solved through WebGL optimization.',
    resultsAchieved:
      'Increased visitor engagement by 60% and extended average visit duration by 40%.',
    mediaDescription:
      'Screenshots and videos showcasing the interactive elements',
    media: [
      { image: 'screenshot1.jpg', caption: 'Main interface' },
      { image: 'screenshot2.jpg', caption: 'Interactive elements' },
    ],
    isFeatured: true,
    category: 'experiential-engineering',
    skills: ['react', 'typescript', 'node'],
    oneLiner: 'Immersive digital experience that brings history to life',
    teaser: {
      headline: 'Revolutionary museum experience',
      subline: 'Combining technology and storytelling for maximum impact',
    },
    status: 'shipped',
  },
};

const mockProjectMinimal: CollectionEntry<'workProject'> = {
  id: 'minimal-project',
  slug: 'minimal-project',
  body: '',
  collection: 'workProject',
  data: {
    title: 'Simple Web App',
    job: 'sample-job',
    duration: '2 months',
    summary: 'A straightforward web application built with modern tools.',
    isFeatured: false,
    skills: ['react'],
  },
};

const meta: Meta<typeof ProjectCard> = {
  title: 'ProjectCard',
  component: ProjectCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['light', 'dark'],
    },
    compact: {
      control: { type: 'boolean' },
    },
    showImage: {
      control: { type: 'boolean' },
    },
    showBadges: {
      control: { type: 'boolean' },
    },
    showSkills: {
      control: { type: 'boolean' },
    },
    maxSkills: {
      control: { type: 'number', min: 1, max: 10 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    project: mockProject,
    skills: mockSkills,
  },
};

export const LightVariant: Story = {
  args: {
    project: mockProject,
    skills: mockSkills,
    variant: 'light',
  },
};

export const DarkVariant: Story = {
  args: {
    project: mockProject,
    skills: mockSkills,
    variant: 'dark',
  },
};

export const WithoutImage: Story = {
  args: {
    project: mockProject,
    skills: mockSkills,
    showImage: false,
  },
};

export const WithoutBadges: Story = {
  args: {
    project: mockProject,
    skills: mockSkills,
    showBadges: false,
  },
};

export const WithoutSkills: Story = {
  args: {
    project: mockProject,
    skills: mockSkills,
    showSkills: false,
  },
};

export const LimitedSkills: Story = {
  args: {
    project: mockProject,
    skills: mockSkills,
    maxSkills: 2,
  },
};

export const MinimalProject: Story = {
  args: {
    project: mockProjectMinimal,
    skills: mockSkills,
  },
};

export const Compact: Story = {
  args: {
    project: mockProject,
    skills: mockSkills,
    compact: true,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2">
      <ProjectCard project={mockProject} skills={mockSkills} variant="light" />
      <ProjectCard project={mockProject} skills={mockSkills} variant="dark" />
    </div>
  ),
};

export const DifferentConfigurations: Story = {
  render: () => (
    <div className="grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <ProjectCard
        project={mockProject}
        skills={mockSkills}
        showImage={true}
        showBadges={true}
        showSkills={true}
      />
      <ProjectCard
        project={mockProject}
        skills={mockSkills}
        showImage={false}
        showBadges={true}
        showSkills={true}
      />
      <ProjectCard
        project={mockProject}
        skills={mockSkills}
        showImage={true}
        showBadges={false}
        showSkills={true}
      />
      <ProjectCard
        project={mockProject}
        skills={mockSkills}
        showImage={true}
        showBadges={true}
        showSkills={false}
      />
      <ProjectCard
        project={mockProjectMinimal}
        skills={mockSkills}
        showImage={true}
        showBadges={true}
        showSkills={true}
      />
      <ProjectCard project={mockProject} skills={mockSkills} maxSkills={1} />
    </div>
  ),
};
