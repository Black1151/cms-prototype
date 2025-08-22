// ThemeService.amend.js — patcher-first amendment flow
// Keeps changes local whenever possible and *does not* regenerate a whole theme
// unless the caller explicitly asks elsewhere to start over.
//
// Usage (typical inside your ThemeService):
//   import { amendTokens } from './ThemeService.amend.js';
//   const result = await amendTokens(currentTheme, { instruction, scope, mode, dryRun });
//
import * as jsonpatch from 'fast-json-patch';
import { parseInstructions } from './instruction-parser';
import { applyParsedOps } from './logic-patcher';

/**
 * @param {object} theme - Either a full theme object with { tokens, ... } or just tokens.
 * @param {object|string} input - Either a string instruction or { instruction, scope, mode, dryRun }.
 * @returns {Promise<object>} - Next theme (or tokens) + diff. If dryRun, sets _preview = true.
 */
export async function amendTokens(theme, input = {}) {
  const isString = typeof input === 'string';
  const instruction = isString ? input : (input.instruction ?? '');
  const dryRun = isString ? false : !!input.dryRun;

  const tokens = theme?.tokens ?? theme;
  const ops = parseInstructions(instruction);

  if (ops.length > 0) {
    const { next, diff } = applyParsedOps(tokens, ops);
    const nextTheme = theme?.tokens ? { ...theme, tokens: next } : next;
    if (dryRun) return { ...(nextTheme || {}), _preview: true, diff };
    return { ...(nextTheme || {}), _preview: false, diff };
  }

  // No parser match → caller may choose to fall back to AI elsewhere.
  // Here we return the original unchanged (no preview) to avoid scrapping anything.
  return { ...(theme || {}), _preview: false, diff: [] };
}
