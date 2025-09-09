import type { Meta, StoryObj } from '@storybook/react';
import { AnimationStage } from './AnimationStage';
import type {
  Application,
  AnimationManifest,
  Animation,
  ControlValues,
} from '@bracketbear/flateralus';

// Mock application for stories
const createMockApplication = (): Application => {
  // Create a shared animation instance
  const animation = createMockAnimation();

  const mockApp = {
    init: async (container: HTMLElement) => {
      // Create a canvas element that fills the container
      const canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';

      // Set canvas size to match container
      const resizeCanvas = () => {
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      };

      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);

      // Add some animated content
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let time = 0;
        const animate = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Get current control values from the shared animation instance
          const values = animation.getControlValues();

          // Create gradient background
          const gradient = ctx.createLinearGradient(
            0,
            0,
            canvas.width,
            canvas.height
          );
          gradient.addColorStop(0, '#667eea');
          gradient.addColorStop(1, '#764ba2');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw animated particles
          const particleCount = Math.max(1, values.particleCount as number); // Ensure minimum of 1
          const particleSize = values.particleSize as number;
          const enableGlow = values.enableGlow as boolean;
          const colorScheme = values.colorScheme as string;

          for (let i = 0; i < particleCount; i++) {
            const x =
              canvas.width / 2 +
              Math.cos(time + i * 0.5) * (100 + Math.sin(time * 0.5) * 50);
            const y =
              canvas.height / 2 +
              Math.sin(time + i * 0.5) * (80 + Math.cos(time * 0.3) * 40);
            const radius = particleSize + Math.sin(time * 2 + i) * 3;

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);

            // Apply color scheme
            let color;
            switch (colorScheme) {
              case 'blue':
                color = `hsl(${200 + Math.sin(time * 0.5 + i) * 20}, 80%, 60%)`;
                break;
              case 'red':
                color = `hsl(${0 + Math.sin(time * 0.5 + i) * 20}, 80%, 60%)`;
                break;
              case 'green':
                color = `hsl(${120 + Math.sin(time * 0.5 + i) * 20}, 80%, 60%)`;
                break;
              default: // rainbow
                color = `hsl(${(time * 30 + i * 18) % 360}, 80%, 60%)`;
            }

            ctx.fillStyle = color;
            ctx.fill();

            // Add glow effect if enabled
            if (enableGlow) {
              ctx.shadowColor = color;
              ctx.shadowBlur = 10;
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }

          // Draw connecting lines if enabled
          const enableConnections = values.enableConnections as boolean;
          const connectionDistance = values.connectionDistance as number;

          if (enableConnections) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            for (let i = 0; i < particleCount; i++) {
              for (let j = i + 1; j < particleCount; j++) {
                const x1 =
                  canvas.width / 2 +
                  Math.cos(time + i * 0.5) * (100 + Math.sin(time * 0.5) * 50);
                const y1 =
                  canvas.height / 2 +
                  Math.sin(time + i * 0.5) * (80 + Math.cos(time * 0.3) * 40);
                const x2 =
                  canvas.width / 2 +
                  Math.cos(time + j * 0.5) * (100 + Math.sin(time * 0.5) * 50);
                const y2 =
                  canvas.height / 2 +
                  Math.sin(time + j * 0.5) * (80 + Math.cos(time * 0.3) * 40);

                const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
                if (distance < connectionDistance) {
                  ctx.beginPath();
                  ctx.moveTo(x1, y1);
                  ctx.lineTo(x2, y2);
                  ctx.stroke();
                }
              }
            }
          }

          time += 0.02 * (values.speed as number);
          requestAnimationFrame(animate);
        };
        animate();
      }

      container.appendChild(canvas);
    },
    start: () => {},
    pause: () => {},
    resume: () => {},
    destroy: () => {},
    isInitialized: () => true,
    isRunning: () => true,
    getCanvas: () => document.querySelector('canvas'),
    getContext: () => null,
    getAnimation: () => animation,
  } as any;

  return mockApp;
};

// Mock animation with manifest for debug controls
const createMockAnimation = (): Animation => {
  const mockManifest: AnimationManifest = {
    id: 'particle-network',
    name: 'Particle Network',
    description: 'An animated particle network with connecting lines',
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
        name: 'particleCount',
        type: 'number',
        label: 'Particle Count',
        description: 'Number of particles to render',
        defaultValue: 20,
        min: 1,
        max: 50,
        step: 1,
        debug: true,
        resetsAnimation: true,
      },
      {
        name: 'particleSize',
        type: 'number',
        label: 'Particle Size',
        description: 'Base size of particles',
        defaultValue: 5,
        min: 2,
        max: 15,
        step: 0.5,
        debug: true,
        resetsAnimation: false,
      },
      {
        name: 'connectionDistance',
        type: 'number',
        label: 'Connection Distance',
        description: 'Maximum distance for particle connections',
        defaultValue: 100,
        min: 50,
        max: 200,
        step: 10,
        debug: true,
        resetsAnimation: false,
      },
      {
        name: 'enableConnections',
        type: 'boolean',
        label: 'Enable Connections',
        description: 'Whether to draw lines between particles',
        defaultValue: true,
        debug: true,
        resetsAnimation: false,
      },
      {
        name: 'enableGlow',
        type: 'boolean',
        label: 'Enable Glow',
        description: 'Whether to add glow effects to particles',
        defaultValue: true,
        debug: true,
        resetsAnimation: false,
      },
      {
        name: 'colorScheme',
        type: 'select',
        label: 'Color Scheme',
        description: 'The color scheme for particles',
        defaultValue: 'rainbow',
        options: [
          { value: 'rainbow', label: 'Rainbow' },
          { value: 'blue', label: 'Blue' },
          { value: 'red', label: 'Red' },
          { value: 'green', label: 'Green' },
        ],
        debug: true,
        resetsAnimation: false,
      },
    ],
  };

  let currentValues: ControlValues = {
    speed: 1.0,
    particleCount: 20,
    particleSize: 5,
    connectionDistance: 100,
    enableConnections: true,
    enableGlow: true,
    colorScheme: 'rainbow',
  };

  let controlsUpdatedCallback: ((values: ControlValues) => void) | undefined;

  const mockAnimation = {
    getControlValues: () => currentValues,
    updateControls: (values: Partial<ControlValues>) => {
      currentValues = { ...currentValues, ...values } as ControlValues;
      console.log('Animation controls updated:', currentValues);
      // Notify debug controls of the change
      if (controlsUpdatedCallback) {
        controlsUpdatedCallback(currentValues);
      }
    },
    reset: (values?: ControlValues) => {
      if (values) {
        currentValues = values;
      } else {
        currentValues = {
          speed: 1.0,
          particleCount: 20,
          particleSize: 5,
          connectionDistance: 100,
          enableConnections: true,
          enableGlow: true,
          colorScheme: 'rainbow',
        };
      }
      console.log('Animation reset:', currentValues);
      // Notify debug controls of the change
      if (controlsUpdatedCallback) {
        controlsUpdatedCallback(currentValues);
      }
    },
    getManifest: () => mockManifest,
    setOnControlsUpdated: (
      callback: ((values: ControlValues) => void) | undefined
    ) => {
      controlsUpdatedCallback = callback;
    },
  } as any;

  return mockAnimation;
};

const meta: Meta<typeof AnimationStage> = {
  title: 'AnimationStage',
  component: AnimationStage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A stage component that hosts a pre-configured application and displays debug controls. Can automatically adjust text colors based on background luminance for accessibility.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    showDebugControls: {
      control: { type: 'boolean' },
      description: 'Whether to show debug controls',
    },
    showDownloadButton: {
      control: { type: 'boolean' },
      description: 'Whether to show the download button in debug controls',
    },
    pauseWhenHidden: {
      control: { type: 'boolean' },
      description: 'Whether to pause animation when not visible',
    },
    visibilityThreshold: {
      control: { type: 'range', min: 0, max: 1, step: 0.1 },
      description: 'Threshold for visibility detection (0-1)',
    },
    visibilityRootMargin: {
      control: { type: 'text' },
      description: 'Root margin for visibility detection',
    },
    className: {
      control: { type: 'text' },
      description: 'Additional CSS classes for the main container',
    },
    canvasClassName: {
      control: { type: 'text' },
      description: 'CSS classes to apply to the canvas element',
    },
    debugControlsClassName: {
      control: { type: 'text' },
      description: 'CSS classes for the debug controls',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    application: createMockApplication(),
    showDebugControls: false,
    className: 'h-screen w-full',
  },
};

export const WithDebugControls: Story = {
  args: {
    application: createMockApplication(),
    showDebugControls: true,
    showDownloadButton: true,
    className: 'h-screen w-full',
  },
};

export const WithChildren: Story = {
  render: () => (
    <AnimationStage
      application={createMockApplication()}
      showDebugControls={true}
      className="h-screen w-full"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="card bg-white/90 p-6 text-center">
          <h3 className="text-xl font-bold text-gray-900">Overlay Content</h3>
          <p className="text-gray-600">
            This content appears over the animation
          </p>
        </div>
      </div>
    </AnimationStage>
  ),
};

export const CustomLayout: Story = {
  render: () => (
    <AnimationStage
      application={createMockApplication()}
      showDebugControls={true}
      className="h-screen w-full"
      layoutClassName="relative flex h-full w-full items-center justify-center"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="card bg-brand-red rounded-lg p-6 text-center text-white shadow-lg">
          <h3 className="mb-2 text-2xl font-bold">Custom Centered Layout</h3>
          <p className="text-sm opacity-90">
            This content is centered using custom layout classes
          </p>
        </div>
      </div>
    </AnimationStage>
  ),
};
