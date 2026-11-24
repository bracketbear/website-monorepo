import { describe, it, expect } from 'vitest';
import { createManifest } from '@bracketbear/flateralus';
import type { QualityLever } from '@bracketbear/flateralus';
import { HarnessShaderAnimation } from './harness-shader-animation';

const MANIFEST = createManifest({
  id: 'harness-probe',
  name: 'Harness Probe',
  description: 'Exercises render-scale resolution without a GL context.',
  controls: [],
});

/** A mask-based effect, the default for the harness. */
class MaskEffect extends HarnessShaderAnimation<typeof MANIFEST> {
  protected readonly frag = '';
  protected readonly extraUniforms = [] as const;
  constructor() {
    super(MANIFEST);
  }
  protected mask(): null {
    return null;
  }
  protected setUniforms(): void {}
  scale(): number {
    return this.renderScale;
  }
}

/** A maskless effect with its own resolution range. */
class ToyEffect extends MaskEffect {
  protected readonly needsMask = false;
  protected readonly renderScaleLever: QualityLever = { min: 0.4, max: 1 };
}

class CappedToy extends ToyEffect {
  readonly dpr = 0.8;
}

describe('HarnessShaderAnimation render scale', () => {
  it('keeps mask effects at scale 1 whatever the quality', () => {
    // Mask effects compare p = uvS * uRes, in framebuffer pixels, against a
    // uRect measured in stage pixels. The two only agree at scale 1: scaled
    // down, the mask would shrink into the top-left corner.
    const a = new MaskEffect();
    a.setQualityMode('fixed', 0);
    expect(a.scale()).toBe(1);
  });

  it('lets a maskless effect follow its resolution lever', () => {
    const a = new ToyEffect();
    a.setQualityMode('fixed', 0);
    expect(a.scale()).toBeCloseTo(0.4, 10);
    a.setQualityMode('fixed', 1);
    expect(a.scale()).toBeCloseTo(1, 10);
  });

  it('still honours a dpr ceiling', () => {
    const a = new CappedToy();
    a.setQualityMode('fixed', 1);
    expect(a.scale()).toBeCloseTo(0.8, 10);
  });

  it('reports the resolved render scale alongside declared levers', () => {
    // Resolution is the lever people ask about, so the readout has to show it.
    const a = new ToyEffect();
    a.setQualityMode('fixed', 0);
    expect(a.getResolvedLevers().renderScale).toBeCloseTo(0.4, 10);
  });
});
