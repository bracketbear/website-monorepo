import type { Meta, StoryObj } from '@storybook/react';
import { Ticker } from '@bracketbear/bear-ui-react';

const StarIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const ReactIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12.765c5.523 0 9.998-1.18 9.998-2.635C21.998 8.675 17.523 7.495 12 7.495S2.002 8.675 2.002 10.13c0 1.455 4.475 2.635 9.998 2.635zM12 3C6.477 3 2 4.18 2 5.635S6.477 8.27 12 8.27s10-1.18 10-2.635S17.523 3 12 3zm0 13.5c-5.523 0-9.998-1.18-9.998-2.635V12c0 1.455 4.475 2.635 9.998 2.635S21.998 13.455 21.998 12v3.13c0 1.455-4.475 2.635-9.998 2.635z" />
  </svg>
);

const TypeScriptIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.005-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z" />
  </svg>
);

const TailwindIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.001,4.8c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624 C13.666,10.618,15.027,12,18.001,12c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624 C16.337,6.182,14.976,4.8,12.001,4.8z M6.001,12c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624 c1.177,1.194,2.538,2.576,5.512,2.576c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624 C10.337,13.382,8.976,12,6.001,12z" />
  </svg>
);

const meta: Meta<typeof Ticker> = {
  title: 'Ticker',
  component: Ticker,
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
    speed: {
      control: { type: 'range', min: 0.1, max: 2, step: 0.1 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleItems = [
  {
    id: '1',
    title: 'React',
    icon: ReactIcon,
    link: 'https://reactjs.org',
  },
  {
    id: '2',
    title: 'TypeScript',
    icon: TypeScriptIcon,
    link: 'https://typescriptlang.org',
  },
  {
    id: '3',
    title: 'Tailwind CSS',
    icon: TailwindIcon,
    link: 'https://tailwindcss.com',
  },
  {
    id: '4',
    title: 'Vite',
    icon: StarIcon,
    link: 'https://vitejs.dev',
  },
  {
    id: '5',
    title: 'Storybook',
    icon: StarIcon,
    link: 'https://storybook.js.org',
  },
];

const techItems = [
  {
    id: '1',
    title: 'JavaScript',
    icon: StarIcon,
  },
  {
    id: '2',
    title: 'TypeScript',
    icon: StarIcon,
  },
  {
    id: '3',
    title: 'React',
    icon: StarIcon,
  },
  {
    id: '4',
    title: 'Vue',
    icon: StarIcon,
  },
  {
    id: '5',
    title: 'Angular',
    icon: StarIcon,
  },
  {
    id: '6',
    title: 'Node.js',
    icon: StarIcon,
  },
  {
    id: '7',
    title: 'Python',
    icon: StarIcon,
  },
  {
    id: '8',
    title: 'Go',
    icon: StarIcon,
  },
];

export const Default: Story = {
  args: {
    items: sampleItems,
  },
};

export const WithoutIcons: Story = {
  args: {
    items: techItems,
  },
};

export const FastSpeed: Story = {
  args: {
    items: sampleItems,
    speed: 1.5,
  },
};

export const SlowSpeed: Story = {
  args: {
    items: sampleItems,
    speed: 0.2,
  },
};

export const CustomStyling: Story = {
  args: {
    items: sampleItems,
    className: 'rounded-lg',
    itemClassName: 'px-6 py-2',
  },
};

export const WithClickHandler: Story = {
  args: {
    items: sampleItems,
    onItemClick: (item) => {
      console.log('Clicked item:', item);
      alert(`Clicked: ${item.title}`);
    },
  },
};

export const LongList: Story = {
  args: {
    items: [
      ...techItems,
      {
        id: '9',
        title: 'Rust',
      },
      {
        id: '10',
        title: 'Swift',
      },
      {
        id: '11',
        title: 'Kotlin',
      },
      {
        id: '12',
        title: 'Dart',
      },
      {
        id: '13',
        title: 'C#',
      },
      {
        id: '14',
        title: 'Java',
      },
      {
        id: '15',
        title: 'PHP',
      },
    ],
  },
};

export const SingleItem: Story = {
  args: {
    items: [
      {
        id: '1',
        title: 'Single Item',
        icon: StarIcon,
      },
    ],
  },
};
