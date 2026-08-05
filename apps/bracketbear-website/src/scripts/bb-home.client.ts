// Homepage client behavior — cursor, ticker, absorb buttons, pixi stage,
// scroll reveals. Lifted from the static draft at
// apps/bracketbear-website/public/draft/index.html. Re-sync if the draft
// is updated.

import * as PIXI from 'pixi.js';
import * as filters from 'pixi-filters';

// ============================================================
// Cursor — Disney-style blob with anticipation, squash & stretch,
// follow-through. State machine drives transform per frame.
// ============================================================
(function () {
  if (window.matchMedia('(hover: none)').matches) return;
  const cursor = document.getElementById('cursor');
  const hand = document.getElementById('cursorHand');
  if (!cursor || !hand) return;

  // -- input
  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let pmx = mx; // previous frame mouse, for velocity
  let pmy = my;

  // -- hand position (separate from blob, snaps to mouse)
  let hx = mx;
  let hy = my;

  // -- blob state machine
  // The button's own ::before fill handles the "arrival" visual now,
  // so the cursor blob just dives straight along the z-axis (scales
  // to 0 in place) and pops back up on exit. No travel-to-center.
  //
  // 'idle'   — blob follows mouse with velocity stretch
  // 'zipout' — quick anticipation pulse + scale-to-zero in place
  // 'hidden' — invisible, parked at mouse
  // 'zipin'  — pops back up at mouse with overshoot
  // 'settle' — damped wobble at mouse, then idle
  let state = 'idle';
  let stateT0 = performance.now();

  // Position used for transform output
  let bx = mx;
  let by = my;
  // Scale/rotation
  let scaleA = 1; // along motion
  let scaleP = 1; // perpendicular to motion
  let angle = 0; // rad

  function setState(next: string) {
    state = next;
    stateT0 = performance.now();
  }

  const easeOutBack = (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  window.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
  });

  // Press feedback on the pixel hand
  window.addEventListener('mousedown', () => {
    if (hand.classList.contains('is-on')) hand.classList.add('is-press');
  });
  window.addEventListener('mouseup', () => {
    hand.classList.remove('is-press');
  });

  // ::before fill is 6px wide → 3px native radius. Scale needed to
  // cover the full element from any entry point = max distance from
  // entry to any corner / 3, with a small overshoot factor.
  const FILL_NATIVE_R = 3;
  function fillScaleFor(localX: number, localY: number, w: number, h: number) {
    const maxDist = Math.max(
      Math.hypot(localX, localY),
      Math.hypot(w - localX, localY),
      Math.hypot(localX, h - localY),
      Math.hypot(w - localX, h - localY)
    );
    return Math.ceil((maxDist / FILL_NATIVE_R) * 1.15);
  }

  function onEnter(e: MouseEvent) {
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    const lx = e.clientX - r.left;
    const ly = e.clientY - r.top;
    // Anchor the absorbing fill at the cursor entry point
    el.style.setProperty('--fx', lx + 'px');
    el.style.setProperty('--fy', ly + 'px');
    el.style.setProperty(
      '--fr',
      String(fillScaleFor(lx, ly, r.width, r.height))
    );
    el.classList.add('is-absorbed');
    hand.classList.add('is-on');
    setState('zipout');
  }
  function onLeave(e: MouseEvent) {
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    // Re-anchor the fill toward the cursor's EXIT point so the
    // receding fill and the cursor zip-in feel like one liquid.
    el.style.setProperty('--fx', e.clientX - r.left + 'px');
    el.style.setProperty('--fy', e.clientY - r.top + 'px');
    el.style.setProperty('--fr', '0');
    el.classList.remove('is-absorbed');
    hand.classList.remove('is-on');
    cursor.style.opacity = '1';
    setState('zipin');
  }
  function onMoveInside() {}

  function bindHotspots() {
    document.querySelectorAll('[data-hot]').forEach((el) => {
      const hotEl = el as any;
      if (hotEl.__hotBound) return;
      hotEl.__hotBound = true;
      el.addEventListener('mouseenter', onEnter as EventListener);
      el.addEventListener('mouseleave', onLeave as EventListener);
      el.addEventListener('mousemove', onMoveInside);
    });
  }
  bindHotspots();
  const mo = new MutationObserver(bindHotspots);
  mo.observe(document.body, { childList: true, subtree: true });

  // Durations (ms)
  const T_ZIPOUT = 180;
  const T_ZIPIN = 240;
  const T_SETTLE = 320;

  function tick(now: number) {
    const dt = now - stateT0;

    if (state === 'idle') {
      // Velocity-based stretch on free movement
      const vx = mx - pmx;
      const vy = my - pmy;
      const speed = Math.hypot(vx, vy);
      bx += (mx - bx) * 0.28;
      by += (my - by) * 0.28;
      const targetA = 1 + Math.min(speed / 22, 0.55);
      const targetP = 1 - Math.min(speed / 60, 0.25);
      scaleA += (targetA - scaleA) * 0.25;
      scaleP += (targetP - scaleP) * 0.25;
      if (speed > 0.5) angle = Math.atan2(my - by, mx - bx);
      cursor.style.opacity = '1';
    } else if (state === 'zipout') {
      // Pure z-axis dive: anticipate pulse, then scale to zero in place.
      // Stay at mouse the whole time so it feels like the cursor is
      // diving INTO the page right where you are.
      bx = mx;
      by = my;
      angle = 0;
      const k = Math.min(dt / T_ZIPOUT, 1);
      // 0–25%: brief inflate (anticipation) up to 1.25
      // 25–100%: ease-in shrink to 0
      let s;
      if (k < 0.25) {
        s = 1 + (k / 0.25) * 0.25;
      } else {
        const k2 = (k - 0.25) / 0.75;
        s = 1.25 * (1 - k2 * k2);
      }
      scaleA = s;
      scaleP = s;
      if (k >= 1) {
        scaleA = 0;
        scaleP = 0;
        cursor.style.opacity = '0';
        setState('hidden');
      }
    } else if (state === 'hidden') {
      // Parked invisibly at the mouse position
      bx = mx;
      by = my;
      angle = 0;
    } else if (state === 'zipin') {
      // Z-axis emerge: scale from 0 in place at exit point with overshoot
      bx = mx;
      by = my;
      angle = 0;
      const k = Math.min(dt / T_ZIPIN, 1);
      const eo = easeOutBack(k);
      scaleA = eo;
      scaleP = eo;
      cursor.style.opacity = '1';
      if (k >= 1) setState('settle');
    } else if (state === 'settle') {
      // Damped wobble at mouse — follow-through from the zip-in pop
      const k = Math.min(dt / T_SETTLE, 1);
      bx += (mx - bx) * 0.5;
      by += (my - by) * 0.5;
      const wobbleA = Math.cos(k * Math.PI * 4) * Math.exp(-k * 4.5);
      const wobbleP = Math.cos((k + 0.18) * Math.PI * 4) * Math.exp(-k * 4.5);
      scaleA = 1 + wobbleA * 0.18;
      scaleP = 1 - wobbleP * 0.13;
      if (k >= 1) {
        scaleA = 1;
        scaleP = 1;
        setState('idle');
      }
    }

    // Apply transform: position → orient to motion → squash/stretch
    cursor.style.transform =
      'translate3d(' +
      bx +
      'px,' +
      by +
      'px, 0) ' +
      'translate(-50%, -50%) ' +
      'rotate(' +
      angle +
      'rad) ' +
      'scale(' +
      scaleA +
      ',' +
      scaleP +
      ')';

    // Hand: snaps to mouse with light smoothing (pointer feel)
    hx += (mx - hx) * 0.6;
    hy += (my - hy) * 0.6;
    hand.style.transform = 'translate3d(' + hx + 'px,' + hy + 'px, 0)';

    pmx = mx;
    pmy = my;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

// ============================================================
// Scroll reveal
// ============================================================
(function () {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
})();

// ============================================================
// Hero stage — BB silhouette as PORTAL MASK
// The BB shape masks a trippy, throbbing fluid: warm radial gradient
// + concentric color-cycling tunnel rings + displacement noise warp.
// 72-BPM lub-dub drives scale-pulse, color flash, glitch, RGB split,
// and shockwaves that fire OUTSIDE the mask through the chromatic chain.
// ============================================================
(function () {
  const cv = document.getElementById('stage') as HTMLCanvasElement | null;
  if (!cv) return;
  const stageEl = cv.parentElement as HTMLElement;
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  void reduceMotion; // referenced for future use

  // ---- Bracket Bear logo paths (viewBox 400.89 x 249.73) ----
  const VIEW_W = 400.89;
  const VIEW_H = 249.73;
  const LOGO_PATHS = [
    {
      d: 'm69.98,172.24v-94.76c0-4.14,3.36-7.5,7.5-7.5h15.14c1.66,0,3-1.34,3-3V3C95.62,1.34,94.28,0,92.62,0H15C6.72,0,0,6.72,0,15v219.73c0,8.28,6.72,15,15,15h77.62c1.66,0,3-1.34,3-3v-63.99c0-1.66-1.34-3-3-3h-15.14c-4.14,0-7.5-3.36-7.5-7.5Z',
      fr: 'nonzero',
    },
    {
      d: 'm174.98,117.27c12.14,16.38,20.1,28.95,19.83,56.54-.73,66.7-62.49,74.8-77.35,75.78-1.73.11-3.19-1.26-3.19-2.99v-84.29c0-1.66-1.34-3-3-3h-19.68c-1.66,0-3-1.34-3-3v-64.05c0-1.66,1.34-3,3-3h19.68c1.66,0,3-1.34,3-3V3.05c0-1.72,1.44-3.08,3.16-3,12.12.59,55.68,6.48,69.61,59.96,7.61,29.23-3.42,50.36-12.06,57.26',
      fr: 'evenodd',
    },
    {
      d: 'm323.41,179.74h-15.14c-1.66,0-3,1.34-3,3v63.99c0,1.66,1.34,3,3,3h77.62c8.28,0,15-6.72,15-15V15C400.89,6.72,394.18,0,385.89,0h-77.62c-1.66,0-3,1.34-3,3v63.99c0,1.66,1.34,3,3,3h15.14c4.14,0,7.5,3.36,7.5,7.5v94.76c0,4.14-3.36,7.5-7.5,7.5Z',
      fr: 'nonzero',
    },
    {
      d: 'm225.92,117.28c-8.64-6.9-19.67-28.03-12.06-57.26C227.79,6.53,271.35.64,283.47.05c1.72-.08,3.16,1.28,3.16,3v83.21c0,1.66,1.34,3,3,3h19.68c1.66,0,3,1.34,3,3v64.05c0,1.66-1.34,3-3,3h-19.68c-1.66,0-3,1.34-3,3v84.29c0,1.73-1.46,3.11-3.19,2.99-14.86-.98-76.62-9.08-77.35-75.78-.27-27.6,7.69-40.17,19.83-56.54',
      fr: 'evenodd',
    },
  ];

  // The Pixi canvas extends past the stage grid cell via .stage__field
  // (CSS inset: -32%) so portal effects/shockwaves can bleed out.
  const fieldEl =
    (stageEl.querySelector('.stage__field') as HTMLElement) || stageEl;
  // Cap at 2× — retina-sharp without 3-4× GPU cost. The metaball pipeline
  // (blur + threshold + masked composite) dominates render time.
  const renderResolution = Math.min(window.devicePixelRatio || 1, 2);
  const app = new PIXI.Application({
    view: cv,
    resizeTo: fieldEl,
    backgroundAlpha: 0,
    antialias: true,
    resolution: renderResolution,
    autoDensity: true,
    powerPreference: 'high-performance',
  });

  // ---- Make BB silhouette texture (used as the portal mask) ----
  function makeLogoMaskTexture() {
    const SCALE = 6;
    const off = document.createElement('canvas');
    off.width = Math.round(VIEW_W * SCALE);
    off.height = Math.round(VIEW_H * SCALE);
    const c = off.getContext('2d')!;
    c.scale(SCALE, SCALE);
    c.fillStyle = '#ffffff';
    for (const p of LOGO_PATHS) c.fill(new Path2D(p.d), p.fr as CanvasFillRule);
    return PIXI.Texture.from(off);
  }
  const maskTex = makeLogoMaskTexture();

  // ---- Alternate-dimension background — DEEP void with violet bloom ----
  // The BB silhouette and fireflies are portals into "another dimension" —
  // the inside palette is intentionally NON-brand: cool electric neons
  // against deep purple/navy, opposite of the warm orange page.
  function makeAltDimensionBg() {
    const size = 512;
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const c = off.getContext('2d')!;
    const grad = c.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    grad.addColorStop(0.0, '#3d1a8a'); // violet bloom center
    grad.addColorStop(0.3, '#1f0c5e'); // deep purple
    grad.addColorStop(0.65, '#0d0530'); // near-black navy
    grad.addColorStop(1.0, '#050218'); // void edge
    c.fillStyle = grad;
    c.fillRect(0, 0, size, size);
    return PIXI.Texture.from(off);
  }
  const gradTex = makeAltDimensionBg();

  // ---- Make displacement noise texture (SVG fractalNoise) ----
  const NOISE_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><filter id="t"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="3"/></filter><rect width="512" height="512" filter="url(%23t)"/></svg>';
  const noiseTex = PIXI.Texture.from(
    'data:image/svg+xml;utf8,' + encodeURIComponent(NOISE_SVG)
  );

  // ---- 90s/Memphis decorative shapes — ALT-DIMENSION palette ----
  // Electric neons against the void bg. Deliberately off-brand: this is
  // the world INSIDE the portal, not the brand world outside it.
  const SHAPE_PALETTE = [
    { c: 0xff1f8f, w: 0.2 }, // hot pink
    { c: 0x1ff5ff, w: 0.18 }, // electric cyan
    { c: 0x9bff1f, w: 0.16 }, // neon green
    { c: 0xb01fff, w: 0.16 }, // electric purple
    { c: 0xffe71f, w: 0.14 }, // electric yellow
    { c: 0xff8a00, w: 0.1 }, // amber (subtle bridge to brand)
    { c: 0xfff3e3, w: 0.06 }, // cream highlights
  ];
  function pickShapeColor() {
    const r = Math.random();
    let cum = 0;
    for (const p of SHAPE_PALETTE) {
      cum += p.w;
      if (r < cum) return p.c;
    }
    return 0x110a08;
  }
  function makeShape(kind: string, color: number, size: number) {
    const g = new PIXI.Graphics();
    // Beefier strokes — line shapes read with more confidence and weight
    const lw = Math.max(3.5, size * 0.18);
    switch (kind) {
      case 'tri':
        g.beginFill(color, 1);
        g.moveTo(0, -size * 0.7);
        g.lineTo(size * 0.6, size * 0.45);
        g.lineTo(-size * 0.6, size * 0.45);
        g.closePath();
        g.endFill();
        break;
      case 'tri-out':
        // drawPolygon auto-closes with mitered joins so the apex stays
        // pointy (vs moveTo/lineTo/lineTo back to start, which leaves
        // flat butt-caps meeting at the top vertex).
        g.lineStyle(lw, color, 1);
        g.drawPolygon([
          0,
          -size * 0.7,
          size * 0.6,
          size * 0.45,
          -size * 0.6,
          size * 0.45,
        ]);
        break;
      case 'circle':
        g.beginFill(color, 1);
        g.drawCircle(0, 0, size * 0.55);
        g.endFill();
        break;
      case 'circle-out':
        g.lineStyle(lw, color, 1);
        g.drawCircle(0, 0, size * 0.55);
        break;
      case 'plus':
        g.beginFill(color, 1);
        g.drawRect(-size * 0.13, -size * 0.55, size * 0.26, size * 1.1);
        g.drawRect(-size * 0.55, -size * 0.13, size * 1.1, size * 0.26);
        g.endFill();
        break;
      case 'squiggle': {
        g.lineStyle(lw, color, 1);
        const steps = 14;
        for (let i = 0; i <= steps; i++) {
          const x = (i / steps - 0.5) * size * 1.7;
          const y = Math.sin((i / steps) * Math.PI * 3) * size * 0.32;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        break;
      }
      case 'zigzag': {
        g.lineStyle(lw, color, 1);
        const pts = 5;
        for (let i = 0; i < pts; i++) {
          const x = (i / (pts - 1) - 0.5) * size * 1.7;
          const y = i % 2 === 0 ? size * 0.32 : -size * 0.32;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        break;
      }
      case 'half':
        g.beginFill(color, 1);
        g.arc(0, 0, size * 0.55, Math.PI, 0, false);
        g.lineTo(-size * 0.55, 0);
        g.endFill();
        break;
      case 'cross':
        g.lineStyle(lw, color, 1);
        g.moveTo(-size * 0.55, -size * 0.55);
        g.lineTo(size * 0.55, size * 0.55);
        g.moveTo(size * 0.55, -size * 0.55);
        g.lineTo(-size * 0.55, size * 0.55);
        break;
      case 'dot':
        g.beginFill(color, 1);
        g.drawCircle(0, 0, size * 0.22);
        g.endFill();
        break;
      case 'rings':
        g.lineStyle(Math.max(2.2, size * 0.1), color, 1);
        for (let r = 1; r <= 3; r++) g.drawCircle(0, 0, size * 0.55 * (r / 3));
        break;
    }
    return g;
  }
  const SHAPE_KINDS = [
    'tri',
    'tri-out',
    'circle',
    'circle-out',
    'plus',
    'squiggle',
    'zigzag',
    'half',
    'cross',
    'dot',
    'rings',
  ];

  // ---- Build scene graph ----
  // The BB silhouette is a static portal mask; fireflies are individual
  // round portal cutouts that orbit/spiral around the BB on the page.
  //
  // app.stage
  //   ├─ fluidScene        (OFF-STAGE — alt-dimension, rendered to fluidRT)
  //   ├─ noiseSprite       (alpha 0, displacement source)
  //   ├─ bbShadowSprite    (BB drop shadow on the orange page)
  //   ├─ fireflyShadowG    (firefly drop shadows)
  //   ├─ heartContainer    (filters: glow — gentle violet halo)
  //   │   ├─ bbMaskSprite  (BB silhouette — mask for portal)
  //   │   └─ portalContent (mask: bbMaskSprite, filters: displacement)
  //   │       └─ bbPortalSprite (full-canvas sprite of fluidRT)
  //   └─ fireflyG          (firefly portal cutouts via fluidRT texture-fill)

  const fluidScene = new PIXI.Container();
  fluidScene.renderable = false;
  app.stage.addChild(fluidScene);

  const bgGrad = new PIXI.Sprite(gradTex);
  bgGrad.anchor.set(0.5);
  fluidScene.addChild(bgGrad);

  const fluidShapeLayer = new PIXI.Container();
  fluidScene.addChild(fluidShapeLayer);
  const fluidShapes: Array<{
    g: PIXI.Container;
    vx: number;
    vy: number;
    rs: number;
    bobFx: number;
    bobFy: number;
    bobP: number;
  }> = [];

  let fluidRT: PIXI.RenderTexture | null = null;

  const noiseSprite = new PIXI.Sprite(noiseTex);
  noiseSprite.anchor.set(0.5);
  noiseSprite.alpha = 0;
  app.stage.addChild(noiseSprite);

  // Drop shadow under the BB silhouette
  const bbShadowSprite = new PIXI.Sprite(maskTex);
  bbShadowSprite.anchor.set(0.5);
  bbShadowSprite.tint = 0x110a08;
  bbShadowSprite.alpha = 0.42;
  bbShadowSprite.filters = [new PIXI.BlurFilter(9, 2)];
  app.stage.addChild(bbShadowSprite);

  // Drop shadows for fireflies — drawn behind their cutouts
  const fireflyShadowG = new PIXI.Graphics();
  fireflyShadowG.filters = [new PIXI.BlurFilter(5, 2)];
  app.stage.addChild(fireflyShadowG);

  const heartContainer = new PIXI.Container();
  app.stage.addChild(heartContainer);

  const bbMaskSprite = new PIXI.Sprite(maskTex);
  bbMaskSprite.anchor.set(0.5);
  heartContainer.addChild(bbMaskSprite);

  const portalContent = new PIXI.Container();
  portalContent.mask = bbMaskSprite;
  heartContainer.addChild(portalContent);

  const bbPortalSprite = new PIXI.Sprite();
  portalContent.addChild(bbPortalSprite);

  // Firefly cutouts — graphics drawn at canvas world coords, sampling
  // the alt-dim texture so each circle is a portal at its position.
  const fireflyG = new PIXI.Graphics();
  app.stage.addChild(fireflyG);
  const fireflies: Array<{
    hx0: number;
    hy0: number;
    hx: number;
    hy: number;
    radius: number;
    ax1: number;
    ay1: number;
    fx1: number;
    fy1: number;
    px1: number;
    py1: number;
    ax2: number;
    ay2: number;
    fx2: number;
    fy2: number;
    px2: number;
    py2: number;
    fleeJitterX: number;
    fleeJitterY: number;
    fleeing: boolean;
    fleeTargetX: number;
    fleeTargetY: number;
    vx: number;
    vy: number;
    panicPhase: number;
    wx: number;
    wy: number;
    wvx: number;
    wvy: number;
  }> = [];

  // ---- Filters ----
  const F = filters as any;
  const displaceFilter = new PIXI.DisplacementFilter(noiseSprite);
  displaceFilter.scale.set(6);
  portalContent.filters = [displaceFilter];
  fireflyG.filters = [displaceFilter];

  const glow = F.GlowFilter
    ? new F.GlowFilter({
        distance: 30,
        outerStrength: 0.4,
        innerStrength: 0,
        color: 0xb01fff,
        quality: 0.3,
      })
    : null;
  if (glow) heartContainer.filters = [glow];

  // ---- Layout ----
  let bgGradBaseScale = 1;
  let canvasW = 0,
    canvasH = 0;
  let bbCenterX = 0,
    bbCenterY = 0; // BB position in canvas coords
  let bbRadius = 100; // approx BB silhouette radius (for boid avoidance)

  function layout() {
    const W = app.screen.width;
    const H = app.screen.height;
    canvasW = W;
    canvasH = H;

    // Canvas is symmetric around the stage box — BB sits at canvas center
    bbCenterX = W / 2;
    bbCenterY = H / 2;

    heartContainer.position.set(bbCenterX, bbCenterY);
    heartContainer.pivot.set(0, 0);

    // BB scale relative to the canvas; pad keeps it from crowding the stage
    const stageAR = W / H;
    const logoAR = VIEW_W / VIEW_H;
    const pad = 0.46;
    let s;
    if (logoAR > stageAR) s = (W * pad) / VIEW_W;
    else s = (H * pad) / VIEW_H;
    const maskScale = s / 6;
    bbMaskSprite.scale.set(maskScale);
    bbMaskSprite.position.set(0, 0);

    const maskWidth = VIEW_W * s;
    const maskHeight = VIEW_H * s;
    // Approximate BB silhouette half-extent — used to choose orbit radii
    bbRadius = Math.max(maskWidth, maskHeight) * 0.5;

    // fluidRT is canvas-sized; gradient centers on the BB
    if (!fluidRT || fluidRT.width !== W || fluidRT.height !== H) {
      if (fluidRT) fluidRT.destroy(true);
      fluidRT = PIXI.RenderTexture.create({
        width: W,
        height: H,
        resolution: app.renderer.resolution,
      });
      bbPortalSprite.texture = fluidRT;
    }

    // Gradient bloom centers on the BB so the violet pool sits behind it
    bgGrad.position.set(bbCenterX, bbCenterY);

    // Bloom large enough to cover the ENTIRE field, not just the BB
    // silhouette area — so the cursor portal stays bright violet
    // wherever the pointer roams (no dark void corners).
    const gradSize = Math.max(maskWidth, maskHeight) * 6.0;
    bgGradBaseScale = gradSize / 512;
    bgGrad.scale.set(bgGradBaseScale);

    // bbPortalSprite covers the full canvas — its top-left in
    // heartContainer's local coords sits at -bbCenter so world coverage
    // matches (0,0)→(W,H).
    bbPortalSprite.position.set(-bbCenterX, -bbCenterY);
    bbPortalSprite.width = W;
    bbPortalSprite.height = H;

    noiseSprite.position.set(bbCenterX, bbCenterY);
    noiseSprite.scale.set((Math.max(W, H) * 1.4) / 512);

    spawnFluidShapes(W, H);
    spawnFireflies(W, H);
  }

  function spawnFluidShapes(W: number, H: number) {
    fluidShapes.forEach((s) => s.g.destroy({ children: true }));
    fluidShapes.length = 0;
    fluidShapeLayer.removeChildren();

    // Heavily populated — these only show through the BB and firefly
    // cutouts, so high density reads as a teeming alt-dim world.
    const COUNT = 80 + Math.floor((W * H) / 90000);
    for (let i = 0; i < COUNT; i++) {
      const kind = SHAPE_KINDS[(Math.random() * SHAPE_KINDS.length) | 0];
      const color = pickShapeColor();
      const size = 18 + Math.random() * 62;

      // Each shape gets a HARD drop shadow — solid, unblurred, offset
      // down-right. Classic 90s zine/Memphis sticker treatment.
      const wrapper = new PIXI.Container();
      const shadow = makeShape(kind, 0x000000, size);
      const offsetAmt = Math.max(3, size * 0.12);
      shadow.position.set(offsetAmt, offsetAmt);
      shadow.alpha = 0.75;
      wrapper.addChild(shadow);
      const fg = makeShape(kind, color, size);
      wrapper.addChild(fg);

      wrapper.x = Math.random() * W;
      wrapper.y = Math.random() * H;
      wrapper.rotation = Math.random() * Math.PI * 2;
      wrapper.alpha = 1;
      fluidShapeLayer.addChild(wrapper);
      fluidShapes.push({
        g: wrapper,
        vx: (Math.random() - 0.5) * 0.32,
        vy: (Math.random() - 0.5) * 0.32,
        rs: (Math.random() - 0.5) * 0.004,
        bobFx: 0.00015 + Math.random() * 0.00055,
        bobFy: 0.00015 + Math.random() * 0.00055,
        bobP: Math.random() * Math.PI * 2,
      });
    }
  }

  // Fireflies are clamped inside the canvas with a small inset so they
  // never drift past the visible field. Since the canvas now extends
  // way leftward into the hero, they have a much bigger playground.
  let frameMinX = 0,
    frameMaxX = 0,
    frameMinY = 0,
    frameMaxY = 0;

  function spawnFireflies(W: number, H: number) {
    fireflies.length = 0;
    frameMinX = W * 0.04;
    frameMaxX = W * 0.96;
    frameMinY = H * 0.06;
    frameMaxY = H * 0.94;
    const fwidth = frameMaxX - frameMinX;
    const fheight = frameMaxY - frameMinY;
    void fwidth;
    void fheight;

    // Each firefly drifts around a HOME position with two layered
    // sinusoids per axis (slow+large + fast+small). Mixed frequencies
    // give organic wandering motion that doesn't loop visibly.
    const COUNT = 28;
    for (let i = 0; i < COUNT; i++) {
      const tier = Math.random();
      let radius;
      if (tier < 0.55) radius = 12 + Math.random() * 8;
      else if (tier < 0.88) radius = 20 + Math.random() * 10;
      else radius = 30 + Math.random() * 14;

      // Home positions scattered in a halo around the BB
      const ang = (i / COUNT) * Math.PI * 2 + Math.random() * 0.5;
      const haloR = bbRadius * (1.25 + Math.random() * 1.4);
      const margin = radius + 60;
      let hx = bbCenterX + Math.cos(ang) * haloR;
      let hy = bbCenterY + Math.sin(ang) * haloR;
      hx = Math.max(frameMinX + margin, Math.min(frameMaxX - margin, hx));
      hy = Math.max(frameMinY + margin, Math.min(frameMaxY - margin, hy));

      fireflies.push({
        // hx0,hy0 = preferred home (constant). hx,hy = animated current
        // home that lerps toward a flee target when the cursor is near.
        hx0: hx,
        hy0: hy,
        hx,
        hy,
        radius,
        ax1: 30 + Math.random() * 35,
        ay1: 25 + Math.random() * 30,
        fx1: 0.00012 + Math.random() * 0.00035,
        fy1: 0.0001 + Math.random() * 0.00033,
        px1: Math.random() * Math.PI * 2,
        py1: Math.random() * Math.PI * 2,
        ax2: 6 + Math.random() * 14,
        ay2: 5 + Math.random() * 12,
        fx2: 0.0007 + Math.random() * 0.0015,
        fy2: 0.0008 + Math.random() * 0.0014,
        px2: Math.random() * Math.PI * 2,
        py2: Math.random() * Math.PI * 2,
        // Per-firefly lateral spread for flee targets so fireflies
        // don't all stack on the same point on the far side.
        fleeJitterX: (Math.random() - 0.5) * bbRadius * 0.9,
        fleeJitterY: (Math.random() - 0.5) * bbRadius * 0.9,
        // Flee state — when triggered, lock a destination and travel
        // there with velocity-based motion (no re-targeting mid-flight).
        fleeing: false,
        fleeTargetX: 0,
        fleeTargetY: 0,
        vx: 0,
        vy: 0,
        // Panic phase — for the perpendicular zigzag during flight
        panicPhase: Math.random() * Math.PI * 2,
        // Wander offset: a slow 2D random walk around home, so the
        // motion stops feeling like a sine loop and starts feeling
        // like an organism that has its own opinion.
        wx: 0,
        wy: 0,
        wvx: 0,
        wvy: 0,
      });
    }
  }
  layout();
  let resizeT: ReturnType<typeof setTimeout>;
  (app.renderer as any).on('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(layout, 60);
  });

  // ---- Pointer tracking (mouse + touch) ----
  let mx = 0,
    my = 0,
    mTargetX = 0,
    mTargetY = 0;
  // Cursor portal — a third lens type that follows the pointer.
  // Coords are in canvas space (matched to fluidRT alignment).
  let cursorX = -9999,
    cursorY = -9999;
  let cursorDispX = -9999,
    cursorDispY = -9999;
  let cursorActive = 0; // 0..1 envelope, fades in/out
  let cursorTargetActive = 0;
  function setPointerCanvas(clientX: number, clientY: number) {
    const r = stageEl.getBoundingClientRect();
    const fr = fieldEl.getBoundingClientRect();
    mTargetX = ((clientX - r.left) / r.width - 0.5) * 22;
    mTargetY = ((clientY - r.top) / r.height - 0.5) * 18;
    cursorX = ((clientX - fr.left) / fr.width) * canvasW;
    cursorY = ((clientY - fr.top) / fr.height) * canvasH;
    if (cursorDispX === -9999) {
      cursorDispX = cursorX;
      cursorDispY = cursorY;
    }
  }
  function isInsideField(clientX: number, clientY: number) {
    const fr = fieldEl.getBoundingClientRect();
    return (
      clientX >= fr.left &&
      clientX <= fr.right &&
      clientY >= fr.top &&
      clientY <= fr.bottom
    );
  }
  // Listen on window so the field's pointer-events:none doesn't block
  // mouse tracking over the 50% bleed area beyond the .stage box.
  window.addEventListener('mousemove', (e) => {
    if (isInsideField(e.clientX, e.clientY)) {
      setPointerCanvas(e.clientX, e.clientY);
      cursorTargetActive = 1;
    } else {
      cursorTargetActive = 0;
      mTargetX = 0;
      mTargetY = 0;
    }
  });
  window.addEventListener(
    'touchstart',
    (e) => {
      if (
        e.touches[0] &&
        isInsideField(e.touches[0].clientX, e.touches[0].clientY)
      ) {
        setPointerCanvas(e.touches[0].clientX, e.touches[0].clientY);
        cursorTargetActive = 1;
      }
    },
    { passive: true }
  );
  window.addEventListener(
    'touchmove',
    (e) => {
      if (
        e.touches[0] &&
        isInsideField(e.touches[0].clientX, e.touches[0].clientY)
      ) {
        setPointerCanvas(e.touches[0].clientX, e.touches[0].clientY);
        cursorTargetActive = 1;
      } else {
        cursorTargetActive = 0;
      }
    },
    { passive: true }
  );
  window.addEventListener('touchend', () => {
    cursorTargetActive = 0;
  });

  // ---- Animation loop ----
  // Calm — no glitching. Just gentle drift, gradient breathing, and a
  // soft displacement warp. The mood is "looking through a portal at
  // a slowly stirring world", not "broadcast tearing".
  app.ticker.add(() => {
    const now = performance.now();

    mx += (mTargetX - mx) * 0.08;
    my += (mTargetY - my) * 0.08;

    // Cursor portal — smooth position + active envelope
    cursorActive += (cursorTargetActive - cursorActive) * 0.12;
    if (cursorDispX !== -9999) {
      cursorDispX += (cursorX - cursorDispX) * 0.18;
      cursorDispY += (cursorY - cursorDispY) * 0.18;
    }
    void cursorActive; // tracked, consumed by firefly flee logic below

    // BB position — anchored at stage center + a tiny mouse parallax
    heartContainer.x = bbCenterX + mx * 0.6;
    heartContainer.y = bbCenterY + my * 0.6;

    // Slow gradient rotation — gives the violet bloom subtle life
    bgGrad.rotation += 0.0014;

    // Drift alt-dim Memphis shapes
    const PAD = 100;
    for (let i = 0; i < fluidShapes.length; i++) {
      const s = fluidShapes[i];
      s.g.x += s.vx + Math.sin(now * s.bobFx + s.bobP) * 0.06;
      s.g.y += s.vy + Math.cos(now * s.bobFy + s.bobP) * 0.06;
      s.g.rotation += s.rs;
      if (s.g.x < -PAD) s.g.x = canvasW + PAD;
      if (s.g.x > canvasW + PAD) s.g.x = -PAD;
      if (s.g.y < -PAD) s.g.y = canvasH + PAD;
      if (s.g.y > canvasH + PAD) s.g.y = -PAD;
    }

    // Render off-stage fluidScene → fluidRT (shared by BB + fireflies)
    if (fluidRT) {
      fluidScene.renderable = true;
      app.renderer.render(fluidScene, { renderTexture: fluidRT, clear: true });
      fluidScene.renderable = false;
    }

    // ---- Firefly natural drift + cursor flee ----
    // When startled, a firefly LOCKS a single destination on the far
    // side and travels smoothly there using velocity-based motion. No
    // re-targeting mid-flight, so the path is one clean smooth arc.
    // After arriving it stays put and resumes drifting.
    const FLEE_TRIGGER = 140;
    const FLEE_MAX_SPEED = 14;
    const FLEE_ARRIVAL_DIST = 6;
    fireflyG.clear();
    fireflyShadowG.clear();
    // Fade fireflies to 0 as they enter the BB silhouette area. The BB
    // is already showing the same alt-dim, so the firefly's circular
    // edge crossing the silhouette would otherwise reveal a seam where
    // its displacement pass doesn't match the BB portal's pass.
    const ffFadeOut = bbRadius * 0.95; // fully visible at/outside this dist
    const ffFadeIn = bbRadius * 0.55; // fully invisible inside this dist
    if (fluidRT) {
      const ffMat = new PIXI.Matrix();
      for (let i = 0; i < fireflies.length; i++) {
        const ff = fireflies[i];
        const driftX =
          Math.sin(now * ff.fx1 + ff.px1) * ff.ax1 +
          Math.sin(now * ff.fx2 + ff.px2) * ff.ax2;
        const driftY =
          Math.cos(now * ff.fy1 + ff.py1) * ff.ay1 +
          Math.cos(now * ff.fy2 + ff.py2) * ff.ay2;

        // Trigger a flee — only when not already fleeing. Lock the
        // destination ONCE so the firefly aims for a fixed point.
        if (!ff.fleeing && cursorActive > 0.1 && cursorDispX !== -9999) {
          const curX = ff.hx + driftX;
          const curY = ff.hy + driftY;
          const dCx = curX - cursorDispX;
          const dCy = curY - cursorDispY;
          if (dCx * dCx + dCy * dCy < FLEE_TRIGGER * FLEE_TRIGGER) {
            const cToBBx = bbCenterX - cursorDispX;
            const cToBBy = bbCenterY - cursorDispY;
            const cToBBd = Math.hypot(cToBBx, cToBBy) || 1;
            const farD = bbRadius * 1.7;
            let tx = bbCenterX + (cToBBx / cToBBd) * farD + ff.fleeJitterX;
            let ty = bbCenterY + (cToBBy / cToBBd) * farD + ff.fleeJitterY;
            const pad = ff.radius + 30;
            tx = Math.max(frameMinX + pad, Math.min(frameMaxX - pad, tx));
            ty = Math.max(frameMinY + pad, Math.min(frameMaxY - pad, ty));
            ff.fleeTargetX = tx;
            ff.fleeTargetY = ty;
            ff.fleeing = true;
          }
        }

        // Velocity-based motion toward locked destination, with a
        // PANIC wobble — perpendicular zigzag + occasional random
        // jolts so the flight feels frantic ("oh shoot, oh shoot")
        // rather than a clean smooth arc.
        if (ff.fleeing) {
          const tdx = ff.fleeTargetX - ff.hx;
          const tdy = ff.fleeTargetY - ff.hy;
          const dist = Math.hypot(tdx, tdy);
          if (dist < FLEE_ARRIVAL_DIST) {
            ff.fleeing = false;
          } else {
            const targetSpeed = Math.min(FLEE_MAX_SPEED, dist * 0.12);
            // Forward velocity toward destination
            let targetVx = (tdx / dist) * targetSpeed;
            let targetVy = (tdy / dist) * targetSpeed;
            // Perpendicular zigzag — sine-based, alternates side to
            // side so the path looks like indecisive panic darts.
            const perpX = -tdy / dist;
            const perpY = tdx / dist;
            const wobble =
              Math.sin(now * 0.026 + ff.panicPhase) * targetSpeed * 0.55;
            targetVx += perpX * wobble;
            targetVy += perpY * wobble;
            // Snappy velocity tracking (0.22 vs 0.15) so the wobble
            // actually shows up in the motion as twitchy darts
            ff.vx += (targetVx - ff.vx) * 0.22;
            ff.vy += (targetVy - ff.vy) * 0.22;
            // Occasional random "oh shoot" impulses
            if (Math.random() < 0.04) {
              ff.vx += (Math.random() - 0.5) * 6;
              ff.vy += (Math.random() - 0.5) * 6;
            }
          }
          // Damp wander while fleeing so the panic flight reads cleanly
          ff.wvx *= 0.85;
          ff.wvy *= 0.85;
          ff.wx *= 0.92;
          ff.wy *= 0.92;
        } else {
          ff.vx *= 0.92;
          ff.vy *= 0.92;
          // Wander steering: longer strides — bigger kicks, looser
          // spring, lighter damping so velocity carries them farther
          // before they're pulled back home.
          ff.wvx += (Math.random() - 0.5) * 0.85 - ff.wx * 0.00018;
          ff.wvy += (Math.random() - 0.5) * 0.85 - ff.wy * 0.00018;
          ff.wvx *= 0.965;
          ff.wvy *= 0.965;
          ff.wx += ff.wvx;
          ff.wy += ff.wvy;
          // Spark — frequent tiny dart so they flit unprovoked.
          if (Math.random() < 0.018) {
            ff.vx += (Math.random() - 0.5) * 5.5;
            ff.vy += (Math.random() - 0.5) * 5.5;
          }
        }
        ff.hx += ff.vx;
        ff.hy += ff.vy;

        let cx = ff.hx + driftX + ff.wx;
        let cy = ff.hy + driftY + ff.wy;
        const pad = ff.radius + 2;
        if (cx < frameMinX + pad) cx = frameMinX + pad;
        else if (cx > frameMaxX - pad) cx = frameMaxX - pad;
        if (cy < frameMinY + pad) cy = frameMinY + pad;
        else if (cy > frameMaxY - pad) cy = frameMaxY - pad;
        const distToBB = Math.hypot(cx - bbCenterX, cy - bbCenterY);
        let ffAlpha;
        if (distToBB >= ffFadeOut) ffAlpha = 1;
        else if (distToBB <= ffFadeIn) ffAlpha = 0;
        else {
          const t = (distToBB - ffFadeIn) / (ffFadeOut - ffFadeIn);
          ffAlpha = t * t * (3 - 2 * t); // smoothstep
        }
        if (ffAlpha <= 0) continue;
        fireflyShadowG.beginFill(0x110a08, 0.42 * ffAlpha);
        fireflyShadowG.drawCircle(cx + 5, cy + 4, ff.radius * 1.05);
        fireflyShadowG.endFill();
        fireflyG.beginTextureFill({
          texture: fluidRT,
          matrix: ffMat,
          alpha: ffAlpha,
        });
        fireflyG.drawCircle(cx, cy, ff.radius);
        fireflyG.endFill();
      }
    }

    // Sync BB drop shadow to heartContainer (offset down-right)
    bbShadowSprite.x = heartContainer.x + 10;
    bbShadowSprite.y = heartContainer.y + 8;
    bbShadowSprite.scale.x = heartContainer.scale.x * bbMaskSprite.scale.x;
    bbShadowSprite.scale.y = heartContainer.scale.y * bbMaskSprite.scale.y;
    bbShadowSprite.rotation = heartContainer.rotation;

    // Gentle, constant displacement — the alt-dim "stirs" slowly
    noiseSprite.rotation += 0.0022;
    noiseSprite.x = bbCenterX + Math.sin(now * 0.00033) * 50;
    noiseSprite.y = bbCenterY + Math.cos(now * 0.00041) * 50;
  });
})();
