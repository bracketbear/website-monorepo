import * as PIXI from 'pixi.js';

export function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Crisp rectangle from the shared white texture, anchored center. */
export function px(color: number, w: number, h?: number): PIXI.Sprite {
  const s = new PIXI.Sprite(PIXI.Texture.WHITE);
  s.anchor.set(0.5);
  s.tint = color;
  s.width = w;
  s.height = h == null ? w : h;
  return s;
}

let glowTexture: PIXI.Texture | null = null;

/** Lazy shared radial-gradient texture — filter-free neon halos. */
export function glowTex(): PIXI.Texture {
  if (!glowTexture) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d')!;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    glowTexture = PIXI.Texture.from(cv);
  }
  return glowTexture;
}

/** Drop the shared glow texture; call when the renderer is torn down. */
export function resetGlowTex(): void {
  glowTexture?.destroy(true);
  glowTexture = null;
}

/** Cheap deterministic 2D value noise in -1..1. */
export function noise2(x: number, y: number): number {
  return (
    Math.sin(x * 1.7 + Math.sin(y * 2.3)) * 0.5 +
    Math.sin(y * 1.3 + Math.sin(x * 1.1) * 2.0) * 0.5
  );
}
