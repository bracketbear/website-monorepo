import type { Meta, StoryObj } from '@storybook/react';
import { ImageGallery } from '@bracketbear/bear-ui-react';

const meta: Meta<typeof ImageGallery> = {
  title: 'ImageGallery',
  component: ImageGallery,
  parameters: {
    layout: 'padded',
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
    columns: {
      control: { type: 'select' },
      options: [1, 2, 3, 4],
    },
    showCaptions: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleImages = [
  {
    src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
    alt: 'Mountain landscape',
    caption: 'Beautiful mountain landscape at sunset',
    width: 400,
    height: 300,
  },
  {
    src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop',
    alt: 'Forest path',
    caption: 'Peaceful forest path through the trees',
    width: 400,
    height: 300,
  },
  {
    src: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=300&fit=crop',
    alt: 'Ocean waves',
    caption: 'Powerful ocean waves crashing on the shore',
    width: 400,
    height: 300,
  },
  {
    src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
    alt: 'Desert dunes',
    caption: 'Golden sand dunes in the desert',
    width: 400,
    height: 300,
  },
  {
    src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
    alt: 'City skyline',
    caption: 'Modern city skyline at night',
    width: 400,
    height: 300,
  },
  {
    src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
    alt: 'Lakeside view',
    caption: 'Serene lakeside view with mountains',
    width: 400,
    height: 300,
  },
];

export const Default: Story = {
  args: {
    images: sampleImages,
    title: 'Nature Gallery',
    description: 'A collection of beautiful nature photographs',
    columns: 3,
    showCaptions: true,
  },
};

export const TwoColumns: Story = {
  args: {
    images: sampleImages,
    title: 'Two Column Layout',
    columns: 2,
    showCaptions: true,
  },
};

export const FourColumns: Story = {
  args: {
    images: sampleImages,
    title: 'Four Column Layout',
    columns: 4,
    showCaptions: true,
  },
};

export const WithoutCaptions: Story = {
  args: {
    images: sampleImages,
    title: 'No Captions',
    columns: 3,
    showCaptions: false,
  },
};

export const SingleColumn: Story = {
  args: {
    images: sampleImages.slice(0, 3),
    title: 'Single Column',
    columns: 1,
    showCaptions: true,
  },
};

export const WithoutTitle: Story = {
  args: {
    images: sampleImages,
    columns: 3,
    showCaptions: true,
  },
};

export const WithDescription: Story = {
  args: {
    images: sampleImages,
    title: 'Gallery with Description',
    description:
      'This gallery showcases various landscapes and natural beauty from around the world.',
    columns: 3,
    showCaptions: true,
  },
};

export const FewImages: Story = {
  args: {
    images: sampleImages.slice(0, 2),
    title: 'Small Gallery',
    columns: 2,
    showCaptions: true,
  },
};

export const ManyImages: Story = {
  args: {
    images: [
      ...sampleImages,
      {
        src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
        alt: 'Additional image 1',
        caption: 'Additional beautiful image',
        width: 400,
        height: 300,
      },
      {
        src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
        alt: 'Additional image 2',
        caption: 'Another stunning view',
        width: 400,
        height: 300,
      },
    ],
    title: 'Large Gallery',
    columns: 3,
    showCaptions: true,
  },
};

export const CustomStyling: Story = {
  args: {
    images: sampleImages,
    title: 'Custom Styled Gallery',
    columns: 3,
    showCaptions: true,
    className: 'border-2 border-blue-500 rounded-lg p-4',
  },
};
