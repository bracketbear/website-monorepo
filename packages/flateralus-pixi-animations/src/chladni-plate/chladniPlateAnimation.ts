import * as PIXI from 'pixi.js';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import { VERT } from '../shared/shader-harness';
import { MANIFEST, type ChladniPlateControlValues } from './manifest';
import { DISPLAY_FS, DISPLAY_UNIFORMS } from './shaders';
import { boundaryCanvas } from './masks';

type Locs = Record<string, WebGLUniformLocation | null>;

function compile(
  gl: WebGL2RenderingContext,
  type: number,
  src: string,
  tag: string
): WebGLShader | null {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error(`[chladni] ${tag}: ${gl.getShaderInfoLog(sh)}`);
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export function program(
  gl: WebGL2RenderingContext,
  frag: string,
  tag: string,
  vert: string = VERT
): WebGLProgram | null {
  const vs = compile(gl, gl.VERTEX_SHADER, vert, `${tag}.vs`);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag, `${tag}.fs`);
  if (!vs || !fs) return null;
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error(`[chladni] ${tag} link: ${gl.getProgramInfoLog(p)}`);
    return null;
  }
  return p;
}

export function locsOf(
  gl: WebGL2RenderingContext,
  p: WebGLProgram,
  names: string[]
): Locs {
  const out: Locs = {};
  for (const n of names) out[n] = gl.getUniformLocation(p, n);
  return out;
}

export function mkTexFrom(
  gl: WebGL2RenderingContext,
  src: HTMLCanvasElement
): WebGLTexture {
  const tx = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tx);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tx;
}

interface Palette {
  bg: [number, number, number];
  plate: [number, number, number];
  edge: [number, number, number];
  sand: [number, number, number];
}

const TINTS: Palette[] = [
  // Slate: a dark plate with bright sand. This is a luminance-headroom
  // decision as much as a taste one — the plate's shimmer is additive and
  // needs somewhere to climb.
  {
    bg: [0.05, 0.05, 0.06],
    plate: [0.16, 0.17, 0.2],
    edge: [0.3, 0.32, 0.36],
    sand: [0.95, 0.93, 0.86],
  },
  {
    bg: [0.07, 0.04, 0.03],
    plate: [0.2, 0.11, 0.07],
    edge: [0.45, 0.24, 0.12],
    sand: [1.0, 0.86, 0.62],
  },
  {
    bg: [0.04, 0.03, 0.03],
    plate: [0.1, 0.09, 0.09],
    edge: [0.24, 0.22, 0.21],
    sand: [1.0, 0.37, 0.12],
  },
];

export class ChladniPlateAnimation extends PixiAnimation<typeof MANIFEST> {
  protected canvas: HTMLCanvasElement | null = null;
  protected gl: WebGL2RenderingContext | null = null;
  protected dispProg: WebGLProgram | null = null;
  protected dispL: Locs = {};
  protected maskTx: WebGLTexture | null = null;
  protected maskKind = -1;
  protected failed = false;

  protected sprite: PIXI.Sprite | null = null;
  protected texture: PIXI.Texture | null = null;

  constructor(initialControls?: Partial<ChladniPlateControlValues>) {
    super(MANIFEST, initialControls);
  }

  onInit(): void {
    this.maskKind = -1;
  }

  /** Build the context and the programs. False means stop retrying. */
  protected build(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      premultipliedAlpha: true,
    });
    if (!gl) return false;
    // The plate field is a float render target. Without it there is no
    // simulation to run at all, so fail once and never retry.
    if (!gl.getExtension('EXT_color_buffer_float')) return false;

    const dispProg = program(gl, DISPLAY_FS, 'disp');
    if (!dispProg) return false;

    this.canvas = canvas;
    this.gl = gl;
    this.dispProg = dispProg;
    this.dispL = locsOf(gl, dispProg, DISPLAY_UNIFORMS);
    return true;
  }

  /**
   * (Re)upload the boundary mask when the plate shape changes.
   *
   * Deliberately not a `resetsAnimation` control: BaseAnimation.reset merges
   * the changed control with manifest DEFAULTS, so declaring it there would
   * throw away every other control the user had tuned just to change shape.
   */
  protected ensureMask(kind: number): void {
    if (kind === this.maskKind) return;
    const gl = this.gl!;
    if (this.maskTx) gl.deleteTexture(this.maskTx);
    this.maskTx = mkTexFrom(gl, boundaryCanvas(kind as 0 | 1 | 2));
    this.maskKind = kind;
  }

  /**
   * The plate's rect in screen uv: centred, square, 82% of the short edge.
   * The plate is an object in the scene, so it keeps its own proportions
   * regardless of how the stage is shaped.
   */
  protected plateRect(w: number, h: number): [number, number, number, number] {
    const s = (Math.min(w, h) * 0.82) / 2;
    return [0.5, 0.5, s / w, s / h];
  }

  onUpdate(
    app: PIXI.Application,
    controls: ChladniPlateControlValues,
    _deltaTime: number
  ): void {
    if (this.failed) return;
    if (!this.gl) {
      if (!this.build()) {
        this.failed = true;
        return;
      }
    }
    const gl = this.gl!;

    if (!this.sprite) {
      this.texture = PIXI.Texture.from(this.canvas!);
      this.sprite = new PIXI.Sprite(this.texture);
      this.getRoot().addChild(this.sprite);
    }

    const sw = app.screen.width;
    const sh = app.screen.height;
    const dpr = this.dpr ?? Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(2, Math.round(sw * dpr));
    const H = Math.max(2, Math.round(sh * dpr));
    if (this.canvas!.width !== W || this.canvas!.height !== H) {
      this.canvas!.width = W;
      this.canvas!.height = H;
      this.texture?.source.resize(W, H);
    }
    this.sprite.width = sw;
    this.sprite.height = sh;

    this.ensureMask(Number(controls.boundary));

    const pal = TINTS[Math.min(TINTS.length - 1, Number(controls.tint))];
    const rect = this.plateRect(W, H);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(this.dispProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.maskTx);
    gl.uniform1i(this.dispL.uMask!, 0);
    gl.uniform2f(this.dispL.uRes!, W, H);
    gl.uniform3fv(this.dispL.uBg!, pal.bg);
    gl.uniform3fv(this.dispL.uPlate!, pal.plate);
    gl.uniform3fv(this.dispL.uEdge!, pal.edge);
    gl.uniform4fv(this.dispL.uRect!, rect);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this.texture?.source.update();
  }

  onDestroy(): void {
    const gl = this.gl;
    if (gl) {
      if (this.maskTx) gl.deleteTexture(this.maskTx);
      if (this.dispProg) gl.deleteProgram(this.dispProg);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.maskTx = null;
    this.maskKind = -1;
    this.dispProg = null;
    this.dispL = {};
    this.gl = null;
    this.canvas = null;
    this.failed = false;
    this.sprite = null;
    this.texture?.destroy(true);
    this.texture = null;
    super.onDestroy();
  }
}

export function createChladniPlateAnimation(
  initialControls?: Partial<ChladniPlateControlValues>
): ChladniPlateAnimation {
  return new ChladniPlateAnimation(initialControls);
}
