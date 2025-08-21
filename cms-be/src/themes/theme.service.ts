import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Theme } from './theme.entity';
import { UpdateThemeInput } from './dto/update-theme.input';
import { GenerateThemeInput } from './dto/generate-theme.input';
import { AmendThemeInput } from './dto/amend-theme.input';
import { ThemeTokensSchema } from '../common/zod/schemas';
import { AuditService } from '../audit/audit.service';
import OpenAI from 'openai';
import * as jsonpatch from 'fast-json-patch';
import type { Operation } from 'fast-json-patch';

// Deterministic NL -> ops + patcher
import { parseInstructions } from './instruction-parser';
import { applyParsedOps } from './logic-patcher';

type AIJsonPatchOp =
  | { op: 'replace'; path: string; value: any }
  | { op: 'add'; path: string; value: any }
  | { op: 'remove'; path: string };

@Injectable()
export class ThemeService {
  private openai: OpenAI;
  private amendmentCache = new Map<string, { tokens: any; diff: any; timestamp: number }>();

  // ====== Model selection / knobs (env overrides) ======
  private readonly GENERATE_MODEL = process.env.OPENAI_MODEL_THEME_GENERATE || 'gpt-5-mini';
  private readonly PATCH_MODEL    = process.env.OPENAI_MODEL_THEME_PATCH    || 'gpt-5-nano';
  private readonly TIMEOUT_MS     = Number(process.env.OPENAI_TIMEOUT_MS || 120000);
  private readonly MAX_TOKENS_GEN = Number(process.env.OPENAI_MAX_TOKENS_GEN || 10000);
  private readonly MAX_TOKENS_PAT = Number(process.env.OPENAI_MAX_TOKENS_PAT || 10000);

  constructor(
    @InjectRepository(Theme) private readonly repo: Repository<Theme>,
    private readonly audit: AuditService,
  ) {
    console.log('🔧 [THEME_SERVICE] Initializing with configuration:');
    console.log('🔧 [THEME_SERVICE] - Generate model:', this.GENERATE_MODEL);
    console.log('🔧 [THEME_SERVICE] - Patch model:', this.PATCH_MODEL);
    console.log('🔧 [THEME_SERVICE] - Timeout:', this.TIMEOUT_MS, 'ms');
    console.log('🔧 [THEME_SERVICE] - Max tokens (gen):', this.MAX_TOKENS_GEN);
    console.log('🔧 [THEME_SERVICE] - Max tokens (patch):', this.MAX_TOKENS_PAT);
    console.log('🔧 [THEME_SERVICE] - OpenAI API key configured:', !!process.env.OPENAI_API_KEY);
    
    // Debug environment variables
    console.log('🔧 [THEME_SERVICE] Environment variables:');
    console.log('🔧 [THEME_SERVICE] - OPENAI_MODEL_THEME_GENERATE:', process.env.OPENAI_MODEL_THEME_GENERATE || 'NOT_SET (using default: gpt-5-mini)');
    console.log('🔧 [THEME_SERVICE] - OPENAI_TIMEOUT_MS:', process.env.OPENAI_TIMEOUT_MS || 'NOT_SET (using default: 20000)');
    console.log('🔧 [THEME_SERVICE] - OPENAI_MAX_TOKENS_GEN:', process.env.OPENAI_MAX_TOKENS_GEN || 'NOT_SET (using default: 10000)');
    console.log('🔧 [THEME_SERVICE] - OPENAI_API_KEY length:', process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.length} chars` : 'NOT_SET');
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('🔧 [THEME_SERVICE] OpenAI client initialized');
  }

  // ======================================================
  // ================ Basic repository ops ================
  // ======================================================
  async get(id: string) {
    const t = await this.repo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Theme not found');
    return t;
  }

  async getAll() {
    const themes = await this.repo.find({
      select: ['id', 'name', 'notes', 'tokens'],
      order: { name: 'ASC' }
    });
    return themes;
  }

  async upsert(input: UpdateThemeInput) {
    const tokens = ThemeTokensSchema.parse(input.tokens);
    if (!input.name || input.name.trim() === '') {
      input.name = input.id;
    }
    const next = this.repo.create({ ...input, tokens });
    const saved = await this.repo.save(next);
    await this.audit.log('theme.upsert', { id: input.id });
    return saved;
  }

  // ======================================================
  // =================== Theme generation =================
  // ======================================================
  
  // Add health check method for debugging
  async checkOpenAIConnection() {
    console.log('🏥 [HEALTH] Checking OpenAI connection...');
    try {
      const startTime = Date.now();
      const response = await this.openai.models.list();
      const duration = Date.now() - startTime;
      console.log('✅ [HEALTH] OpenAI connection successful in', duration, 'ms');
      console.log('✅ [HEALTH] Available models:', response.data.length);
      return { success: true, duration, modelCount: response.data.length };
    } catch (error: any) {
      console.error('❌ [HEALTH] OpenAI connection failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async generateTheme(input: GenerateThemeInput) {
    console.log('🚀 [THEME_GEN] Starting theme generation...');
    console.log('📝 [THEME_GEN] Description:', input.description);
    console.log('⏰ [THEME_GEN] Timeout setting:', this.TIMEOUT_MS, 'ms');
    console.log('🔑 [THEME_GEN] API key configured:', !!process.env.OPENAI_API_KEY);
    console.log('🤖 [THEME_GEN] Using model:', this.GENERATE_MODEL);
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ [THEME_GEN] No OpenAI API key configured');
      throw new Error('OpenAI API key not configured');
    }

    const startTime = Date.now();
    console.log('📋 [THEME_GEN] Building prompt...');
    const prompt = this.buildThemeGenerationPrompt(input.description);
    console.log('📋 [THEME_GEN] Prompt built, length:', prompt.length, 'chars');

    try {
      console.log('🤖 [THEME_GEN] Preparing OpenAI request...');
      const params: any = {
        model: this.GENERATE_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a UI design expert. Always respond with valid JSON only, no extra text.'
          },
          { role: 'user', content: prompt },
        ],
        temperature: 1,
        response_format: { type: 'json_object' },
        max_completion_tokens: this.MAX_TOKENS_GEN,
      };

      console.log('🔧 [THEME_GEN] Request params:', {
        model: params.model,
        maxTokens: params.max_completion_tokens,
        messageCount: params.messages.length,
        promptLength: prompt.length
      });

      console.log('⏳ [THEME_GEN] Calling OpenAI API with timeout:', this.TIMEOUT_MS, 'ms...');
      const apiCallStart = Date.now();
      
      const completion = await this.withTimeout(
        this.openai.chat.completions.create(params),
        this.TIMEOUT_MS
      );

      const apiCallDuration = Date.now() - apiCallStart;
      console.log('✅ [THEME_GEN] OpenAI API call completed in:', apiCallDuration, 'ms');

      let responseContent = completion.choices[0]?.message?.content?.trim();
      if (!responseContent) {
        console.error('❌ [THEME_GEN] No response content from OpenAI');
        throw new Error('No response from OpenAI');
      }
      
      console.log('📄 [THEME_GEN] Raw response length:', responseContent.length, 'chars');
      console.log('📄 [THEME_GEN] Response preview:', responseContent.substring(0, 200) + '...');
      
      console.log('🧹 [THEME_GEN] Cleaning response...');
      responseContent = this.stripCodeFences(responseContent);
      console.log('🧹 [THEME_GEN] Cleaned response length:', responseContent.length, 'chars');

      console.log('🔍 [THEME_GEN] Parsing JSON...');
      const parseStart = Date.now();
      const parsedTokens = this.safeJsonParse(responseContent, 'Theme generation JSON parse failed');
      const parseDuration = Date.now() - parseStart;
      console.log('✅ [THEME_GEN] JSON parsed in:', parseDuration, 'ms');

      console.log('✅ [THEME_GEN] Validating against schema...');
      const validationStart = Date.now();
      const validatedTokens = ThemeTokensSchema.parse(parsedTokens);
      const validationDuration = Date.now() - validationStart;
      console.log('✅ [THEME_GEN] Schema validation passed in:', validationDuration, 'ms');

      const generatedTheme = {
        id: `generated-${Date.now()}`,
        name: `Generated: ${input.description}`,
        tokens: validatedTokens,
        basedOnThemeId: null,
        notes: `AI-generated theme based on description: "${input.description}"`,
      };

      const totalDuration = Date.now() - startTime;
      console.log('🎉 [THEME_GEN] Theme generation completed successfully in:', totalDuration, 'ms');
      console.log('🆔 [THEME_GEN] Generated theme ID:', generatedTheme.id);

      await this.audit.log('theme.generate', {
        description: input.description,
        generatedId: generatedTheme.id,
        model: this.GENERATE_MODEL,
      });

      return generatedTheme;
    } catch (error: any) {
      const totalDuration = Date.now() - startTime;
      console.error('💥 [THEME_GEN] Theme generation failed after:', totalDuration, 'ms');
      console.error('💥 [THEME_GEN] Error type:', error.constructor.name);
      console.error('💥 [THEME_GEN] Error message:', error?.message || String(error));
      console.error('💥 [THEME_GEN] Error stack:', error?.stack);
      
      await this.audit.log('theme.generate.error', {
        description: input.description,
        error: error?.message || String(error),
        model: this.GENERATE_MODEL,
      });
      throw error;
    }
  }

  // ======================================================
  // ===================== Deletion =======================
  // ======================================================
  async deleteTheme(id: string) {
    const theme = await this.repo.findOne({ where: { id } });
    if (!theme) {
      throw new NotFoundException('Theme not found');
    }

    await this.repo.remove(theme);
    await this.audit.log('theme.delete', { id });

    return `Theme "${theme.name || id}" deleted successfully`;
  }

  // ======================================================
  // ================== Amendment helpers =================
  // ======================================================

  private resolveScopeToPaths(scope: NonNullable<AmendThemeInput['scope']>): string[] {
    const out: string[] = [];
    for (const s of scope) {
      if (s === 'notifications') {
        out.push('/colors/success', '/colors/warning', '/colors/error', '/colors/info');
      } else if (s === 'spacing') {
        out.push('/spacing');
      } else if (s === 'radii') {
        out.push('/radii');
      } else if (s === 'brandColors') {
        out.push('/colors/brand');
      } else if (s === 'accentColors') {
        out.push('/colors/accent');
      } else if (s === 'typography') {
        out.push('/fonts', '/fontSizes', '/fontWeights', '/lineHeights');
      } else if (s === 'layout') {
        out.push('/breakpoints');
      } else if (s === 'shadows') {
        out.push('/shadows');
      } else if (s === 'borders') {
        out.push('/borders');
      } else if (s === 'animations') {
        out.push('/animations');
      }
    }
    return out;
  }

  private pickSubtree(tokens: any, prefixes: string[]) {
    const out: any = {};
    for (const p of prefixes) {
      const parts = p.split('/').filter(Boolean);
      let src = tokens;
      let ok = true;
      for (const k of parts) {
        if (src && Object.prototype.hasOwnProperty.call(src, k)) {
          src = src[k];
        } else {
          ok = false; break;
        }
      }
      if (!ok) continue;

      let cur = out;
      parts.forEach((k, i) => {
        if (i === parts.length - 1) {
          cur[k] = src;
        } else {
          cur[k] ??= {};
          cur = cur[k];
        }
      });
    }
    return out;
  }

  private applySubtree(tokens: any, prefixes: string[], subtree: any) {
    const next = JSON.parse(JSON.stringify(tokens));
    for (const p of prefixes) {
      const parts = p.split('/').filter(Boolean);
      let dst = next;
      let src = subtree;
      for (let i = 0; i < parts.length; i++) {
        const k = parts[i];
        if (i === parts.length - 1) {
          if (src && src[k] !== undefined) {
            dst[k] = src[k];
          }
        } else {
          dst[k] ??= {};
          dst = dst[k];
          src = src?.[k];
        }
      }
    }
    return next;
  }

  private computeAllowedPathsFromInstruction(instruction: string): string[] {
    const t = instruction.toLowerCase();
    const out = new Set<string>();

    if (/\bcolors?\b/.test(t) || /\bbrand|primary\b/.test(t) || /\baccent|secondary\b/.test(t) ||
        /\bneutral|gray|grey\b/.test(t) || /\bsuccess|warning|error|danger|info\b/.test(t) ||
        /\bnotifications|alerts|statuses\b/.test(t)) {
      if (/\bbrand|primary\b/.test(t)) out.add('/colors/brand');
      if (/\baccent|secondary\b/.test(t)) out.add('/colors/accent');
      if (/\bneutral|gray|grey\b/.test(t)) out.add('/colors/neutral');
      if (/\bsuccess\b/.test(t)) out.add('/colors/success');
      if (/\bwarning\b/.test(t)) out.add('/colors/warning');
      if (/\b(error|danger)\b/.test(t)) out.add('/colors/error');
      if (/\binfo|informational|notice\b/.test(t)) out.add('/colors/info');
      if (/\bnotifications|alerts|statuses\b/.test(t)) {
        out.add('/colors/success'); out.add('/colors/warning'); out.add('/colors/error'); out.add('/colors/info');
      }
      if (Array.from(out).filter(p => p.startsWith('/colors/')).length === 0) {
        out.add('/colors/brand'); out.add('/colors/accent');
      }
    }

    if (/\bgradient\b/.test(t)) out.add('/gradients');
    if (/\boverlay|backgrounds?\b/.test(t)) out.add('/backgrounds');
    if (/\bspacing|gaps?|gutters?|density|white\s*space\b/.test(t)) out.add('/spacing');
    if (/\bradius|radii|corners?|rounded|pill|square|sharp/.test(t)) out.add('/radii');
    if (/\bfont|typography|typeface|line[-\s]?height|leading|weight\b/.test(t)) {
      out.add('/fonts'); out.add('/fontSizes'); out.add('/fontWeights'); out.add('/lineHeights');
    }
    if (/\bshadow|elevation|depth\b/.test(t)) out.add('/shadows');
    if (/\bborder\b/.test(t)) out.add('/borders');
    if (/\banimation|transition|easing\b/.test(t)) out.add('/animations');
    if (/\bbreakpoint|mobile|tablet|desktop|laptop|ultrawide|2xl\b/.test(t)) out.add('/breakpoints');

    return Array.from(out);
  }

  // ======================================================
  // ================== AI fallbacks only =================
  // ======================================================

  private async regenSubtree(tokens: any, instruction: string, scope?: AmendThemeInput['scope']) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OpenAI API key not configured');

    const allow = this.resolveScopeToPaths(scope ?? ['notifications']);
    const ctx = this.pickSubtree(tokens, allow);

    const messages = [
      { role: 'system' as const, content: 'Return ONLY valid JSON. Keep the SAME OBJECT SHAPE (keys) as the given context. Do not add or remove keys.' },
      { role: 'user' as const, content: `Instruction:\n${instruction}\n\nContext JSON (only edit values, keep keys identical):\n${JSON.stringify(ctx)}` },
    ];

    const params: any = {
      model: this.PATCH_MODEL,
      messages,
      response_format: { type: 'json_object' },
      temperature: 1,
      max_completion_tokens: this.MAX_TOKENS_PAT,
    };

    const res = await this.withTimeout(this.openai.chat.completions.create(params), this.TIMEOUT_MS);
    let content = res.choices[0]?.message?.content?.trim();
    if (!content) throw new Error('Empty AI response');

    content = this.stripCodeFences(content);
    const patchSubtree = this.safeJsonParse(content, 'AI subtree JSON parse failed');

    const merged = this.applySubtree(tokens, allow, patchSubtree);
    return merged;
  }

  private async patchWithAI(tokens: any, instruction: string, manualScope?: AmendThemeInput['scope']) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OpenAI API key not configured');

    const allow = manualScope
      ? this.resolveScopeToPaths(manualScope)
      : this.computeAllowedPathsFromInstruction(instruction);

    const allowedPaths = allow.length ? allow : ['/colors/brand', '/colors/accent'];
    const ctx = this.pickSubtree(tokens, allowedPaths);
    const ctxJson = JSON.stringify(ctx);

    const system = [
      'You are a JSON Patch generator.',
      'Return ONLY a JSON object with one key "patch" whose value is a valid RFC6902 JSON Patch array.',
      'Every operation MUST use an allowed path or a descendant of an allowed path.',
      'If updating a color PALETTE (e.g., /colors/brand), you MUST provide the FULL object with shades 50,100,...,900.',
      'If the instruction mentions multiple explicit values (e.g., "xl and 2xl"), you MUST include separate operations for each.',
    ].join(' ');

    const user = [
      `Instruction: ${instruction}`,
      '',
      `Allowed path prefixes (writes beyond these MUST NOT appear):`,
      JSON.stringify(allowedPaths),
      '',
      'Context JSON (this is the ONLY data you can rely on for current values):',
      ctxJson,
      '',
      'Output contract:',
      '{ "patch": [ { "op": "replace|add|remove", "path": "/path", "value": any? }, ... ] }',
    ].join('\n');

    const params: any = {
      model: this.PATCH_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 1,
      max_completion_tokens: this.MAX_TOKENS_PAT,
    };

    const res = await this.withTimeout(this.openai.chat.completions.create(params), this.TIMEOUT_MS);
    let raw = res.choices[0]?.message?.content?.trim();
    if (!raw) throw new Error('Empty AI response');
    raw = this.stripCodeFences(raw);

    // Accept either { patch: [...] } or a direct array (be forgiving)
    const parsed = this.safeJsonParse<any>(raw, 'AI patch JSON parse failed');

    let aiOps: AIJsonPatchOp[];
    if (Array.isArray(parsed)) {
      aiOps = parsed as AIJsonPatchOp[];
    } else if (parsed?.patch && Array.isArray(parsed.patch)) {
      aiOps = parsed.patch as AIJsonPatchOp[];
    } else if (parsed?.operations && Array.isArray(parsed.operations)) {
      aiOps = parsed.operations as AIJsonPatchOp[];
    } else if (parsed?.op && parsed?.path) {
      aiOps = [parsed as AIJsonPatchOp];
    } else {
      throw new BadRequestException('AI did not return a JSON Patch array');
    }

    const ops = this.validateAndCoercePatch(aiOps, allowedPaths, ctx);

    // Apply patch atomically on a deep clone
    const result = jsonpatch.applyPatch(JSON.parse(JSON.stringify(tokens)), ops as readonly Operation[], true).newDocument;
    return result;
  }

  // ======================================================
  // =================== Public: amend ====================
  // ======================================================
  async amend(input: AmendThemeInput) {
    const theme = await this.get(input.id);

    const fingerprint = this.simpleHash(JSON.stringify(theme.tokens)).toString(36);
    const cacheKey = `${input.id}:${fingerprint}:${input.instruction}`;
    const cached = this.amendmentCache.get(cacheKey);

    let next = theme.tokens;
    let diff: any;

    if (cached && !input.dryRun) {
      next = cached.tokens;
      diff = cached.diff;
    } else {
      // 1) Deterministic path (no AI)
      const ops = parseInstructions(input.instruction);
      if (ops.length > 0) {
        const res = applyParsedOps(theme.tokens, ops);
        next = res.next;
        diff = res.diff;
      } else {
        // 2) No deterministic parse → choose strategy: 'regen' explicitly or 'patch' fallback
        const strategy = input.mode ?? (input.scope && input.scope.length > 0 ? 'regen' : 'patch');
        if (strategy === 'regen') {
          next = await this.regenSubtree(theme.tokens, input.instruction, input.scope);
        } else {
          next = await this.patchWithAI(theme.tokens, input.instruction, input.scope);
        }
        diff = jsonpatch.compare(theme.tokens, next);
      }

      this.amendmentCache.set(cacheKey, { tokens: next, diff, timestamp: Date.now() });
      this.cleanupCache();
    }

    const validated = ThemeTokensSchema.parse(next);

    if (input.dryRun) {
      await this.audit.log('theme.amend.preview', { id: input.id, diff });
      return { ...theme, tokens: validated, _preview: true, diff };
    }

    const saved = await this.repo.save({ ...theme, tokens: validated });
    await this.audit.log('theme.amend', { id: input.id, diff });
    return saved;
  }

  // ======================================================
  // ==================== Misc helpers ====================
  // ======================================================

  private cleanupCache() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    for (const [key, value] of this.amendmentCache.entries()) {
      if (now - value.timestamp > oneHour) {
        this.amendmentCache.delete(key);
      }
    }
  }

  private stripCodeFences(s: string) {
    return s.replace(/^```json\s*|\s*```$/g, '').trim();
  }

  private safeJsonParse<T = any>(s: string, errMsg: string): T {
    try {
      return JSON.parse(s) as T;
    } catch {
      throw new BadRequestException(errMsg);
    }
  }

  private async withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    console.log(`⏱️ [TIMEOUT] Setting timeout for ${ms}ms`);
    const startTime = Date.now();
    let to: any;
    try {
      const result = await Promise.race([
        p.then(value => {
          const duration = Date.now() - startTime;
          console.log(`✅ [TIMEOUT] Promise resolved in ${duration}ms (under ${ms}ms limit)`);
          return value;
        }),
        new Promise<T>((_, rej) => { 
          to = setTimeout(() => {
            const duration = Date.now() - startTime;
            console.error(`⏰ [TIMEOUT] Promise timed out after ${duration}ms (limit: ${ms}ms)`);
            console.error(`⏰ [TIMEOUT] This means OpenAI took longer than ${ms}ms to respond`);
            console.error(`⏰ [TIMEOUT] Possible causes:`);
            console.error(`⏰ [TIMEOUT] - Network latency or connection issues`);
            console.error(`⏰ [TIMEOUT] - OpenAI API is experiencing high load`);
            console.error(`⏰ [TIMEOUT] - Request is too complex for the model`);
            console.error(`⏰ [TIMEOUT] - Rate limiting or quota issues`);
            rej(new Error(`OpenAI request timed out after ${duration}ms`));
          }, ms); 
        })
      ]);
      return result;
    } finally {
      if (to) {
        console.log(`🧹 [TIMEOUT] Cleaning up timeout handler`);
        clearTimeout(to);
      }
    }
  }

  private simpleHash(s: string) {
    let h = 0, i = 0, len = s.length;
    while (i < len) {
      h = (h << 5) - h + s.charCodeAt(i++) | 0;
    }
    return h >>> 0;
  }

  private buildThemeGenerationPrompt(description: string) {
    return `
You are an expert UI designer and CSS specialist.
Given a description of a theme, create a cohesive design system and output ONLY valid JSON that matches this shape:

{
  "colors": {
    "brand": { "50": "#HEX", "100": "#HEX", "200": "#HEX", "300": "#HEX", "400": "#HEX", "500": "#HEX", "600": "#HEX", "700": "#HEX", "800": "#HEX", "900": "#HEX" },
    "accent": { "50": "#HEX", "100": "#HEX", "200": "#HEX", "300": "#HEX", "400": "#HEX", "500": "#HEX", "600": "#HEX", "700": "#HEX", "800": "#HEX", "900": "#HEX" },
    "neutral": { "50": "#HEX", "100": "#HEX", "200": "#HEX", "300": "#HEX", "400": "#HEX", "500": "#HEX", "600": "#HEX", "700": "#HEX", "800": "#HEX", "900": "#HEX" },
    "success": { "50": "#HEX", "100": "#HEX", "200": "#HEX", "300": "#HEX", "400": "#HEX", "500": "#HEX", "600": "#HEX", "700": "#HEX", "800": "#HEX", "900": "#HEX" },
    "warning": { "50": "#HEX", "100": "#HEX", "200": "#HEX", "300": "#HEX", "400": "#HEX", "500": "#HEX", "600": "#HEX", "700": "#HEX", "800": "#HEX", "900": "#HEX" },
    "error":   { "50": "#HEX", "100": "#HEX", "200": "#HEX", "300": "#HEX", "400": "#HEX", "500": "#HEX", "600": "#HEX", "700": "#HEX", "800": "#HEX", "900": "#HEX" },
    "info":    { "50": "#HEX", "100": "#HEX", "200": "#HEX", "300": "#HEX", "400": "#HEX", "500": "#HEX", "600": "#HEX", "700": "#HEX", "800": "#HEX", "900": "#HEX" }
  },
  "spacing": { "xs": "4px", "sm": "8px", "md": "16px", "lg": "24px", "xl": "32px", "2xl": "48px", "3xl": "64px" },
  "radii":   { "none": "0px", "sm": "4px", "md": "8px", "lg": "12px", "xl": "16px", "2xl": "24px", "full": "9999px" },
  "fonts":   { "heading": "Inter|Roboto|Poppins|Montserrat|Open Sans", "body": "Inter|Roboto|Poppins|Montserrat|Open Sans", "mono": "JetBrains Mono|Fira Code|Source Code Pro", "display": "Playfair Display|Merriweather|Lora" },
  "fontSizes": { "xs":"12px","sm":"14px","md":"16px","lg":"18px","xl":"20px","2xl":"24px","3xl":"30px","4xl":"36px","5xl":"48px","6xl":"60px" },
  "fontWeights": { "hairline":"100","thin":"200","light":"300","normal":"400","medium":"500","semibold":"600","bold":"700","extrabold":"800","black":"900" },
  "lineHeights": { "none":"1","tight":"1.25","snug":"1.375","normal":"1.5","relaxed":"1.625","loose":"2" },
  "shadows": {
    "xs":"0 1px 2px rgba(0,0,0,0.06)",
    "sm":"0 1px 3px rgba(0,0,0,0.1)",
    "md":"0 4px 8px rgba(0,0,0,0.12)",
    "lg":"0 8px 20px rgba(0,0,0,0.14)",
    "xl":"0 16px 28px rgba(0,0,0,0.15)",
    "2xl":"0 24px 48px rgba(0,0,0,0.18)",
    "inner":"inset 0 2px 6px rgba(0,0,0,0.08)",
    "outline":"0 0 0 3px rgba(66,153,225,0.4)"
  },
  "borders": {
    "widths": { "none":"0px","thin":"1px","thick":"3px" },
    "styles": { "solid":"solid","dashed":"dashed","dotted":"dotted","double":"double","groove":"groove","ridge":"ridge","inset":"inset","outset":"outset" }
  },
  "gradients": {
    "primary": "linear-gradient(45deg, #HEX, #HEX)",
    "secondary": "linear-gradient(45deg, #HEX, #HEX)",
    "accent": "linear-gradient(45deg, #HEX, #HEX)",
    "neutral": "linear-gradient(45deg, #HEX, #HEX)"
  },
  "backgrounds": {
    "primary": "rgba(R,G,B,0.95)",
    "secondary": "rgba(R,G,B,0.95)",
    "tertiary": "rgba(R,G,B,0.9)",
    "overlay": "rgba(R,G,B,0.5)"
  },
  "animations": {
    "duration": { "fast":"150ms","normal":"300ms","slow":"500ms" },
    "easing": { "linear":"linear","ease":"ease","easeIn":"ease-in","easeOut":"ease-out","easeInOut":"ease-in-out" }
  },
  "breakpoints": { "sm":"640px","md":"768px","lg":"1024px","xl":"1280px","2xl":"1536px" }
}

Requirements:
- Theme: "${description}" — create a cohesive, original system that fits.
- Use VALID CSS values and hex colors.
- Keep values realistic and consistent.
- Output JSON ONLY (no markdown, no code fences, no commentary).
`.trim();
  }

  // ======================================================
  // ============== JSON Patch guards & coercion ==========
  // ======================================================

  private validateAndCoercePatch(aiOps: unknown, allowedPaths: string[], contextDoc: any): Operation[] {
    if (!Array.isArray(aiOps)) {
      throw new BadRequestException('Patch must be an array');
    }

    // Shallow shape checks + allow-list enforcement
    const coerced: Operation[] = aiOps.map((raw, idx) => {
      const op = (raw as any)?.op;
      const path = (raw as any)?.path;

      if (op !== 'add' && op !== 'remove' && op !== 'replace') {
        throw new BadRequestException(`Invalid op at index ${idx}: ${String(op)}`);
      }
      if (typeof path !== 'string' || !path.startsWith('/')) {
        throw new BadRequestException(`Invalid path at index ${idx}: ${String(path)}`);
      }
      const withinAllowed = allowedPaths.some(p => path === p || path.startsWith(p + '/'));
      if (!withinAllowed) {
        throw new BadRequestException(`Forbidden path at index ${idx}: ${path}`);
      }

      if (op === 'remove') {
        return { op: 'remove', path } as Operation;
      }

      if (!('value' in (raw as any))) {
        throw new BadRequestException(`Missing "value" for non-remove op at index ${idx} (${path})`);
      }

      const value = (raw as any).value;
      if (op === 'add') {
        return { op: 'add', path, value } as Operation;
      }
      return { op: 'replace', path, value } as Operation;
    });

    // Optional semantic validation using fast-json-patch
    const error = jsonpatch.validate(coerced as any, contextDoc);
    if (error) {
      // jsonpatch.validate returns an Error-like object; surface a readable message
      throw new BadRequestException(`Invalid JSON Patch: ${error.message || String(error)}`);
    }

    return coerced;
  }
}
