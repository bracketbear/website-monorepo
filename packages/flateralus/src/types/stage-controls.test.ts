import { describe, it, expect } from 'vitest';
import type {
  StageControl,
  StageControlValues,
  StageControlsManifest,
} from './stage-controls';

describe('Stage Controls Types', () => {
  it('should define valid stage control types', () => {
    const stageControl: StageControl = {
      name: 'backgroundColor',
      type: 'color',
      label: 'Background Color',
      description: 'Stage background color',
      defaultValue: '#000000',
      debug: true,
      isStageControl: true,
      category: 'background',
    };

    expect(stageControl.name).toBe('backgroundColor');
    expect(stageControl.isStageControl).toBe(true);
    expect(stageControl.category).toBe('background');
  });

  it('should define valid stage control values', () => {
    const stageControls: StageControlValues = {
      backgroundColor: '#000000',
      backgroundAlpha: 0.5,
      enableGrid: true,
      gridColor: '#ffffff',
      gridOpacity: 0.2,
    };

    expect(stageControls.backgroundColor).toBe('#000000');
    expect(stageControls.backgroundAlpha).toBe(0.5);
    expect(stageControls.enableGrid).toBe(true);
  });

  it('should define valid stage controls manifest', () => {
    const manifest: StageControlsManifest = {
      id: 'test-stage-controls',
      name: 'Test Stage Controls',
      description: 'Test stage controls manifest',
      controls: [
        {
          name: 'backgroundColor',
          type: 'color',
          label: 'Background Color',
          description: 'Stage background color',
          defaultValue: '#000000',
          debug: true,
          isStageControl: true,
          category: 'background',
        },
      ],
    };

    expect(manifest.id).toBe('test-stage-controls');
    expect(manifest.controls).toHaveLength(1);
    expect(manifest.controls[0].name).toBe('backgroundColor');
  });

  it('should infer control value types from manifest', () => {
    const _manifest: StageControlsManifest = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      controls: [
        {
          name: 'backgroundColor',
          type: 'color',
          label: 'Background Color',
          description: 'Stage background color',
          defaultValue: '#000000',
          debug: true,
          isStageControl: true,
          category: 'background',
        },
        {
          name: 'backgroundAlpha',
          type: 'number',
          label: 'Background Alpha',
          description: 'Background transparency',
          defaultValue: 0.5,
          debug: true,
          isStageControl: true,
          category: 'background',
        },
        {
          name: 'enableGrid',
          type: 'boolean',
          label: 'Enable Grid',
          description: 'Show grid',
          defaultValue: false,
          debug: true,
          isStageControl: true,
          category: 'grid',
        },
      ],
    };

    // Test that the manifest has the expected structure
    expect(_manifest.controls).toHaveLength(3);
    expect(_manifest.controls[0].name).toBe('backgroundColor');
    expect(_manifest.controls[1].name).toBe('backgroundAlpha');
    expect(_manifest.controls[2].name).toBe('enableGrid');
  });
});
