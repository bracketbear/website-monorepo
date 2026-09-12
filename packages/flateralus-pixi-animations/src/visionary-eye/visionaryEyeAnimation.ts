import type * as PIXI from 'pixi.js';
import { createManifest } from '@bracketbear/flateralus';
import type { ManifestToControlValues } from '@bracketbear/flateralus';
import { HarnessShaderAnimation } from '../shared/harness-shader-animation';
import type { ShaderContext } from '../shared/shader-harness';
import {
  SDF_COMMON_UNIFORMS,
  SDF_PRE,
  SHARED_EYE,
  sdfMask,
} from '../shared/sdf-harness';
import { EYE_GLOBE } from './eye';
import { FILM_TEXTURE_UNIT, FilmSim } from './film';
import type { BlinkState } from './physics';
import {
  DELTA,
  GRID,
  fallbackFraction,
  isWiping,
  lidCoverage,
  lidSweep,
  newBlinkState,
  stepBlink,
  worldToLocal,
} from './physics';

const MANIFEST = createManifest({
  id: 'visionary-eye',
  name: 'Visionary Eye (GLSL)',
  description:
    'The third-eye mandala wrapped onto a raytraced spherical eye, full stage. Smooth pursuit of the cursor while you are over the stage; self-directed saccades and fixation micro-tremor when left alone. The pupil dilates with attention — swelling while you hold its gaze, pulsing on saccades, drifting with slow hippus at rest — and the energy filaments carve real relief into the surface, displacing the normals so light rakes across the ridges.',
  controls: [
    {
      name: 'eyeScale',
      type: 'number',
      label: 'Eye Scale',
      min: 0.4,
      max: 1.4,
      step: 0.05,
      defaultValue: 0.85,
      debug: true,
    },
    {
      name: 'speed',
      type: 'number',
      label: 'Flow Speed',
      min: 0.05,
      max: 1.5,
      step: 0.05,
      defaultValue: 0.5,
      debug: true,
    },
    {
      name: 'dilate',
      type: 'number',
      label: 'Pupil Response',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.7,
      debug: true,
    },
    {
      name: 'bump',
      type: 'number',
      label: 'Energy Relief',
      min: 0,
      max: 1.5,
      step: 0.05,
      defaultValue: 0.8,
      debug: true,
    },
    {
      name: 'grain',
      type: 'boolean',
      label: 'Film Grain',
      defaultValue: true,
      debug: true,
    },
    {
      name: 'showFilm',
      type: 'boolean',
      label: 'Show Film',
      defaultValue: false,
      debug: true,
    },
  ],
} as const);

export type VisionaryEyeControlValues = ManifestToControlValues<
  typeof MANIFEST
>;

const FRAG =
  SDF_PRE +
  SHARED_EYE +
  EYE_GLOBE +
  `
      uniform float uSpeed;
      uniform float uScale;
      void main() {
        vec2 uvS = vec2(vUV.x, 1.0 - vUV.y);
        vec2 p = uvS * uRes;
        vec2 q = (p - uRes * 0.5) / (min(uRes.x, uRes.y) * 0.5) * (0.44 / uScale);
        float t = uTime * uSpeed;
        vec3 col = eyeW(q, t);
        fragColor = vec4(finish(col, uvS, p), 1.0);
      }`;

export class VisionaryEyeAnimation extends HarnessShaderAnimation<
  typeof MANIFEST
> {
  protected readonly frag = FRAG;
  protected readonly extraUniforms = [
    'uGaze',
    'uSpeed',
    'uScale',
    'uPupil',
    'uBump',
    'uFilm',
    'uFilmN',
    'uDelta',
    'uShowFilm',
    'uFilmOK',
  ] as const;
  protected readonly commonUniforms = SDF_COMMON_UNIFORMS;

  /** Honours the OS reduced-motion setting by freezing the flow. */
  private reducedMotion = false;
  /** The tear film field. Null where the float render target is unavailable. */
  private film: FilmSim | null = null;
  /** Set once FilmSim.create has been tried, so a failure is not retried. */
  private filmTried = false;
  /** Smoothed gaze, and the target it is chasing. */
  private gaze: [number, number] = [0, 0];
  private gazeTarget: [number, number] = [0, 0];
  private nextSaccade = 0;
  private pupil = 0.15;
  private pupilPulse = 0;
  /**
   * The gaze the display is actually drawn with: the smoothed gaze plus
   * Bell's roll. The film's frame has to be this one and not `gaze`, or the
   * field shears against the cornea it is painted on for the length of a
   * blink.
   */
  private gazeView: [number, number] = [0, 0];
  private blink: BlinkState = newBlinkState();
  /** Lid coverage at the end of the previous frame, for the sweep's span. */
  private lidPrev = 0;
  /** Defect layout the current blink will lay down. New every blink. */
  private lidSeed = 0;
  /**
   * Film seconds integrated on the previous frame, and the running total.
   *
   * The blink runs on this clock and not on `dt`. Below about 40fps the film
   * ages slower than the wall — `FilmSim.advance` caps the backlog — so a lid
   * driven by `dt` would run its refractory window and its travel against a
   * clock the measured dryness is not on, by a factor that changes with the
   * frame rate. One frame of lag, the same as the gaze already has.
   */
  private filmDt = 0;

  constructor(initialControls?: Partial<VisionaryEyeControlValues>) {
    super(MANIFEST, initialControls);
  }

  protected mask(): HTMLCanvasElement {
    return sdfMask();
  }

  onInit(app: PIXI.Application, controls: VisionaryEyeControlValues): void {
    super.onInit(app, controls);
    this.reducedMotion =
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.gaze = [0, 0];
    this.gazeTarget = [0, 0];
    this.nextSaccade = 0;
    this.pupil = 0.15;
    this.pupilPulse = 0;
    this.gazeView = [0, 0];
    this.blink = newBlinkState();
    this.lidPrev = 0;
    this.lidSeed = Math.random() * 1000;
    this.filmDt = 0;
  }

  /**
   * Build the film on first frame, let the lid wipe it, and advance it.
   *
   * Runs before the display program is bound, so the base's own viewport and
   * useProgram restore the state the sim passes leave behind. Everything
   * directional is handed over already projected onto the corneal tangent
   * basis — a world vector must never reach the field or gravity drains
   * sideways and the lid's band tilts as the eye looks around.
   *
   * The frame it projects into is `gazeView`, the one the display was last
   * drawn with, and not `gaze`: they differ by Bell's roll for the length of a
   * blink, which is exactly when the lid is laying film. It is last frame's
   * either way, which is one frame of lag on a direction that turns over
   * hundreds of milliseconds.
   *
   * The wipe goes in before `advance()` so the fresh sheet is what the next
   * mu pass derives its chemical potential from.
   *
   * The blink is stepped on the **film's** clock — the seconds `advance()`
   * reports having integrated — and not on `dt`. Below about 40fps those two
   * diverge, and a lid driven by the wall clock fires at a dryness that
   * depends on the frame rate.
   */
  protected simulate(
    gl: WebGL2RenderingContext,
    _ctx: ShaderContext,
    _controls: VisionaryEyeControlValues,
    dt: number
  ): void {
    if (!this.film) {
      if (this.filmTried) return;
      this.filmTried = true;
      this.film = FilmSim.create(gl);
      // Spec D11: load mid-cycle with real structure, not as a flat mirror.
      this.film?.prime(Math.random() * 1000);
      return;
    }
    // Reduced motion keeps the primed field but stops it evolving, the same
    // way the flow time is pinned below. No blinks either: a lid that swept
    // once a cycle is exactly the motion the setting is asking us not to make.
    if (this.reducedMotion) return;

    const before = this.blink;
    // **The measurement, and the reason this animation exists.** The lid is
    // driven by the dry area fraction read back off the field itself, not by
    // any clock: raise EVAP and the eye blinks sooner, because the film tears
    // sooner. Spec D6 forbids an interval floor or ceiling here — the only
    // lever on cadence is EVAP.
    //
    // Only while the lid is open, because `stepBlink` reads the fraction only
    // in that phase. During the sweep the reduction pass and its readback
    // would be a GPU sync point bought for a value nothing looks at, on
    // exactly the frames already spending splats on the wipe. The 0 passed
    // through the closing and opening phases is never compared against
    // anything.
    //
    // `null` is usually the measurement having retired — the driver refused a
    // readable format, the readback was rejected, or it threw. That is
    // latched, announced once, and cannot come back. It is also the transient
    // before the first good value lands, which is not latched and clears
    // itself. Either way the trigger needs a number. The film still runs and
    // looks right; only the decision has lost its input, so the trigger falls
    // back to a ramp calibrated to the cadence the measurement produces on
    // average. A degraded eye that still blinks, rather than one that stares.
    const fraction =
      before.phase === 'open'
        ? (this.film.measure() ?? fallbackFraction(before.since))
        : 0;

    // **On the film's clock, not the wall's.** The fraction above is a
    // property of the field, so the refractory window and the lid's travel
    // have to age with the field too. The harness clamps dt to 0.05s and
    // `advance` caps the backlog at 0.025s, so the two clocks run at different
    // fractions of real time the moment the frame rate drops: at 8fps the wall
    // clock covers five seconds while the field ages by one. Driving the blink
    // off dt is what made it look like the lid was never firing at all.
    this.blink = stepBlink(before, this.filmDt, fraction);
    if (before.phase === 'open' && this.blink.phase !== 'open') {
      // A new layout for every blink. Without this the same patches would come
      // back in the same places and the eye would read as a loop.
      this.lidSeed = Math.random() * 1000;
    }
    const coverage = lidCoverage(this.blink);
    if (isWiping(this.blink) || isWiping(before)) {
      this.film.wipe(
        this.lidSeed,
        lidSweep(this.lidPrev, coverage, this.gazeView[0], this.gazeView[1])
      );
    }
    this.lidPrev = coverage;

    this.filmDt = this.film.advance(
      dt,
      worldToLocal(0, 1, this.gazeView[0], this.gazeView[1])
    );
  }

  protected setUniforms(
    gl: WebGL2RenderingContext,
    locs: Record<string, WebGLUniformLocation | null>,
    _ctx: ShaderContext,
    controls: VisionaryEyeControlValues,
    dt: number,
    app: PIXI.Application
  ): void {
    // Reduced motion pins time so the eye holds a single pose.
    if (this.reducedMotion) gl.uniform1f(locs.uTime!, 7.0);
    gl.uniform1f(locs.uSpeed!, controls.speed);
    gl.uniform1f(locs.uScale!, controls.eyeScale);

    const m = this.pointer?.mouse;
    const watched = !!m?.active && !this.reducedMotion;
    if (watched) {
      this.gazeTarget = [
        (m!.x / app.screen.width - 0.5) * 1.4,
        (m!.y / app.screen.height - 0.5) * 1.4,
      ];
      this.nextSaccade = this.time + 0.4;
    } else if (this.time > this.nextSaccade) {
      // Left alone, the eye looks around on its own.
      this.gazeTarget = [
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 0.9,
      ];
      this.nextSaccade = this.time + 0.5 + Math.random() * 2.6;
      // Saccade startle dilation.
      this.pupilPulse = Math.min(0.5, this.pupilPulse + 0.3);
    }
    const kg = 1 - Math.exp(-dt * (watched ? 9 : 16));
    this.gaze[0] +=
      (Math.max(-0.75, Math.min(0.75, this.gazeTarget[0])) - this.gaze[0]) * kg;
    this.gaze[1] +=
      (Math.max(-0.7, Math.min(0.7, this.gazeTarget[1])) - this.gaze[1]) * kg;
    // Bell's phenomenon: the globe rolls up behind a closing lid. Positive
    // gaze.y looks down, so the roll subtracts. Nobody will be able to say why
    // this looks right, which is the point.
    const bell = lidCoverage(this.blink) * 0.35;
    this.gazeView = [this.gaze[0], this.gaze[1] - bell];
    gl.uniform2f(locs.uGaze!, this.gazeView[0], this.gazeView[1]);

    // The pupil dilates under attention, drifts with slow hippus at rest,
    // and pulses on a saccade.
    const target = (watched ? 0.6 : 0.12) * controls.dilate;
    this.pupil +=
      (target - this.pupil) *
      (1 - Math.exp(-dt * (target > this.pupil ? 2.0 : 3.2)));
    this.pupilPulse *= Math.exp(-dt * 2.2);
    const hippus =
      (Math.sin(this.time * 0.7) * 0.06 + Math.sin(this.time * 1.83) * 0.035) *
      controls.dilate;
    gl.uniform1f(
      locs.uPupil!,
      this.reducedMotion
        ? 0.25
        : Math.max(0, this.pupil + this.pupilPulse + hippus)
    );
    gl.uniform1f(locs.uBump!, controls.bump);

    // The film. Bound here rather than in simulate() because the display
    // program is only current from this point on.
    gl.uniform1f(locs.uFilmN!, GRID);
    gl.uniform1f(locs.uDelta!, DELTA);
    gl.uniform1f(locs.uShowFilm!, controls.showFilm ? 1 : 0);
    gl.uniform1f(locs.uFilmOK!, this.film?.ok ? 1 : 0);
    // Always point uFilm at its own unit, even with no film to bind. Left
    // unset it defaults to 0, which is the SDF mask — harmless while uFilmOK
    // gates every read, but a trap for the passes Tasks 10-12 add.
    gl.uniform1i(locs.uFilm!, FILM_TEXTURE_UNIT);
    if (this.film) this.film.bindField(FILM_TEXTURE_UNIT);
  }

  onDestroy(): void {
    // Before super, which loses the context these objects live in.
    this.film?.destroy();
    this.film = null;
    this.filmTried = false;
    super.onDestroy();
  }
}

export function createVisionaryEyeAnimation(
  initialControls?: Partial<VisionaryEyeControlValues>
): VisionaryEyeAnimation {
  return new VisionaryEyeAnimation(initialControls);
}
