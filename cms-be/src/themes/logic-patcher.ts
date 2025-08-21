// src/theme/logic-patcher.ts
import * as jsonpatch from 'fast-json-patch';
import {
  adjustLightness, adjustSaturation, shiftHue, paletteFromHue, transformPalette,
  contrastPalette, parsePx, toPx, clamp, isHex, hexToHsl, hslToHex,
  SPACING_RANGES, RADII_RANGES, FONTSIZE_RANGES, LINEHEIGHT_RANGES, BREAKPOINT_KEYS,
  hexToRgbaString, ShadeKey, SHADE_KEYS
} from './theme-utils';
import { ParsedOp, TargetPalette } from './instruction-parser';

type Tokens = any;

function magToLDelta(m: 'slight'|'moderate'|'strong') { return m === 'slight' ? 4 : m === 'moderate' ? 8 : 12; }
function magToScale(m: 'slight'|'moderate'|'strong') { return m === 'slight' ? 1.10 : m === 'moderate' ? 1.18 : 1.30; }

function ensure(obj: any, path: string[]) { let cur = obj; for (const k of path) cur = (cur[k] ??= {}); return cur; }

// Helpers to fan out multi-target ops
function forTargets(tokens: Tokens, targets: TargetPalette[], fn: (t: Tokens, target: TargetPalette) => Tokens): Tokens {
  let next = JSON.parse(JSON.stringify(tokens));
  for (const tgt of targets) next = fn(next, tgt);
  return next;
}

// ---- Colors ----
function applyPaletteReplaceByFamily(tokens: Tokens, targets: TargetPalette[], family: any, saturation?: any) {
  return forTargets(tokens, targets, (t, targetKey) => {
    const next = JSON.parse(JSON.stringify(t));
    ensure(next, ['colors']);
    next.colors[targetKey] = saturation !== undefined && saturation !== null
      ? paletteFromHue(family as any, typeof saturation === 'number' ? { saturation } : (saturation === 'slight' ? { saturation: 55 } : saturation === 'moderate' ? { saturation: 65 } : saturation === 'strong' ? { saturation: 75 } : {}))
      : paletteFromHue(family as any);
    return next;
  });
}
function applyPaletteReplaceByHex(tokens: Tokens, targets: TargetPalette[], hex: string) {
  return forTargets(tokens, targets, (t, targetKey) => {
    const next = JSON.parse(JSON.stringify(t));
    const { h, s } = hexToHsl(hex as any);
    const L: Record<string, number> = {
      '50': 97, '100': 94, '200': 88, '300': 80, '400': 70,
      '500': 58, '600': 50, '700': 42, '800': 34, '900': 26,
    };
    const out: Record<string, string> = {};
    for (const k of Object.keys(L)) out[k] = hslToHex(h, clamp(s,35,90), L[k]);
    ensure(next, ['colors']);
    next.colors[targetKey] = out;
    return next;
  });
}
function applyPaletteReplaceWithList(tokens: Tokens, targets: TargetPalette[], list: string[]) {
  const order = ['50','100','200','300','400','500','600','700','800','900'];
  return forTargets(tokens, targets, (t, targetKey) => {
    const next = JSON.parse(JSON.stringify(t));
    const out: Record<string,string> = {};
    for (let i=0;i<order.length;i++) {
      const v = list[i];
      out[order[i]] = isHex(v) ? v : (next?.colors?.[targetKey]?.[order[i]] ?? '#000000');
    }
    ensure(next, ['colors']); next.colors[targetKey] = out; return next;
  });
}
function applyPaletteSaturation(tokens: Tokens, targets: TargetPalette[], dir: 'increase'|'decrease', mag: any) {
  return forTargets(tokens, targets, (t, targetKey) => {
    const next = JSON.parse(JSON.stringify(t));
    const pal = next?.colors?.[targetKey]; if (!pal) return t;
    const delta = (magToLDelta(mag) / 2) * (dir === 'increase' ? +1 : -1);
    next.colors[targetKey] = transformPalette(pal, (hex) => adjustSaturation(hex, delta)); return next;
  });
}
function applyPaletteHueShift(tokens: Tokens, targets: TargetPalette[], shift: 'warmer'|'cooler'|number) {
  const deg = typeof shift === 'number' ? shift : (shift === 'warmer' ? -8 : +8);
  return forTargets(tokens, targets, (t, targetKey) => {
    const next = JSON.parse(JSON.stringify(t));
    const pal = next?.colors?.[targetKey]; if (!pal) return t;
    next.colors[targetKey] = transformPalette(pal, (hex) => shiftHue(hex, deg)); return next;
  });
}
function applyPaletteContrast(tokens: Tokens, targets: TargetPalette[], mag: any) {
  return forTargets(tokens, targets, (t, targetKey) => {
    const next = JSON.parse(JSON.stringify(t));
    const pal = next?.colors?.[targetKey]; if (!pal) return t;
    next.colors[targetKey] = contrastPalette(pal, magToLDelta(mag) / 2); return next;
  });
}
function applyShadeAdjust(tokens: Tokens, targets: TargetPalette[], shade: ShadeKey, dir: 'lighter'|'darker', mag: any) {
  return forTargets(tokens, targets, (t, targetKey) => {
    const next = JSON.parse(JSON.stringify(t));
    const cur = next?.colors?.[targetKey]?.[shade]; if (!cur) return t;
    const delta = magToLDelta(mag) * (dir === 'lighter' ? +1 : -1);
    next.colors[targetKey][shade] = adjustLightness(cur, delta); return next;
  });
}
function applyShadeSetHex(tokens: Tokens, targets: TargetPalette[], shade: ShadeKey, hex: string) {
  return forTargets(tokens, targets, (t, targetKey) => {
    const next = JSON.parse(JSON.stringify(t));
    ensure(next, ['colors', targetKey]);
    next.colors[targetKey][shade] = hex; return next;
  });
}

// ---- Gradients ----
function applyGradientSet(tokens: Tokens, key: 'primary'|'secondary'|'accent'|'neutral', value: string) {
  const next = JSON.parse(JSON.stringify(tokens));
  ensure(next, ['gradients']); next.gradients[key] = value; return next;
}
function applyGradientFromPalette(tokens: Tokens, key: 'primary'|'secondary'|'accent'|'neutral', type: 'linear'|'radial', angleDeg: number|undefined, palette: TargetPalette, from: ShadeKey, to: ShadeKey) {
  const next = JSON.parse(JSON.stringify(tokens));
  const c1 = next?.colors?.[palette]?.[from];
  const c2 = next?.colors?.[palette]?.[to];
  if (!c1 || !c2) return tokens;
  const value = type === 'radial'
    ? `radial-gradient(circle, ${c1}, ${c2})`
    : `linear-gradient(${typeof angleDeg === 'number' ? angleDeg : 45}deg, ${c1}, ${c2})`;
  ensure(next, ['gradients']); next.gradients[key] = value; return next;
}

// ---- Overlay opacity ----
function parseRgbaAlpha(s: string): number | null {
  const m = /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(\d*\.?\d+)\s*\)/i.exec(s || '');
  return m ? parseFloat(m[1]) : null;
}
function applyOverlayOpacitySet(tokens: Tokens, opacity: number) {
  const next = JSON.parse(JSON.stringify(tokens));
  ensure(next, ['backgrounds']);
  const base = next?.colors?.neutral?.['900'] || '#000000';
  const current = next.backgrounds.overlay || '';
  const alpha = parseRgbaAlpha(current);
  next.backgrounds.overlay = hexToRgbaString(base, opacity);
  // keep other backgrounds untouched
  return next;
}
function applyOverlayOpacityScale(tokens: Tokens, direction: 'increase'|'decrease', byPercent?: number, mag?: any) {
  const next = JSON.parse(JSON.stringify(tokens));
  ensure(next, ['backgrounds']);
  const base = next?.colors?.neutral?.['900'] || '#000000';
  const current = next.backgrounds.overlay || '';
  const alpha = parseRgbaAlpha(current);
  const delta = byPercent != null ? (byPercent/100) : (mag ? (mag === 'slight' ? 0.05 : mag === 'moderate' ? 0.1 : 0.15) : 0.08);
  const newA = clamp((alpha ?? 0.5) + (direction === 'increase' ? +delta : -delta), 0, 1);
  next.backgrounds.overlay = hexToRgbaString(base, newA);
  return next;
}

// ---- Spacing ----
function applySpacingScale(tokens: Tokens, direction: 'increase'|'decrease', by?: number, mag?: any) {
  const next = JSON.parse(JSON.stringify(tokens));
  if (!next.spacing) return tokens;
  const factor = by ?? magToScale(mag ?? 'slight');
  const scale = direction === 'increase' ? factor : 1 / factor;
  Object.keys(next.spacing).forEach(k => {
    const n = parsePx(next.spacing[k]); if (n == null) return;
    const [min,max] = SPACING_RANGES[k] ?? [2,80];
    next.spacing[k] = toPx(clamp(n * scale, min, max));
  });
  return next;
}
function applySpacingAdjustKeys(tokens: Tokens, keys: string[], byPx?: number, setPx?: number) {
  const next = JSON.parse(JSON.stringify(tokens));
  for (const k of keys) {
    if (!next.spacing?.[k]) continue;
    const [min,max] = SPACING_RANGES[k] ?? [2,80];
    if (setPx != null) next.spacing[k] = toPx(clamp(setPx, min, max));
    else if (byPx != null) {
      const cur = parsePx(next.spacing[k]) ?? 0;
      next.spacing[k] = toPx(clamp(cur + byPx, min, max));
    }
  }
  return next;
}

// ---- Radii ----
function applyRadiiScale(tokens: Tokens, direction: 'increase'|'decrease', by: any) {
  const next = JSON.parse(JSON.stringify(tokens));
  if (!next.radii) return tokens;
  const delta = typeof by === 'number' ? by : (magToLDelta(by ?? 'slight') / 2);
  const sign = direction === 'increase' ? +1 : -1;
  for (const k of Object.keys(next.radii)) {
    if (!RADII_RANGES[k] || k === 'none' || k === 'full') continue;
    const cur = parsePx(next.radii[k]) ?? 0;
    const [min,max] = RADII_RANGES[k];
    next.radii[k] = toPx(clamp(cur + sign * delta, min, max));
  }
  return next;
}
function applyRadiiAdjustKeys(tokens: Tokens, keys: string[], byPx?: number, setPx?: number) {
  const next = JSON.parse(JSON.stringify(tokens));
  for (const k of keys) {
    if (!next.radii?.[k]) continue;
    const [min,max] = RADII_RANGES[k] ?? [0,32];
    if (setPx != null) next.radii[k] = toPx(clamp(setPx, min, max));
    else if (byPx != null) {
      const cur = parsePx(next.radii[k]) ?? 0;
      next.radii[k] = toPx(clamp(cur + byPx, min, max));
    }
  }
  return next;
}
function applyRadiiPreset(tokens: Tokens, preset: 'pill'|'square') {
  const next = JSON.parse(JSON.stringify(tokens));
  if (!next.radii) return tokens;
  if (preset === 'pill') {
    next.radii.sm = '9999px'; next.radii.md = '9999px'; next.radii.lg = '9999px'; next.radii.xl = '9999px'; next.radii['2xl'] = '9999px';
  } else {
    next.radii.sm = '0px'; next.radii.md = '0px'; next.radii.lg = '0px'; next.radii.xl = '0px'; next.radii['2xl'] = '0px';
  }
  return next;
}

// ---- Fonts ----
function applyFontFamilySet(tokens: Tokens, part: 'heading'|'body'|'mono'|'display', family: string) {
  const next = JSON.parse(JSON.stringify(tokens));
  next.fonts ??= {}; next.fonts[part] = family.trim(); return next;
}
function applyFontSizeScaleAll(tokens: Tokens, direction: 'larger'|'smaller', magnitude?: any, byPercent?: number) {
  const next = JSON.parse(JSON.stringify(tokens));
  if (!next.fontSizes) return tokens;
  const factor = byPercent ? (1 + byPercent/100) : magToScale(magnitude ?? 'slight');
  const scale = direction === 'larger' ? factor : 1 / factor;
  for (const k of Object.keys(next.fontSizes)) {
    const cur = parsePx(next.fontSizes[k]); if (cur == null) continue;
    const [min,max] = FONTSIZE_RANGES[k] ?? [10,72];
    next.fontSizes[k] = toPx(clamp(cur * scale, min, max));
  }
  return next;
}
function applyFontSizeAdjust(tokens: Tokens, keys: string[], direction?: 'larger'|'smaller', magnitude?: any, byPx?: number, setPx?: number) {
  const next = JSON.parse(JSON.stringify(tokens));
  if (!next.fontSizes) return tokens;
  for (const k of keys) {
    if (!next.fontSizes[k]) continue;
    const [min,max] = FONTSIZE_RANGES[k] ?? [10,72];
    if (setPx != null) { next.fontSizes[k] = toPx(clamp(setPx, min, max)); continue; }
    if (byPx != null) { const cur = parsePx(next.fontSizes[k]) ?? 0; next.fontSizes[k] = toPx(clamp(cur + byPx, min, max)); continue; }
    const delta = (magnitude ? (magnitude === 'slight' ? 2 : magnitude === 'moderate' ? 4 : 6) : 2) * (direction === 'larger' ? +1 : -1);
    const cur = parsePx(next.fontSizes[k]) ?? 0;
    next.fontSizes[k] = toPx(clamp(cur + delta, min, max));
  }
  return next;
}
function applyFontWeightSet(tokens: Tokens, key: any, value: number) {
  const next = JSON.parse(JSON.stringify(tokens));
  ensure(next, ['fontWeights']); next.fontWeights[key] = String(Math.max(100, Math.min(900, Math.round(value/100)*100)));
  return next;
}

// ---- Line heights ----
function applyLineHeightScale(tokens: Tokens, direction: 'looser'|'tighter', magnitude?: any, by?: number) {
  const next = JSON.parse(JSON.stringify(tokens));
  if (!next.lineHeights) return tokens;
  const delta = by ?? (magnitude === 'strong' ? 0.2 : magnitude === 'moderate' ? 0.12 : 0.08);
  const sign = direction === 'looser' ? +1 : -1;
  for (const key of Object.keys(next.lineHeights)) {
    if (!LINEHEIGHT_RANGES[key] && key !== 'normal' && key !== 'none' && key !== 'loose') continue;
    const cur = parseFloat(String(next.lineHeights[key])); if (isNaN(cur)) continue;
    const range = LINEHEIGHT_RANGES[key] ?? [1,2];
    next.lineHeights[key] = String(clamp(cur + sign * delta, range[0], range[1]));
  }
  return next;
}
function applyLineHeightSet(tokens: Tokens, key: 'tight'|'snug'|'relaxed', value: number) {
  const next = JSON.parse(JSON.stringify(tokens));
  if (!next.lineHeights) return tokens;
  const [min,max] = LINEHEIGHT_RANGES[key] ?? [1,2];
  next.lineHeights[key] = String(clamp(value, min, max));
  return next;
}

// ---- Shadows ----
function tweakShadow(sh: string, direction: 'stronger'|'softer') {
  const parts = sh.split(/\s*,\s*/);
  return parts.map(seg => {
    const rgba = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*(\d*\.?\d+))?\s*\)/i.exec(seg);
    let alpha = rgba?.[1] ? parseFloat(rgba[1]) : 0.1;
    const nums = seg.match(/-?\d+px/g) || [];
    const px = nums.map(n => parseInt(n));
    if (px.length >= 3) {
      const factor = direction === 'stronger' ? 1.2 : 0.85;
      px[2] = Math.max(0, Math.round(px[2] * factor)); // blur
      if (px[3] != null) px[3] = Math.round(px[3] * factor); // spread
      alpha = clamp(alpha * (direction === 'stronger' ? 1.25 : 0.8), 0.03, 0.35);
      let idx = 0;
      let rebuilt = seg.replace(/-?\d+px/g, () => `${px[idx++]}px`);
      rebuilt = rebuilt.replace(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*\d*\.?\d+)?\s*\)/i, (m: string) =>
        m.replace(/(\d*\.?\d+)\s*\)$/, `${alpha.toFixed(2)})`));
      return rebuilt;
    }
    return seg;
  }).join(', ');
}
function applyShadowsStrength(tokens: Tokens, direction: 'stronger'|'softer') {
  const next = JSON.parse(JSON.stringify(tokens));
  if (!next.shadows) return tokens;
  for (const k of Object.keys(next.shadows)) {
    if (typeof next.shadows[k] !== 'string') continue;
    next.shadows[k] = tweakShadow(next.shadows[k], direction);
  }
  return next;
}
function applyShadowsStrengthKeys(tokens: Tokens, keys: string[], direction: 'stronger'|'softer') {
  const next = JSON.parse(JSON.stringify(tokens));
  if (!next.shadows) return tokens;
  for (const k of keys) {
    if (typeof next.shadows[k] !== 'string') continue;
    next.shadows[k] = tweakShadow(next.shadows[k], direction);
  }
  return next;
}

// ---- Borders ----
function applyBordersWidthScale(tokens: Tokens, direction: 'thicker'|'thinner') {
  const next = JSON.parse(JSON.stringify(tokens));
  const delta = direction === 'thicker' ? +1 : -1;
  if (next?.borders?.widths) {
    for (const key of Object.keys(next.borders.widths)) {
      const cur = parsePx(next.borders.widths[key]) ?? 0;
      const v = clamp(cur + delta, 0, 8);
      next.borders.widths[key] = toPx(v);
    }
  }
  return next;
}
function applyBordersWidthSet(tokens: Tokens, which: 'thin'|'thick', px: number) {
  const next = JSON.parse(JSON.stringify(tokens));
  if (!next?.borders?.widths) return tokens;
  next.borders.widths[which] = toPx(clamp(px, 0, 8));
  return next;
}
function applyBordersStyleSet(tokens: Tokens, style: string) {
  const next = JSON.parse(JSON.stringify(tokens));
  if (!next?.borders?.styles) return tokens;
  next.borders.styles[style] = style;
  return next;
}

// ---- Animations ----
function applyAnimationDurationScale(tokens: Tokens, direction: 'faster'|'slower', magnitude?: any, byPercent?: number) {
  const next = JSON.parse(JSON.stringify(tokens));
  const factor = byPercent ? (1 + byPercent/100) : (magnitude ? magToScale(magnitude) : 1.1);
  const scale = direction === 'faster' ? 1 / factor : factor;
  const keys = ['fast','normal','slow'];
  for (const k of keys) {
    const raw = String(next?.animations?.duration?.[k] ?? '');
    const m = /(\d+)\s*ms/i.exec(raw);
    if (!m) continue;
    const cur = parseInt(m[1], 10);
    next.animations.duration[k] = `${Math.max(50, Math.round(cur * scale))}ms`;
  }
  return next;
}
function applyAnimationDurationSet(tokens: Tokens, key: 'fast'|'normal'|'slow', ms: number) {
  const next = JSON.parse(JSON.stringify(tokens));
  ensure(next, ['animations','duration']);
  next.animations.duration[key] = `${Math.max(50, Math.round(ms))}ms`;
  return next;
}
function applyAnimationEasingSet(tokens: Tokens, easing: 'linear'|'ease'|'ease-in'|'ease-out'|'ease-in-out') {
  const next = JSON.parse(JSON.stringify(tokens));
  ensure(next, ['animations','easing']);
  next.animations.easing.linear = 'linear';
  next.animations.easing['ease'] = 'ease';
  next.animations.easing['easeIn'] = 'ease-in';
  next.animations.easing['easeOut'] = 'ease-out';
  next.animations.easing['easeInOut'] = 'ease-in-out';
  return next;
}

// ---- Breakpoints ----
function applyBreakpointsScale(tokens: Tokens, byPx: number) {
  const next = JSON.parse(JSON.stringify(tokens));
  if (!next.breakpoints) return tokens;
  for (const k of BREAKPOINT_KEYS) {
    const raw = String(next.breakpoints[k] ?? '');
    const m = /(\d+)\s*px/i.exec(raw);
    if (!m) continue;
    const cur = parseInt(m[1],10);
    next.breakpoints[k] = `${Math.max(320, cur + byPx)}px`;
  }
  return next;
}
function applyBreakpointsSet(tokens: Tokens, key: 'sm'|'md'|'lg'|'xl'|'2xl', px: number) {
  const next = JSON.parse(JSON.stringify(tokens));
  ensure(next, ['breakpoints']);
  next.breakpoints[key] = `${Math.max(320, px)}px`;
  return next;
}

// ---- Density presets (composite ops) ----
function applyDensityPreset(tokens: Tokens, level: 'compact'|'cozy'|'comfortable'|'spacious') {
  let next = JSON.parse(JSON.stringify(tokens));
  switch (level) {
    case 'compact':
      next = applySpacingScale(next, 'decrease', undefined, 'moderate');
      next = applyLineHeightScale(next, 'tighter', 'slight');
      break;
    case 'cozy':
      next = applySpacingScale(next, 'decrease', undefined, 'slight');
      next = applyLineHeightScale(next, 'tighter', 'slight');
      break;
    case 'comfortable':
      next = applySpacingScale(next, 'increase', undefined, 'slight');
      next = applyLineHeightScale(next, 'looser', 'slight');
      break;
    case 'spacious':
      next = applySpacingScale(next, 'increase', undefined, 'moderate');
      next = applyLineHeightScale(next, 'looser', 'moderate');
      break;
  }
  return next;
}

// ---- Dispatcher ----
export function applyParsedOps(tokens: Tokens, ops: ParsedOp[]) {
  let next = JSON.parse(JSON.stringify(tokens));

  for (const op of ops) {
    switch (op.kind) {
      case 'paletteReplaceByFamily': next = applyPaletteReplaceByFamily(next, op.targets, op.to, (op as any).saturation); break;
      case 'paletteReplaceByHex': next = applyPaletteReplaceByHex(next, op.targets, op.hex); break;
      case 'paletteReplaceWithList': next = applyPaletteReplaceWithList(next, op.targets, op.list); break;
      case 'paletteSaturation': next = applyPaletteSaturation(next, op.targets, op.direction, op.magnitude); break;
      case 'paletteHueShift': next = applyPaletteHueShift(next, op.targets, op.shift); break;
      case 'paletteContrast': next = applyPaletteContrast(next, op.targets, op.magnitude); break;
      case 'shadeAdjust': next = applyShadeAdjust(next, op.targets, op.shade, op.direction, op.magnitude); break;
      case 'shadeSetHex': next = applyShadeSetHex(next, op.targets, op.shade, op.hex); break;

      case 'gradientSet': next = applyGradientSet(next, op.key, op.value); break;
      case 'gradientFromPalette': next = applyGradientFromPalette(next, op.key, op.type, op.angleDeg, op.palette, op.from, op.to); break;

      case 'overlayOpacitySet': next = applyOverlayOpacitySet(next, op.opacity); break;
      case 'overlayOpacityScale': next = applyOverlayOpacityScale(next, op.direction, op.byPercent, op.magnitude); break;

      case 'spacingScale': next = applySpacingScale(next, op.direction, op.by, op.magnitude); break;
      case 'spacingAdjustKeys': next = applySpacingAdjustKeys(next, op.keys, op.byPx, op.setPx); break;

      case 'radiiScale': next = applyRadiiScale(next, op.direction, op.magnitude); break;
      case 'radiiAdjustKeys': next = applyRadiiAdjustKeys(next, op.keys, op.byPx, op.setPx); break;
      case 'radiiPreset': next = applyRadiiPreset(next, op.preset); break;

      case 'fontFamilySet': next = applyFontFamilySet(next, op.part, op.family); break;
      case 'fontSizeScaleAll': next = applyFontSizeScaleAll(next, op.direction, op.magnitude, op.byPercent); break;
      case 'fontSizeAdjust': next = applyFontSizeAdjust(next, op.keys, op.direction, op.magnitude, op.byPx, op.setPx); break;
      case 'fontWeightSet': next = applyFontWeightSet(next, op.key, op.value); break;

      case 'lineHeightScale': next = applyLineHeightScale(next, op.direction, op.magnitude, op.by); break;
      case 'lineHeightSet': next = applyLineHeightSet(next, op.key, op.value); break;

      case 'shadowsStrength': next = applyShadowsStrength(next, op.direction); break;
      case 'shadowsStrengthKeys': next = applyShadowsStrengthKeys(next, op.keys, op.direction); break;

      case 'bordersWidthScale': next = applyBordersWidthScale(next, op.direction); break;
      case 'bordersWidthSet': next = applyBordersWidthSet(next, op.which, op.px); break;
      case 'bordersStyleSet': next = applyBordersStyleSet(next, op.style); break;

      case 'animationDurationScale': next = applyAnimationDurationScale(next, op.direction, op.magnitude, op.byPercent); break;
      case 'animationDurationSet': next = applyAnimationDurationSet(next, op.key, op.ms); break;
      case 'animationEasingSet': next = applyAnimationEasingSet(next, op.easing); break;

      case 'breakpointsScale': next = applyBreakpointsScale(next, op.byPx); break;
      case 'breakpointsSet': next = applyBreakpointsSet(next, op.key, op.px); break;

      case 'densityPreset': next = applyDensityPreset(next, op.level); break;
    }
  }

  return { next, diff: jsonpatch.compare(tokens, next) };
}
