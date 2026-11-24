export type BootState = 'animate' | 'still' | 'none';

/**
 * What the Portal Mark stage should do on this device. A pure function: the
 * caller probes matchMedia and WebGL and passes the answers in.
 *
 * - no WebGL: nothing mounts, the ink ground and the page copy carry on
 * - reduced motion: mount, and the animation holds a still frame
 * - otherwise: mount and run
 */
export function bootState(opts: {
  reducedMotion: boolean;
  webgl: boolean;
}): BootState {
  if (!opts.webgl) return 'none';
  if (opts.reducedMotion) return 'still';
  return 'animate';
}
