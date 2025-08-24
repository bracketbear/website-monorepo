import {
  BaseAnimation,
  createManifest,
  type ManifestToControlValues,
} from '@bracketbear/flateralus';
import * as PIXI from 'pixi.js';

// Animation manifest
export const RETRO_GRID_MANIFEST = createManifest({
  id: 'retro-grid',
  name: 'Retro Grid',
  description: 'A retro gameboy/old Mac style grid with animated squares',
  controls: [
    {
      name: 'gridSize',
      type: 'number',
      label: 'Grid Size',
      description: 'Number of squares in the grid (both width and height)',
      min: 10,
      max: 150,
      step: 1,
      defaultValue: 20,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'squareSize',
      type: 'number',
      label: 'Square Size',
      description: 'Size of each grid square in pixels',
      min: 4,
      max: 20,
      step: 1,
      defaultValue: 8,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'gridAngle',
      type: 'number',
      label: 'Grid Angle',
      description: 'Rotation angle of the grid in degrees',
      min: -45,
      max: 45,
      step: 1,
      defaultValue: 15,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'animationSpeed',
      type: 'number',
      label: 'Animation Speed',
      description: 'Speed of the animation patterns',
      min: 0.1,
      max: 3.0,
      step: 0.1,
      defaultValue: 1.0,
      debug: true,
      resetsAnimation: false,
    },
    {
      name: 'pattern',
      type: 'select',
      label: 'Animation Pattern',
      description: 'Type of animation pattern to display',
      options: [
        { value: 'wave', label: 'Wave' },
        { value: 'ripple', label: 'Ripple' },
        { value: 'random', label: 'Random' },
        { value: 'scanline', label: 'Scanline' },
        { value: 'checkerboard', label: 'Checkerboard' },
        { value: 'spiral', label: 'Spiral' },
      ],
      defaultValue: 'wave',
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'squareColor',
      type: 'color',
      label: 'Square Color',
      description: 'Color of the grid squares',
      defaultValue: '#ff69b4',
      debug: true,
      resetsAnimation: false,
    },
    {
      name: 'gap',
      type: 'number',
      label: 'Grid Gap',
      description: 'Space between grid squares in pixels',
      min: 0,
      max: 20,
      step: 1,
      defaultValue: 0,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'skewX',
      type: 'number',
      label: 'Skew X',
      description: 'Horizontal skew of the grid in degrees',
      min: -45,
      max: 45,
      step: 1,
      defaultValue: 0,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'skewY',
      type: 'number',
      label: 'Skew Y',
      description: 'Vertical skew of the grid in degrees',
      min: -45,
      max: 45,
      step: 1,
      defaultValue: 0,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'perspectiveX',
      type: 'number',
      label: 'Perspective X',
      description: 'Horizontal perspective distortion (looking up/down)',
      min: -0.5,
      max: 0.5,
      step: 0.01,
      defaultValue: 0,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'perspectiveY',
      type: 'number',
      label: 'Perspective Y',
      description: 'Vertical perspective distortion (looking left/right)',
      min: -0.5,
      max: 0.5,
      step: 0.01,
      defaultValue: 0,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'particleShape',
      type: 'select',
      label: 'Particle Shape',
      description: 'Shape of individual grid particles',
      options: [
        { value: 'square', label: 'Square' },
        { value: 'circle', label: 'Circle' },
        { value: 'diamond', label: 'Diamond' },
        { value: 'triangle', label: 'Triangle' },
        { value: 'cross', label: 'Cross' },
      ],
      defaultValue: 'square',
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'cornerRoundness',
      type: 'number',
      label: 'Corner Roundness',
      description: 'Roundness of square corners (0 = sharp, 1 = fully rounded)',
      min: 0,
      max: 1,
      step: 0.1,
      defaultValue: 0,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'showGridLines',
      type: 'boolean',
      label: 'Show Grid Lines',
      description: 'Display grid lines between squares',
      defaultValue: true,
      debug: true,
      resetsAnimation: false,
    },
    {
      name: 'gridLineColor',
      type: 'color',
      label: 'Grid Line Color',
      description: 'Color of the grid lines',
      defaultValue: '#ff1493',
      debug: true,
      resetsAnimation: false,
    },
    {
      name: 'opacity',
      type: 'number',
      label: 'Opacity',
      description: 'Overall opacity of the grid',
      min: 0.1,
      max: 1.0,
      step: 0.1,
      defaultValue: 0.8,
      debug: true,
      resetsAnimation: false,
    },
    {
      name: 'waveAmplitude',
      type: 'number',
      label: 'Wave Amplitude',
      description: 'Height of the wave pattern',
      min: 0,
      max: 1,
      step: 0.1,
      defaultValue: 0.5,
      debug: true,
      resetsAnimation: false,
    },
    {
      name: 'waveFrequency',
      type: 'number',
      label: 'Wave Frequency',
      description: 'Frequency of the wave pattern',
      min: 0.1,
      max: 2.0,
      step: 0.1,
      defaultValue: 0.8,
      debug: true,
      resetsAnimation: false,
    },
    {
      name: 'rippleSpeed',
      type: 'number',
      label: 'Ripple Speed',
      description: 'Speed of ripple effect',
      min: 0.1,
      max: 3.0,
      step: 0.1,
      defaultValue: 1.5,
      debug: true,
      resetsAnimation: false,
    },
    {
      name: 'scanlineSpeed',
      type: 'number',
      label: 'Scanline Speed',
      description: 'Speed of scanline effect',
      min: 0.1,
      max: 5.0,
      step: 0.1,
      defaultValue: 2.0,
      debug: true,
      resetsAnimation: false,
    },
  ],
});

type RetroGridControlValues = ManifestToControlValues<
  typeof RETRO_GRID_MANIFEST
>;

interface GridSquare {
  sprite: PIXI.Graphics;
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  targetAlpha: number;
  currentAlpha: number;
  animationOffset: number;
  shape: string; // Store the original shape for each particle
}

export class RetroGridAnimation extends BaseAnimation<
  typeof RETRO_GRID_MANIFEST,
  RetroGridControlValues
> {
  private squares: GridSquare[] = [];
  private gridContainer!: PIXI.Container;
  private gridLinesContainer!: PIXI.Container;
  private time: number = 0;
  private gridWidth: number = 0;
  private gridHeight: number = 0;

  constructor(initialControls?: Partial<RetroGridControlValues>) {
    super(RETRO_GRID_MANIFEST, initialControls);
  }

  onInit(context: PIXI.Application, controls: RetroGridControlValues): void {
    this.gridContainer = new PIXI.Container();
    this.gridLinesContainer = new PIXI.Container();

    context.stage.addChild(this.gridContainer);
    context.stage.addChild(this.gridLinesContainer);

    this.createGrid(context, controls);
    this.setupGridRotation(controls);

    // Center the grid on the stage
    this.updateGridPosition(context);

    // Handle resize events
    context.renderer.on('resize', () => {
      // Recreate grid with new stage dimensions
      this.recreateGridForResize(context, controls);
    });
  }

  onUpdate(
    context: PIXI.Application,
    controls: RetroGridControlValues,
    deltaTime: number
  ): void {
    this.time += deltaTime * controls.animationSpeed;

    // Update grid pattern based on selected pattern
    switch (controls.pattern) {
      case 'wave':
        this.updateWavePattern(controls);
        break;
      case 'ripple':
        this.updateRipplePattern(controls);
        break;
      case 'random':
        this.updateRandomPattern(controls);
        break;
      case 'scanline':
        this.updateScanlinePattern(controls);
        break;
      case 'checkerboard':
        this.updateCheckerboardPattern(controls);
        break;
      case 'spiral':
        this.updateSpiralPattern(controls);
        break;
    }

    // Update square animations
    this.updateSquares(controls, deltaTime);
  }

  onDestroy(): void {
    if (this.gridContainer && this.gridContainer.parent) {
      this.gridContainer.parent.removeChild(this.gridContainer);
    }
    if (this.gridLinesContainer && this.gridLinesContainer.parent) {
      this.gridLinesContainer.parent.removeChild(this.gridLinesContainer);
    }

    this.squares.forEach((square) => {
      if (square.sprite && square.sprite.parent) {
        square.sprite.parent.removeChild(square.sprite);
      }
    });

    this.squares = [];
  }

  protected onReset(
    context: PIXI.Application,
    controls: RetroGridControlValues
  ): void {
    console.log('🔄 RetroGrid: onReset called - recreating entire grid');

    // Clear existing grid
    this.gridContainer.removeChildren();
    this.gridLinesContainer.removeChildren();
    this.squares = [];

    // Recreate grid with new controls
    this.createGrid(context, controls);
    this.setupGridRotation(controls);
    this.updateGridPosition(context);

    console.log('✅ RetroGrid: Grid reset complete');
  }

  protected onDynamicControlsChange(
    controls: RetroGridControlValues,
    previousControls: RetroGridControlValues,
    changedControls: string[]
  ): void {
    console.log('🎛️ RetroGrid: Dynamic controls changed:', changedControls);

    // Only handle controls that don't reset the animation
    // Controls with resetsAnimation: true are handled by onReset

    if (changedControls.includes('squareColor')) {
      this.updateSquareColors(controls.squareColor);
    }

    if (changedControls.includes('opacity')) {
      this.updateOpacity(controls.opacity);
    }

    if (changedControls.includes('gridLineColor')) {
      this.updateGridLineColors(controls.gridLineColor);
    }

    if (changedControls.includes('showGridLines')) {
      this.toggleGridLines(controls.showGridLines);
    }

    // Handle animation pattern parameters that don't reset the grid
    if (
      changedControls.includes('waveAmplitude') ||
      changedControls.includes('waveFrequency') ||
      changedControls.includes('rippleSpeed') ||
      changedControls.includes('scanlineSpeed')
    ) {
      // These controls only affect animation timing, no need to redraw
      return;
    }
  }

  private createGrid(
    context: PIXI.Application,
    controls: RetroGridControlValues
  ): void {
    this.gridWidth = controls.gridSize;
    this.gridHeight = controls.gridSize;

    // Calculate square size to ensure grid always covers the stage, even with rotation and skew
    const stageWidth = context.screen.width;
    const stageHeight = context.screen.height;

    // Calculate the diagonal of the stage to ensure coverage for any rotation
    const stageDiagonal = Math.sqrt(
      stageWidth * stageWidth + stageHeight * stageHeight
    );

    // Account for gaps between squares
    const totalGapX = (this.gridWidth - 1) * controls.gap;
    const totalGapY = (this.gridHeight - 1) * controls.gap;

    // Calculate required square size based on the stage diagonal
    // This ensures the grid covers the entire visible area even when rotated
    const requiredSquareSize =
      (stageDiagonal + Math.max(totalGapX, totalGapY) + 100) /
      Math.min(this.gridWidth, this.gridHeight);

    // Use the larger of the required size or user's preferred size
    const squareSize = Math.max(
      controls.squareSize,
      Math.ceil(requiredSquareSize)
    );

    // Recalculate gaps and positioning with final square size
    const finalTotalGapX = (this.gridWidth - 1) * controls.gap;
    const finalTotalGapY = (this.gridHeight - 1) * controls.gap;
    const startX = -(this.gridWidth * squareSize + finalTotalGapX) / 2;
    const startY = -(this.gridHeight * squareSize + finalTotalGapY) / 2;

    // Create grid particles
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const particle = new PIXI.Graphics();

        // Draw different shapes based on selection
        this.drawParticleShape(
          particle,
          controls.particleShape,
          squareSize,
          controls.squareColor
        );

        particle.x = startX + x * (squareSize + controls.gap);
        particle.y = startY + y * (squareSize + controls.gap);
        particle.alpha = controls.opacity;

        this.gridContainer.addChild(particle);

        this.squares.push({
          sprite: particle,
          x,
          y,
          size: squareSize,
          baseAlpha: controls.opacity,
          targetAlpha: controls.opacity,
          currentAlpha: controls.opacity,
          animationOffset: Math.random() * Math.PI * 2,
          shape: controls.particleShape, // Store the shape used for this particle
        });
      }
    }

    // Create grid lines
    if (controls.showGridLines) {
      this.createGridLines(controls, startX, startY, squareSize);
    }
  }

  private createGridLines(
    controls: RetroGridControlValues,
    startX: number,
    startY: number,
    squareSize: number
  ): void {
    const lineColor = this.hexToNumber(controls.gridLineColor);

    // Vertical lines
    for (let x = 0; x <= this.gridWidth; x++) {
      const line = new PIXI.Graphics();
      line
        .setStrokeStyle({ width: 1, color: lineColor, alpha: 0.3 })
        .moveTo(0, 0)
        .lineTo(
          0,
          this.gridHeight * (squareSize + controls.gap) - controls.gap
        );
      line.x = startX + x * (squareSize + controls.gap);
      line.y = startY;
      this.gridLinesContainer.addChild(line);
    }

    // Horizontal lines
    for (let y = 0; y <= this.gridHeight; y++) {
      const line = new PIXI.Graphics();
      line
        .setStrokeStyle({ width: 1, color: lineColor, alpha: 0.3 })
        .moveTo(0, 0)
        .lineTo(this.gridWidth * (squareSize + controls.gap) - controls.gap, 0);
      line.x = startX;
      line.y = startY + y * (squareSize + controls.gap);
      this.gridLinesContainer.addChild(line);
    }
  }

  private setupGridRotation(controls: RetroGridControlValues): void {
    // Apply rotation
    this.gridContainer.rotation = (controls.gridAngle * Math.PI) / 180;
    this.gridLinesContainer.rotation = (controls.gridAngle * Math.PI) / 180;

    // Apply skew
    this.gridContainer.skew.x = (controls.skewX * Math.PI) / 180;
    this.gridContainer.skew.y = (controls.skewY * Math.PI) / 180;
    this.gridLinesContainer.skew.x = (controls.skewX * Math.PI) / 180;
    this.gridLinesContainer.skew.y = (controls.skewY * Math.PI) / 180;

    // Apply perspective distortion using matrix transformation
    this.applyPerspective(controls);
  }

  private applyPerspective(controls: RetroGridControlValues): void {
    // Apply perspective distortion using scale and skew
    // perspectiveX creates the "looking up/down" effect
    // perspectiveY creates the "looking left/right" effect

    // Horizontal perspective (looking up/down)
    if (controls.perspectiveX !== 0) {
      this.gridContainer.scale.x = 1 + controls.perspectiveX;
      this.gridLinesContainer.scale.x = 1 + controls.perspectiveX;
    }

    // Vertical perspective (looking left/right)
    if (controls.perspectiveY !== 0) {
      this.gridContainer.scale.y = 1 + controls.perspectiveY;
      this.gridLinesContainer.scale.y = 1 + controls.perspectiveY;
    }
  }

  private drawParticleShape(
    graphics: PIXI.Graphics,
    shape: string,
    size: number,
    color: string
  ): void {
    const colorNumber = this.hexToNumber(color);
    const halfSize = size / 2;
    const controls = this.getControlValues();

    switch (shape) {
      case 'square':
        if (controls.cornerRoundness > 0) {
          // Draw rounded rectangle
          const radius = size * controls.cornerRoundness * 0.5;
          graphics
            .roundRect(0, 0, size, size, radius)
            .fill({ color: colorNumber });
        } else {
          // Draw sharp square
          graphics.rect(0, 0, size, size).fill({ color: colorNumber });
        }
        break;

      case 'circle':
        graphics
          .circle(halfSize, halfSize, halfSize)
          .fill({ color: colorNumber });
        break;

      case 'diamond':
        graphics
          .moveTo(halfSize, 0)
          .lineTo(size, halfSize)
          .lineTo(halfSize, size)
          .lineTo(0, halfSize)
          .closePath()
          .fill({ color: colorNumber });
        break;

      case 'triangle':
        graphics
          .moveTo(halfSize, 0)
          .lineTo(size, size)
          .lineTo(0, size)
          .closePath()
          .fill({ color: colorNumber });
        break;

      case 'cross':
        const crossWidth = size * 0.3;
        const crossCenter = size / 2;
        graphics
          .rect(crossCenter - crossWidth / 2, 0, crossWidth, size)
          .rect(0, crossCenter - crossWidth / 2, size, crossWidth)
          .fill({ color: colorNumber });
        break;

      default:
        // Fallback to square
        graphics.rect(0, 0, size, size).fill({ color: colorNumber });
        break;
    }
  }

  private updateWavePattern(controls: RetroGridControlValues): void {
    this.squares.forEach((square) => {
      const x = square.x / controls.squareSize;
      const y = square.y / controls.squareSize;

      const wave =
        Math.sin(x * controls.waveFrequency + this.time) *
        controls.waveAmplitude;
      const wave2 =
        Math.cos(y * controls.waveFrequency * 0.7 + this.time * 0.8) *
        controls.waveAmplitude *
        0.5;

      square.targetAlpha =
        controls.opacity * (0.3 + (0.7 * (wave + wave2 + 1)) / 2);
    });
  }

  private updateRipplePattern(controls: RetroGridControlValues): void {
    const centerX = this.gridWidth / 2;
    const centerY = this.gridHeight / 2;

    this.squares.forEach((square) => {
      const dx = square.x - centerX;
      const dy = square.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const ripple =
        Math.sin(distance * 0.2 - this.time * controls.rippleSpeed) *
        controls.waveAmplitude;
      square.targetAlpha = controls.opacity * (0.2 + (0.8 * (ripple + 1)) / 2);
    });
  }

  private updateRandomPattern(controls: RetroGridControlValues): void {
    this.squares.forEach((square) => {
      const random =
        Math.sin(this.time * 0.5 + square.animationOffset) * 0.5 + 0.5;
      square.targetAlpha = controls.opacity * (0.1 + 0.9 * random);
    });
  }

  private updateScanlinePattern(controls: RetroGridControlValues): void {
    this.squares.forEach((square) => {
      const scanline =
        Math.sin(square.y * 0.1 + this.time * controls.scanlineSpeed) * 0.5 +
        0.5;
      square.targetAlpha = controls.opacity * (0.1 + 0.9 * scanline);
    });
  }

  private updateCheckerboardPattern(controls: RetroGridControlValues): void {
    this.squares.forEach((square) => {
      const checker =
        (Math.floor(square.x / controls.squareSize) +
          Math.floor(square.y / controls.squareSize)) %
        2;
      const pulse = Math.sin(this.time * 2) * 0.3 + 0.7;
      square.targetAlpha = controls.opacity * (checker ? pulse : 1 - pulse);
    });
  }

  private updateSpiralPattern(controls: RetroGridControlValues): void {
    const centerX = this.gridWidth / 2;
    const centerY = this.gridHeight / 2;

    this.squares.forEach((square) => {
      const dx = square.x - centerX;
      const dy = square.y - centerY;
      const angle = Math.atan2(dy, dx);
      const distance = Math.sqrt(dx * dx + dy * dy);

      const spiral =
        Math.sin(angle * 3 + distance * 0.1 - this.time) *
        controls.waveAmplitude;
      square.targetAlpha = controls.opacity * (0.2 + (0.8 * (spiral + 1)) / 2);
    });
  }

  private updateSquares(
    controls: RetroGridControlValues,
    deltaTime: number
  ): void {
    this.squares.forEach((square) => {
      // Smooth alpha transition
      square.currentAlpha +=
        (square.targetAlpha - square.currentAlpha) * deltaTime * 3;
      square.sprite.alpha = square.currentAlpha;
    });
  }

  private updateSquareColors(color: string): void {
    console.log('🎨 RetroGrid: Updating square colors to', color);
    this.squares.forEach((square) => {
      square.sprite.clear();
      // Redraw the particle with its original shape but new color
      // This prevents conflicts when particleShape control changes
      this.drawParticleShape(
        square.sprite,
        square.shape, // Use the stored shape, not current controls
        square.size,
        color
      );
    });
    console.log('✅ RetroGrid: Color update complete');
  }

  private updateOpacity(opacity: number): void {
    this.squares.forEach((square) => {
      square.baseAlpha = opacity;
      square.targetAlpha = opacity;
    });
  }

  private updateGridLineColors(color: string): void {
    const colorNumber = this.hexToNumber(color);
    this.gridLinesContainer.children.forEach((line) => {
      if (line instanceof PIXI.Graphics) {
        // Store the line dimensions before clearing
        const isHorizontal = line.width > line.height;
        const lineLength = isHorizontal ? line.width : line.height;

        line.clear();

        // Redraw the line
        if (isHorizontal) {
          // Horizontal line
          line
            .setStrokeStyle({ width: 1, color: colorNumber, alpha: 0.3 })
            .moveTo(0, 0)
            .lineTo(lineLength, 0);
        } else {
          // Vertical line
          line
            .setStrokeStyle({ width: 1, color: colorNumber, alpha: 0.3 })
            .moveTo(0, 0)
            .lineTo(0, lineLength);
        }
      }
    });
  }

  private toggleGridLines(show: boolean): void {
    this.gridLinesContainer.visible = show;
  }

  private updateGridPosition(context: PIXI.Application): void {
    this.gridContainer.x = context.screen.width / 2;
    this.gridContainer.y = context.screen.height / 2;
    this.gridLinesContainer.x = context.screen.width / 2;
    this.gridLinesContainer.y = context.screen.height / 2;
  }

  private recreateGridForResize(
    context: PIXI.Application,
    controls: RetroGridControlValues
  ): void {
    // Clear existing grid
    this.gridContainer.removeChildren();
    this.gridLinesContainer.removeChildren();
    this.squares = [];

    // Recreate grid with new stage dimensions
    this.createGrid(context, controls);
    this.setupGridRotation(controls);
    this.updateGridPosition(context);
  }

  private hexToNumber(hex: string): number {
    return parseInt(hex.replace('#', ''), 16);
  }
}

export function createRetroGridAnimation(
  initialControls?: Partial<RetroGridControlValues>
): RetroGridAnimation {
  return new RetroGridAnimation(initialControls);
}
