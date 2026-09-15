# Frame monitoring and quality levers in Flateralus

## Why

The catalog has 45 animations and no way to tell how fast any of them runs.
Cost is found by eye, and the eye is bad at it: `iron-bloom` shipped a first
draft that rendered at 0.1 FPS — one frame per sixteen seconds — and that
went unnoticed through five rounds of material tuning. A readout would have
said so on the first frame.

The goal is two things that belong together: measure every animation from one
place, and give the framework a principled way to trade quality for frame
rate at runtime.

## The constraint that shapes the design

**CPU work time cannot see these scenes.** `onUpdate` returns as soon as it
issues `gl.drawArrays`; the GPU work happens afterwards. Timing the body of
`onUpdate` would have reported `iron-bloom` at roughly a millisecond a frame
while it was really taking 15,800ms.

So the control signal is **frame interval**, not work time. When the GPU is
the bottleneck the render loop backs up and the interval grows, which is
precisely the symptom that exposed the 0.1 FPS.

`EXT_disjoint_timer_query_webgl2` reports true GPU time, but it is often
disabled in Chrome and its results arrive several frames late. It is wired in
as an optional diagnostic readout and never as the controller's input.

## Where it hooks in

`BaseAnimation.update()` is the single chokepoint every animation passes
through — it already computes `deltaTime` and calls `onUpdate`. Measuring
there gives all 45 animations coverage with no per-animation work.

That method currently times with `Date.now()`, which is millisecond
resolution and too coarse for frame timing. It moves to `performance.now()`.

## Components

Four pieces. The first three are pure logic with an injected clock, so
oscillation, warmup and tab-hiding are unit tests rather than things to
squint at in a browser.

### 1. `FrameMonitor` — `flateralus/src/perf/frame-monitor.ts`

A ring buffer of frame intervals, about 120 of them.

- Reports **p50 and p95, never the mean.** A 16ms mean with a 90ms p95 is a
  hitching scene that averages out to looking fine.
- Percentiles are computed when read, not per frame. Sorting 120 floats every
  frame for every animation would itself become a cost worth measuring.
- Drops warmup samples. Shader compilation and the first texture upload
  otherwise convince the controller to slam quality to minimum on load.
- Drops intervals that exceed an outlier ceiling, and drops the interval
  spanning an explicit discontinuity. A backgrounded tab reports intervals in
  seconds and that is not slowness.

```ts
interface FrameStats {
  count: number;
  p50: number; // ms
  p95: number; // ms
  fps: number; // implied by p50
}
```

### 2. `QualityLever` — `flateralus/src/perf/quality.ts`

What an animation declares it is willing to trade.

```ts
interface QualityLever {
  min: number; // value at quality 0 — cheapest it will run
  max: number; // value at quality 1 — best it knows how to look
  step?: number; // march steps have to be integers
  curve?: (q: number) => number; // default linear
}
```

There is **one scalar `q` in [0,1]** and every lever maps off it. Not a solver
that picks levers per frame: a single scalar is predictable, debuggable, and
puts the trade in the author's hands via the choice of min and max.

The framework always owns a generic `renderScale` lever, so every animation
gets adaptive resolution with no opt-in. An animation may declare more —
`iron-bloom` would add `marchSteps: { min: 24, max: 72, step: 1 }`.

### 3. `QualityController` — `flateralus/src/perf/quality-controller.ts`

A pure function of (stats, budget, current `q`) to the next `q`.

```
p95 > budget × 1.15  ->  q -= 0.08, cooldown 250ms     (ratchet down fast)
p95 < budget × 0.75  ->  q += 0.02, cooldown 1000ms    (climb back slowly)
otherwise            ->  hold
```

The asymmetry and the deadband are the whole design. Symmetric rates
oscillate: drop resolution, get faster, raise resolution, get slower, repeat
forever. Down fast because the viewer is suffering now; up slowly because
being wrong upward costs them again.

`q` is quantised to 0.05 so resolution moves in discrete steps rather than
thrashing the renderer every frame.

### 4. Pinning and the readout

`qualityMode: 'auto' | 'fixed'`, and fixed is not a nicety. Automatic scaling
fighting the developer during look-dev is intolerable — tuning `iron-bloom`'s
material against a controller that kept moving the resolution would have been
much worse than tuning it blind.

The animation lab shows p50/p95 in ms, implied FPS, current `q`, and what each
lever resolved to, plus a control to pin `q`.

## Compatibility

Additive and opt-in throughout. An animation that declares no levers behaves
exactly as it does today, and the existing `dpr` override keeps working.

## Risks

- **`Date.now()` to `performance.now()` is the invasive change.** It alters
  `deltaTime` precision for all 45 animations. It should be strictly an
  improvement, but it is the edit most likely to disturb something, so it
  lands in its own commit with a pass over the fixed-timestep scenes:
  `caustics-pool`, `rd-vat`, `crt-phosphor`.
- Mid-flight resolution changes are already safe in `HarnessShaderAnimation`,
  which resizes whenever dimensions change. PIXI's `renderer.resolution` is
  heavier to change, which is what the quantisation protects.
- `deltaTime`'s meaning does not change. Scenes that integrate on a fixed step
  keep their own accumulators and their own `dt` caps.

## What this does and does not buy

It would not have made `iron-bloom` fast. It would have said, on the first
frame, that it was running at 0.1 FPS and that the cost was GPU-side —
instead of that surfacing several material iterations later.

## Out of scope

- Choosing levers automatically per frame by measured cost. One scalar first.
- GPU timer queries as a control input.
- Any change to how animations are authored beyond the optional lever block.

## Changed during implementation

Four things the design did not anticipate, each found by a failing test or by
watching the controller run live.

- **Quality is accumulated continuously and quantised only on output.**
  Rounding the stored value swallowed the up-step, which is smaller than the
  quantum by design, so quality could ratchet down and never recover.
- **A quality change is itself a disturbance.** Changing render scale
  reallocates a render target and costs a frame or two. Live, those frames
  pushed p95 to 93ms against a 25ms p50 and the controller hunted between
  0.25 and 0.70 chasing its own adjustments. `discontinuity(settleIntervals)`
  now discards the frames after each change; afterwards it settled and held.
  The unit simulation had passed throughout, because it modelled cost as a
  smooth function of quality with no per-change spike.
- **`minQuality` bounds the controller, not a manual pin.** Clamping pins as
  well made each lever's `min` — its value at quality zero — unreachable.
- **Mask-based harness effects stay out of adaptive resolution.** They compare
  `p = uvS * uRes` in framebuffer pixels against a `uRect` in stage pixels,
  which only agree at scale 1; scaled down, the mask shrinks into a corner.
  They keep their previous scale until they get a stage-space resolution
  uniform. Three effects that override `renderScale` themselves
  (`dmt-tunnel`, `interference-field`, `shatter-glass`) are also unaffected.
