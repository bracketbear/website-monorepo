import type { Meta, StoryObj } from '@storybook/react';
import { MeetFlateralusSection } from './MeetFlateralusSection';

const meta: Meta<typeof MeetFlateralusSection> = {
  title: 'MeetFlateralusSection',
  component: MeetFlateralusSection,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: { type: 'text' },
    },
    content: {
      control: { type: 'text' },
    },
    buttonText: {
      control: { type: 'text' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const defaultContent = `## A powerful schema for connecting experiential apps to everything.

Flateralus is a comprehensive framework for building interactive experiences that seamlessly integrate with modern web technologies.

### Key Features

- **Unified Animation System**: Consistent API across PIXI.js and p5.js
- **Real-time Controls**: Live parameter adjustment during development
- **Type Safety**: Full TypeScript support for all components
- **Performance Optimized**: Efficient rendering and memory management

### Use Cases

- Interactive installations
- Data visualizations
- Educational experiences
- Marketing campaigns
- Art installations`;

const shortContent = `## Interactive Experiences Made Simple

Build engaging, interactive applications with our comprehensive animation framework.

### Features

- Real-time controls
- Type-safe APIs
- Performance optimized
- Easy integration`;

const longContent = `## Flateralus: The Future of Interactive Development

Flateralus represents a paradigm shift in how we approach interactive web experiences. By providing a unified schema that bridges the gap between different animation libraries and frameworks, we enable developers to create more engaging, performant, and maintainable applications.

### The Problem We Solve

Traditional animation libraries often require developers to learn multiple APIs, deal with inconsistent performance characteristics, and struggle with complex integration patterns. Flateralus solves this by providing:

- **Unified API**: One consistent interface across PIXI.js, p5.js, and other libraries
- **Real-time Controls**: Live parameter adjustment during development and runtime
- **Type Safety**: Full TypeScript support prevents runtime errors
- **Performance Optimization**: Intelligent rendering and memory management

### Architecture

Our framework is built on three core principles:

1. **Modularity**: Each component can be used independently
2. **Extensibility**: Easy to add new animation types and controls
3. **Performance**: Optimized for smooth 60fps animations

### Getting Started

Getting started with Flateralus is simple. Our comprehensive documentation and examples make it easy to integrate into any project, whether you're building a simple data visualization or a complex interactive installation.

### Community

Join our growing community of developers, artists, and creators who are pushing the boundaries of what's possible with interactive web experiences.`;

export const Default: Story = {
  args: {
    title: 'Meet Flateralus',
    content: defaultContent,
    buttonText: 'View Source Code',
  },
};

export const ShortContent: Story = {
  args: {
    title: 'Quick Overview',
    content: shortContent,
    buttonText: 'Learn More',
  },
};

export const LongContent: Story = {
  args: {
    title: 'Comprehensive Guide',
    content: longContent,
    buttonText: 'Explore Documentation',
  },
};

export const CustomTitle: Story = {
  args: {
    title: 'Interactive Framework',
    content: defaultContent,
    buttonText: 'Get Started',
  },
};

export const MinimalContent: Story = {
  args: {
    title: 'Simple Introduction',
    content:
      '## Welcome to Flateralus\n\nA powerful framework for interactive experiences.',
    buttonText: 'Try It Out',
  },
};

export const WithMarkdown: Story = {
  args: {
    title: 'Markdown Support',
    content: `## Rich Content Support

This section supports **bold text**, *italic text*, and [links](https://example.com).

### Lists

- Feature one
- Feature two
- Feature three

### Code Examples

\`\`\`javascript
const animation = createBlobAnimation({
  particleCount: 100,
  animationSpeed: 2.0
});
\`\`\`

> This is a blockquote with important information.`,
    buttonText: 'Read More',
  },
};
