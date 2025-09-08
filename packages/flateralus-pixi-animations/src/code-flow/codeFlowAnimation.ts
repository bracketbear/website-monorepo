import {
  BaseAnimation,
  createManifest,
  type ManifestToControlValues,
} from '@bracketbear/flateralus';
import * as PIXI from 'pixi.js';

// ============================================================================
// ANIMATION CONSTANTS
// ============================================================================

const CODE_LINE_COUNT = 8;
const CODE_LINE_SPEED = 0.5;
const CODE_LINE_SPACING = 80;
const _CODE_LINE_LENGTH = 200;
const _CODE_LINE_HEIGHT = 20;

// Sample code snippets for different programming languages
const CODE_SNIPPETS = {
  javascript: [
    'const user = await fetchUser(id);',
    'function calculateTotal(items) {',
    '  return items.reduce((sum, item) => sum + item.price, 0);',
    '}',
    'const isValid = email.includes("@");',
    'const config = { apiUrl: process.env.API_URL };',
    'export default class UserService {',
    '  async getUser(id) { return await db.findUser(id); }',
    '}',
  ],
  typescript: [
    'interface User { id: number; name: string; }',
    'const users: User[] = await fetchUsers();',
    'type Status = "loading" | "success" | "error";',
    'function validate<T>(data: T): boolean {',
    '  return data !== null && data !== undefined;',
    '}',
    'export const API_ENDPOINTS = {',
    '  users: "/api/users",',
    '  posts: "/api/posts"',
    '} as const;',
  ],
  python: [
    'def calculate_fibonacci(n: int) -> int:',
    '    if n <= 1: return n',
    '    return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)',
    'class DataProcessor:',
    '    def __init__(self, config: dict):',
    '        self.config = config',
    '    async def process(self, data: list) -> dict:',
    '        return {"processed": len(data)}',
  ],
  rust: [
    'fn main() {',
    '    let mut vec = Vec::new();',
    '    vec.push(42);',
    '    println!("{:?}", vec);',
    '}',
    'struct User {',
    '    id: u32,',
    '    name: String,',
    '}',
    'impl User {',
    '    fn new(id: u32, name: String) -> Self {',
    '        Self { id, name }',
    '    }',
  ],
};

// ============================================================================
// CODE LINE INTERFACE
// ============================================================================

interface CodeLine {
  text: PIXI.Text;
  x: number;
  y: number;
  speed: number;
  language: keyof typeof CODE_SNIPPETS;
  snippet: string;
  opacity: number;
  targetOpacity: number;
  glowGraphics?: PIXI.Graphics;
}

// ============================================================================
// ANIMATION MANIFEST
// ============================================================================

export const CODE_FLOW_MANIFEST = createManifest({
  id: 'code-flow',
  name: 'Code Flow',
  description:
    'Animated lines of code flowing across the screen like data streams',
  controls: [
    {
      name: 'lineCount',
      type: 'number',
      label: 'Line Count',
      description: 'Number of code lines flowing simultaneously',
      min: 3,
      max: 15,
      step: 1,
      defaultValue: CODE_LINE_COUNT,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'flowSpeed',
      type: 'number',
      label: 'Flow Speed',
      description: 'Speed of code lines moving across screen',
      min: 0.1,
      max: 2.0,
      step: 0.1,
      defaultValue: CODE_LINE_SPEED,
      debug: true,
    },
    {
      name: 'lineSpacing',
      type: 'number',
      label: 'Line Spacing',
      description: 'Vertical spacing between code lines',
      min: 40,
      max: 120,
      step: 5,
      defaultValue: CODE_LINE_SPACING,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'fontSize',
      type: 'number',
      label: 'Font Size',
      description: 'Size of the code text',
      min: 12,
      max: 24,
      step: 1,
      defaultValue: 16,
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'language',
      type: 'select',
      label: 'Programming Language',
      description: 'Language for code snippets',
      options: [
        { value: 'javascript', label: 'JavaScript' },
        { value: 'typescript', label: 'TypeScript' },
        { value: 'python', label: 'Python' },
        { value: 'rust', label: 'Rust' },
      ],
      defaultValue: 'typescript',
      debug: true,
      resetsAnimation: true,
    },
    {
      name: 'textColor',
      type: 'color',
      label: 'Text Color',
      description: 'Color of the code text',
      defaultValue: '#00ff88',
      debug: true,
    },
    {
      name: 'backgroundColor',
      type: 'color',
      label: 'Background Color',
      description: 'Background color for code lines',
      defaultValue: '#001122',
      debug: true,
    },
    {
      name: 'opacity',
      type: 'number',
      label: 'Opacity',
      description: 'Overall opacity of code lines',
      min: 0.1,
      max: 1.0,
      step: 0.1,
      defaultValue: 0.8,
      debug: true,
    },
    {
      name: 'showGlow',
      type: 'boolean',
      label: 'Show Glow Effect',
      description: 'Add a subtle glow around code lines',
      defaultValue: true,
      debug: true,
    },
    {
      name: 'glowColor',
      type: 'color',
      label: 'Glow Color',
      description: 'Color of the glow effect',
      defaultValue: '#00ff88',
      debug: true,
    },
    {
      name: 'glowIntensity',
      type: 'number',
      label: 'Glow Intensity',
      description: 'Intensity of the glow effect',
      min: 0.1,
      max: 1.0,
      step: 0.1,
      defaultValue: 0.3,
      debug: true,
    },
    {
      name: 'direction',
      type: 'select',
      label: 'Flow Direction',
      description: 'Direction of code flow',
      options: [
        { value: 'right', label: 'Right to Left' },
        { value: 'left', label: 'Left to Right' },
        { value: 'alternating', label: 'Alternating' },
      ],
      defaultValue: 'right',
      debug: true,
    },
    {
      name: 'fadeInOut',
      type: 'boolean',
      label: 'Fade In/Out',
      description: 'Fade code lines in and out as they enter/exit',
      defaultValue: true,
      debug: true,
    },
  ],
});

type CodeFlowControlValues = ManifestToControlValues<typeof CODE_FLOW_MANIFEST>;

// ============================================================================
// CODE FLOW ANIMATION CLASS
// ============================================================================

export class CodeFlowAnimation extends BaseAnimation<
  typeof CODE_FLOW_MANIFEST,
  CodeFlowControlValues
> {
  private codeLines: CodeLine[] = [];
  private container!: PIXI.Container;
  private time: number = 0;

  constructor(initialControls?: Partial<CodeFlowControlValues>) {
    super(CODE_FLOW_MANIFEST, initialControls);
  }

  onInit(context: PIXI.Application, controls: CodeFlowControlValues): void {
    this.container = new PIXI.Container();
    context.stage.addChild(this.container);

    this.createCodeLines(context, controls);
  }

  onUpdate(
    context: PIXI.Application,
    controls: CodeFlowControlValues,
    deltaTime: number
  ): void {
    this.time += deltaTime;

    this.updateCodeLines(context, controls, deltaTime);
  }

  onDestroy(): void {
    if (this.container && this.container.parent) {
      this.container.parent.removeChild(this.container);
    }

    this.codeLines.forEach((line) => {
      if (line.text && line.text.parent) {
        line.text.parent.removeChild(line.text);
      }
      if (line.glowGraphics && line.glowGraphics.parent) {
        line.glowGraphics.parent.removeChild(line.glowGraphics);
      }
    });

    this.codeLines = [];
  }

  protected onReset(
    context: PIXI.Application,
    controls: CodeFlowControlValues
  ): void {
    // Clear existing code lines
    this.container.removeChildren();
    this.codeLines = [];

    // Recreate code lines with new controls
    this.createCodeLines(context, controls);
  }

  protected onDynamicControlsChange(
    controls: CodeFlowControlValues,
    previousControls: CodeFlowControlValues,
    changedControls: string[]
  ): void {
    // Update text colors
    if (changedControls.includes('textColor')) {
      this.updateTextColors(controls.textColor);
    }

    // Update background colors
    if (changedControls.includes('backgroundColor')) {
      this.updateBackgroundColors(controls.backgroundColor);
    }

    // Update glow effects
    if (
      changedControls.includes('glowColor') ||
      changedControls.includes('glowIntensity')
    ) {
      this.updateGlowEffects(controls);
    }

    // Update opacity
    if (changedControls.includes('opacity')) {
      this.updateOpacity(controls.opacity);
    }
  }

  private createCodeLines(
    context: PIXI.Application,
    controls: CodeFlowControlValues
  ): void {
    const snippets = CODE_SNIPPETS[controls.language];
    const stageWidth = context.screen.width;
    const stageHeight = context.screen.height;

    for (let i = 0; i < controls.lineCount; i++) {
      const snippet = snippets[i % snippets.length];
      const y =
        stageHeight / 2 -
        ((controls.lineCount - 1) * controls.lineSpacing) / 2 +
        i * controls.lineSpacing;

      // Create text
      const text = new PIXI.Text({
        text: snippet,
        style: {
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
          fontSize: controls.fontSize,
          fill: this.hexToNumber(controls.textColor),
          align: 'left',
        },
      });

      // Create background rectangle
      const background = new PIXI.Graphics();
      background.roundRect(-5, -2, text.width + 10, text.height + 4, 4).fill({
        color: this.hexToNumber(controls.backgroundColor),
        alpha: 0.3,
      });

      // Create glow effect if enabled
      let glowGraphics: PIXI.Graphics | undefined;
      if (controls.showGlow) {
        glowGraphics = new PIXI.Graphics();
        glowGraphics
          .roundRect(-8, -5, text.width + 16, text.height + 10, 6)
          .fill({
            color: this.hexToNumber(controls.glowColor),
            alpha: controls.glowIntensity * 0.3,
          });
      }

      // Create container for this code line
      const lineContainer = new PIXI.Container();

      if (glowGraphics) {
        lineContainer.addChild(glowGraphics);
      }
      lineContainer.addChild(background);
      lineContainer.addChild(text);

      // Position based on direction
      let x: number;
      let speed: number;

      switch (controls.direction) {
        case 'right':
          x = stageWidth + 100;
          speed = -controls.flowSpeed;
          break;
        case 'left':
          x = -text.width - 100;
          speed = controls.flowSpeed;
          break;
        case 'alternating':
          x = i % 2 === 0 ? stageWidth + 100 : -text.width - 100;
          speed = i % 2 === 0 ? -controls.flowSpeed : controls.flowSpeed;
          break;
        default:
          x = stageWidth + 100;
          speed = -controls.flowSpeed;
      }

      lineContainer.x = x;
      lineContainer.y = y;

      this.container.addChild(lineContainer);

      this.codeLines.push({
        text,
        x,
        y,
        speed,
        language: controls.language,
        snippet,
        opacity: controls.opacity,
        targetOpacity: controls.opacity,
        glowGraphics,
      });
    }
  }

  private updateCodeLines(
    context: PIXI.Application,
    controls: CodeFlowControlValues,
    deltaTime: number
  ): void {
    const stageWidth = context.screen.width;

    this.codeLines.forEach((line, _index) => {
      // Update position
      line.x += line.speed * deltaTime * 60; // 60fps normalization

      // Update container position
      const container = line.text.parent as PIXI.Container;
      container.x = line.x;

      // Handle fade in/out
      if (controls.fadeInOut) {
        const fadeDistance = 200;

        // Fade in from edges
        if (line.speed < 0) {
          // Moving right to left
          if (line.x > stageWidth - fadeDistance) {
            line.targetOpacity =
              controls.opacity * ((stageWidth - line.x) / fadeDistance);
          } else if (line.x < fadeDistance) {
            line.targetOpacity = controls.opacity * (line.x / fadeDistance);
          } else {
            line.targetOpacity = controls.opacity;
          }
        } else {
          // Moving left to right
          if (line.x < fadeDistance) {
            line.targetOpacity = controls.opacity * (line.x / fadeDistance);
          } else if (line.x > stageWidth - fadeDistance) {
            line.targetOpacity =
              controls.opacity * ((stageWidth - line.x) / fadeDistance);
          } else {
            line.targetOpacity = controls.opacity;
          }
        }
      } else {
        line.targetOpacity = controls.opacity;
      }

      // Smooth opacity transition
      line.opacity += (line.targetOpacity - line.opacity) * deltaTime * 5;
      container.alpha = line.opacity;

      // Reset position when off screen
      if (line.speed < 0 && line.x < -line.text.width - 100) {
        line.x = stageWidth + 100;
        line.opacity = 0;
      } else if (line.speed > 0 && line.x > stageWidth + 100) {
        line.x = -line.text.width - 100;
        line.opacity = 0;
      }
    });
  }

  private updateTextColors(color: string | number): void {
    const colorNumber = this.hexToNumber(color);
    this.codeLines.forEach((line) => {
      line.text.style.fill = colorNumber;
    });
  }

  private updateBackgroundColors(color: string | number): void {
    const colorNumber = this.hexToNumber(color);
    this.codeLines.forEach((line) => {
      const container = line.text.parent as PIXI.Container;
      // Find the background graphics by looking for a Graphics object that's not the glow
      const background = container.children.find(
        (child) => child instanceof PIXI.Graphics && child !== line.glowGraphics
      ) as PIXI.Graphics;

      if (background) {
        background.clear();
        background
          .roundRect(-5, -2, line.text.width + 10, line.text.height + 4, 4)
          .fill({ color: colorNumber, alpha: 0.3 });
      }
    });
  }

  private updateGlowEffects(controls: CodeFlowControlValues): void {
    this.codeLines.forEach((line) => {
      if (line.glowGraphics && controls.showGlow) {
        line.glowGraphics.clear();
        line.glowGraphics
          .roundRect(-8, -5, line.text.width + 16, line.text.height + 10, 6)
          .fill({
            color: this.hexToNumber(controls.glowColor),
            alpha: controls.glowIntensity * 0.3,
          });
      }
    });
  }

  private updateOpacity(opacity: number): void {
    this.codeLines.forEach((line) => {
      line.targetOpacity = opacity;
    });
  }

  private hexToNumber(hex: string | number): number {
    if (typeof hex === 'number') {
      return hex;
    }
    if (typeof hex === 'string') {
      return parseInt(hex.replace('#', ''), 16);
    }
    return 0xffffff;
  }
}

export function createCodeFlowAnimation(
  initialControls?: Partial<CodeFlowControlValues>
): CodeFlowAnimation {
  return new CodeFlowAnimation(initialControls);
}
