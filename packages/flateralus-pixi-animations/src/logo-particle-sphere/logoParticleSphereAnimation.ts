import {
  BaseAnimation,
  createManifest,
  type ManifestToControlValues,
} from '@bracketbear/flateralus';
import * as PIXI from 'pixi.js';

// ============================================================================
// SVG PATH DATA - Bracket Bear Logo
// ============================================================================

// The four paths from bracket-bear-logo.svg (viewBox: 0 0 400.89 249.73)
const LOGO_SVG_PATHS = [
  'm69.98,172.24v-94.76c0-4.14,3.36-7.5,7.5-7.5h15.14c1.66,0,3-1.34,3-3V3C95.62,1.34,94.28,0,92.62,0H15C6.72,0,0,6.72,0,15v219.73c0,8.28,6.72,15,15,15h77.62c1.66,0,3-1.34,3-3v-63.99c0-1.66-1.34-3-3-3h-15.14c-4.14,0-7.5-3.36-7.5-7.5Z',
  'm174.98,117.27c12.14,16.38,20.1,28.95,19.83,56.54-.73,66.7-62.49,74.8-77.35,75.78-1.73.11-3.19-1.26-3.19-2.99v-84.29c0-1.66-1.34-3-3-3h-19.68c-1.66,0-3-1.34-3-3v-64.05c0-1.66,1.34-3,3-3h19.68c1.66,0,3-1.34,3-3V3.05c0-1.72,1.44-3.08,3.16-3,12.12.59,55.68,6.48,69.61,59.96,7.61,29.23-3.42,50.36-12.06,57.26',
  'm323.41,179.74h-15.14c-1.66,0-3,1.34-3,3v63.99c0,1.66,1.34,3,3,3h77.62c8.28,0,15-6.72,15-15V15C400.89,6.72,394.18,0,385.89,0h-77.62c-1.66,0-3,1.34-3,3v63.99c0,1.66,1.34,3,3,3h15.14c4.14,0,7.5,3.36,7.5,7.5v94.76c0,4.14-3.36,7.5-7.5,7.5Z',
  'm225.92,117.28c-8.64-6.9-19.67-28.03-12.06-57.26C227.79,6.53,271.35.64,283.47.05c1.72-.08,3.16,1.28,3.16,3v83.21c0,1.66,1.34,3,3,3h19.68c1.66,0,3,1.34,3,3v64.05c0,1.66-1.34,3-3,3h-19.68c-1.66,0-3,1.34-3,3v84.29c0,1.73-1.46,3.11-3.19,2.99-14.86-.98-76.62-9.08-77.35-75.78-.27-27.6,7.69-40.17,19.83-56.54',
];

const LOGO_VIEWBOX_WIDTH = 400.89;
const LOGO_VIEWBOX_HEIGHT = 249.73;

// ============================================================================
// SVG PATH SAMPLING UTILITIES
// ============================================================================

/**
 * Sample points along SVG paths using the browser's built-in SVG path API.
 * Creates a temporary SVG element to leverage getPointAtLength().
 */
function samplePointsFromSVGPaths(
  paths: string[],
  totalPoints: number
): { x: number; y: number }[] {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute(
    'viewBox',
    `0 0 ${LOGO_VIEWBOX_WIDTH} ${LOGO_VIEWBOX_HEIGHT}`
  );
  svg.style.position = 'absolute';
  svg.style.visibility = 'hidden';
  svg.style.width = '0';
  svg.style.height = '0';
  document.body.appendChild(svg);

  // Create path elements and measure total length
  const pathElements: SVGPathElement[] = [];
  let totalLength = 0;

  for (const d of paths) {
    const pathEl = document.createElementNS(svgNS, 'path');
    pathEl.setAttribute('d', d);
    svg.appendChild(pathEl);
    pathElements.push(pathEl);
    totalLength += pathEl.getTotalLength();
  }

  // Distribute points proportionally across paths
  const points: { x: number; y: number }[] = [];

  for (const pathEl of pathElements) {
    const pathLength = pathEl.getTotalLength();
    const pathPoints = Math.round((pathLength / totalLength) * totalPoints);

    for (let i = 0; i < pathPoints; i++) {
      const distance = (i / pathPoints) * pathLength;
      const pt = pathEl.getPointAtLength(distance);
      points.push({ x: pt.x, y: pt.y });
    }
  }

  // Clean up
  document.body.removeChild(svg);

  return points;
}

// ============================================================================
// 90s GEOMETRIC SHAPE INTERFACE
// ============================================================================

type ShapeType =
  | 'triangle'
  | 'diamond'
  | 'circle'
  | 'cross'
  | 'zigzag'
  | 'ring';

// Color cycle palettes — each is [primary, secondary]
const NEON_PALETTES: [number, number][] = [
  [0xff00c8, 0x00fff7], // hot pink + cyan
  [0xeeff00, 0xb400ff], // acid yellow + electric purple
  [0x00ff66, 0xff6600], // lime + neon orange
  [0xff0055, 0x00ccff], // red-pink + sky blue
  [0xb400ff, 0x39ff14], // purple + neon green
];

const NEON_COLORS_90S = [
  0x00fff7, // cyan
  0x39ff14, // neon green
  0xb400ff, // electric purple
  0xeeff00, // acid yellow
  0x00ff66, // lime green
  0xff6600, // neon orange
];

interface GeoShape {
  sprite: PIXI.Graphics;
  x: number;
  y: number;
  size: number;
  shapeType: ShapeType;
  color: number;
  baseAlpha: number;
  rotationSpeed: number;
  driftX: number;
  driftY: number;
  pulseSpeed: number;
  pulseOffset: number;
  rotation: number;
}

// ============================================================================
// PARTICLE INTERFACE
// ============================================================================

interface Particle {
  sprite: PIXI.Graphics;
  // Logo position (normalized to center, in logo units)
  logoX: number;
  logoY: number;
  logoZ: number;
  // Current 3D position after rotation
  currentX: number;
  currentY: number;
  currentZ: number;
  size: number;
  baseSize: number;
  pulseOffset: number;
  color: number;
  baseAlpha: number;
  currentAlpha: number;
  // Per-particle wobble for dynamicism
  wobbleSpeedX: number;
  wobbleSpeedY: number;
  wobbleAmplitude: number;
  wobbleOffset: number;
}

// ============================================================================
// RING TEXT
// ============================================================================

const _RING_TEXT = '  BRACKET BEAR  \u2022  SOFTWARE STUDIO  \u2022';

interface RingCharacter {
  text: PIXI.Text;
  angle: number; // base angle around the ring
}

// ============================================================================
// ANIMATION MANIFEST
// ============================================================================

export const LOGO_PARTICLE_SPHERE_MANIFEST = createManifest({
  id: 'logo-particle-sphere',
  name: 'Logo Particle Sphere',
  description: 'A 3D rotating particle formation of the Bracket Bear logo',
  controls: [
    {
      name: 'particleCount',
      type: 'number',
      label: 'Particle Count',
      description: 'Number of particles forming the logo',
      min: 100,
      max: 1500,
      step: 50,
      defaultValue: 600,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'logoScale',
      type: 'number',
      label: 'Logo Scale',
      description: 'Scale of the logo relative to container',
      min: 0.3,
      max: 2.0,
      step: 0.1,
      defaultValue: 0.9,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'particleSize',
      type: 'number',
      label: 'Particle Size',
      description: 'Base size of individual particles',
      min: 1,
      max: 6,
      step: 0.5,
      defaultValue: 2.5,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'depthSpread',
      type: 'number',
      label: 'Depth Spread',
      description: 'How far particles spread along the Z axis',
      min: 0,
      max: 150,
      step: 5,
      defaultValue: 40,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'rotationSpeedX',
      type: 'number',
      label: 'Rotation Speed X',
      description: 'Rotation speed around X axis',
      min: 0,
      max: 0.02,
      step: 0.001,
      defaultValue: 0.002,
      debug: true,
    },
    {
      name: 'rotationSpeedY',
      type: 'number',
      label: 'Rotation Speed Y',
      description: 'Rotation speed around Y axis',
      min: 0,
      max: 0.02,
      step: 0.001,
      defaultValue: 0.004,
      debug: true,
    },
    {
      name: 'pulseSpeed',
      type: 'number',
      label: 'Pulse Speed',
      description: 'Speed of particle size pulsing',
      min: 0,
      max: 3.0,
      step: 0.1,
      defaultValue: 0.8,
      debug: true,
    },
    {
      name: 'pulseAmplitude',
      type: 'number',
      label: 'Pulse Amplitude',
      description: 'Amplitude of particle size pulsing',
      min: 0,
      max: 1.0,
      step: 0.05,
      defaultValue: 0.15,
      debug: true,
    },
    {
      name: 'particleColor',
      type: 'color',
      label: 'Particle Color',
      description: 'Primary color of the particles',
      defaultValue: '#00fff7',
      debug: true,
    },
    {
      name: 'particleColorSecondary',
      type: 'color',
      label: 'Secondary Color',
      description: 'Secondary particle color for variation',
      defaultValue: '#39ff14',
      debug: true,
    },
    {
      name: 'opacity',
      type: 'number',
      label: 'Opacity',
      description: 'Overall opacity of particles',
      min: 0.1,
      max: 1.0,
      step: 0.05,
      defaultValue: 0.9,
      debug: true,
    },
    {
      name: 'showConnections',
      type: 'boolean',
      label: 'Show Connections',
      description: 'Draw lines between nearby particles',
      defaultValue: true,
      debug: true,
    },
    {
      name: 'connectionDistance',
      type: 'number',
      label: 'Connection Distance',
      description: 'Maximum distance for connection lines',
      min: 5,
      max: 60,
      step: 2,
      defaultValue: 20,
      debug: true,
    },
    {
      name: 'connectionColor',
      type: 'color',
      label: 'Connection Color',
      description: 'Color of connection lines',
      defaultValue: '#f97316',
      debug: true,
    },
    {
      name: 'glowSize',
      type: 'number',
      label: 'Glow Size',
      description: 'Size of particle glow effect',
      min: 0,
      max: 10,
      step: 0.5,
      defaultValue: 3,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'ringRadius',
      type: 'number',
      label: 'Ring Radius',
      description: 'Radius of the text ring relative to container',
      min: 0.3,
      max: 2.0,
      step: 0.05,
      defaultValue: 0.55,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'ringSpeed',
      type: 'number',
      label: 'Ring Speed',
      description: 'Rotation speed of the text ring',
      min: 0.001,
      max: 0.05,
      step: 0.001,
      defaultValue: 0.008,
      debug: true,
    },
    {
      name: 'ringColor',
      type: 'color',
      label: 'Ring Text Color',
      description: 'Color of the ring text',
      defaultValue: '#ffffff',
      debug: true,
    },
    {
      name: 'ringFontSize',
      type: 'number',
      label: 'Ring Font Size',
      description: 'Font size of the ring text',
      min: 8,
      max: 32,
      step: 1,
      defaultValue: 16,
      debug: true,
      resetsAnimation: true,
    },
  ],
});

type LogoParticleSphereControlValues = ManifestToControlValues<
  typeof LOGO_PARTICLE_SPHERE_MANIFEST
>;

// ============================================================================
// LOGO PARTICLE SPHERE ANIMATION CLASS
// ============================================================================

export class LogoParticleSphereAnimation extends BaseAnimation<
  typeof LOGO_PARTICLE_SPHERE_MANIFEST,
  LogoParticleSphereControlValues
> {
  private particles: Particle[] = [];
  private geoShapes: GeoShape[] = [];
  private ringCharacters: RingCharacter[] = [];
  private container!: PIXI.Container;
  private bgContainer!: PIXI.Container;
  private scanlineGraphics!: PIXI.Graphics;
  private ringContainer!: PIXI.Container;
  private connectionsGraphics!: PIXI.Graphics;
  // RGB split ghost containers
  private rgbRedContainer!: PIXI.Container;
  private rgbBlueContainer!: PIXI.Container;
  private time: number = 0;
  private rotationX: number = 0;
  private rotationY: number = 0;
  private rotationZ: number = 0;
  private ringRotation: number = 0;
  private logoPoints: { x: number; y: number }[] = [];
  private burstPhase: number = 0; // drives the periodic explosion/snap-back
  // Glitch state — supports multiple simultaneous slices
  private glitchTimer: number = 0;
  private glitchActive: boolean = false;
  private glitchSlices: { y: number; height: number; offsetX: number }[] = [];
  // Fisheye warp state (render-level displacement filter)
  private fisheyeTimer: number = 0;
  private fisheyeActive: boolean = false;
  private fisheyeTargetScale: number = 0;
  private fisheyeCurrentScale: number = 0;
  private displacementSprite!: PIXI.Sprite;
  private displacementFilter!: PIXI.DisplacementFilter;
  // Stutter/freeze frame
  private stutterTimer: number = 2.0;
  private stutterFrozen: boolean = false;
  // Color cycle
  private colorCycleTimer: number = 5.0;
  private colorCycleActive: boolean = false;
  private colorCyclePalette: number = 0;

  constructor(initialControls?: Partial<LogoParticleSphereControlValues>) {
    super(LOGO_PARTICLE_SPHERE_MANIFEST, initialControls);
  }

  onInit(
    context: PIXI.Application,
    controls: LogoParticleSphereControlValues
  ): void {
    this.bgContainer = new PIXI.Container();
    this.container = new PIXI.Container();
    this.connectionsGraphics = new PIXI.Graphics();
    this.scanlineGraphics = new PIXI.Graphics();

    // RGB split ghost layers — behind the main container
    this.rgbRedContainer = new PIXI.Container();
    this.rgbBlueContainer = new PIXI.Container();
    this.rgbRedContainer.alpha = 0;
    this.rgbBlueContainer.alpha = 0;
    this.rgbRedContainer.tint = 0xff0000;
    this.rgbBlueContainer.tint = 0x0000ff;

    context.stage.addChild(this.bgContainer);
    context.stage.addChild(this.rgbRedContainer);
    context.stage.addChild(this.rgbBlueContainer);
    context.stage.addChild(this.container);
    context.stage.addChild(this.connectionsGraphics);
    context.stage.addChild(this.scanlineGraphics);

    // Set up displacement filter for fisheye warp
    this.createDisplacementFilter(context);

    // Create 90s geometric background shapes
    this.createGeoShapes(context);

    // Sample points from the logo SVG paths
    this.logoPoints = samplePointsFromSVGPaths(
      LOGO_SVG_PATHS,
      controls.particleCount
    );

    this.createParticles(context, controls);
  }

  onUpdate(
    context: PIXI.Application,
    controls: LogoParticleSphereControlValues,
    deltaTime: number
  ): void {
    this.time += deltaTime;

    // ---- Stutter/freeze: skip the entire update for 50-150ms ----
    this.stutterTimer -= deltaTime;
    if (this.stutterTimer <= 0) {
      if (this.stutterFrozen) {
        this.stutterFrozen = false;
        this.stutterTimer = 3.0 + Math.random() * 5.0; // 3-8s between stutters
      } else {
        this.stutterFrozen = true;
        this.stutterTimer = 0.05 + Math.random() * 0.1; // freeze 50-150ms
      }
    }
    if (this.stutterFrozen) return; // everything stays exactly where it was

    // Slow continuous rotation
    this.rotationX += controls.rotationSpeedX * deltaTime * 60;
    this.rotationY += controls.rotationSpeedY * deltaTime * 60;

    // Z-axis swagger — quantized/stepped for a jumpy glitch feel
    const swayRaw = Math.sin(this.time * 0.3) * 0.06;
    this.rotationZ = Math.round(swayRaw * 30) / 30; // snap to steps

    // Burst phase — periodic kick every ~4 seconds (sawtooth that decays)
    this.burstPhase = this.time % 4.0;

    // ---- Glitch timing — random bursts of glitch ----
    this.glitchTimer -= deltaTime;
    if (this.glitchTimer <= 0) {
      if (this.glitchActive) {
        this.glitchActive = false;
        this.glitchTimer = 0.8 + Math.random() * 2.0;
      } else {
        this.glitchActive = true;
        this.glitchTimer = 0.04 + Math.random() * 0.2;
        const screenH = context.screen.height;
        const sliceCount = 2 + Math.floor(Math.random() * 4);
        this.glitchSlices = [];
        for (let i = 0; i < sliceCount; i++) {
          this.glitchSlices.push({
            y: (Math.random() - 0.5) * screenH * 0.8,
            height: 15 + Math.random() * 60,
            offsetX: (Math.random() - 0.5) * 80,
          });
        }
      }
    }

    // ---- Color cycle — snap to a random neon palette then back ----
    this.colorCycleTimer -= deltaTime;
    if (this.colorCycleTimer <= 0) {
      if (this.colorCycleActive) {
        // Snap back to original colors
        this.colorCycleActive = false;
        this.colorCycleTimer = 4.0 + Math.random() * 6.0; // 4-10s between cycles
        this.restoreParticleColors(controls);
      } else {
        this.colorCycleActive = true;
        this.colorCycleTimer = 0.1 + Math.random() * 0.3; // flash lasts 100-400ms
        this.colorCyclePalette = Math.floor(
          Math.random() * NEON_PALETTES.length
        );
        this.applyColorCycle();
      }
    }

    // ---- Fisheye warp — displacement filter ----
    this.fisheyeTimer -= deltaTime;
    if (this.fisheyeTimer <= 0) {
      if (this.fisheyeActive) {
        this.fisheyeActive = false;
        this.fisheyeTargetScale = 0;
        this.fisheyeTimer = 2.0 + Math.random() * 4.0;
      } else {
        this.fisheyeActive = true;
        this.fisheyeTimer = 0.3 + Math.random() * 0.6;
        this.fisheyeTargetScale = 20 + Math.random() * 50;
        const screenW = context.screen.width;
        const screenH = context.screen.height;
        this.displacementSprite.x = screenW * (0.25 + Math.random() * 0.5);
        this.displacementSprite.y = screenH * (0.25 + Math.random() * 0.5);
      }
    }
    if (this.fisheyeActive) {
      this.fisheyeCurrentScale = this.fisheyeTargetScale;
    } else {
      this.fisheyeCurrentScale *= Math.max(0, 1 - deltaTime * 12);
      if (this.fisheyeCurrentScale < 0.5) this.fisheyeCurrentScale = 0;
    }
    this.displacementFilter.scale.x = this.fisheyeCurrentScale;
    this.displacementFilter.scale.y = this.fisheyeCurrentScale;

    // ---- RGB split — offset ghost containers during glitch ----
    if (this.glitchActive) {
      this.rgbRedContainer.alpha = 0.3;
      this.rgbBlueContainer.alpha = 0.3;
      // Mirror main container position but offset
      this.rgbRedContainer.x = this.container.x - 4 - Math.random() * 6;
      this.rgbRedContainer.y = this.container.y + 2;
      this.rgbRedContainer.rotation = this.container.rotation;
      this.rgbRedContainer.scale = this.container.scale;
      this.rgbBlueContainer.x = this.container.x + 4 + Math.random() * 6;
      this.rgbBlueContainer.y = this.container.y - 2;
      this.rgbBlueContainer.rotation = this.container.rotation;
      this.rgbBlueContainer.scale = this.container.scale;
    } else {
      // Fast fade out
      this.rgbRedContainer.alpha *= 0.8;
      this.rgbBlueContainer.alpha *= 0.8;
      if (this.rgbRedContainer.alpha < 0.01) {
        this.rgbRedContainer.alpha = 0;
        this.rgbBlueContainer.alpha = 0;
      }
    }

    this.updateGeoShapes(context);
    this.updateParticles(context, controls);
    this.updateScanlines(context);

    if (controls.showConnections) {
      this.updateConnections(controls);
    } else {
      this.connectionsGraphics.clear();
    }
  }

  onDestroy(): void {
    if (this.rgbRedContainer?.parent) {
      this.rgbRedContainer.parent.removeChild(this.rgbRedContainer);
    }
    if (this.rgbBlueContainer?.parent) {
      this.rgbBlueContainer.parent.removeChild(this.rgbBlueContainer);
    }
    if (this.bgContainer?.parent) {
      this.bgContainer.parent.removeChild(this.bgContainer);
    }
    if (this.container?.parent) {
      this.container.parent.removeChild(this.container);
    }
    if (this.connectionsGraphics?.parent) {
      this.connectionsGraphics.parent.removeChild(this.connectionsGraphics);
    }
    if (this.scanlineGraphics?.parent) {
      this.scanlineGraphics.parent.removeChild(this.scanlineGraphics);
    }
    if (this.displacementSprite?.parent) {
      this.displacementSprite.parent.removeChild(this.displacementSprite);
    }
    this.particles.forEach((p) => {
      if (p.sprite?.parent) p.sprite.parent.removeChild(p.sprite);
    });
    this.geoShapes.forEach((s) => {
      if (s.sprite?.parent) s.sprite.parent.removeChild(s.sprite);
    });
    this.particles = [];
    this.geoShapes = [];
  }

  protected onReset(
    context: PIXI.Application,
    controls: LogoParticleSphereControlValues
  ): void {
    this.bgContainer.removeChildren();
    this.container.removeChildren();
    this.rgbRedContainer.removeChildren();
    this.rgbBlueContainer.removeChildren();
    this.connectionsGraphics.clear();
    this.scanlineGraphics.clear();
    this.fisheyeCurrentScale = 0;
    this.fisheyeTargetScale = 0;
    this.displacementFilter.scale.x = 0;
    this.displacementFilter.scale.y = 0;
    this.particles = [];
    this.geoShapes = [];

    this.createGeoShapes(context);
    this.logoPoints = samplePointsFromSVGPaths(
      LOGO_SVG_PATHS,
      controls.particleCount
    );
    this.createParticles(context, controls);
  }

  protected onDynamicControlsChange(
    controls: LogoParticleSphereControlValues,
    _previousControls: LogoParticleSphereControlValues,
    changedControls: string[]
  ): void {
    if (
      changedControls.includes('particleColor') ||
      changedControls.includes('particleColorSecondary')
    ) {
      this.updateParticleColors(controls);
    }
    if (changedControls.includes('opacity')) {
      this.particles.forEach((p) => {
        p.baseAlpha = controls.opacity;
      });
    }
  }

  // --------------------------------------------------------------------------
  // Displacement filter (fisheye warp)
  // --------------------------------------------------------------------------

  private createDisplacementFilter(context: PIXI.Application): void {
    // Generate a radial gradient on a canvas for the displacement map
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    // Center = white (max displacement), edge = mid-gray (neutral)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.6, 'rgba(180, 180, 180, 1)');
    gradient.addColorStop(1, 'rgba(128, 128, 128, 1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = PIXI.Texture.from(canvas);
    this.displacementSprite = new PIXI.Sprite(texture);
    this.displacementSprite.anchor.set(0.5);
    this.displacementSprite.scale.set(2);
    this.displacementSprite.alpha = 0; // invisible — only used as a map
    context.stage.addChild(this.displacementSprite);

    this.displacementFilter = new PIXI.DisplacementFilter({
      sprite: this.displacementSprite,
      scale: 0,
    });
    context.stage.filters = [this.displacementFilter];
  }

  // --------------------------------------------------------------------------
  // 90s Geometric Background Shapes
  // --------------------------------------------------------------------------

  private drawGeoShape(
    sprite: PIXI.Graphics,
    shapeType: ShapeType,
    size: number,
    color: number,
    alpha: number
  ): void {
    switch (shapeType) {
      case 'triangle':
        sprite
          .moveTo(0, -size)
          .lineTo(size * 0.866, size * 0.5)
          .lineTo(-size * 0.866, size * 0.5)
          .closePath()
          .fill({ color, alpha });
        break;
      case 'diamond':
        sprite
          .moveTo(0, -size)
          .lineTo(size * 0.6, 0)
          .lineTo(0, size)
          .lineTo(-size * 0.6, 0)
          .closePath()
          .fill({ color, alpha });
        break;
      case 'circle':
        sprite.circle(0, 0, size * 0.6).fill({ color, alpha });
        break;
      case 'cross':
        const t = size * 0.2;
        sprite.rect(-t, -size, t * 2, size * 2).fill({ color, alpha });
        sprite.rect(-size, -t, size * 2, t * 2).fill({ color, alpha });
        break;
      case 'zigzag':
        sprite
          .setStrokeStyle({ width: 2, color, alpha })
          .moveTo(-size, -size * 0.5)
          .lineTo(-size * 0.33, size * 0.5)
          .lineTo(size * 0.33, -size * 0.5)
          .lineTo(size, size * 0.5)
          .stroke();
        break;
      case 'ring':
        sprite
          .setStrokeStyle({ width: 2, color, alpha })
          .circle(0, 0, size * 0.6)
          .stroke();
        break;
    }
  }

  private createGeoShapes(context: PIXI.Application): void {
    const screenW = context.screen.width;
    const screenH = context.screen.height;
    const shapeCount = Math.floor((screenW * screenH) / 18000);
    const shapeTypes: ShapeType[] = [
      'triangle',
      'diamond',
      'circle',
      'cross',
      'zigzag',
      'ring',
    ];

    for (let i = 0; i < shapeCount; i++) {
      const x = Math.random() * screenW;
      const y = Math.random() * screenH;
      const size = Math.random() * 16 + 5;
      const baseAlpha = Math.random() * 0.12 + 0.06;
      const shapeType =
        shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
      const color =
        NEON_COLORS_90S[Math.floor(Math.random() * NEON_COLORS_90S.length)];

      const sprite = new PIXI.Graphics();
      this.drawGeoShape(sprite, shapeType, size, color, baseAlpha);

      sprite.x = x;
      sprite.y = y;
      this.bgContainer.addChild(sprite);

      this.geoShapes.push({
        sprite,
        x,
        y,
        size,
        shapeType,
        color,
        baseAlpha,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        driftX: (Math.random() - 0.5) * 0.3,
        driftY: (Math.random() - 0.5) * 0.2,
        pulseSpeed: Math.random() * 1.5 + 0.5,
        pulseOffset: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI * 2,
      });
    }
  }

  private updateGeoShapes(context: PIXI.Application): void {
    const screenW = context.screen.width;
    const screenH = context.screen.height;

    for (const shape of this.geoShapes) {
      // Rotate the shape
      shape.rotation += shape.rotationSpeed;
      shape.sprite.rotation = shape.rotation;

      // Drift
      shape.x += shape.driftX;
      shape.y += shape.driftY;

      // Wrap around screen edges
      if (shape.x < -30) shape.x = screenW + 30;
      if (shape.x > screenW + 30) shape.x = -30;
      if (shape.y < -30) shape.y = screenH + 30;
      if (shape.y > screenH + 30) shape.y = -30;

      shape.sprite.x = shape.x;
      shape.sprite.y = shape.y;

      // Pulse alpha
      const pulse = Math.sin(this.time * shape.pulseSpeed + shape.pulseOffset);
      shape.sprite.alpha = shape.baseAlpha * (0.5 + pulse * 0.5);
    }
  }

  // --------------------------------------------------------------------------
  // Scanline overlay (CRT effect)
  // --------------------------------------------------------------------------

  private updateScanlines(context: PIXI.Application): void {
    this.scanlineGraphics.clear();
    const screenW = context.screen.width;
    const screenH = context.screen.height;
    const lineSpacing = 4;

    // Scrolling scanlines
    const offset = (this.time * 30) % lineSpacing;

    for (let y = offset; y < screenH; y += lineSpacing) {
      this.scanlineGraphics
        .rect(0, y, screenW, 1)
        .fill({ color: 0x000000, alpha: 0.06 });
    }

    // During glitch: chromatic aberration bands for each slice
    if (this.glitchActive) {
      for (const slice of this.glitchSlices) {
        const bandY = screenH / 2 + slice.y;
        // Cyan band shifted left
        this.scanlineGraphics
          .rect(-10, bandY, screenW, slice.height * 0.5)
          .fill({ color: 0x00fff7, alpha: 0.07 });
        // Magenta band shifted right
        this.scanlineGraphics
          .rect(10, bandY + slice.height * 0.25, screenW, slice.height * 0.5)
          .fill({ color: 0xff00c8, alpha: 0.07 });
        // White noise flicker bar
        this.scanlineGraphics
          .rect(0, bandY + Math.random() * slice.height, screenW, 2)
          .fill({ color: 0xffffff, alpha: 0.15 });
      }
    }
  }

  // --------------------------------------------------------------------------
  // Particle creation
  // --------------------------------------------------------------------------

  private createParticles(
    context: PIXI.Application,
    controls: LogoParticleSphereControlValues
  ): void {
    const screenW = context.screen.width;
    const screenH = context.screen.height;
    const minDim = Math.min(screenW, screenH);

    // Scale logo to fit in the container
    const scale =
      (minDim / Math.max(LOGO_VIEWBOX_WIDTH, LOGO_VIEWBOX_HEIGHT)) *
      controls.logoScale;

    // Center offset: shift logo center to origin
    const logoCenterX = LOGO_VIEWBOX_WIDTH / 2;
    const logoCenterY = LOGO_VIEWBOX_HEIGHT / 2;

    const primaryColor = this.hexToNumber(controls.particleColor);
    const secondaryColor = this.hexToNumber(controls.particleColorSecondary);

    for (let i = 0; i < this.logoPoints.length; i++) {
      const pt = this.logoPoints[i];

      // Center the logo points around origin and scale
      const logoX = (pt.x - logoCenterX) * scale;
      const logoY = (pt.y - logoCenterY) * scale;
      // Random depth spread for 3D effect
      const logoZ = (Math.random() - 0.5) * controls.depthSpread;

      // Alternate colors with some randomness
      const useSecondary = Math.random() > 0.6;
      const color = useSecondary ? secondaryColor : primaryColor;

      const size = controls.particleSize + (Math.random() - 0.5) * 1.0;

      // Create particle sprite with aggressive neon glow
      const sprite = new PIXI.Graphics();
      if (controls.glowSize > 0) {
        // Wide outer bloom
        sprite
          .circle(0, 0, size + controls.glowSize * 3)
          .fill({ color, alpha: 0.03 });
        // Outer halo
        sprite
          .circle(0, 0, size + controls.glowSize * 2)
          .fill({ color, alpha: 0.06 });
        // Mid glow
        sprite
          .circle(0, 0, size + controls.glowSize * 1.2)
          .fill({ color, alpha: 0.12 });
        // Inner glow
        sprite
          .circle(0, 0, size + controls.glowSize * 0.5)
          .fill({ color, alpha: 0.2 });
      }
      // Bright core
      sprite.circle(0, 0, size).fill({ color, alpha: controls.opacity });
      // Hot white center — punchy
      sprite
        .circle(0, 0, size * 0.5)
        .fill({ color: 0xffffff, alpha: controls.opacity * 0.7 });

      this.container.addChild(sprite);

      this.particles.push({
        sprite,
        logoX,
        logoY,
        logoZ,
        currentX: logoX,
        currentY: logoY,
        currentZ: logoZ,
        size,
        baseSize: size,
        pulseOffset: Math.random() * Math.PI * 2,
        color,
        baseAlpha: controls.opacity,
        currentAlpha: controls.opacity,
        wobbleSpeedX: Math.random() * 1.5 + 0.4,
        wobbleSpeedY: Math.random() * 1.5 + 0.4,
        wobbleAmplitude: Math.random() * 1.5 + 0.5,
        wobbleOffset: Math.random() * Math.PI * 2,
      });
    }

    // Create lightweight dots for RGB ghost containers
    for (const p of this.particles) {
      const redDot = new PIXI.Graphics();
      redDot.circle(0, 0, p.baseSize).fill({ color: 0xff0000, alpha: 0.8 });
      this.rgbRedContainer.addChild(redDot);

      const blueDot = new PIXI.Graphics();
      blueDot.circle(0, 0, p.baseSize).fill({ color: 0x0000ff, alpha: 0.8 });
      this.rgbBlueContainer.addChild(blueDot);
    }

    // Position container at screen center
    this.container.x = screenW / 2;
    this.container.y = screenH / 2;
    this.connectionsGraphics.x = screenW / 2;
    this.connectionsGraphics.y = screenH / 2;
  }

  // --------------------------------------------------------------------------
  // Particle update (3D rotation + projection + wobble + wave)
  // --------------------------------------------------------------------------

  private updateParticles(
    context: PIXI.Application,
    controls: LogoParticleSphereControlValues
  ): void {
    const screenW = context.screen.width;
    const screenH = context.screen.height;
    const minDim = Math.min(screenW, screenH);

    // Reposition container if resized
    this.container.x = screenW / 2;
    this.container.y = screenH / 2;
    this.connectionsGraphics.x = screenW / 2;
    this.connectionsGraphics.y = screenH / 2;

    const cosX = Math.cos(this.rotationX);
    const sinX = Math.sin(this.rotationX);
    const cosY = Math.cos(this.rotationY);
    const sinY = Math.sin(this.rotationY);
    const cosZ = Math.cos(this.rotationZ);
    const sinZ = Math.sin(this.rotationZ);

    // Perspective projection distance
    const focalLength = minDim * 1.5;

    // Wave distortion that ripples across the formation
    const waveTime = this.time * 1.2;

    // Burst: sharp kick outward that decays fast (peaks at t=0 of each cycle)
    // burstPhase is 0..4 — we want a fast spike at 0 that dies by ~0.6s
    const burstRaw = Math.max(0, 1 - this.burstPhase * 2.5);
    const burstStrength = burstRaw * burstRaw * 18; // quadratic falloff, max ~18px push

    // Heartbeat breathing — snappy, quantized steps
    const hb = this.time * 2.2;
    const heartbeatRaw =
      (Math.pow(Math.sin(hb), 12) + Math.pow(Math.sin(hb + 0.4), 8) * 0.5) *
      0.05;
    const heartbeat = Math.round(heartbeatRaw * 40) / 40;

    // Apply swagger + heartbeat to the whole container
    this.container.rotation = this.rotationZ;
    this.container.scale.set(1.0 + heartbeat);

    // Noise frame — changes every ~3 frames for a jittery, lo-fi feel
    const noiseFrame = Math.floor(this.time * 20);

    const redChildren = this.rgbRedContainer.children;
    const blueChildren = this.rgbBlueContainer.children;

    for (let pi = 0; pi < this.particles.length; pi++) {
      const particle = this.particles[pi];
      // Per-particle wobble offset
      const wobbleX =
        Math.sin(this.time * particle.wobbleSpeedX + particle.wobbleOffset) *
        particle.wobbleAmplitude;
      const wobbleY =
        Math.cos(
          this.time * particle.wobbleSpeedY + particle.wobbleOffset * 1.3
        ) * particle.wobbleAmplitude;

      // Random per-particle noise jitter — seeded by particle position + noiseFrame
      const noiseHash =
        ((particle.logoX * 73.17 +
          particle.logoY * 91.33 +
          noiseFrame * 37.19) %
          1000) /
        1000;
      const noiseX = (noiseHash - 0.5) * 2.5;
      const noiseY = (((noiseHash * 127.1 + 0.3) % 1.0) - 0.5) * 2.5;

      let x = particle.logoX + wobbleX + noiseX;
      let y = particle.logoY + wobbleY + noiseY;
      let z = particle.logoZ;

      // Burst kick — push particles outward from center
      if (burstStrength > 0.1) {
        const dist =
          Math.sqrt(
            particle.logoX * particle.logoX + particle.logoY * particle.logoY
          ) || 1;
        x += (particle.logoX / dist) * burstStrength;
        y += (particle.logoY / dist) * burstStrength;
      }

      // Wave distortion — ripple based on distance from center
      const waveDist = Math.sqrt(
        particle.logoX * particle.logoX + particle.logoY * particle.logoY
      );
      const waveOffset = Math.sin(waveTime - waveDist * 0.015) * 4;
      z += waveOffset;

      // Rotate around X axis
      const y1 = y * cosX - z * sinX;
      const z1 = y * sinX + z * cosX;

      // Rotate around Y axis
      const x2 = x * cosY + z1 * sinY;
      const z2 = -x * sinY + z1 * cosY;

      // Rotate around Z axis (swagger)
      const x3 = x2 * cosZ - y1 * sinZ;
      const y3 = x2 * sinZ + y1 * cosZ;

      // Apply pulsing
      const pulsePhase = this.time * controls.pulseSpeed + particle.pulseOffset;
      const pulseFactor = 1 + Math.sin(pulsePhase) * controls.pulseAmplitude;

      // Perspective projection
      const perspectiveScale = focalLength / (focalLength + z2);
      const projectedX = x3 * perspectiveScale;
      const projectedY = y3 * perspectiveScale;

      particle.currentX = x3;
      particle.currentY = y3;
      particle.currentZ = z2;

      // Update sprite
      let finalX = projectedX;
      let finalY = projectedY;

      // Glitch: horizontal slice displacement + depth glitch
      if (this.glitchActive) {
        for (const slice of this.glitchSlices) {
          if (projectedY > slice.y && projectedY < slice.y + slice.height) {
            finalX += slice.offsetX;
            // Glitch the depth — shove particles forward/back in Z
            const depthGlitch = (Math.random() - 0.5) * 40;
            const glitchedScale =
              focalLength / (focalLength + z2 + depthGlitch);
            particle.sprite.scale.set(pulseFactor * glitchedScale);
            break;
          }
        }
      }

      particle.sprite.x = finalX;
      particle.sprite.y = finalY;
      particle.sprite.scale.set(pulseFactor * perspectiveScale);

      // Depth-based alpha — flash brighter during burst
      const maxDepth = controls.depthSpread + 50;
      const depthAlpha = Math.max(0.25, 1 - Math.abs(z2) / maxDepth);
      const burstGlow = 1 + burstRaw * 0.4;
      particle.currentAlpha = Math.min(
        1,
        particle.baseAlpha * depthAlpha * burstGlow
      );

      // Glitch: random particle flicker — ~6% of particles per frame
      if (Math.random() < 0.06) {
        particle.sprite.alpha = Math.random() < 0.5 ? 0 : 1;
      } else {
        particle.sprite.alpha = particle.currentAlpha;
      }

      // Sync RGB ghost dot positions
      if (redChildren[pi]) {
        redChildren[pi].x = finalX;
        redChildren[pi].y = finalY;
        redChildren[pi].scale = particle.sprite.scale;
        redChildren[pi].alpha = particle.sprite.alpha;
      }
      if (blueChildren[pi]) {
        blueChildren[pi].x = finalX;
        blueChildren[pi].y = finalY;
        blueChildren[pi].scale = particle.sprite.scale;
        blueChildren[pi].alpha = particle.sprite.alpha;
      }
    }
  }

  // --------------------------------------------------------------------------
  // Connection lines
  // --------------------------------------------------------------------------

  private updateConnections(controls: LogoParticleSphereControlValues): void {
    this.connectionsGraphics.clear();

    const connectionColor = this.hexToNumber(controls.connectionColor);
    const maxDist = controls.connectionDistance;
    const maxDistSq = maxDist * maxDist;

    // Use projected positions (sprite x/y) for connection drawing
    const len = this.particles.length;
    for (let i = 0; i < len; i++) {
      const p1 = this.particles[i];
      for (let j = i + 1; j < len; j++) {
        const p2 = this.particles[j];

        const dx = p1.sprite.x - p2.sprite.x;
        const dy = p1.sprite.y - p2.sprite.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < maxDistSq) {
          const dist = Math.sqrt(distSq);
          const alpha = ((maxDist - dist) / maxDist) * 0.3;
          this.connectionsGraphics
            .setStrokeStyle({
              width: 0.8,
              color: connectionColor,
              alpha,
            })
            .moveTo(p1.sprite.x, p1.sprite.y)
            .lineTo(p2.sprite.x, p2.sprite.y);
        }
      }
    }
    this.connectionsGraphics.stroke();
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private updateParticleColors(
    controls: LogoParticleSphereControlValues
  ): void {
    const primary = this.hexToNumber(controls.particleColor);
    const secondary = this.hexToNumber(controls.particleColorSecondary);

    this.particles.forEach((p, i) => {
      const useSecondary = i % 3 === 0;
      const color = useSecondary ? secondary : primary;
      p.color = color;
      p.sprite.clear();
      if (controls.glowSize > 0) {
        p.sprite
          .circle(0, 0, p.baseSize + controls.glowSize * 2.5)
          .fill({ color, alpha: 0.04 });
        p.sprite
          .circle(0, 0, p.baseSize + controls.glowSize * 1.5)
          .fill({ color, alpha: 0.08 });
        p.sprite
          .circle(0, 0, p.baseSize + controls.glowSize * 0.7)
          .fill({ color, alpha: 0.15 });
      }
      p.sprite.circle(0, 0, p.baseSize).fill({ color, alpha: p.currentAlpha });
      p.sprite
        .circle(0, 0, p.baseSize * 0.4)
        .fill({ color: 0xffffff, alpha: p.currentAlpha * 0.6 });
    });
  }

  private applyColorCycle(): void {
    const [primary, secondary] = NEON_PALETTES[this.colorCyclePalette];
    for (const p of this.particles) {
      p.sprite.tint = Math.random() > 0.4 ? primary : secondary;
    }
  }

  private restoreParticleColors(
    controls: LogoParticleSphereControlValues
  ): void {
    const primary = this.hexToNumber(controls.particleColor);
    const secondary = this.hexToNumber(controls.particleColorSecondary);
    for (const p of this.particles) {
      p.sprite.tint = 0xffffff; // reset tint
      p.color = Math.random() > 0.6 ? secondary : primary;
    }
  }

  private hexToNumber(hex: string | number): number {
    if (typeof hex === 'number') return hex;
    if (typeof hex === 'string') return parseInt(hex.replace('#', ''), 16);
    return 0xffffff;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createLogoParticleSphereAnimation(
  initialControls?: Partial<LogoParticleSphereControlValues>
): LogoParticleSphereAnimation {
  return new LogoParticleSphereAnimation(initialControls);
}
