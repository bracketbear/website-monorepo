import { logoMask } from './logo';

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
  texture: WebGLTexture;
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

function compile(
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
  maskCanvas: HTMLCanvasElement
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
  for (const name of [...COMMON_UNIFORMS, ...extraUniforms]) {
    locs[name] = gl.getUniformLocation(program, name);
  }

  const texture = gl.createTexture()!;
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
  gl.uniform1i(locs.uTex!, 0);

  return {
    canvas,
    gl,
    program,
    locs,
    texture,
    texWidth: maskCanvas.width,
    texHeight: maskCanvas.height,
  };
}

/** Delete every GL object the context owns. */
export function destroyShaderContext(ctx: ShaderContext): void {
  const { gl } = ctx;
  gl.deleteTexture(ctx.texture);
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
