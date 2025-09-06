import type { Meta, StoryObj } from '@storybook/react';
import { Testimonial } from '@bracketbear/bear-ui-react';

const meta: Meta<typeof Testimonial> = {
  title: 'Testimonial',
  component: Testimonial,
  parameters: {
    layout: 'fullscreen',
    viewport: {
      defaultViewport: 'desktop',
    },
    docs: {
      canvas: {
        layout: 'fullscreen',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['light', 'dark', 'primary'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleTestimonial = {
  quote:
    'Working with Bracket Bear has been an absolute pleasure. Their attention to detail and creative approach to problem-solving exceeded all our expectations.',
  name: 'Sarah Johnson',
  role: 'CEO',
  org: 'TechCorp',
  avatarUrl:
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
};

export const Dark: Story = {
  args: {
    ...sampleTestimonial,
    variant: 'dark',
  },
};

export const Light: Story = {
  args: {
    ...sampleTestimonial,
    variant: 'light',
  },
};

export const Primary: Story = {
  args: {
    ...sampleTestimonial,
    variant: 'primary',
  },
};

export const WithoutAvatar: Story = {
  args: {
    quote:
      'The team at Bracket Bear delivered exactly what we needed, when we needed it. Their communication throughout the project was excellent.',
    name: 'Michael Chen',
    role: 'Product Manager',
    org: 'StartupXYZ',
    variant: 'dark',
  },
};

export const WithoutOrganization: Story = {
  args: {
    quote:
      'Outstanding work! The final product exceeded our expectations and the development process was smooth and professional.',
    name: 'Emily Rodriguez',
    role: 'Creative Director',
    variant: 'light',
    avatarUrl:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
  },
};

export const LongQuote: Story = {
  args: {
    quote:
      "Bracket Bear transformed our digital presence completely. From the initial consultation through to the final launch, their team demonstrated exceptional expertise in both design and development. The attention to detail, creative problem-solving, and commitment to delivering exactly what we envisioned made this project a true success. We couldn't be happier with the results.",
    name: 'David Thompson',
    role: 'Marketing Director',
    org: 'Global Enterprises Inc.',
    variant: 'dark',
    avatarUrl:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  },
};

export const MarkdownQuote: Story = {
  args: {
    quote:
      '**Amazing work!** The team delivered exactly what we needed. *Highly recommended* for anyone looking for quality development services.',
    name: 'Lisa Wang',
    role: 'Founder',
    org: 'InnovateLab',
    variant: 'light',
    avatarUrl:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
  },
};

export const CustomStyling: Story = {
  args: {
    ...sampleTestimonial,
    variant: 'dark',
    className: 'bg-gradient-to-r from-purple-600 to-blue-600',
  },
};
