export const DISPLAY_FS = `#version 300 es
    precision highp float;
    in vec2 vUV; out vec4 fragColor;
    uniform sampler2D uMask;
    uniform vec2 uRes;
    uniform vec3 uBg, uPlate, uEdge;
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
        col = mix(col, uPlate, body);
        float rim = body * (1.0 - smoothstep(0.5 + e, 0.5 + e * 6.0, m));
        col = mix(col, uEdge, rim * 0.8);
      }
      fragColor = vec4(col, 1.0);
    }`;

export const DISPLAY_UNIFORMS = [
  'uMask',
  'uRes',
  'uBg',
  'uPlate',
  'uEdge',
  'uRect',
];
