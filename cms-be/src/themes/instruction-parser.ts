// src/theme/instruction-parser.ts
import { ColorFamily, colorFamilyFromWord, isHex, ShadeKey, SHADE_KEYS } from './theme-utils';

export type Magnitude = 'slight' | 'moderate' | 'strong';

export type TargetPalette =
  | 'brand' | 'accent' | 'neutral' | 'success' | 'warning' | 'error' | 'info';

export type GradientKey = 'primary'|'secondary'|'accent'|'neutral';
export type GradientType = 'linear'|'radial';
export type EasingName = 'linear'|'ease'|'ease-in'|'ease-out'|'ease-in-out';

export type ParsedOp =
  // Colors
  | { kind: 'paletteReplaceByFamily'; targets: TargetPalette[]; to: ColorFamily; saturation?: Magnitude|number }
  | { kind: 'paletteReplaceByHex'; targets: TargetPalette[]; hex: string }
  | { kind: 'paletteReplaceWithList'; targets: TargetPalette[]; list: string[] } // 10 hexes
  | { kind: 'paletteSaturation'; targets: TargetPalette[]; direction: 'increase'|'decrease'; magnitude: Magnitude }
  | { kind: 'paletteHueShift'; targets: TargetPalette[]; shift: 'warmer'|'cooler'|number }
  | { kind: 'paletteContrast'; targets: TargetPalette[]; magnitude: Magnitude }
  | { kind: 'shadeAdjust'; targets: TargetPalette[]; shade: ShadeKey; direction: 'lighter'|'darker'; magnitude: Magnitude }
  | { kind: 'shadeSetHex'; targets: TargetPalette[]; shade: ShadeKey; hex: string }

  // Gradients
  | { kind: 'gradientSet'; key: GradientKey; value: string }
  | { kind: 'gradientFromPalette'; key: GradientKey; type: GradientType; angleDeg?: number; palette: TargetPalette; from: ShadeKey; to: ShadeKey }

  // Backgrounds / overlays
  | { kind: 'overlayOpacitySet'; opacity: number } // 0..1
  | { kind: 'overlayOpacityScale'; direction: 'increase'|'decrease'; byPercent?: number; magnitude?: Magnitude }

  // Spacing
  | { kind: 'spacingScale'; direction: 'increase'|'decrease'; by?: number; magnitude?: Magnitude }
  | { kind: 'spacingAdjustKeys'; keys: Array<'xs'|'sm'|'md'|'lg'|'xl'|'2xl'|'3xl'>; byPx?: number; setPx?: number }

  // Radii
  | { kind: 'radiiScale'; direction: 'increase'|'decrease'; magnitude: Magnitude|number }
  | { kind: 'radiiAdjustKeys'; keys: Array<'sm'|'md'|'lg'|'xl'|'2xl'>; byPx?: number; setPx?: number }
  | { kind: 'radiiPreset'; preset: 'pill'|'square' }

  // Fonts & sizes
  | { kind: 'fontFamilySet'; part: 'heading'|'body'|'mono'|'display'; family: string }
  | { kind: 'fontSizeScaleAll'; direction: 'larger'|'smaller'; magnitude?: Magnitude; byPercent?: number }
  | { kind: 'fontSizeAdjust'; keys: Array<'xs'|'sm'|'md'|'lg'|'xl'|'2xl'|'3xl'|'4xl'|'5xl'|'6xl'>; direction?: 'larger'|'smaller'; magnitude?: Magnitude; byPx?: number; setPx?: number }
  | { kind: 'fontWeightSet'; key: 'hairline'|'thin'|'light'|'normal'|'medium'|'semibold'|'bold'|'extrabold'|'black'; value: number }

  // Line heights
  | { kind: 'lineHeightScale'; direction: 'looser'|'tighter'; magnitude?: Magnitude; by?: number }
  | { kind: 'lineHeightSet'; key: 'tight'|'snug'|'relaxed'; value: number }

  // Shadows
  | { kind: 'shadowsStrength'; direction: 'stronger'|'softer' }
  | { kind: 'shadowsStrengthKeys'; keys: Array<'xs'|'sm'|'md'|'lg'|'xl'|'2xl'>; direction: 'stronger'|'softer' }

  // Borders
  | { kind: 'bordersWidthScale'; direction: 'thicker'|'thinner' }
  | { kind: 'bordersWidthSet'; which: 'thin'|'thick'; px: number }
  | { kind: 'bordersStyleSet'; style: 'solid'|'dashed'|'dotted'|'double'|'groove'|'ridge'|'inset'|'outset' }

  // Animations
  | { kind: 'animationDurationScale'; direction: 'faster'|'slower'; magnitude?: Magnitude; byPercent?: number }
  | { kind: 'animationDurationSet'; key: 'fast'|'normal'|'slow'; ms: number }
  | { kind: 'animationEasingSet'; easing: EasingName }

  // Breakpoints
  | { kind: 'breakpointsScale'; byPx: number }
  | { kind: 'breakpointsSet'; key: 'sm'|'md'|'lg'|'xl'|'2xl'; px: number }

  // Density preset (maps to multiple small adjustments)
  | { kind: 'densityPreset'; level: 'compact'|'cozy'|'comfortable'|'spacious' }
  ;

const MAG_WORDS: Record<string, Magnitude> = {
  slightly: 'slight', slight: 'slight', a_little: 'slight', a_bit: 'slight',
  somewhat: 'moderate', moderately: 'moderate', noticeable: 'moderate',
  significantly: 'strong', strongly: 'strong', very: 'strong', a_lot: 'strong',
};

const GROUPS: Record<string, TargetPalette[]> = {
  notifications: ['success','warning','error','info'],
  statuses:      ['success','warning','error','info'],
  alerts:        ['success','warning','error','info'],
  all:           ['brand','accent','neutral','success','warning','error','info'],
  allcolors:     ['brand','accent','neutral','success','warning','error','info'],
};

const BREAKPOINT_ALIASES: Record<string,'sm'|'md'|'lg'|'xl'|'2xl'> = {
  mobile:'sm', phone:'sm', handset:'sm',
  tablet:'md', tab:'md',
  laptop:'lg', desktop:'lg',
  'large desktop':'xl', large:'xl', wide:'xl',
  '2xl':'2xl', ultrawide:'2xl',
};

function norm(s: string) {
  return s
    .replace(/\band\b/gi, ' and ')
    .replace(/\ba little\b/gi, ' a_little ')
    .replace(/\ba bit\b/gi, ' a_bit ')
    .replace(/\s+/g, ' ')
    .trim();
}

function magnitude(text: string): Magnitude {
  const t = text.toLowerCase();
  for (const k of Object.keys(MAG_WORDS)) if (t.includes(k)) return MAG_WORDS[k];
  return 'slight';
}

function pickTargets(text: string): TargetPalette[] | null {
  const t = text.toLowerCase();
  const found = new Set<TargetPalette>();
  const map: Record<string, TargetPalette> = {
    brand:'brand', primary:'brand', accent:'accent', secondary:'accent',
    neutral:'neutral', gray:'neutral', grey:'neutral',
    success:'success', ok:'success', positive:'success',
    warning:'warning', caution:'warning',
    error:'error', danger:'error', critical:'error', negative:'error',
    info:'info', informational:'info', notice:'info',
  };
  for (const key of Object.keys(map)) {
    if (new RegExp(`\\b${key}\\b`, 'i').test(text)) {
      found.add(map[key]);
    }
  }
  
  if (found.size > 0) {
    return Array.from(found);
  }
  
  for (const k of Object.keys(GROUPS)) {
    if (new RegExp(`\\b${k}\\b`).test(t)) {
      return GROUPS[k];
    }
  }
  
  return null;
}

function parseShade(text: string): ShadeKey | null {
  const m = /\b(50|100|200|300|400|500|600|700|800|900)\b/i.exec(text);
  return (m?.[1] as ShadeKey) ?? null;
}
function collectHexList(text: string): string[] {
  const list = text.match(/#[0-9a-f]{3,6}/gi) || [];
  return list.map(h => h);
}
function parsePercentValue(text: string): number | null {
  const m = /(-?\d+(?:\.\d+)?)\s*%/i.exec(text);
  return m ? parseFloat(m[1]) / 100 : null;
}
function parsePxValue(text: string): number | null {
  const m = /(-?\d+(?:\.\d+)?)\s*px\b/i.exec(text);
  return m ? parseFloat(m[1]) : null;
}
function parseNumber(text: string): number | null {
  const m = /(-?\d+(?:\.\d+)?)/.exec(text);
  return m ? parseFloat(m[1]) : null;
}
function parseFontPart(text: string): 'heading'|'body'|'mono'|'display' | null {
  const t = text.toLowerCase();
  if (/\b(heading|headings|titles?)\b/.test(t)) return 'heading';
  if (/\b(body|text|paragraph)\b/.test(t)) return 'body';
  if (/\b(mono|monospace|code)\b/.test(t)) return 'mono';
  if (/\b(display)\b/.test(t)) return 'display';
  return null;
}
function parseFontKeys(text: string) {
  const keys: Array<'xs'|'sm'|'md'|'lg'|'xl'|'2xl'|'3xl'|'4xl'|'5xl'|'6xl'> = [];
  for (const k of ['xs','sm','md','lg','xl','2xl','3xl','4xl','5xl','6xl'] as const) {
    const re = new RegExp(`\\b${k}\\b`, 'i');
    if (re.test(text)) keys.push(k);
  }
  return keys;
}
function parseSpacingKeys(text: string) {
  const keys: Array<'xs'|'sm'|'md'|'lg'|'xl'|'2xl'|'3xl'> = [];
  for (const k of ['xs','sm','md','lg','xl','2xl','3xl'] as const) {
    const re = new RegExp(`\\b${k}\\b`, 'i');
    if (re.test(text)) keys.push(k);
  }
  return keys;
}
function parseShadowKeys(text: string) {
  const keys: Array<'xs'|'sm'|'md'|'lg'|'xl'|'2xl'> = [];
  for (const k of ['xs','sm','md','lg','xl','2xl'] as const) {
    const re = new RegExp(`\\b${k}\\b`, 'i');
    if (re.test(text)) keys.push(k);
  }
  return keys;
}
function toGradientKey(text: string): GradientKey | null {
  const t = text.toLowerCase();
  if (/\bprimary\b/.test(t)) return 'primary';
  if (/\bsecondary\b/.test(t)) return 'secondary';
  if (/\baccent\b/.test(t)) return 'accent';
  if (/\bneutral\b/.test(t)) return 'neutral';
  return null;
}
function gradientAngle(text: string): number | undefined {
  if (/vertical|top\s*to\s*bottom|to\s*bottom/i.test(text)) return 180;
  if (/horizontal|left\s*to\s*right|to\s*right/i.test(text)) return 90;
  const m = /(-?\d+(?:\.\d+)?)\s*deg/i.exec(text);
  return m ? parseFloat(m[1]) : undefined;
}
function gradientType(text: string): GradientType {
  return /radial/i.test(text) ? 'radial' : 'linear';
}

// --- helper: extract color families mentioned in free-form text ---
function extractFamilies(text: string): ColorFamily[] {
  const seen = new Set<ColorFamily>();
  const out: ColorFamily[] = [];
  const tokens = text.toLowerCase().split(/[^a-z]+/);
  for (const tok of tokens) {
    if (!tok) continue;
    const fam = colorFamilyFromWord(tok);
    if (fam && !seen.has(fam)) { seen.add(fam); out.push(fam); }
  }
  return out;
}

// --- segmentation: split complex instructions into manageable clauses ---
function segment(text: string): string[] {
  const hardSplit = text.split(/(?<=[.;])\s+/);
  const parts: string[] = [];
  for (const h of hardSplit) {
    // split on ' also ', ' plus ', ' as well ', ' then '
    const mids = h.split(/\s+(?:also|plus|as well as|as well|then)\s+/i);
    for (const m of mids) {
      // careful split on ' and ' only if both sides look like independent edit clauses
      const tokens = m.split(/\s+and\s+/i);
      if (tokens.length === 1) { parts.push(tokens[0]); continue; }
      // heuristics: if both sides mention any edit keyword, split; else keep together
      const kw = /(color|palette|spacing|radius|radii|corner|font|size|line|height|shadow|border|animation|easing|breakpoint|gradient|overlay|opacity)/i;
      let buf = [tokens[0]];
      for (let i=1;i<tokens.length;i++) {
        const prev = buf[buf.length-1];
        const cur = tokens[i];
        if (kw.test(prev) && kw.test(cur)) { parts.push(buf.join(' and ')); buf=[cur]; }
        else { buf.push(cur); }
      }
      parts.push(buf.join(' and '));
    }
  }
  return parts.map(p => p.trim()).filter(Boolean);
}

// ----- Single-clause parse (returns 0..n ops) -----
export function parseInstructionSingle(clause: string): ParsedOp[] {
  const text = norm(clause);
  const ops: ParsedOp[] = [];

  // ===== Density presets =====
  if (/\b(compact|denser|dense)\b/i.test(text)) { ops.push({ kind:'densityPreset', level:'compact' }); return ops; }
  if (/\b(cozy)\b/i.test(text)) { ops.push({ kind:'densityPreset', level:'cozy' }); return ops; }
  if (/\b(comfortable)\b/i.test(text)) { ops.push({ kind:'densityPreset', level:'comfortable' }); return ops; }
  if (/\b(spacious|roomier|airy)\b/i.test(text)) { ops.push({ kind:'densityPreset', level:'spacious' }); return ops; }


  // ===== High-level: "<color1> and <color2> theme" (no explicit targets) =====
  if (/(theme|scheme|palette|color\s*scheme|colour\s*scheme)/i.test(text)) {
    const fams = extractFamilies(text);
    if (fams.length >= 2) {
      const neutralCandidates: ColorFamily[] = fams.filter(f => f === 'gray' || f === 'slate' || f === 'neutral');
      const neutr = neutralCandidates.length ? neutralCandidates[0] : null;
      const nonNeutral = fams.filter(f => f !== 'gray' && f !== 'slate' && f !== 'neutral');
      if (neutr && nonNeutral.length) {
        ops.push({ kind:'paletteReplaceByFamily', targets:['neutral'], to: neutr });
        ops.push({ kind:'paletteReplaceByFamily', targets:['brand','accent'], to: nonNeutral[0] });
        return ops;
      }
      if (!neutr) {
        // both colors are chromatic: first => brand, second => accent
        ops.push({ kind:'paletteReplaceByFamily', targets:['brand'], to: fams[0] });
        ops.push({ kind:'paletteReplaceByFamily', targets:['accent'], to: fams[1] });
        return ops;
      }
    } else if (fams.length === 1) {
      // Single-color theme: apply to brand & accent
      ops.push({ kind:'paletteReplaceByFamily', targets:['brand','accent'], to: fams[0] });
      return ops;
    }
  }
  // ===== Gradients =====
  if (/gradient/i.test(text)) {
    const key = toGradientKey(text);
    if (key) {
      // explicit value
      if (/linear-gradient|radial-gradient/i.test(text)) {
        const value = text.match(/(linear-gradient\(.*?\)|radial-gradient\(.*?\))/i)?.[1];
        if (value) { ops.push({ kind:'gradientSet', key, value }); return ops; }
      }
      // build from palette + shades
      const type = gradientType(text);
      const angle = gradientAngle(text);
      const palTargets = pickTargets(text) || ['brand'];
      const shadeFrom = parseShade(text) || '400';
      const shadeTo = (text.match(/\b(50|100|200|300|400|500|600|700|800|900)\b.*?(?:to|-|→)\s*(50|100|200|300|400|500|600|700|800|900)/i)?.[2] as ShadeKey) || '600';
      // use first palette target mentioned
      ops.push({ kind:'gradientFromPalette', key, type, angleDeg: angle, palette: palTargets[0], from: shadeFrom, to: shadeTo });
      return ops;
    }
  }

  // ===== Overlay / backgrounds (opacity) =====
  if (/\boverlay\b/i.test(text) && /opacity|transparen/i.test(text)) {
    const pct = parsePercentValue(text);
    const val = parseNumber(text);
    if (pct != null) { // e.g., increase overlay opacity by 10%
      const dir = /(increase|more|stronger|darker)/i.test(text) ? 'increase' : 'decrease';
      ops.push({ kind:'overlayOpacityScale', direction: dir, byPercent: Math.abs(pct*100) });
      return ops;
    }
    if (val != null && val <= 1.0) { ops.push({ kind:'overlayOpacitySet', opacity: Math.max(0, Math.min(1, val)) }); return ops; }
    if (val != null && val > 1.0 && val <= 100.0) { ops.push({ kind:'overlayOpacitySet', opacity: Math.max(0, Math.min(1, val/100)) }); return ops; }
  }

  // ===== Colors: palette replace by family / multi-target =====
  if (/(update|change|switch|set|make)/i.test(text) && /(brand|primary|accent|secondary|neutral|gray|grey|success|warning|error|danger|info|notifications|alerts|statuses|all colors|all)/i.test(text)) {
    const targets = pickTargets(text) || ['brand'];
    // with list of 10 hexes
    if (/#/.test(text)) {
      const list = collectHexList(text);
      if (list.length === 10) { ops.push({ kind:'paletteReplaceWithList', targets, list }); return ops; }
      // single base hex => derive palette
      const hex = text.match(/#[0-9a-f]{3,6}/i)?.[0];
      if (hex && isHex(hex)) { ops.push({ kind:'paletteReplaceByHex', targets, hex }); return ops; }
    }
    
    // Check for direct color family: "make accent colors purple", "set brand colors blue"
    const colorFamilyMatch = text.match(/\b(?:make|set|change|update|switch)\s+(?:the\s+)?(?:brand|primary|accent|secondary|neutral|gray|grey|success|warning|error|danger|info)\s+colors?\s+(\w+)/i);
    if (colorFamilyMatch) {
      const colorWord = colorFamilyMatch[1];
      const fam = colorFamilyFromWord(colorWord);
      if (fam) { 
        ops.push({ kind:'paletteReplaceByFamily', targets, to: fam }); 
        return ops; 
      }
    }
    
    // to <family> or "towards <family>"
    const toWord = /\b(?:to|as|towards)\s+([a-z-]+)\b/i.exec(text)?.[1];
    if (toWord) {
      const fam = colorFamilyFromWord(toWord);
      if (fam) { ops.push({ kind:'paletteReplaceByFamily', targets, to: fam }); return ops; }
    }
  }

  // Colors: single shade set hex
  const shadeHex = /(set|make|update).*(brand|primary|accent|secondary|neutral|gray|grey|success|warning|error|danger|info).*\b(50|100|200|300|400|500|600|700|800|900)\b.*?(to|as)\s*(#[0-9a-f]{3,6})/i.exec(text);
  if (shadeHex) {
    const targets = pickTargets(shadeHex[2]) || ['brand'];
    const shade = shadeHex[3] as ShadeKey;
    const hex = shadeHex[5];
    if (isHex(hex)) { ops.push({ kind:'shadeSetHex', targets, shade, hex }); return ops; }
  }

  // Colors: shade adjust lighter/darker
  const shadeTweak = /(brand|primary|accent|secondary|neutral|gray|grey|success|warning|error|danger|info|notifications|alerts|statuses|all).*(?:color\s*)?(\b50|100|200|300|400|500|600|700|800|900\b).*?(lighter|darker)/i.exec(text);
  if (shadeTweak) {
    const targets = pickTargets(shadeTweak[1]) || ['brand'];
    const shade = shadeTweak[2] as ShadeKey;
    const dir = shadeTweak[3].toLowerCase() as 'lighter'|'darker';
    ops.push({ kind:'shadeAdjust', targets, shade, direction: dir, magnitude: magnitude(text) });
    return ops;
  }

  // Colors: saturation (vibrant/pastel/muted/washed out)
  if (/(saturate|more\s+vibrant|increase\s+saturation|muted|pastel|desaturate|washed\s*out|less\s+saturated)/i.test(text)) {
    const targets = pickTargets(text) || ['accent'];
    const dir = /(saturate|more\s+vibrant|increase\s+saturation)/i.test(text) ? 'increase' : 'decrease';
    ops.push({ kind:'paletteSaturation', targets, direction: dir, magnitude: magnitude(text) });
    return ops;
  }

  // Colors: hue shift warmer/cooler or “shift hue by N deg”
  if (/(warmer|cooler|shift\s*hue)/i.test(text) && /(brand|accent|neutral|success|warning|error|info|notifications|alerts|statuses|all)/i.test(text)) {
    const targets = pickTargets(text) || ['brand'];
    const m = /shift\s*hue\s*(?:by\s*)?(-?\d+)/i.exec(text);
    if (m) ops.push({ kind:'paletteHueShift', targets, shift: parseInt(m[1],10) });
    else if (/warmer/i.test(text)) ops.push({ kind:'paletteHueShift', targets, shift:'warmer' });
    else if (/cooler/i.test(text)) ops.push({ kind:'paletteHueShift', targets, shift:'cooler' });
    return ops;
  }

  // Colors: increase contrast
  if (/(increase|boost|raise|higher)\s+contrast|more\s+contrast/i.test(text)) {
    const targets = pickTargets(text) || ['neutral'];
    ops.push({ kind:'paletteContrast', targets, magnitude: magnitude(text) });
    return ops;
  }

  // ===== Spacing =====
  if (/spacing|gaps?|gutters?|whitespace|white\s*space|density/i.test(text)) {
    const spKeys = parseSpacingKeys(text);
    if (spKeys.length) {
      const setPx = parsePxValue(text);
      if (setPx != null) { ops.push({ kind:'spacingAdjustKeys', keys: spKeys, setPx }); return ops; }
      const byPx = /(?:by|plus|\+)\s*(-?\d+(?:\.\d+)?)\s*px/i.exec(text)?.[1];
      if (byPx) { ops.push({ kind:'spacingAdjustKeys', keys: spKeys, byPx: parseFloat(byPx) }); return ops; }
    }
    // global scale (increase/decrease or percent)
    const pct = parsePercentValue(text);
    if (pct != null) { ops.push({ kind:'spacingScale', direction: pct >= 0 ? 'increase' : 'decrease', by: 1 + Math.abs(pct) }); return ops; }
    if (/(increase|more|roomier|looser)/i.test(text)) { ops.push({ kind:'spacingScale', direction:'increase', magnitude: magnitude(text) }); return ops; }
    if (/(decrease|reduce|less|compact|denser|tighter)/i.test(text)) { ops.push({ kind:'spacingScale', direction:'decrease', magnitude: magnitude(text) }); return ops; }
  }

  // ===== Radii =====
  if (/radius|radii|corner|rounded|pill|square|sharp(er)?/i.test(text)) {
    if (/\bpill\b/i.test(text)) { ops.push({ kind:'radiiPreset', preset:'pill' }); return ops; }
    if (/\bsquare|sharp(er)?\b/i.test(text)) { ops.push({ kind:'radiiPreset', preset:'square' }); return ops; }
    const keys: Array<'sm'|'md'|'lg'|'xl'|'2xl'> = [];
    for (const k of ['sm','md','lg','xl','2xl'] as const) if (new RegExp(`\\b${k}\\b`, 'i').test(text)) keys.push(k);
    const setPx = parsePxValue(text);
    if (keys.length && setPx != null) { ops.push({ kind:'radiiAdjustKeys', keys, setPx }); return ops; }
    const byPx = /(?:by|plus|\+)\s*(-?\d+(?:\.\d+)?)\s*px/i.exec(text)?.[1];
    if (keys.length && byPx) { ops.push({ kind:'radiiAdjustKeys', keys, byPx: parseFloat(byPx) }); return ops; }
    const dir = /(increase|more|rounder|more\s+rounded)/i.test(text) ? 'increase' : /(decrease|less|sharper|more\s+square)/i.test(text) ? 'decrease' : null;
    if (dir) { ops.push({ kind:'radiiScale', direction: dir, magnitude: magnitude(text) }); return ops; }
  }

  // ===== Fonts =====
  if (/font|typeface|typography/i.test(text)) {
    // families
    if (/heading|headings|title/.test(text)) {
      const fam = /(?:use|set|make)\s+([A-Za-z0-9 ,'-]+)\s+(?:for\s+headings|as\s+heading|heading\s+font)/i.exec(text)?.[1];
      if (fam) { ops.push({ kind:'fontFamilySet', part:'heading', family: fam.trim() }); return ops; }
    }
    if (/\bbody\b/.test(text)) {
      const fam = /(?:use|set|make)\s+([A-Za-z0-9 ,'-]+)\s+(?:for\s+body|as\s+body|body\s+font)/i.exec(text)?.[1];
      if (fam) { ops.push({ kind:'fontFamilySet', part:'body', family: fam.trim() }); return ops; }
    }
    if (/\bmono|monospace|code\b/i.test(text)) {
      const fam = /(?:use|set|make)\s+([A-Za-z0-9 ,'-]+)\s+(?:for\s+mono|as\s+mono|mono\s+font|code\s+font)/i.exec(text)?.[1];
      if (fam) { ops.push({ kind:'fontFamilySet', part:'mono', family: fam.trim() }); return ops; }
    }
    if (/\bdisplay\b/i.test(text)) {
      const fam = /(?:use|set|make)\s+([A-Za-z0-9 ,'-]+)\s+(?:for\s+display|as\s+display|display\s+font)/i.exec(text)?.[1];
      if (fam) { ops.push({ kind:'fontFamilySet', part:'display', family: fam.trim() }); return ops; }
    }

    // sizes (specific keys)
    const sizeKeys = parseFontKeys(text);
    if (sizeKeys.length) {
      const setPx = parsePxValue(text);
      if (setPx != null) { ops.push({ kind:'fontSizeAdjust', keys: sizeKeys, setPx }); return ops; }
      const byPx = /(?:by|plus|\+)\s*(-?\d+(?:\.\d+)?)\s*px/i.exec(text)?.[1];
      if (byPx) { ops.push({ kind:'fontSizeAdjust', keys: sizeKeys, byPx: parseFloat(byPx) }); return ops; }
      const dir = /(larger|bigger|increase|upsize)/i.test(text) ? 'larger' : /(smaller|decrease|downsize)/i.test(text) ? 'smaller' : 'larger';
      const pct = parsePercentValue(text);
      if (pct != null) { ops.push({ kind:'fontSizeScaleAll', direction: dir, byPercent: Math.abs(pct*100) }); return ops; }
      ops.push({ kind:'fontSizeAdjust', keys: sizeKeys, direction: dir, magnitude: magnitude(text) });
      return ops;
    }

    // global size scaling
    if (/(larger|bigger|smaller|decrease|increase)/i.test(text)) {
      const dir = /(larger|bigger|increase)/i.test(text) ? 'larger' : 'smaller';
      const pct = parsePercentValue(text);
      ops.push({ kind:'fontSizeScaleAll', direction: dir, byPercent: pct ? Math.abs(pct*100) : undefined, magnitude: pct ? undefined : magnitude(text) });
      return ops;
    }

    // font weights e.g. "set semibold to 600"
    const w = /(hairline|thin|light|normal|medium|semibold|bold|extrabold|black).*(\d{3})/i.exec(text);
    if (w) {
      ops.push({ kind:'fontWeightSet', key: w[1].toLowerCase() as any, value: parseInt(w[2],10) });
      return ops;
    }
  }

  // ===== Line height =====
  if (/line[-\s]?height|leading|looser|tighter|relaxed|snug|tight\b/i.test(text)) {
    if (/set/i.test(text)) {
      const key = /(tight|snug|relaxed)/i.exec(text)?.[1]?.toLowerCase() as ('tight'|'snug'|'relaxed')|undefined;
      const val = /(-?\d+(?:\.\d+)?)\b/.exec(text)?.[1];
      if (key && val) { ops.push({ kind:'lineHeightSet', key, value: parseFloat(val) }); return ops; }
    }
    const dir = /(looser|relaxed|more\s+space)/i.test(text) ? 'looser' : 'tighter';
    const by = parsePercentValue(text);
    ops.push({ kind:'lineHeightScale', direction: dir, magnitude: by ? undefined : magnitude(text), by: by ?? undefined });
    return ops;
  }

  // ===== Shadows =====
  if (/shadow|elevation|depth/i.test(text)) {
    const direction = /(stronger|deeper|more\s+pronounced|heavier|darker)/i.test(text) ? 'stronger' : 'softer';
    const keys = parseShadowKeys(text);
    if (keys.length) { ops.push({ kind:'shadowsStrengthKeys', keys, direction }); return ops; }
    ops.push({ kind:'shadowsStrength', direction }); return ops;
  }

  // ===== Borders =====
  if (/border/i.test(text)) {
    if (/(thicker|heavier|wider|stronger)/i.test(text)) { ops.push({ kind:'bordersWidthScale', direction:'thicker' }); return ops; }
    if (/(thinner|lighter|narrower|softer)/i.test(text)) { ops.push({ kind:'bordersWidthScale', direction:'thinner' }); return ops; }
    const setThin = /\bthin\b.*?(\d+(?:\.\d+)?)\s*px/i.exec(text)?.[1];
    if (setThin) { ops.push({ kind:'bordersWidthSet', which:'thin', px: parseFloat(setThin) }); }
    const setThick = /\bthick\b.*?(\d+(?:\.\d+)?)\s*px/i.exec(text)?.[1];
    if (setThick) { ops.push({ kind:'bordersWidthSet', which:'thick', px: parseFloat(setThick) }); }
    const style = /(solid|dashed|dotted|double|groove|ridge|inset|outset)\b/i.exec(text)?.[1]?.toLowerCase() as any;
    if (style) { ops.push({ kind:'bordersStyleSet', style }); }
    if (ops.length) return ops;
  }

  // ===== Animations =====
  if (/animation|transition/i.test(text)) {
    if (/(snappy|snappier|faster|speed\s*up)/i.test(text)) { ops.push({ kind:'animationDurationScale', direction:'faster', magnitude: magnitude(text) }); return ops; }
    if (/(slower|slow\s*down|more\s+gentle)/i.test(text)) { ops.push({ kind:'animationDurationScale', direction:'slower', magnitude: magnitude(text) }); return ops; }
    const set = /(fast|normal|slow)\s*(?:to|=)\s*(\d+)\s*ms/i.exec(text);
    if (set) { ops.push({ kind:'animationDurationSet', key: set[1] as any, ms: parseInt(set[2],10) }); return ops; }
    const easing = /(linear|ease-in-out|ease-in|ease-out|ease)\b/i.exec(text)?.[1] as EasingName|undefined;
    if (easing) { ops.push({ kind:'animationEasingSet', easing }); return ops; }
  }

  // ===== Breakpoints =====
  if (/breakpoint|mobile|tablet|desktop|laptop|ultrawide|2xl\b/i.test(text)) {
    const inc = /(increase|bump|raise|add)\s+.*?(\d+)\s*px/i.exec(text)?.[2];
    if (inc) { ops.push({ kind:'breakpointsScale', byPx: parseInt(inc,10) }); return ops; }
    // e.g., "set mobile to 360px, md to 800px"
    const pairs = Array.from(text.matchAll(/\b(sm|md|lg|xl|2xl|mobile|tablet|desktop|laptop|ultrawide)\b.*?(?:to|=)\s*(\d+)\s*px/gi));
    for (const [, keyRaw, px] of pairs) {
      const k = (BREAKPOINT_ALIASES[keyRaw.toLowerCase()] ?? (keyRaw.toLowerCase() as any)) as 'sm'|'md'|'lg'|'xl'|'2xl';
      if (k) ops.push({ kind:'breakpointsSet', key: k, px: parseInt(px,10) });
    }
    if (ops.length) return ops;
  }

  return ops;
}

// Public API: parse possibly multi-clause instructions
export function parseInstructions(instruction: string): ParsedOp[] {
  const clauses = segment(instruction);
  const out: ParsedOp[] = [];
  for (const c of clauses) {
    const ops = parseInstructionSingle(c);
    out.push(...ops);
  }
  return out;
}

// Back-compat (if you still call parseInstruction elsewhere)
export function parseInstruction(instruction: string): ParsedOp[] {
  return parseInstructions(instruction);
}
