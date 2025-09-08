import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { DebugControls } from './DebugControls';
import type {
  AnimationManifest,
  ControlValues,
  ControlValueTypes,
  Control,
} from '@bracketbear/flateralus';

// Mock animation manifest for stories
const createMockManifest = (): AnimationManifest => ({
  id: 'mock-animation',
  name: 'Mock Animation',
  description: 'A mock animation for Storybook stories',
  controls: [
    {
      name: 'speed',
      type: 'number',
      label: 'Animation Speed',
      description: 'Controls how fast the animation runs',
      defaultValue: 1.0,
      min: 0.1,
      max: 3.0,
      step: 0.1,
      debug: true,
      resetsAnimation: false,
    },
    {
      name: 'color',
      type: 'color',
      label: 'Primary Color',
      description: 'The main color of the animation',
      defaultValue: '#ff6b6b',
      debug: true,
      resetsAnimation: false,
    },
    {
      name: 'enableEffects',
      type: 'boolean',
      label: 'Enable Effects',
      description: 'Whether to show visual effects',
      defaultValue: true,
      debug: true,
      resetsAnimation: false,
    },
    {
      name: 'style',
      type: 'select',
      label: 'Animation Style',
      description: 'The visual style of the animation',
      defaultValue: 'smooth',
      options: [
        { value: 'smooth', label: 'Smooth' },
        { value: 'bouncy', label: 'Bouncy' },
        { value: 'sharp', label: 'Sharp' },
      ],
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'particleCount',
      type: 'number',
      label: 'Particle Count',
      description: 'Number of particles to render',
      defaultValue: 50,
      min: 10,
      max: 200,
      step: 10,
      debug: true,
      resetsAnimation: true,
    },
  ] as Control[],
});

// Mock stage controls manifest
const createMockStageManifest = () => ({
  id: 'stage-controls',
  name: 'Stage Settings',
  description: 'Controls for the animation stage',
  controls: [
    {
      name: 'backgroundColor',
      type: 'color',
      label: 'Background Color',
      description: 'The background color of the stage',
      defaultValue: '#1a1a1a',
      debug: true,
      resetsAnimation: false,
    },
    {
      name: 'backgroundAlpha',
      type: 'number',
      label: 'Background Opacity',
      description: 'The opacity of the background',
      defaultValue: 0.8,
      min: 0,
      max: 1,
      step: 0.1,
      debug: true,
      resetsAnimation: false,
    },
    {
      name: 'enableGrid',
      type: 'boolean',
      label: 'Show Grid',
      description: 'Whether to display a grid overlay',
      defaultValue: true,
      debug: true,
      resetsAnimation: false,
    },
  ] as Control[],
});

const meta: Meta<typeof DebugControls> = {
  title: 'DebugControls',
  component: DebugControls,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          "Debug controls component that provides a dynamic UI for adjusting animation parameters in real-time based on the animation's manifest and control schema.",
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isVisible: {
      control: { type: 'boolean' },
      description: 'Whether the debug controls are visible',
    },
    showDownloadButton: {
      control: { type: 'boolean' },
      description: 'Whether to show the download button',
    },
    className: {
      control: { type: 'text' },
      description: 'Additional CSS classes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    manifest: createMockManifest(),
    controlValues: {
      speed: 1.0,
      color: '#ff6b6b',
      enableEffects: true,
      style: 'smooth',
      particleCount: 50,
    },
    onControlsChange: (values) => console.log('Controls changed:', values),
    isVisible: true,
    showDownloadButton: true,
  },
};

export const WithStageControls: Story = {
  render: () => {
    const [controlValues, setControlValues] = useState<ControlValues>({
      speed: 1.5,
      color: '#4ecdc4',
      enableEffects: false,
      style: 'bouncy',
      particleCount: 100,
    });

    const [stageControlValues, setStageControlValues] = useState({
      backgroundColor: '#2a2a2a',
      backgroundAlpha: 0.9,
      enableGrid: false,
    });

    const handleControlsChange = (values: Partial<ControlValues>) => {
      setControlValues((prev) => {
        const filteredValues: Partial<ControlValues> = {};
        for (const [key, value] of Object.entries(values)) {
          if (value !== undefined) {
            filteredValues[key as keyof ControlValues] =
              value as ControlValueTypes;
          }
        }
        return { ...prev, ...filteredValues } as ControlValues;
      });
    };

    const handleStageControlsChange = (values: Record<string, any>) => {
      setStageControlValues((prev) => ({ ...prev, ...values }));
    };

    const randomizeStageControls = () => {
      setStageControlValues({
        backgroundColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        backgroundAlpha: Math.random(),
        enableGrid: Math.random() > 0.5,
      });
    };

    const randomizeAllControls = () => {
      setControlValues({
        speed: Math.random() * 2.9 + 0.1,
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        enableEffects: Math.random() > 0.5,
        style: ['smooth', 'bouncy', 'sharp'][Math.floor(Math.random() * 3)],
        particleCount: Math.floor(Math.random() * 190) + 10,
      });
      randomizeStageControls();
    };

    return (
      <div className="relative h-96 w-full bg-gray-100 p-4">
        <DebugControls
          manifest={createMockManifest()}
          controlValues={controlValues}
          onControlsChange={handleControlsChange}
          isVisible={true}
          showDownloadButton={true}
          stageControls={{
            manifest: createMockStageManifest(),
            controlValues: stageControlValues,
          }}
          onStageControlsChange={handleStageControlsChange}
          randomizeStageControls={randomizeStageControls}
          randomizeAllControls={randomizeAllControls}
        />

        <div className="mt-8 space-y-2">
          <h3 className="font-bold">Current Values:</h3>
          <div className="space-y-1 text-sm">
            <div>Speed: {JSON.stringify(controlValues.speed)}</div>
            <div>Color: {JSON.stringify(controlValues.color)}</div>
            <div>Effects: {controlValues.enableEffects ? 'On' : 'Off'}</div>
            <div>Style: {JSON.stringify(controlValues.style)}</div>
            <div>Particles: {JSON.stringify(controlValues.particleCount)}</div>
          </div>

          <h3 className="mt-4 font-bold">Stage Values:</h3>
          <div className="space-y-1 text-sm">
            <div>Background: {stageControlValues.backgroundColor}</div>
            <div>Opacity: {stageControlValues.backgroundAlpha}</div>
            <div>Grid: {stageControlValues.enableGrid ? 'On' : 'Off'}</div>
          </div>
        </div>
      </div>
    );
  },
};

export const Hidden: Story = {
  args: {
    manifest: createMockManifest(),
    controlValues: {
      speed: 1.0,
      color: '#ff6b6b',
      enableEffects: true,
      style: 'smooth',
      particleCount: 50,
    },
    onControlsChange: (values) => console.log('Controls changed:', values),
    isVisible: false,
    showDownloadButton: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Debug controls are hidden when isVisible is false.',
      },
    },
  },
};

export const WithoutDownloadButton: Story = {
  args: {
    manifest: createMockManifest(),
    controlValues: {
      speed: 1.0,
      color: '#ff6b6b',
      enableEffects: true,
      style: 'smooth',
      particleCount: 50,
    },
    onControlsChange: (values) => console.log('Controls changed:', values),
    isVisible: true,
    showDownloadButton: false,
  },
};

export const ComplexControls: Story = {
  render: () => {
    const complexManifest: AnimationManifest = {
      id: 'complex-animation',
      name: 'Complex Animation',
      description: 'An animation with many different control types',
      controls: [
        {
          name: 'rotationSpeed',
          type: 'number',
          label: 'Rotation Speed',
          description: 'How fast objects rotate',
          defaultValue: 0.5,
          min: 0,
          max: 2,
          step: 0.1,
          debug: true,
          resetsAnimation: false,
        },
        {
          name: 'scale',
          type: 'number',
          label: 'Scale Factor',
          description: 'Overall scale of the animation',
          defaultValue: 1.0,
          min: 0.1,
          max: 3.0,
          step: 0.1,
          debug: true,
          resetsAnimation: true,
        },
        {
          name: 'primaryColor',
          type: 'color',
          label: 'Primary Color',
          description: 'Main color of the animation',
          defaultValue: '#ff6b6b',
          debug: true,
          resetsAnimation: false,
        },
        {
          name: 'secondaryColor',
          type: 'color',
          label: 'Secondary Color',
          description: 'Secondary color for accents',
          defaultValue: '#4ecdc4',
          debug: true,
          resetsAnimation: false,
        },
        {
          name: 'enableShadows',
          type: 'boolean',
          label: 'Enable Shadows',
          description: 'Whether to render shadows',
          defaultValue: true,
          debug: true,
          resetsAnimation: false,
        },
        {
          name: 'enableBlur',
          type: 'boolean',
          label: 'Enable Blur',
          description: 'Whether to apply blur effects',
          defaultValue: false,
          debug: true,
          resetsAnimation: false,
        },
        {
          name: 'animationMode',
          type: 'select',
          label: 'Animation Mode',
          description: 'The type of animation to play',
          defaultValue: 'continuous',
          options: [
            { value: 'continuous', label: 'Continuous' },
            { value: 'pulse', label: 'Pulse' },
            { value: 'wave', label: 'Wave' },
            { value: 'random', label: 'Random' },
          ],
          debug: true,
          resetsAnimation: true,
        },
        {
          name: 'intensity',
          type: 'number',
          label: 'Intensity',
          description: 'Overall intensity of effects',
          defaultValue: 0.7,
          min: 0,
          max: 1,
          step: 0.05,
          debug: true,
          resetsAnimation: false,
        },
      ] as Control[],
    };

    const [controlValues, setControlValues] = useState<ControlValues>({
      rotationSpeed: 0.5,
      scale: 1.0,
      primaryColor: '#ff6b6b',
      secondaryColor: '#4ecdc4',
      enableShadows: true,
      enableBlur: false,
      animationMode: 'continuous',
      intensity: 0.7,
    });

    const handleControlsChange = (values: Partial<ControlValues>) => {
      setControlValues((prev) => {
        const filteredValues: Partial<ControlValues> = {};
        for (const [key, value] of Object.entries(values)) {
          if (value !== undefined) {
            filteredValues[key as keyof ControlValues] =
              value as ControlValueTypes;
          }
        }
        return { ...prev, ...filteredValues } as ControlValues;
      });
    };

    return (
      <div className="relative h-96 w-full bg-gray-100 p-4">
        <DebugControls
          manifest={complexManifest}
          controlValues={controlValues}
          onControlsChange={handleControlsChange}
          isVisible={true}
          showDownloadButton={true}
        />
      </div>
    );
  },
};
