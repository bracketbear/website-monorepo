import { createManifest } from '../utils/create-manifest';
import type { ManifestToControlValues } from './index';

// Test that createManifest preserves const assertions
const MANIFEST = createManifest({
  id: 'test-animation',
  name: 'Test Animation',
  description: 'A test animation',
  controls: [
    {
      name: 'speed',
      type: 'number',
      label: 'Speed',
      defaultValue: 1.0,
      debug: true,
    },
    {
      name: 'color',
      type: 'color',
      label: 'Color',
      defaultValue: '#ff0000',
      debug: true,
    },
    {
      name: 'enabled',
      type: 'boolean',
      label: 'Enabled',
      defaultValue: true,
      debug: false,
    },
  ],
} as const);

// This should be strongly typed with literal types
type ControlValues = ManifestToControlValues<typeof MANIFEST>;

// Type assertions to verify the types are correct
type _AssertControlValues = ControlValues extends {
  speed: number;
  color: string;
  enabled: boolean;
}
  ? true
  : false;

// This should be true if our type inference is working
const isCorrectlyTyped: _AssertControlValues = true;

// Test that we can use the control values with proper types
const controlValues: ControlValues = {
  speed: 1.5, // number
  color: '#00ff00', // string (not boolean!)
  enabled: false, // boolean
};

export { MANIFEST, controlValues, isCorrectlyTyped };
