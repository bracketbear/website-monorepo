import type { Meta, StoryObj } from '@storybook/react';
import { Slider } from '@bracketbear/bear-ui-react';
import { useState } from 'react';

const meta: Meta<typeof Slider> = {
  title: 'Slider',
  component: Slider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    min: {
      control: { type: 'number' },
    },
    max: {
      control: { type: 'number' },
    },
    step: {
      control: { type: 'number' },
    },
    disabled: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component to handle state
const SliderWrapper = (
  args: Omit<React.ComponentProps<typeof Slider>, 'onChange'>
) => {
  const [value, setValue] = useState(args.value || 50);

  return (
    <div className="w-80 space-y-4">
      <Slider {...args} value={value} onChange={setValue} />
      <div className="text-center text-sm text-gray-600">Value: {value}</div>
    </div>
  );
};

export const Default: Story = {
  render: (args) => <SliderWrapper {...args} />,
  args: {
    value: 50,
    min: 0,
    max: 100,
    step: 1,
  },
};

export const WithMinMax: Story = {
  render: (args) => <SliderWrapper {...args} />,
  args: {
    value: 25,
    min: 10,
    max: 90,
    step: 1,
  },
};

export const DecimalSteps: Story = {
  render: (args) => <SliderWrapper {...args} />,
  args: {
    value: 2.5,
    min: 0,
    max: 5,
    step: 0.1,
  },
};

export const LargeRange: Story = {
  render: (args) => <SliderWrapper {...args} />,
  args: {
    value: 500,
    min: 0,
    max: 1000,
    step: 10,
  },
};

export const SmallRange: Story = {
  render: (args) => <SliderWrapper {...args} />,
  args: {
    value: 3,
    min: 1,
    max: 5,
    step: 1,
  },
};

export const Disabled: Story = {
  render: (args) => <SliderWrapper {...args} />,
  args: {
    value: 75,
    min: 0,
    max: 100,
    step: 1,
    disabled: true,
  },
};

export const CustomStyling: Story = {
  render: (args) => <SliderWrapper {...args} />,
  args: {
    value: 60,
    min: 0,
    max: 100,
    step: 1,
    className: 'h-3 bg-gradient-to-r from-blue-500 to-purple-500',
  },
};

export const ControlPanelExample: Story = {
  render: () => {
    const [volume, setVolume] = useState(70);
    const [brightness, setBrightness] = useState(80);
    const [contrast, setContrast] = useState(50);

    return (
      <div className="w-80 space-y-6 rounded-lg bg-gray-900 p-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white">
            Volume: {volume}%
          </label>
          <Slider
            value={volume}
            min={0}
            max={100}
            step={1}
            onChange={setVolume}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-white">
            Brightness: {brightness}%
          </label>
          <Slider
            value={brightness}
            min={0}
            max={100}
            step={1}
            onChange={setBrightness}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-white">
            Contrast: {contrast}%
          </label>
          <Slider
            value={contrast}
            min={0}
            max={100}
            step={1}
            onChange={setContrast}
          />
        </div>
      </div>
    );
  },
};
