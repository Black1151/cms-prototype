// src/theme/theme-utils.ts
export type Hex = `#${string}`;

export type ColorFamily =
  | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green' | 'teal'
  | 'cyan' | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia' | 'pink'
  | 'rose' | 'brown' | 'slate' | 'gray' | 'neutral';

export const SHADE_KEYS = ['50','100','200','300','400','500','600','700','800','900'] as const;
export type ShadeKey = typeof SHADE_KEYS[number];

const FAMILY_HUES: Record<ColorFamily, number> = {
  red: 0, orange: 24, amber: 45, yellow: 52, lime: 90, green: 140, teal: 170,
  cyan: 190, blue: 210, indigo: 230, violet: 260, purple: 280, fuchsia: 300,
  pink: 330, rose: 350, brown: 20, slate: 215, gray: 210, neutral: 210,
};

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
export function roundPx(px: number) { return Math.round(px); }

export function parsePx(value: string | number): number | null {
  if (typeof value === 'number') return value;
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*px\s*$/i.exec(value);
  return m ? parseFloat(m[1]) : null;
}
export function toPx(n: number) { return `${roundPx(n)}px`; }
export function parsePercent(s: string): number | null {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*%\s*$/i.exec(s); return m ? parseFloat(m[1]) / 100 : null;
}
export function parseNumber(s: string): number | null {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*$/i.exec(s); return m ? parseFloat(m[1]) : null;
}
export function isHex(s: string): s is Hex { return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s); }

// ---- color conversions ----
function hexToRgb(hex: Hex) {
  const h = hex.replace('#', '');
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return { r, g, b };
  }
  const bigint = parseInt(h, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}
function rgbToHex(r: number, g: number, b: number): Hex {
  const hx = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return (`#${hx(r)}${hx(g)}${hx(b)}`) as Hex;
}
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > .5 ? d / (2 - max - min) : d / (max + min);
    switch (max) { case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break; }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}
function hslToRgb(h: number, s: number, l: number) {
  h = ((h % 360) + 360) % 360; h /= 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < .5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}
export function hexToHsl(hex: Hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}
export function hslToHex(h: number, s: number, l: number): Hex {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}
export function adjustLightness(hex: Hex, deltaL: number): Hex {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, clamp(l + deltaL, 0, 100));
}
export function adjustSaturation(hex: Hex, deltaS: number): Hex {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, clamp(s + deltaS, 0, 100), l);
}
export function shiftHue(hex: Hex, deltaH: number): Hex {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h + deltaH, s, l);
}

export function hexToRgbaString(hex: Hex, a: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(a, 0, 1).toFixed(3)})`;
}

// -------- palette utilities --------
export function paletteFromHue(family: ColorFamily, opts?: { saturation?: number }) {
  const hue = FAMILY_HUES[family] ?? 210;
  const sat = clamp(opts?.saturation ?? 65, 35, 90);
  const L: Record<string, number> = {
    '50': 97, '100': 94, '200': 88, '300': 80, '400': 70,
    '500': 58, '600': 50, '700': 42, '800': 34, '900': 26,
  };
  const out: Record<string, Hex> = {};
  for (const k of Object.keys(L)) out[k] = hslToHex(hue, sat, L[k]);
  return out;
}
export function transformPalette(
  palette: Record<string, string>, fn: (hex: Hex, key: string) => Hex
) {
  const out: Record<string, Hex> = {};
  for (const k of Object.keys(palette)) {
    const v = palette[k];
    out[k] = isHex(v) ? fn(v as Hex, k) : (v as Hex);
  }
  return out;
}
export function contrastPalette(palette: Record<string, string>, deltaL: number) {
  const keys = Object.keys(palette);
  return transformPalette(palette, (hex, key) => {
    const n = parseInt(key, 10);
    const factor = n <= 500 ? +1 : -1;
    return adjustLightness(hex, factor * Math.abs(deltaL));
  });
}

// Ranges bound to your schema
export const SPACING_RANGES: Record<string,[number,number]> = {
  xs:[2,8], sm:[6,12], md:[12,20], lg:[20,32], xl:[28,40], '2xl':[40,56], '3xl':[56,80]
};
export const RADII_RANGES: Record<string,[number,number]> = {
  sm:[2,6], md:[6,12], lg:[10,18], xl:[14,24], '2xl':[20,32]
};
export const FONTSIZE_RANGES: Record<string,[number,number]> = {
  xs:[10,14], sm:[12,16], md:[14,18], lg:[16,22], xl:[18,24],
  '2xl':[22,28], '3xl':[26,36], '4xl':[32,42], '5xl':[42,54], '6xl':[54,72],
};
export const LINEHEIGHT_RANGES: Record<string,[number,number]> = {
  tight:[1.1,1.3], snug:[1.3,1.4], relaxed:[1.5,1.7],
};
export const BREAKPOINT_KEYS = ['sm','md','lg','xl','2xl'] as const;

// Richer color aliases (“lavender”, “navy”, “olive”, etc.)
export function colorFamilyFromWord(word: string): ColorFamily | null {
  const w = word.toLowerCase();
  const map: Record<string, ColorFamily> = {
    purple:'purple', violet:'violet', lilac:'purple', lavender:'purple', plum:'purple',
    indigo:'indigo', blue:'blue', navy:'blue', azure:'blue', cobalt:'blue', sapphire:'blue', sky:'blue',
    cyan:'cyan', teal:'teal', turquoise:'teal', aqua:'teal', aquamarine:'teal',
    green:'green', emerald:'green', forest:'green', olive:'green', mint:'green', seafoam:'green',
    lime:'lime', chartreuse:'lime',
    yellow:'yellow', amber:'amber', orange:'orange', peach:'orange', coral:'orange', apricot:'orange',
    red:'red', crimson:'red', maroon:'red', burgundy:'red',
    pink:'pink', fuchsia:'fuchsia', magenta:'fuchsia', rose:'rose',
    brown:'brown', tan:'brown', khaki:'brown', sand:'brown',
    slate:'slate', charcoal:'slate', graphite:'slate',
    grey:'gray', gray:'gray', neutral:'neutral',
  };
  return map[w] ?? null;
}
