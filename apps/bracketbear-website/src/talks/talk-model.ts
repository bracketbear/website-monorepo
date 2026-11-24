/** Pure helpers for the runner. No DOM, no React, so they test in isolation. */

export function clampIndex(i: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.max(i, 0), count - 1);
}

export function next(i: number, count: number): number {
  return clampIndex(i + 1, count);
}

export function prev(i: number, count: number): number {
  return clampIndex(i - 1, count);
}

/** `?slide=<id>` → index. Unknown or missing ids land on the first slide. */
export function indexFromParam(
  param: string | null,
  slides: { id: string }[]
): number {
  if (!param) return 0;
  const i = slides.findIndex((s) => s.id === param);
  return i === -1 ? 0 : i;
}

export function formatCounter(i: number, count: number): string {
  return `${String(i + 1).padStart(2, '0')} / ${count}`;
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
