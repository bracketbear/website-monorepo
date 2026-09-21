import { logoMask, LOGO_VIEWBOX } from './logo';

/** The mark's aspect, the shape every mask-driven effect was tuned around. */
const LOGO_ASPECT = LOGO_VIEWBOX.w / LOGO_VIEWBOX.h;

export { logoMask };

/**
 * Shared WebGL2 harness for the shader animations.
 *
 * Each effect owns an offscreen webgl2 canvas drawn with a fullscreen
 * triangle generated from gl_VertexID (no buffers), then blitted into PIXI
 * as a Sprite over a Texture wrapping that canvas. Palette uniforms are
 * pushed from PAL every frame, which is why a theme switch reaches shaders
 * as well as scene-graph animations.
 */

/** Fullscreen triangle with no vertex buffer. */
export const VERT = `#version 300 es
    out vec2 vUV;
    void main() {
      vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
      vUV = p;
      gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
    }`;

/**
 * Fragment prelude: the noise kit, the mask sampler, and the grain and
 * vignette finisher every effect ends with.
 */
export const PRE = `#version 300 es
    precision highp float;
    in vec2 vUV;
    out vec4 fragColor;
    uniform sampler2D uTex;
    uniform float uTime;
    uniform vec2 uRes;
    uniform vec4 uRect;
    uniform float uGrain;
    uniform float uStage;
    uniform vec3 uInk;
    uniform vec3 uOrange;
    uniform vec3 uSun;
    uniform vec3 uCream;
    float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float vnoise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
                 mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.03 + vec2(17.0, 9.2); a *= 0.5; }
      return v;
    }
    float maskA(vec2 uv) {
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
      return texture(uTex, uv).a;
    }
    vec3 finish(vec3 col, vec2 uvS, vec2 p) {
      col += (hash21(floor(p * 0.9) + vec2(fract(uTime * 7.0) * 13.0)) - 0.5) * 0.05 * uGrain;
      vec2 c = uvS * 2.0 - 1.0;
      return col * (0.9 + 0.1 * smoothstep(1.7, 0.3, dot(c, c)));
    }
  `;

export const COMMON_UNIFORMS = [
  'uTex',
  'uTime',
  'uRes',
  'uRect',
  'uGrain',
  'uStage',
  'uInk',
  'uOrange',
  'uSun',
  'uCream',
] as const;

export interface ShaderContext {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  locs: Record<string, WebGLUniformLocation | null>;
  texture: WebGLTexture | null;
  texWidth: number;
  texHeight: number;
}

/** Split an integer color into normalized RGB. */
function rgb(hex: number): [number, number, number] {
  return [
    ((hex >> 16) & 255) / 255,
    ((hex >> 8) & 255) / 255,
    (hex & 255) / 255,
  ];
}

export function setColor(
  gl: WebGL2RenderingContext,
  loc: WebGLUniformLocation | null,
  hex: number
): void {
  const c = rgb(hex);
  gl.uniform3f(loc, c[0], c[1], c[2]);
}

export function compile(
  gl: WebGL2RenderingContext,
  type: number,
  src: string
): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('shader:', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

/**
 * Build the offscreen GL context for one effect. Returns null if WebGL2 is
 * unavailable or the program fails to build, and the caller is expected to
 * stop trying rather than retry every frame.
 */
export function createShaderContext(
  frag: string,
  extraUniforms: readonly string[],
  /** Null for effects that sample no mask, such as the toys. */
  maskCanvas: HTMLCanvasElement | null,
  commonUniforms: readonly string[] = COMMON_UNIFORMS
): ShaderContext | null {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const gl = canvas.getContext('webgl2', {
    antialias: false,
    alpha: false,
    premultipliedAlpha: true,
  });
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('shader link:', gl.getProgramInfoLog(program));
    return null;
  }
  gl.useProgram(program);

  const locs: Record<string, WebGLUniformLocation | null> = {};
  for (const name of [...commonUniforms, ...extraUniforms]) {
    locs[name] = gl.getUniformLocation(program, name);
  }

  let texture: WebGLTexture | null = null;
  if (maskCanvas) {
    texture = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      maskCanvas
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (locs.uTex) gl.uniform1i(locs.uTex, 0);
  }

  return {
    canvas,
    gl,
    program,
    locs,
    texture,
    texWidth: maskCanvas?.width ?? 1,
    texHeight: maskCanvas?.height ?? 1,
  };
}

/** Delete every GL object the context owns. */
export function destroyShaderContext(ctx: ShaderContext): void {
  const { gl } = ctx;
  if (ctx.texture) gl.deleteTexture(ctx.texture);
  gl.deleteProgram(ctx.program);
  gl.getExtension('WEBGL_lose_context')?.loseContext();
}

/**
 * Letterbox the mask inside the stage at `scale`, preserving aspect.
 * Returns [x, y, width, height] in stage pixels for the uRect uniform.
 */
export function fitRect(
  stageW: number,
  stageH: number,
  ctx: ShaderContext,
  scale: number
): [number, number, number, number] {
  const ar = ctx.texWidth / ctx.texHeight;
  const lw = Math.min(stageW, stageH * ar) * scale;
  const lh = lw / ar;
  return [(stageW - lw) / 2, (stageH - lh) / 2, lw, lh];
}

// ---------------------------------------------------------------------------
// Text mask canvases — white on transparent, alpha is the mask.
// ---------------------------------------------------------------------------

let headCanvas: HTMLCanvasElement | null = null;
let fontsKicked = false;

function buildHeadline(): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  const g = cv.getContext('2d')!;
  const fit = (text: string, maxW: number, cap: number) => {
    g.font = '100px Anton';
    const w = g.measureText(text).width || 1;
    return Math.min(cap, (100 * maxW) / w);
  };
  const big = ['EXPERIENTIAL', 'SOFTWARE', 'PLATFORM', 'EXPERTS.'];
  const kick = 84;
  const sizes = big.map((l) => fit(l, 1680, 430));
  let totalH = 70 + kick * 1.5;
  sizes.forEach((sz) => {
    totalH += sz;
  });
  cv.width = 1800;
  cv.height = Math.ceil(totalH + 90);
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  const x = cv.width / 2;
  let y = 70 + kick;
  g.font = `${kick}px Anton`;
  g.fillText('WE ARE THE', x, y);
  y += kick * 0.5;
  big.forEach((l, i) => {
    y += sizes[i];
    g.font = `${Math.round(sizes[i])}px Anton`;
    g.fillText(l, x, y);
  });
  return cv;
}

/**
 * The hero headline rasterized to a mask. Returns null until Anton has
 * loaded, so callers should keep asking each frame rather than caching null.
 */
export function headlineMask(): HTMLCanvasElement | null {
  if (headCanvas) return headCanvas;
  if (!fontsKicked) {
    fontsKicked = true;
    const done = () => {
      try {
        headCanvas = buildHeadline();
      } catch (e) {
        console.error('headline mask:', e);
      }
    };
    if (document.fonts?.load) {
      void document.fonts.load('400 100px Anton').then(done, done);
    } else {
      done();
    }
  }
  return headCanvas;
}

// ---------------------------------------------------------------------------
// Phrase mask: an arbitrary line of copy, set in Anton, as a mask.
// ---------------------------------------------------------------------------

const phraseCache = new Map<string, HTMLCanvasElement>();

/** The type size each phrase canvas was set at, in its own pixels. */
const phraseSize = new WeakMap<HTMLCanvasElement, number>();

/**
 * One em of a phrase mask, in the mask's own pixels — for effects that size
 * something against the type (a halftone pitch, a stroke width) rather than
 * against the block. Zero for a canvas `phraseMask` did not make.
 */
export function phraseEm(mask: HTMLCanvasElement): number {
  return phraseSize.get(mask) ?? 0;
}

/**
 * Break `words` into `n` lines, balancing measured width across the lines.
 *
 * Greedy rather than optimal: it fills a line until adding the next word
 * would push it past its share of the total, which for phrases of the four
 * to six words a slide can carry lands on the same split an optimal pass
 * would pick, without the quadratic table.
 */
function balanceLines(
  measure: (t: string) => number,
  words: string[],
  n: number
): string[] | null {
  if (n > words.length) return null;
  const share = measure(words.join(' ')) / n;
  const lines: string[] = [];
  let cur = words[0];
  for (let i = 1; i < words.length; i++) {
    const remaining = words.length - i;
    const linesLeft = n - lines.length - 1;
    // Always leave enough words to fill the lines that are still empty.
    const mustBreak = remaining === linesLeft;
    if (
      !mustBreak &&
      linesLeft > 0 &&
      measure(`${cur} ${words[i]}`) <= share * 1.12
    ) {
      cur = `${cur} ${words[i]}`;
    } else if (linesLeft > 0) {
      lines.push(cur);
      cur = words[i];
    } else {
      cur = `${cur} ${words[i]}`;
    }
  }
  lines.push(cur);
  return lines.length === n ? lines : null;
}

/** Anton stacks tightly; this is the baseline-to-baseline step per em. */
export const LEADING = 0.86;

/**
 * Choose how to break `text` across up to four lines so the block it makes
 * comes closest to `targetAspect`.
 *
 * `measure` reports a string's width in ems, which is what keeps this
 * independent of the size the caller lands on: the block's aspect is
 * `widest line / (LEADING * lines)` at any font size.
 *
 * Split out from the rasterizer so the choice is testable without a canvas.
 */
export function planPhraseLines(
  text: string,
  measure: (t: string) => number,
  targetAspect: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  let best: { lines: string[]; score: number } | null = null;
  for (let n = 1; n <= Math.min(4, words.length); n++) {
    const lines = balanceLines(measure, words, n);
    if (!lines) continue;
    const widest = Math.max(...lines.map(measure));
    const score = Math.abs(Math.log(widest / (LEADING * n) / targetAspect));
    if (!best || score < best.score) best = { lines, score };
  }
  return best?.lines ?? [text];
}

function buildPhrase(text: string, targetAspect: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  const g = cv.getContext('2d')!;
  // Measured at a nominal 100px, so `em` reports widths in ems.
  g.font = '100px Anton';
  const em = (t: string) => g.measureText(t).width / 100;
  const lines = planPhraseLines(text, em, targetAspect);

  // Rasterize wide enough that the letterforms survive the dye grid, then
  // let the caller letterbox it. 1600px across is ~1.5 dye texels per source
  // pixel at DW = 1024, which is where the edges stop crawling.
  const W = 1600;
  const pad = Math.round(W * 0.03);
  const size = Math.round((W - pad * 2) / Math.max(...lines.map(em)));
  cv.width = W;
  cv.height = Math.round(size * LEADING * lines.length + pad * 2);
  // Resizing the canvas resets the context, so restate everything.
  g.font = `${size}px Anton`;
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  lines.forEach((l, i) => {
    // 0.72 em is Anton's cap height; it centres the caps in the line box.
    g.fillText(l, W / 2, pad + size * (LEADING * i + 0.72));
  });
  phraseSize.set(cv, size);
  return cv;
}

/**
 * An arbitrary phrase rasterized white on transparent, broken onto however
 * many lines land closest to `targetAspect` (the mark's 1.6 by default, so
 * a phrase drops into an effect built around the mark without relayout).
 *
 * Returns null until Anton has loaded — callers should keep asking each
 * frame rather than caching the null.
 */
export function phraseMask(
  text: string,
  targetAspect = LOGO_ASPECT
): HTMLCanvasElement | null {
  const key = `${targetAspect.toFixed(3)}|${text}`;
  const hit = phraseCache.get(key);
  if (hit) return hit;
  // headlineMask kicks the Anton load; reuse that readiness signal.
  if (!headlineMask()) return null;
  try {
    const cv = buildPhrase(text, targetAspect);
    // A handful of phrases per session at most, but a control that types a
    // character at a time would otherwise grow this without bound.
    if (phraseCache.size > 24) phraseCache.clear();
    phraseCache.set(key, cv);
    return cv;
  } catch (e) {
    console.error('phrase mask:', e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Composite mask: the mark above the wordmark, used by the lockup effects.
// ---------------------------------------------------------------------------

let compCanvas: HTMLCanvasElement | null = null;

/**
 * The full lockup as a mask: the mark over "BRACKET BEAR" set in Anton.
 * Returns null until the font has loaded.
 */
export function compositeMask(): HTMLCanvasElement | null {
  if (compCanvas) return compCanvas;
  // headlineMask kicks the font load; reuse that readiness signal.
  if (!headlineMask()) return null;
  const logo = logoMask();
  const cv = document.createElement('canvas');
  cv.width = 1440;
  cv.height = 980;
  const g = cv.getContext('2d')!;
  const lw = 860;
  const lh = lw * (logo.height / logo.width);
  g.drawImage(logo, (1440 - lw) / 2, 90, lw, lh);
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.font = '100px Anton';
  const t = 'BRACKET BEAR';
  const size = Math.min(190, (100 * 860) / (g.measureText(t).width || 1));
  g.font = `${Math.round(size)}px Anton`;
  g.fillText(t, 720, 90 + lh + 58 + size * 0.72);
  compCanvas = cv;
  return cv;
}
