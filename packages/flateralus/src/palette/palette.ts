/** Semantic slots every theme must fill. */
export type PaletteKey =
  | 'orange'
  | 'bright'
  | 'deep'
  | 'rust'
  | 'sun'
  | 'cream'
  | 'ink'
  | 'ink2'
  | 'cyan'
  | 'acid';

export type PaletteColors = Record<PaletteKey, number>;

export type ThemeId =
  | 'sunset'
  | 'miami84'
  | 'nick95'
  | 'gameboy'
  | 'rave'
  | 'memphis';

export interface Theme {
  label: string;
  colors: PaletteColors;
}

/**
 * Roles, not names: `orange` is the dominant canvas, `bright` the lifted
 * canvas, `ink` the high-contrast-on-canvas value, `cream` the paper,
 * `sun` the warm highlight, `deep`/`rust` mid accents, `cyan`/`acid` pops.
 * A theme reassigns the roles; it does not rename them.
 */
export const THEMES: Record<ThemeId, Theme> = {
  sunset: {
    label: 'Sunset (brand)',
    colors: {
      orange: 0xff5f1f,
      bright: 0xff7a33,
      deep: 0xd8420c,
      rust: 0xa82a07,
      sun: 0xffc24a,
      cream: 0xfff3e3,
      ink: 0x110a08,
      ink2: 0x1c130e,
      cyan: 0x7df9ff,
      acid: 0xd8ff3d,
    },
  },
  miami84: {
    label: "Miami '84",
    colors: {
      orange: 0x2e1a5e,
      bright: 0x45247f,
      deep: 0xff2975,
      rust: 0xc11368,
      sun: 0xffd319,
      cream: 0xfdf5ff,
      ink: 0xfdf5ff,
      ink2: 0xe8d5ff,
      cyan: 0x00e5ff,
      acid: 0xff6ec7,
    },
  },
  nick95: {
    label: "Nick '95",
    colors: {
      orange: 0xff6600,
      bright: 0xff8324,
      deep: 0x663399,
      rust: 0x4d2673,
      sun: 0xffcc00,
      cream: 0xfff8e7,
      ink: 0x1f1200,
      ink2: 0x2e1b00,
      cyan: 0x00c2cb,
      acid: 0xb5e61d,
    },
  },
  gameboy: {
    label: 'Game Boy',
    colors: {
      orange: 0x8bac0f,
      bright: 0x9bbc0f,
      deep: 0x306230,
      rust: 0x0f380f,
      sun: 0x9bbc0f,
      cream: 0xe0f8d0,
      ink: 0x0f380f,
      ink2: 0x306230,
      cyan: 0xe0f8d0,
      acid: 0xe0f8d0,
    },
  },
  rave: {
    label: 'JNCO Rave',
    colors: {
      orange: 0x0d0221,
      bright: 0x1a0b3d,
      deep: 0xb026ff,
      rust: 0x7a1fd1,
      sun: 0xff9e00,
      cream: 0xf2ffe9,
      ink: 0xf2ffe9,
      ink2: 0xd9ffd0,
      cyan: 0x00ffff,
      acid: 0x39ff14,
    },
  },
  memphis: {
    label: 'Memphis Milano',
    colors: {
      orange: 0xf4ead5,
      bright: 0xfdf6e4,
      deep: 0xff6ea9,
      rust: 0x00b3a4,
      sun: 0xffd23f,
      cream: 0xffffff,
      ink: 0x191919,
      ink2: 0x2b2b2b,
      cyan: 0x6dd3ff,
      acid: 0xb8e986,
    },
  },
};

/**
 * The live palette. Animations read `PAL.orange` at draw time and must
 * never destructure it — `applyTheme` mutates this object in place so a
 * theme switch reaches every animation without re-wiring anything.
 */
export const PAL: PaletteColors = { ...THEMES.sunset.colors };

let currentTheme: ThemeId = 'sunset';

export function applyTheme(id: ThemeId): void {
  const theme = THEMES[id];
  if (!theme) return;
  Object.assign(PAL, theme.colors);
  currentTheme = id;
}

export function getThemeId(): ThemeId {
  return currentTheme;
}

/** Integer color to CSS hex, e.g. 0xff5f1f -> '#ff5f1f'. */
export function hx(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}
