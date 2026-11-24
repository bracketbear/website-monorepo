export const LAPLACIAN_FS = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform sampler2D uW;      // .x = w, .y = w one step ago, .z = envelope
    uniform sampler2D uMask;   // .x = 1 inside the plate
    uniform vec2 uGrid;
    void main() {
      // Simply supported (spec D2): grad^2 w = 0 on the boundary, imposed by
      // zeroing L outside the plate. w = 0 outside is imposed by the step
      // pass, so the neighbour taps below already read zero there.
      if (texture(uMask, vUV).x < 0.5) { fragColor = vec4(0.0); return; }
      vec2 px = 1.0 / uGrid;
      float c = texture(uW, vUV).x;
      float l = texture(uW, vUV - vec2(px.x, 0.0)).x;
      float r = texture(uW, vUV + vec2(px.x, 0.0)).x;
      float b = texture(uW, vUV - vec2(0.0, px.y)).x;
      float t = texture(uW, vUV + vec2(0.0, px.y)).x;
      fragColor = vec4(l + r + b + t - 4.0 * c, 0.0, 0.0, 1.0);
    }`;

export const LAPLACIAN_UNIFORMS = ['uW', 'uMask', 'uGrid'];

export const STEP_FS = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform sampler2D uW;      // .x = w, .y = w one step ago, .z = envelope
    uniform sampler2D uL;      // .x = grad^2 w
    uniform sampler2D uMask;
    uniform sampler2D uDens;   // .x = grain density
    uniform vec2 uGrid;
    uniform float uBeta, uDecay, uLoad, uDrive, uPhase, uEnvA, uDriveR;
    uniform vec2 uDriveP[8];
    uniform int uDriveN;
    void main() {
      if (texture(uMask, vUV).x < 0.5) { fragColor = vec4(0.0); return; }

      vec2 px = 1.0 / uGrid;
      float cL = texture(uL, vUV).x;
      float lL = texture(uL, vUV - vec2(px.x, 0.0)).x;
      float rL = texture(uL, vUV + vec2(px.x, 0.0)).x;
      float bL = texture(uL, vUV - vec2(0.0, px.y)).x;
      float tL = texture(uL, vUV + vec2(0.0, px.y)).x;
      float bih = lL + rL + bL + tL - 4.0 * cL;   // grad^4 w

      vec3 s = texture(uW, vUV).xyz;
      float dens = texture(uDens, vUV).x;
      // Added mass lowers local stiffness; sand also dissipates energy. This
      // is the loop closure: the figure changes the plate that made it.
      float beta = uBeta / (1.0 + uLoad * dens);
      float decay = uDecay * (1.0 - min(0.4, uLoad * dens * 0.02));

      // One point driver per connected region of the plate, all in phase.
      // A single centre driver is the right model for the square and the
      // circle and is what gives their degenerate mode pairs a symmetric
      // excitation; the mark is four disconnected pieces and its centre falls
      // in the gap between two of them, so the rule generalises rather than
      // special-cases. See driverPoints() in masks.ts.
      float env = 0.0;
      for (int i = 0; i < 8; i++) {
        if (i >= uDriveN) break;
        vec2 d = (vUV - uDriveP[i]) * uGrid;
        env += exp(-dot(d, d) / (uDriveR * uDriveR));
      }
      float f = env * uDrive * 3e-4 * sin(uPhase);

      float w = (2.0 * s.x - s.y - beta * bih + f) * decay;
      // Numerical guard. In a stable run this never engages; if it does, the
      // stiffness clamp or the step rate is wrong, and damping is not the fix.
      w = clamp(w, -8.0, 8.0);

      float e = mix(s.z, abs(w), uEnvA);
      fragColor = vec4(w, s.x, e, 1.0);
    }`;

export const STEP_UNIFORMS = [
  'uW',
  'uL',
  'uMask',
  'uDens',
  'uGrid',
  'uBeta',
  'uDecay',
  'uLoad',
  'uDrive',
  'uPhase',
  'uEnvA',
  'uDriveR',
  'uDriveP[0]',
  'uDriveN',
];

export const DISPLAY_FS = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform sampler2D uMask;
    uniform sampler2D uW;
    uniform vec2 uRes;
    uniform vec3 uBg, uPlate, uEdge;
    uniform float uShow, uView;
    // Plate rect in screen uv: xy = centre, zw = half-size.
    uniform vec4 uRect;
    void main() {
      vec2 p = (vUV - uRect.xy) / uRect.zw * 0.5 + 0.5;
      vec3 col = uBg;
      if (p.x > 0.0 && p.x < 1.0 && p.y > 0.0 && p.y < 1.0) {
        float m = texture(uMask, p).x;
        // Soften the mask edge so a 128-cell boundary does not read as
        // staircase pixels at screen resolution.
        float e = fwidth(m) + 1e-4;
        float body = smoothstep(0.5 - e, 0.5 + e, m);
        vec3 s = texture(uW, p).xyz;
        // uView 0 = deflection (debug), 1 = envelope. The envelope is what
        // the grains read; if the nodal structure is not legible here it is
        // not there, and no amount of grain tuning will invent it.
        float v = mix(clamp(s.x * uShow, -0.6, 0.6), s.z * uShow, uView);
        col = mix(col, uPlate + vec3(v), body);
        float rim = body * (1.0 - smoothstep(0.5 + e, 0.5 + e * 6.0, m));
        col = mix(col, uEdge, rim * 0.8);
      }
      fragColor = vec4(col, 1.0);
    }`;

export const DISPLAY_UNIFORMS = [
  'uMask',
  'uW',
  'uRes',
  'uBg',
  'uPlate',
  'uEdge',
  'uRect',
  'uShow',
  'uView',
];
