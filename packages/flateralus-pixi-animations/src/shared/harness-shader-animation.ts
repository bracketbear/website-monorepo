import * as PIXI from 'pixi.js';
import { PAL } from '@bracketbear/flateralus';
import type {
  AnimationManifest,
  ManifestToControlValues,
} from '@bracketbear/flateralus';
import { PixiAnimation } from '@bracketbear/flateralus-pixi';
import {
  COMMON_UNIFORMS,
  createShaderContext,
  destroyShaderContext,
  setColor,
  type ShaderContext,
} from './shader-harness';

/**
 * Base for the shared-harness shader effects.
 *
 * Each effect owns an offscreen WebGL2 canvas drawn with a fullscreen
 * triangle, blitted into PIXI as a sprite. This class does everything those
 * effects have in common — building the context once the mask is ready,
 * resizing, pushing the common and palette uniforms every frame, drawing,
 * and tearing the whole lot down — so a subclass supplies only its fragment
 * source, its extra uniform names, its mask, and its own uniforms.
 */
export abstract class HarnessShaderAnimation<
  TManifest extends AnimationManifest,
  TControlValues extends
    ManifestToControlValues<TManifest> = ManifestToControlValues<TManifest>,
> extends PixiAnimation<TManifest, TControlValues> {
  /** Full fragment source, normally `PRE + '...'`. */
  protected abstract readonly frag: string;
  /** Uniform names beyond the common set. */
  protected abstract readonly extraUniforms: readonly string[];

  /**
   * The common uniform list this effect's prelude declares. The SDF family
   * uses a different prelude and adds uTexAR, so it overrides this.
   */
  protected readonly commonUniforms: readonly string[] = COMMON_UNIFORMS;

  /**
   * The mask texture source. Returning null means "not ready yet" — the
   * effect simply skips the frame and asks again, which is how the
   * font-dependent masks work.
   */
  protected abstract mask(): HTMLCanvasElement | null;

  /** Push the effect's own uniforms. Called every frame, after the common ones. */
  protected abstract setUniforms(
    gl: WebGL2RenderingContext,
    locs: Record<string, WebGLUniformLocation | null>,
    ctx: ShaderContext,
    controls: TControlValues,
    deltaTime: number,
    app: PIXI.Application
  ): void;

  protected ctx: ShaderContext | null = null;
  protected time = 0;
  /** Set once the context cannot be built, so we stop retrying every frame. */
  private failed = false;
  private sprite: PIXI.Sprite | null = null;
  private texture: PIXI.Texture | null = null;

  onInit(_app: PIXI.Application, _controls: TControlValues): void {
    this.time = 0;
    // Kick any lazy mask build so it is ready as early as possible.
    this.mask();
  }

  onUpdate(
    app: PIXI.Application,
    controls: TControlValues,
    deltaTime: number
  ): void {
    if (this.failed) return;

    if (!this.ctx) {
      const mask = this.mask();
      if (!mask) return;
      const ctx = createShaderContext(
        this.frag,
        this.extraUniforms,
        mask,
        this.commonUniforms
      );
      if (!ctx) {
        this.failed = true;
        return;
      }
      this.ctx = ctx;
    }
    const ctx = this.ctx;

    if (!this.sprite) {
      this.texture = PIXI.Texture.from(ctx.canvas);
      this.sprite = new PIXI.Sprite(this.texture);
      this.getRoot().addChild(this.sprite);
    }

    const dt = Math.min(0.05, deltaTime);
    this.time += dt;

    const sw = app.screen.width;
    const sh = app.screen.height;
    const W = Math.max(2, Math.round(sw));
    const H = Math.max(2, Math.round(sh));
    if (ctx.canvas.width !== W || ctx.canvas.height !== H) {
      ctx.canvas.width = W;
      ctx.canvas.height = H;
      this.texture?.source.resize(W, H);
    }
    this.sprite.width = sw;
    this.sprite.height = sh;

    const { gl, locs } = ctx;
    gl.viewport(0, 0, W, H);
    gl.useProgram(ctx.program);
    gl.uniform1f(locs.uTime!, this.time);
    gl.uniform2f(locs.uRes!, sw, sh);

    // `grain` and `stage` are shared by every effect on this harness, but
    // they live in each manifest, so read them structurally.
    const c = controls as unknown as {
      grain?: boolean;
      stage?: number | string;
    };
    gl.uniform1f(locs.uGrain!, c.grain ? 1 : 0);
    gl.uniform1f(locs.uStage!, c.stage == null ? 1 : Number(c.stage));

    // Palette uniforms are pushed every frame, which is how a theme switch
    // reaches the shaders.
    setColor(gl, locs.uInk!, PAL.ink);
    setColor(gl, locs.uOrange!, PAL.bright);
    setColor(gl, locs.uSun!, PAL.sun);
    setColor(gl, locs.uCream!, PAL.cream);
    // Declared only by the SDF prelude; harmless where absent.
    if (locs.uTexAR) gl.uniform1f(locs.uTexAR, ctx.texWidth / ctx.texHeight);

    this.setUniforms(gl, locs, ctx, controls, dt, app);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.texture?.source.update();
  }

  onDestroy(): void {
    this.sprite = null;
    this.texture?.destroy(true);
    this.texture = null;
    if (this.ctx) {
      destroyShaderContext(this.ctx);
      this.ctx = null;
    }
    this.failed = false;
    super.onDestroy();
  }
}
