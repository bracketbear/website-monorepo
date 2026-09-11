# GLSL and Flateralus implementation notes

Repo-specific mechanics for building a simulated animation here. Read after
deciding the approach in `SKILL.md`, not instead of it.

All paths relative to `packages/flateralus-pixi-animations/src/`.

## Where things already are

| Helper                      | File                       | Use                                           |
| --------------------------- | -------------------------- | --------------------------------------------- |
| `PingPong`                  | `shared/ping-pong.ts`      | Feedback-buffer pair, sim pass + display pass |
| `VERT`, `logoMask()`        | `shared/shader-harness.ts` | Fullscreen-triangle vertex shader, brand mask |
| `TOYS_PRE`, `fbm`, `vnoise` | `shared/toys-harness.ts`   | Fragment prelude with noise helpers           |
| `sdfMask()`                 | `shared/sdf-harness.ts`    | Signed-distance mask of the mark              |

`PingPong` covers the common shape: one simulation pass, one display pass, swap.
It returns `null` where `EXT_color_buffer_float` is unavailable and the caller
should stop retrying.

## When to own the plumbing instead

`PingPong` keeps the live framebuffer private. You must own the ping-pong
yourself if you need to either:

- **blend extra passes onto the live texture between steps** (a splat pass that
  adds disturbances), or
- **read the field back on the CPU** (objects sampling the state).

`caustics-pool` needs both, so it runs three programs — step, splat, display —
and owns `hTex[2]` / `hFb[2]` directly. That is the reason for the divergence;
do not "simplify" it back onto `PingPong`.

## The three-program shape

**Step** integrates. State lives in two channels: `.x` is the field now, `.y` is
the field one step ago.

```glsl
vec2 c = texture(uH, vUV).xy;
float lap = L + Rv + B + T - 4.0 * c.x;
float nh = (2.0 * c.x - c.y + uC2 * lap) * uDamp;
fragColor = vec4(nh, c.x, 0.0, 1.0);   // new h, previous h
```

**Splat** adds a gaussian to the _live_ texture with additive blending, leaving
`h_prev` in `.y` untouched — so a disturbance does not corrupt the integrator.

```ts
gl.enable(gl.BLEND);
gl.blendFunc(gl.ONE, gl.ONE);
gl.bindFramebuffer(gl.FRAMEBUFFER, this.hFb[this.hi]); // live, not the back buffer
```

**Display** reads the field and derives everything: gradient → normal →
refraction → Jacobian → caustic, plus fresnel, glints and objects.

## Float targets

`RGBA16F` + `HALF_FLOAT`, `LINEAR` filtering, `CLAMP_TO_EDGE`. Clamping is what
gives you reflection off the pool walls for free.

```ts
if (!gl.getExtension('EXT_color_buffer_float')) return false; // stop retrying
gl.texImage2D(
  gl.TEXTURE_2D,
  0,
  gl.RGBA16F,
  sw,
  sh,
  0,
  gl.RGBA,
  gl.HALF_FLOAT,
  null
);
```

## Reading the field back on the CPU

This is what couples the GPU simulation to CPU object physics. Bind the live
framebuffer, read a 3×3 window, and central-difference it for the gradient.

The readback _format_ is a property of the attachment and varies by driver, so
probe it once and cache the verdict. Re-probe after resize — the attachment
changed.

```ts
const t = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE);
const f = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT);
this.readMode =
  f === gl.RGBA && t === gl.FLOAT
    ? 'float'
    : f === gl.RGBA && t === gl.HALF_FLOAT
      ? 'half'
      : 'none'; // degrade: objects drift, scene still runs
```

Half-float comes back as `Uint16Array`; `h2f()` in `causticsPoolAnimation.ts`
converts. Always keep a path where the probe fails and the scene still works.

Measured cost: 3 objects × one 3×3 read per frame held a steady 60fps in Chrome
at the lab's ~640×1030 canvas. Do not pre-optimize it away — it is the loop
closure.

## Deriving the display

```glsl
vec2 gradH(vec2 uv);                     // central difference of the field
vec3 n = normalize(vec3(-g, 1.0));       // surface normal
vec3 r = refract(vec3(0,0,-1), n, 0.7519);  // air -> water, 1/1.33
return uv + r.xy * (uDepth / max(0.35, -r.z));
```

Then sample whatever is "below" through `refrUV()` — floor, tiles, painted
graphics. Type distorting under moving water is an unfakeable depth cue and
costs nothing extra once the map exists.

Take the Jacobian of that same map for caustics (see `SKILL.md`).

## Tuning forcing against this grid

`ensureSim` holds total cell count near 147456 and derives the grid from the
aspect ratio, so a portrait canvas lands around 302x488 and a landscape one
does not. **Forcing constants written in uv are therefore resolution-dependent**
— the same shader on a different canvas shape gets a different physical
wavelength. Write the relationships down rather than the magic numbers:

```
wave speed   = sqrt(uC2) cells/step         # 0.3 -> 0.548 cells/step, ~49 cells/s at 90Hz
grid/noise   = simW / frequency             # 302 / 27 -> 11.2 cells per noise cell
drift        = driftConst * grid/noise      # 0.15 -> ~1.7 cells/s
```

The drift constant is subtracted from a coordinate that has _already_ been
scaled by the frequency, so it is in noise-cell units. Reading it as uv
overstates it by exactly the frequency — a mistake that survives review,
because the constant still tunes and the scene still looks better.

caustics-pool currently runs quasi-static: gusts drift at ~3% of the wave
speed, so the surface holds a forced pattern that follows them rather than
radiating resonant chop. That is a tuned-by-eye choice, not a derived one.

## Multi-tap sampling: hoist what does not vary

Chromatic dispersion samples the floor three times along one refracted ray.
Done naively that also evaluates the painted lockup's wear three times — an
fbm, two vnoise and a texture fetch per tap — for a fringe nobody can see on a
flat graphic. Split the function: `floorTile()` is sampled per channel,
`lockup()` runs once over the result.

The general shape: when you sample a function N times for a per-channel or
multi-offset effect, hoist every part whose output is identical across taps.

## Manifest and controls

Standard `createManifest`. Two conventions worth keeping:

- Mark controls `debug: true` so they appear in the lab but not in production
  chrome.
- A `select` control with numeric `value`s reads back as a number — compare with
  `Number(controls.mode) > 0.5`, not a string.

Palettes live as a `TINTS` array of vec3 tuples. **Check every palette with the
effect actually running.** Additive light needs a dark enough base to climb
into; a near-white floor erases computed caustics entirely.

## Lifecycle gotchas

**Wait for fonts before rasterizing text to a texture.** Rasterizing into a
canvas texture happens once; if the face has not loaded you bake the fallback
forever. Poll `document.fonts.check()` with a giving-up deadline.

```ts
if (
  this.fontT < 4 &&
  document.fonts &&
  !FONTS.every((f) => document.fonts.check(f))
) {
  for (const f of FONTS) void document.fonts.load(f);
  return; // try again next frame
}
```

**Release the context on destroy:**
`gl.getExtension('WEBGL_lose_context')?.loseContext()`.

**Resize invalidates the readback probe.** Reset `readMode = null` in `ensureSim`.

## Prior art in this repo

| Animation                    | What it has                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `caustics-pool`              | Integration + fixed step + GPU→CPU loop closure. The only one with all three. |
| `silhouette-flock`           | Real boids; the cursor is a hawk that scatters them.                          |
| `rd-vat`, `crt-phosphor`     | Ping-pong feedback state, no CPU coupling.                                    |
| `slime-mold`, `ink-dissolve` | Fixed-timestep accumulators.                                                  |

Reuse `caustics-pool` for the full shape, `silhouette-flock` for agent
simulation without shaders.

## Verifying it

The lab renders every animation with live controls:

```bash
npm run dev          # from repo root
open http://localhost:4321/lab
```

Pick the animation in the sidebar. Drag on the canvas — if the scene does not
change when you disturb it, you built decoration. Cycle every palette with the
effect running before calling it done.
