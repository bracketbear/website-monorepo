import { Application, Container } from 'pixi.js';

/**
 * Calculate the average luminance of a PixiJS container or the entire application
 * @param app - The PixiJS application instance
 * @param target - Optional container to measure, defaults to the entire app stage
 * @param debug - Optional debug flag to log detailed information
 * @returns Average luminance value between 0 and 1
 */
export function averageLuminanceFromPixi(
  app: Application,
  target?: Container,
  debug: boolean = false
): number {
  // Use the target container or the app stage if no target provided
  const container = target || app.stage;

  // Extract pixels from the container
  const { pixels } = app.renderer.extract.pixels(container);

  // Ensure we have valid pixel data
  if (!pixels || pixels.length === 0) {
    if (debug) console.log('No pixel data available');
    return 0;
  }

  if (debug) {
    console.log(`Total pixels: ${pixels.length / 4}`);
    console.log(`Sample step: 4 (sampling every 4th pixel)`);
  }

  let sumL = 0;
  let sampleCount = 0;
  let transparentCount = 0;
  let totalSampled = 0;

  // Sample every 4th pixel to improve performance
  const sampleStep = 4;

  for (let i = 0; i < pixels.length; i += sampleStep * 4) {
    totalSampled++;
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3]; // Alpha channel

    // Skip fully transparent pixels (alpha = 0)
    if (a === 0) {
      transparentCount++;
      continue;
    }

    // Normalize RGB values to 0-1 range
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;

    // Convert to linear RGB using sRGB transfer function
    const rl =
      rNorm <= 0.03928 ? rNorm / 12.92 : Math.pow((rNorm + 0.055) / 1.055, 2.4);
    const gl =
      gNorm <= 0.03928 ? gNorm / 12.92 : Math.pow((gNorm + 0.055) / 1.055, 2.4);
    const bl =
      bNorm <= 0.03928 ? bNorm / 12.92 : Math.pow((bNorm + 0.055) / 1.055, 2.4);

    // Calculate luminance using standard coefficients
    const luminance = 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
    sumL += luminance;
    sampleCount++;

    if (debug && sampleCount <= 5) {
      console.log(
        `Sample ${sampleCount}: RGB(${r},${g},${b}) A:${a} -> L:${luminance.toFixed(4)}`
      );
    }
  }

  if (debug) {
    console.log(
      `Sampled ${totalSampled} pixels, ${transparentCount} transparent, ${sampleCount} visible`
    );
  }

  // If no visible pixels were found, return a default value
  if (sampleCount === 0) {
    if (debug)
      console.log('No visible pixels found, returning default luminance 0.5');
    return 0.5; // Default to medium luminance
  }

  const averageLuminance = sumL / sampleCount;
  if (debug) {
    console.log(`Average luminance: ${averageLuminance.toFixed(4)}`);
  }

  return averageLuminance;
}
