import { describe, it, expect } from 'vitest';
import { REGISTRY } from './registry';
import { SECTIONS } from './sections';

/**
 * The animations selected for the Lab. A missed or mis-registered port
 * should fail the suite rather than quietly go unnoticed in a nav list
 * nobody scrolls to the bottom of.
 */
const SELECTED = [
  'contour-hood',
  'contour-pgh',
  'foil-statement',
  'holo-mark',
  'ink-dissolve',
  'led-matrix',
  'logo-resolve',
  'portal-mark',
  'schematic-lens',
  'sdf-forge',
  'shatter-glass',
  'signal-alignment',
  'visionary-eye',
  // Section 04 Work through 08 Contact
  'street-pulse',
  'atomic-age',
  'energy-body',
  'block-party',
  'sun-arc',
  'rust-machine',
  // Toys, all but night-rain
  'goo-lamp',
  'kaleido',
  'crt-phosphor',
  'slime-mold',
  'jelly-tank',
  'scan-terrain',
  'dmt-tunnel',
  'interference-field',
  'caustics-pool',
];

/**
 * Ported before the scope narrowed, as proofs that each rendering pipeline
 * worked end to end. Kept deliberately; removing them is a separate call.
 */
const PIPELINE_PROOFS = [
  'pixel-sunrise',
  'silhouette-flock',
  'heat-haze',
  'rd-vat',
  'halftone-tide',
];

describe('lab registry', () => {
  it('contains every selected animation', () => {
    const ids = new Set(REGISTRY.map((e) => e.id));
    const missing = SELECTED.filter((id) => !ids.has(id));
    expect(missing).toEqual([]);
  });

  it('contains nothing beyond the selected set and the pipeline proofs', () => {
    const allowed = new Set([...SELECTED, ...PIPELINE_PROOFS]);
    const extra = REGISTRY.map((e) => e.id).filter((id) => !allowed.has(id));
    expect(extra).toEqual([]);
  });

  it('never registers the same id twice', () => {
    const ids = REGISTRY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every entry a name, tag and blurb', () => {
    for (const e of REGISTRY) {
      expect(e.name.length, e.id).toBeGreaterThan(0);
      expect(e.tag.length, e.id).toBeGreaterThan(0);
      // The blurb is written copy that populates the inspector, not a note.
      expect(e.blurb.length, e.id).toBeGreaterThan(40);
    }
  });

  it('puts every entry in a section the nav actually renders', () => {
    const keys = new Set(SECTIONS.map((s) => s.key));
    for (const e of REGISTRY) expect(keys.has(e.section), e.id).toBe(true);
  });

  it('deliberately excludes night-rain', () => {
    expect(REGISTRY.some((e) => e.id === 'night-rain')).toBe(false);
  });
});
