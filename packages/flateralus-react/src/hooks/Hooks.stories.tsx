import type { Meta, StoryObj } from '@storybook/react';
import { useRef } from 'react';
import { useAnimationStage } from './useAnimationStage';
import { useControls } from './useControls';
import { useDebugControls } from './useDebugControls';
import type {
  Application,
  AnimationManifest,
  Animation,
} from '@bracketbear/flateralus';

// Shared mock application instance to avoid multiple animations
let sharedApplication: Application | null = null;

const createMockApplication = (): Application => {
  if (sharedApplication) {
    return sharedApplication;
  }

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

      // Add some animated content (reduced complexity)
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let time = 0;
        const animate = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

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

          // Draw fewer animated particles (reduced from 20 to 8)
          for (let i = 0; i < 8; i++) {
            const x =
              canvas.width / 2 +
              Math.cos(time + i * 0.8) * (80 + Math.sin(time * 0.3) * 30);
            const y =
              canvas.height / 2 +
              Math.sin(time + i * 0.8) * (60 + Math.cos(time * 0.2) * 20);
            const radius = 4 + Math.sin(time * 1.5 + i) * 2;

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `hsl(${(time * 20 + i * 45) % 360}, 70%, 60%)`;
            ctx.fill();
          }

          time += 0.015; // Slower animation
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
    getAnimation: () => null,
  } as any;

  sharedApplication = mockApp;
  return mockApp;
};

// Mock animation for controls hook
const createMockAnimation = (): Animation => {
  const mockAnimation = {
    getControlValues: () => ({
      speed: 1.0,
      color: '#ff6b6b',
      enableEffects: true,
    }),
    updateControls: (values: any) => console.log('Updating controls:', values),
    reset: (values?: any) => console.log('Resetting animation:', values),
    getManifest: () => createMockManifest(),
    setOnControlsUpdated: (_callback: any) => {},
  } as any;

  return mockAnimation;
};

// Mock manifest for stories
const createMockManifest = (): AnimationManifest => ({
  id: 'mock-animation',
  name: 'Mock Animation',
  description: 'A mock animation for Storybook stories',
  version: '1.0.0',
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
  ],
});

// useAnimationStage Hook Stories
const AnimationStageHookDemo = () => {
  const application = createMockApplication();

  const {
    containerRef,
    application: _app,
    controlValues,
    manifest,
    isInitialized,
    isRunning,
    isVisible,
  } = useAnimationStage({
    application,
    pauseWhenHidden: true,
    visibilityThreshold: 0.1,
    canvasClassName: 'rounded-lg',
  });

  return (
    <div className="space-y-4">
      <div className="rounded bg-gray-100 p-4 text-sm">
        <h3 className="mb-2 font-bold">useAnimationStage Hook State:</h3>
        <div>Initialized: {isInitialized ? 'Yes' : 'No'}</div>
        <div>Running: {isRunning ? 'Yes' : 'No'}</div>
        <div>Visible: {isVisible ? 'Yes' : 'No'}</div>
        <div>Has Manifest: {manifest ? 'Yes' : 'No'}</div>
        <div>Control Values: {JSON.stringify(controlValues)}</div>
      </div>

      <div
        ref={containerRef}
        className="h-48 w-full rounded-lg border-2 border-gray-300"
      />
    </div>
  );
};

const meta: Meta<typeof AnimationStageHookDemo> = {
  title: 'Hooks',
  component: AnimationStageHookDemo,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Hooks for managing animation stages, controls, and debug functionality in Flateralus React applications.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const UseAnimationStage: Story = {
  render: () => <AnimationStageHookDemo />,
};

export const UseAnimationStageWithPauseWhenHidden: Story = {
  render: () => {
    const application = createMockApplication();

    const { containerRef, isInitialized, isRunning, isVisible } =
      useAnimationStage({
        application,
        pauseWhenHidden: true,
        visibilityThreshold: 0.5, // Pause when less than 50% visible
      });

    return (
      <div className="space-y-4">
        <div className="rounded bg-yellow-100 p-4 text-sm">
          <h3 className="mb-2 font-bold">
            useAnimationStage with Pause When Hidden:
          </h3>
          <div>Initialized: {isInitialized ? 'Yes' : 'No'}</div>
          <div>Running: {isRunning ? 'Yes' : 'No'}</div>
          <div>Visible: {isVisible ? 'Yes' : 'No'}</div>
          <div className="mt-2 text-xs">
            Animation will pause when less than 50% visible
          </div>
        </div>

        <div
          ref={containerRef}
          className="h-48 w-full rounded-lg border-2 border-gray-300"
        />
      </div>
    );
  },
};

// useControls Hook Stories
const ControlsHookDemo = () => {
  const animationRef = useRef<Animation | null>(createMockAnimation());
  const manifest = createMockManifest();
  const initialControlValues = {
    speed: 1.0,
    color: '#ff6b6b',
    enableEffects: true,
  };

  const { controlValues, handleControlsChange, showResetToast } = useControls({
    animation: animationRef.current,
    manifest,
    initialControlValues,
    onReset: () => console.log('Animation reset!'),
  });

  const handleSpeedChange = () => {
    handleControlsChange({ speed: Math.random() * 2.9 + 0.1 });
  };

  const handleColorChange = () => {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    handleControlsChange({ color: randomColor });
  };

  const handleEffectsToggle = () => {
    handleControlsChange({ enableEffects: !controlValues.enableEffects });
  };

  return (
    <div className="space-y-4">
      <div className="rounded bg-gray-100 p-4 text-sm">
        <h3 className="mb-2 font-bold">useControls Hook State:</h3>
        <div>Speed: {controlValues.speed}</div>
        <div>Color: {controlValues.color}</div>
        <div>Effects: {controlValues.enableEffects ? 'On' : 'Off'}</div>
        <div>Reset Toast: {showResetToast ? 'Showing' : 'Hidden'}</div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSpeedChange}
          className="rounded bg-blue-500 px-3 py-1 text-sm text-white"
        >
          Random Speed
        </button>
        <button
          onClick={handleColorChange}
          className="rounded bg-green-500 px-3 py-1 text-sm text-white"
        >
          Random Color
        </button>
        <button
          onClick={handleEffectsToggle}
          className="rounded bg-purple-500 px-3 py-1 text-sm text-white"
        >
          Toggle Effects
        </button>
      </div>

      {showResetToast && (
        <div className="rounded bg-yellow-200 p-2 text-sm">
          Animation reset!
        </div>
      )}
    </div>
  );
};

export const UseControls: Story = {
  render: () => <ControlsHookDemo />,
};

// useDebugControls Hook Stories
const DebugControlsHookDemo = () => {
  const application = createMockApplication();
  const _manifest = createMockManifest();

  const { debugControlsProps, showResetToast } = useDebugControls({
    showDebugControls: true,
    showDownloadButton: true,
    application,
    onRandomize: () => console.log('Randomized!'),
    stageControls: {
      manifest: {
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
        ],
      },
      controlValues: {
        backgroundColor: '#2a2a2a',
      },
    },
    onStageControlsChange: (values) =>
      console.log('Stage controls changed:', values),
  });

  return (
    <div className="space-y-4">
      <div className="rounded bg-gray-100 p-4 text-sm">
        <h3 className="mb-2 font-bold">useDebugControls Hook State:</h3>
        <div>Is Visible: {debugControlsProps.isVisible ? 'Yes' : 'No'}</div>
        <div>Has Manifest: {debugControlsProps.manifest ? 'Yes' : 'No'}</div>
        <div>
          Has Stage Controls: {debugControlsProps.stageControls ? 'Yes' : 'No'}
        </div>
        <div>Reset Toast: {showResetToast ? 'Showing' : 'Hidden'}</div>
      </div>

      <div className="rounded-lg border-2 border-gray-300 p-4">
        <h4 className="mb-2 font-bold">Debug Controls Props:</h4>
        <pre className="overflow-auto rounded bg-gray-50 p-2 text-xs">
          {JSON.stringify(debugControlsProps, null, 2)}
        </pre>
      </div>

      {showResetToast && (
        <div className="rounded bg-yellow-200 p-2 text-sm">
          Animation reset!
        </div>
      )}
    </div>
  );
};

export const UseDebugControls: Story = {
  render: () => <DebugControlsHookDemo />,
};

// Combined Hook Demo
export const AllHooksCombined: Story = {
  render: () => {
    const application = createMockApplication();
    const animationRef = useRef<Animation | null>(createMockAnimation());
    const manifest = createMockManifest();

    // useAnimationStage
    const { containerRef, isInitialized, isRunning, isVisible } =
      useAnimationStage({
        application,
        pauseWhenHidden: true,
      });

    // useControls
    const {
      controlValues,
      handleControlsChange: _handleControlsChange,
      showResetToast: controlsResetToast,
    } = useControls({
      animation: animationRef.current,
      manifest,
      initialControlValues: {
        speed: 1.0,
        color: '#ff6b6b',
        enableEffects: true,
      },
    });

    // useDebugControls
    const { debugControlsProps, showResetToast: debugResetToast } =
      useDebugControls({
        showDebugControls: true,
        showDownloadButton: true,
        application,
        stageControls: {
          manifest: {
            id: 'stage-controls',
            name: 'Stage Settings',
            description: 'Controls for the animation stage',
            controls: [],
          },
          controlValues: {},
        },
      });

    return (
      <div className="space-y-6">
        <div className="rounded bg-blue-50 p-4">
          <h3 className="mb-2 font-bold">All Hooks Combined Demo</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold">useAnimationStage:</h4>
              <div>Initialized: {isInitialized ? 'Yes' : 'No'}</div>
              <div>Running: {isRunning ? 'Yes' : 'No'}</div>
              <div>Visible: {isVisible ? 'Yes' : 'No'}</div>
            </div>
            <div>
              <h4 className="font-semibold">useControls:</h4>
              <div>Speed: {controlValues.speed}</div>
              <div>Color: {controlValues.color}</div>
              <div>Effects: {controlValues.enableEffects ? 'On' : 'Off'}</div>
            </div>
          </div>
        </div>

        <div
          ref={containerRef}
          className="h-40 w-full rounded-lg border-2 border-gray-300"
        />

        <div className="rounded bg-gray-100 p-4 text-sm">
          <h4 className="mb-2 font-bold">Debug Controls Props:</h4>
          <div>Is Visible: {debugControlsProps.isVisible ? 'Yes' : 'No'}</div>
          <div>Has Manifest: {debugControlsProps.manifest ? 'Yes' : 'No'}</div>
        </div>

        {(controlsResetToast || debugResetToast) && (
          <div className="rounded bg-yellow-200 p-2 text-sm">
            Animation reset!
          </div>
        )}
      </div>
    );
  },
};
