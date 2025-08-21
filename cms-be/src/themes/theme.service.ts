import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Theme } from './theme.entity';
import { UpdateThemeInput } from './dto/update-theme.input';
import { GenerateThemeInput } from './dto/generate-theme.input';
import { AmendThemeInput } from './dto/amend-theme.input';
import { ThemeTokensSchema } from '../common/zod/schemas';
import { AuditService } from '../audit/audit.service';
import { jsonPatchSchema } from '../common/jsonPatchSchema';
import OpenAI from 'openai';
import * as jsonpatch from 'fast-json-patch';

@Injectable()
export class ThemeService {
  private openai: OpenAI;
  private amendmentCache = new Map<string, { tokens: any; diff: any; timestamp: number }>();

  constructor(
    @InjectRepository(Theme) private readonly repo: Repository<Theme>,
    private readonly audit: AuditService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async get(id: string) {
    const t = await this.repo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Theme not found');
    return t;
  }

  async getAll() {
    try {
      const themes = await this.repo.find({
        select: ['id', 'name', 'notes', 'tokens'],
        order: { name: 'ASC' }
      });
      return themes;
    } catch (error) {
      throw error;
    }
  }

  async upsert(input: UpdateThemeInput) {
    // validate tokens with Zod
    const tokens = ThemeTokensSchema.parse(input.tokens);
    
    // Ensure name is not null/undefined
    if (!input.name || input.name.trim() === '') {
      input.name = input.id;
    }
    
    const next = this.repo.create({ ...input, tokens });
    const saved = await this.repo.save(next);
    
    await this.audit.log('theme.upsert', { id: input.id });
    return saved;
  }


  async generateTheme(input: GenerateThemeInput) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }
  
    const model = 'gpt-5-nano'; // or process.env.OPENAI_MODEL
  
    const prompt = `You are an expert UI designer and CSS specialist. Given a description of a theme, create a comprehensive design system with all conceivable styling options. The theme description is: "${input.description}". Only output valid JSON.

Create a complete, unique theme that matches the description. Use the following structure as a guide, but generate CREATIVE and ORIGINAL values that fit the theme description:

{
  "colors": {
    "brand": {
      "50": "#[generate unique hex color]",
      "100": "#[generate unique hex color]", 
      "200": "#[generate unique hex color]",
      "300": "#[generate unique hex color]",
      "400": "#[generate unique hex color]",
      "500": "#[generate unique hex color]",
      "600": "#[generate unique hex color]",
      "700": "#[generate unique hex color]",
      "800": "#[generate unique hex color]",
      "900": "#[generate unique hex color]"
    },
    "accent": {
      "50": "#[generate unique hex color]",
      "100": "#[generate unique hex color]",
      "200": "#[generate unique hex color]",
      "300": "#[generate unique hex color]",
      "400": "#[generate unique hex color]",
      "500": "#[generate unique hex color]",
      "600": "#[generate unique hex color]",
      "700": "#[generate unique hex color]",
      "800": "#[generate unique hex color]",
      "900": "#[generate unique hex color]"
    },
    "neutral": {
      "50": "#[generate unique hex color]",
      "100": "#[generate unique hex color]",
      "200": "#[generate unique hex color]",
      "300": "#[generate unique hex color]",
      "400": "#[generate unique hex color]",
      "500": "#[generate unique hex color]",
      "600": "#[generate unique hex color]",
      "700": "#[generate unique hex color]",
      "800": "#[generate unique hex color]",
      "900": "#[generate unique hex color]"
    },
    "success": {
      "50": "#[generate unique hex color]",
      "100": "#[generate unique hex color]",
      "200": "#[generate unique hex color]",
      "300": "#[generate unique hex color]",
      "400": "#[generate unique hex color]",
      "500": "#[generate unique hex color]",
      "600": "#[generate unique hex color]",
      "700": "#[generate unique hex color]",
      "800": "#[generate unique hex color]",
      "900": "#[generate unique hex color]"
    },
    "warning": {
      "50": "#[generate unique hex color]",
      "100": "#[generate unique hex color]",
      "200": "#[generate unique hex color]",
      "300": "#[generate unique hex color]",
      "400": "#[generate unique hex color]",
      "500": "#[generate unique hex color]",
      "600": "#[generate unique hex color]",
      "700": "#[generate unique hex color]",
      "800": "#[generate unique hex color]",
      "900": "#[generate unique hex color]"
    },
    "error": {
      "50": "#[generate unique hex color]",
      "100": "#[generate unique hex color]",
      "200": "#[generate unique hex color]",
      "300": "#[generate unique hex color]",
      "400": "#[generate unique hex color]",
      "500": "#[generate unique hex color]",
      "600": "#[generate unique hex color]",
      "700": "#[generate unique hex color]",
      "800": "#[generate unique hex color]",
      "900": "#[generate unique hex color]"
    },
    "info": {
      "50": "#[generate unique hex color]",
      "100": "#[generate unique hex color]",
      "200": "#[generate unique hex color]",
      "300": "#[generate unique hex color]",
      "400": "#[generate unique hex color]",
      "500": "#[generate unique hex color]",
      "600": "#[generate unique hex color]",
      "700": "#[generate unique hex color]",
      "800": "#[generate unique hex color]",
      "900": "#[generate unique hex color]"
    }
  },
  "spacing": {
    "xs": "[generate spacing between 2px-8px, prefer 4px]",
    "sm": "[generate spacing between 6px-12px, prefer 8px]",
    "md": "[generate spacing between 12px-20px, prefer 16px]",
    "lg": "[generate spacing between 20px-32px, prefer 24px]",
    "xl": "[generate spacing between 28px-40px, prefer 32px]",
    "2xl": "[generate spacing between 40px-56px, prefer 48px]",
    "3xl": "[generate spacing between 56px-80px, prefer 64px]"
  },
  "radii": {
    "none": "0px",
    "sm": "[generate radius between 2px-6px, prefer 4px]",
    "md": "[generate radius between 6px-12px, prefer 8px]",
    "lg": "[generate radius between 10px-18px, prefer 12px]",
    "xl": "[generate radius between 14px-24px, prefer 16px]",
    "2xl": "[generate radius between 20px-32px, prefer 24px]",
    "full": "9999px"
  },
  "fonts": {
    "heading": "[choose from: Inter, Roboto, Open Sans, Poppins, Montserrat, or similar modern sans-serif]",
    "body": "[choose from: Inter, Roboto, Open Sans, Poppins, Montserrat, or similar modern sans-serif]",
    "mono": "[choose from: JetBrains Mono, Fira Code, Source Code Pro, or similar monospace]",
    "display": "[choose from: Playfair Display, Merriweather, Lora, or similar serif fonts]"
  },
  "fontSizes": {
    "xs": "[generate between 10px-14px, prefer 12px]",
    "sm": "[generate between 12px-16px, prefer 14px]",
    "md": "[generate between 14px-18px, prefer 16px]",
    "lg": "[generate between 16px-22px, prefer 18px]",
    "xl": "[generate between 18px-24px, prefer 20px]",
    "2xl": "[generate between 22px-28px, prefer 24px]",
    "3xl": "[generate between 26px-36px, prefer 30px]",
    "4xl": "[generate between 32px-42px, prefer 36px]",
    "5xl": "[generate between 42px-54px, prefer 48px]",
    "6xl": "[generate between 54px-72px, prefer 60px]"
  },
  "fontWeights": {
    "hairline": "100",
    "thin": "200",
    "light": "300",
    "normal": "400",
    "medium": "500",
    "semibold": "600",
    "bold": "700",
    "extrabold": "800",
    "black": "900"
  },
  "lineHeights": {
    "none": "1",
    "tight": "[generate between 1.1-1.3, prefer 1.25]",
    "snug": "[generate between 1.3-1.4, prefer 1.375]",
    "normal": "1.5",
    "relaxed": "[generate between 1.5-1.7, prefer 1.625]",
    "loose": "2"
  },
  "shadows": {
    "xs": "[generate subtle shadow: 0 1px 2-4px rgba(0,0,0,0.05-0.1)]",
    "sm": "[generate light shadow: 0 1px 3-6px rgba(0,0,0,0.08-0.15)]",
    "md": "[generate medium shadow: 0 4-8px 6-12px rgba(0,0,0,0.08-0.15)]",
    "lg": "[generate prominent shadow: 0 8-16px 15-25px rgba(0,0,0,0.08-0.15)]",
    "xl": "[generate large shadow: 0 16-24px 25-35px rgba(0,0,0,0.08-0.15)]",
    "2xl": "[generate dramatic shadow: 0 20-30px 50-60px rgba(0,0,0,0.15-0.25)]",
    "inner": "[generate inner shadow: inset 0 2-4px 4-8px rgba(0,0,0,0.05-0.1)]",
    "outline": "[generate outline: 0 0 0 2-4px rgba(66,153,225,0.3-0.6)]"
  },
  "borders": {
    "widths": {
      "none": "0px",
      "thin": "[generate between 1px-2px, prefer 1px]",
      "thick": "[generate between 2px-4px, prefer 3px]"
    },
    "styles": {
      "solid": "solid",
      "dashed": "dashed",
      "dotted": "dotted",
      "double": "double",
      "groove": "groove",
      "ridge": "ridge",
      "inset": "inset",
      "outset": "outset"
    }
  },
  "gradients": {
    "primary": "[generate gradient using brand colors from above]",
    "secondary": "[generate gradient using accent colors from above]",
    "accent": "[generate gradient using info/success colors from above]",
    "neutral": "[generate gradient using neutral colors from above]"
  },
  "backgrounds": {
    "primary": "[generate using brand colors with 0.9-0.98 opacity]",
    "secondary": "[generate using neutral colors with 0.9-0.98 opacity]",
    "tertiary": "[generate using neutral colors with 0.85-0.95 opacity]",
    "overlay": "[generate using neutral colors with 0.4-0.7 opacity]"
  },
  "animations": {
    "duration": {
      "fast": "[generate between 100ms-200ms, prefer 150ms]",
      "normal": "[generate between 250ms-400ms, prefer 300ms]",
      "slow": "[generate between 400ms-700ms, prefer 500ms]"
    },
    "easing": {
      "linear": "linear",
      "ease": "ease",
      "easeIn": "ease-in",
      "easeOut": "ease-out",
      "easeInOut": "ease-in-out"
    }
  },
  "breakpoints": {
    "sm": "[generate between 600px-680px, prefer 640px]",
    "md": "[generate between 720px-800px, prefer 768px]",
    "lg": "[generate between 960px-1080px, prefer 1024px]",
    "xl": "[generate between 1200px-1360px, prefer 1280px]",
    "2xl": "[generate between 1440px-1600px, prefer 1536px]"
  }
}

IMPORTANT: 
- Do NOT copy the example values above
- Generate completely new, creative values that fit the theme description
- STAY WITHIN the specified ranges for spacing, radii, font sizes, etc.
- Use the "prefer" values as defaults when appropriate
- Create a cohesive, professional design system that:
  1. Matches the theme description "${input.description}"
  2. Uses appropriate color palettes (warm, cool, neutral, etc.) based on the theme
  3. Includes realistic CSS values for all properties
  4. Uses modern CSS techniques like rgba, gradients, and shadows
  5. Ensures all values are valid CSS properties
  6. Makes each theme unique and different from the examples`;

  
    try {
      const params: any = {
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are a UI design expert. Always respond with valid JSON only, no additional text or explanations.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 1,
        // forces the model to return a JSON object (no code fences)
        response_format: { type: 'json_object' },
      };
  

      if (/^gpt-5/.test(model)) {
        params.max_completion_tokens = 40000;
      } else {
        params.max_completion_tokens = 40000;
      }
  
      let completion;
      try {
        completion = await this.openai.chat.completions.create(params);
      } catch (openaiError: any) {
        console.error('OpenAI API call failed:', openaiError);
        throw new Error(`OpenAI API call failed: ${openaiError.message}`);
      }
      
      let responseContent = completion.choices[0]?.message?.content?.trim();
      if (!responseContent) {
        throw new Error('No response from OpenAI');
      }
  
      // (Defensive) strip accidental code fences if any slipped through.
      responseContent = responseContent.replace(/^```json\s*|\s*```$/g, '');
  
      const parsedTokens = JSON.parse(responseContent);
  
      const validatedTokens = ThemeTokensSchema.parse(parsedTokens);
  
      const generatedTheme = {
        id: `generated-${Date.now()}`,
        name: `Generated: ${input.description}`,
        tokens: validatedTokens,
        basedOnThemeId: null,
        notes: `AI-generated theme based on description: "${input.description}"`,
      };
  
      await this.audit.log('theme.generate', {
        description: input.description,
        generatedId: generatedTheme.id,
      });
  
      return generatedTheme;
    } catch (error: any) {
      await this.audit.log('theme.generate.error', {
        description: input.description,
        error: error.message,
      });
      throw error;
    }
  }
  
  async deleteTheme(id: string) {
    const theme = await this.repo.findOne({ where: { id } });
    if (!theme) {
      throw new NotFoundException('Theme not found');
    }
    
    await this.repo.remove(theme);
    await this.audit.log('theme.delete', { id });
    
    return `Theme "${theme.name || id}" deleted successfully`;
  }

  // Theme amendment methods
  private resolveScopeToPaths(scope: NonNullable<AmendThemeInput['scope']>): string[] {
    console.log('🗺️ [PATH RESOLUTION] Resolving scope to paths:', scope);
    
    const out: string[] = [];
    for (const s of scope) {
      if (s === 'notifications') {
        out.push('/colors/success', '/colors/warning', '/colors/error', '/colors/info');
        console.log('🗺️ [PATH RESOLUTION] Mapped notifications to:', ['/colors/success', '/colors/warning', '/colors/error', '/colors/info']);
      }
      else if (s === 'spacing') {
        out.push('/spacing');
        console.log('🗺️ [PATH RESOLUTION] Mapped spacing to:', ['/spacing']);
      }
      else if (s === 'radii') {
        out.push('/radii');
        console.log('🗺️ [PATH RESOLUTION] Mapped radii to:', ['/radii']);
      }
      else if (s === 'brandColors') {
        out.push('/colors');
        console.log('🗺️ [PATH RESOLUTION] Mapped brandColors to:', ['/colors']);
      }
      else if (s === 'accentColors') {
        out.push('/colors');
        console.log('🗺️ [PATH RESOLUTION] Mapped accentColors to:', ['/colors']);
      }
      else if (s === 'typography') {
        out.push('/fonts', '/fontSizes', '/fontWeights', '/lineHeights');
        console.log('🗺️ [PATH RESOLUTION] Mapped typography to:', ['/fonts', '/fontSizes', '/fontWeights', '/lineHeights']);
      }
      else if (s === 'layout') {
        out.push('/breakpoints', '/grid', '/flexbox');
        console.log('🗺️ [PATH RESOLUTION] Mapped layout to:', ['/breakpoints', '/grid', '/flexbox']);
      }
      else if (s === 'shadows') {
        out.push('/shadows');
        console.log('🗺️ [PATH RESOLUTION] Mapped shadows to:', ['/shadows']);
      }
      else if (s === 'borders') {
        out.push('/borders');
        console.log('🗺️ [PATH RESOLUTION] Mapped borders to:', ['/borders']);
      }
      else if (s === 'animations') {
        out.push('/animations');
        console.log('🗺️ [PATH RESOLUTION] Mapped animations to:', ['/animations']);
      }
    }
    
    console.log('🗺️ [PATH RESOLUTION] Final resolved paths:', out);
    return out;
  }

  private pickSubtree(tokens: any, prefixes: string[]) {
    console.log('🌳 [SUBTREE PICKING] Picking subtree with prefixes:', prefixes);
    
    const out: any = {};
    for (const p of prefixes) {
      const parts = p.split('/').filter(Boolean);
      console.log('🌳 [SUBTREE PICKING] Processing path:', p, '→ parts:', parts);
      
      let src = tokens;
      let ok = true;
      for (const k of parts) {
        if (src && Object.prototype.hasOwnProperty.call(src, k)) {
          src = src[k];
          console.log('🌳 [SUBTREE PICKING] Found key:', k, '→ value:', src);
        } else {
          console.warn('🌳 [SUBTREE PICKING] Missing key:', k, 'in path:', p);
          ok = false;
          break;
        }
      }
      
      if (!ok) {
        console.warn('🌳 [SUBTREE PICKING] Skipping invalid path:', p);
        continue;
      }
      
      let cur = out;
      parts.forEach((k, i) => {
        if (i === parts.length - 1) {
          cur[k] = src;
          console.log('🌳 [SUBTREE PICKING] Set final value for:', k, '→', src);
        } else {
          cur[k] ??= {};
          cur = cur[k];
        }
      });
    }
    
    console.log('🌳 [SUBTREE PICKING] Final subtree extracted:', out);
    return out;
  }

  private applySubtree(tokens: any, prefixes: string[], subtree: any) {
    console.log('🔀 [APPLY SUBTREE] Starting applySubtree...');
    console.log('🔀 [APPLY SUBTREE] Prefixes to apply:', prefixes);
    console.log('🔀 [APPLY SUBTREE] Subtree to apply:', subtree);
    
    const next = JSON.parse(JSON.stringify(tokens));
    console.log('🔀 [APPLY SUBTREE] Deep cloned tokens for modification');
    
    for (const p of prefixes) {
      const parts = p.split('/').filter(Boolean);
      console.log('🔀 [APPLY SUBTREE] Processing path:', p, '→ parts:', parts);
      
      let dst = next;
      let src = subtree;
      
      for (let i = 0; i < parts.length; i++) {
        const k = parts[i];
        if (i === parts.length - 1) {
          if (src && src[k] !== undefined) {
            console.log('🔀 [APPLY SUBTREE] Setting final value for:', k, '→', src[k]);
            dst[k] = src[k];
          } else {
            console.warn('🔀 [APPLY SUBTREE] No value to set for:', k, 'in path:', p);
          }
        } else {
          dst[k] ??= {};
          dst = dst[k];
          src = src?.[k];
          console.log('🔀 [APPLY SUBTREE] Navigating to:', k, 'src exists:', !!src);
        }
      }
    }
    
    console.log('🔀 [APPLY SUBTREE] Subtree application completed');
    return next;
  }

  private async detectSectionsFromInstruction(instruction: string): Promise<Array<'notifications' | 'spacing' | 'radii' | 'brandColors' | 'accentColors' | 'typography' | 'layout' | 'shadows' | 'borders' | 'animations'>> {
    console.log('🔍 [SECTION DETECTION] Starting section detection for instruction:', instruction);
    
    try {
      console.log('🔍 [SECTION DETECTION] Making GPT-5-nano call for section detection...');
      
      const res = await this.openai.chat.completions.create({
        model: 'gpt-5-nano',
        messages: [
          {
            role: 'system',
            content: `You are a theme section detector. Given a user instruction, determine which theme sections are being modified.

Available sections:
- colors (for any color-related changes)
- spacing (for spacing, margins, padding changes)
- radii (for border radius changes)
- typography (for font, text changes)
- shadows (for shadow, elevation changes)
- borders (for border changes)
- animations (for animation, transition changes)

Respond with ONLY a comma-separated list of section names, no other text. Example: "colors,spacing" or just "colors" if only one section.`
          },
                    {
            role: 'user',
            content: instruction
          }
        ],
        temperature: 1,
        max_completion_tokens: 50000,
        response_format: { type: 'text' }
      });

      const content = res.choices[0]?.message?.content?.trim();
      console.log('🔍 [SECTION DETECTION] Raw AI response:', content);
      console.log('🔍 [SECTION DETECTION] Usage - Prompt tokens:', res.usage?.prompt_tokens, 'Completion tokens:', res.usage?.completion_tokens, 'Total tokens:', res.usage?.total_tokens);
      
      if (!content) {
        console.warn('🔍 [SECTION DETECTION] Empty AI response');
        return ['brandColors', 'accentColors']; // fallback to colors
      }

      // Parse comma-separated response
      const sections = content.split(',').map(s => s.trim().toLowerCase());
      console.log('🔍 [SECTION DETECTION] Parsed sections:', sections);
      console.log('🔍 [SECTION DETECTION] Raw AI response (lowercase):', content.toLowerCase());
      
      // Map to valid section names - simplified to use 'colors' for all color-related changes
      const validSections: Array<'notifications' | 'spacing' | 'radii' | 'brandColors' | 'accentColors' | 'typography' | 'layout' | 'shadows' | 'borders' | 'animations'> = [];
      
      for (const section of sections) {
        if (section === 'colors' || section === 'color' || section === 'accentcolors') {
          validSections.push('brandColors', 'accentColors');
        } else if (section === 'spacing') {
          validSections.push('spacing');
        } else if (section === 'radii' || section === 'radius') {
          validSections.push('radii');
        } else if (section === 'typography' || section === 'font' || section === 'text') {
          validSections.push('typography');
        } else if (section === 'shadows' || section === 'shadow') {
          validSections.push('shadows');
        } else if (section === 'borders' || section === 'border') {
          validSections.push('borders');
        } else if (section === 'animations' || section === 'animation') {
          validSections.push('animations');
        }
      }

      console.log('🔍 [SECTION DETECTION] Final valid sections:', validSections);
      
      if (validSections.length === 0) {
        console.warn('🔍 [SECTION DETECTION] No valid sections found, using fallback');
        return ['brandColors', 'accentColors'];
      }

      return validSections;
    } catch (error) {
      console.error('🔍 [SECTION DETECTION] Section detection failed:', error);
      console.warn('🔍 [SECTION DETECTION] Falling back to default: colors');
      return ['brandColors', 'accentColors'];
    }
  }



  private async regenSubtree(tokens: any, instruction: string, scope?: AmendThemeInput['scope']) {
    console.log('🔄 [REGEN] Starting regenSubtree...');
    console.log('🔄 [REGEN] Instruction:', instruction);
    console.log('🔄 [REGEN] Manual scope:', scope);
    
    const allow = this.resolveScopeToPaths(scope ?? ['notifications' as const]);
    console.log('🔄 [REGEN] Resolved allowed paths:', allow);
    
    const ctx = this.pickSubtree(tokens, allow);
    console.log('🔄 [REGEN] Context subtree extracted, size:', JSON.stringify(ctx).length, 'chars');
    
    console.log('🔄 [REGEN] Making AI call for subtree regeneration...');
    const res = await this.openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        { role: 'system', content: 'Return ONLY valid JSON of the same keys; no prose.' },
        { role: 'user', content: `Instruction: ${instruction}\nCurrent subtree:\n${JSON.stringify(ctx)}` }
      ],
      response_format: { type: 'json_object' },
      temperature: 1,
      max_completion_tokens: 50000
    });
    
    const content = res.choices[0]?.message?.content?.trim();
    console.log('🔄 [REGEN] Raw AI response:', content);
    console.log('🔄 [REGEN] Usage - Prompt tokens:', res.usage?.prompt_tokens, 'Completion tokens:', res.usage?.completion_tokens, 'Total tokens:', res.usage?.total_tokens);
    
    if (!content) {
      console.error('🔄 [REGEN] Empty AI response');
      throw new Error('Empty AI response');
    }
    
    const patchSubtree = JSON.parse(content);
    console.log('🔄 [REGEN] Parsed regenerated subtree');
    
    console.log('🔄 [REGEN] Applying regenerated subtree...');
    const result = this.applySubtree(tokens, allow, patchSubtree);
    console.log('🔄 [REGEN] Subtree applied successfully');
    
    return result;
  }

  private async patchWithAI(tokens: any, instruction: string, scope?: AmendThemeInput['scope']) {
    console.log('🔧 [PATCH AI] Starting patchWithAI...');
    console.log('🔧 [PATCH AI] Instruction:', instruction);
    console.log('🔧 [PATCH AI] Manual scope:', scope);
    
    let allow: string[];
    if (scope) {
      console.log('🔧 [PATCH AI] Using manual scope');
      allow = this.resolveScopeToPaths(scope);
    } else {
      console.log('🔧 [PATCH AI] Auto-detecting sections...');
      const detectedSections = await this.detectSectionsFromInstruction(instruction);
      allow = this.resolveScopeToPaths(detectedSections);
    }
    
    console.log('🔧 [PATCH AI] Resolved allowed paths:', allow);
    
    const ctx = this.pickSubtree(tokens, allow);
    console.log('🔧 [PATCH AI] Context subtree extracted, size:', JSON.stringify(ctx).length, 'chars');
    
    console.log('🔧 [PATCH AI] Making AI call for JSON patch generation...');
    console.log('🔧 [PATCH AI] Full instruction being sent to AI:', instruction);
    
    // Analyze the instruction to identify multiple values
    const instructionLower = instruction.toLowerCase();
    const hasMultipleValues = /and|&|,|plus|\+/.test(instructionLower);
    const hasXlAnd2xl = /xl.*2xl|2xl.*xl/.test(instructionLower);
    
    console.log('🔧 [PATCH AI] Instruction analysis - hasMultipleValues:', hasMultipleValues, 'hasXlAnd2xl:', hasXlAnd2xl);
    
    let enhancedPrompt = `Instruction: ${instruction}\n\n`;
    
    if (hasMultipleValues) {
      enhancedPrompt += `🚨 CRITICAL: This instruction mentions MULTIPLE values that need updating!\n`;
      enhancedPrompt += `You MUST create a separate patch operation for EACH mentioned value.\n`;
      enhancedPrompt += `Do NOT update just one value - update ALL mentioned values.\n\n`;
    }
    
    if (hasXlAnd2xl) {
      enhancedPrompt += `🎯 SPECIFIC: This mentions "xl and 2xl" - you MUST update BOTH:\n`;
      enhancedPrompt += `- Update /fontSizes/xl to a slightly larger value\n`;
      enhancedPrompt += `- Update /fontSizes/2xl to a slightly larger value\n`;
      enhancedPrompt += `Create TWO separate patch operations.\n\n`;
    }
    
    enhancedPrompt += `IMPORTANT: If this instruction involves updating colors, you MUST update the ENTIRE color palette (all 10 shades: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900). Do not update just one or two colors.\n\n`;
    enhancedPrompt += `Allowed prefixes: ${JSON.stringify(allow)}\nContext:\n${JSON.stringify(ctx)}`;
    
    console.log('🔧 [PATCH AI] Enhanced user prompt being sent to AI:', enhancedPrompt);
    
    const res = await this.openai.chat.completions.create({
        model: 'gpt-5-nano',
        messages: [
          { 
            role: 'system', 
            content: 'You are a JSON Patch expert. Return ONLY a valid RFC6902 JSON Patch array. Each operation must have: op (replace/add/remove), path (JSON pointer), and value (except for remove operations). IMPORTANT: Use the exact paths from the allowed prefixes. If you see "/colors" as allowed, use paths like "/colors/brand", "/colors/accent", "/colors/success", etc. CRITICAL: When updating color palettes, you MUST update ALL color values in that palette (50, 100, 200, 300, 400, 500, 600, 700, 800, 900). Do NOT update just one color - update the entire palette. CRITICAL: When updating multiple specific values (like "xl and 2xl font sizes"), you MUST update ALL mentioned values, not just one. Examples: To update accent colors to green: [{"op":"replace","path":"/colors/accent","value":{"50":"#e6f7e6","100":"#ccefcc","200":"#b3e7b3","300":"#99df99","400":"#80d780","500":"#66cf66","600":"#4dc74d","700":"#33bf33","800":"#1ab71a","900":"#00af00"}}]. To update neutral colors to grays: [{"op":"replace","path":"/colors/neutral","value":{"50":"#fafafa","100":"#f5f5f5","200":"#eeeeee","300":"#e0e0e0","400":"#bdbdbd","500":"#9e9e9e","600":"#757575","700":"#616161","800":"#424242","900":"#212121"}}]. To update xl and 2xl font sizes: [{"op":"replace","path":"/fontSizes/xl","value":"22px"},{"op":"replace","path":"/fontSizes/2xl","value":"26px"}]' 
          },
          { role: 'user', content: enhancedPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 1,
        max_completion_tokens: 50000
      });
    
    const raw = res.choices[0]?.message?.content?.trim();
    console.log('🔧 [PATCH AI] Raw AI response:', raw);
    console.log('🔧 [PATCH AI] Usage - Prompt tokens:', res.usage?.prompt_tokens, 'Completion tokens:', res.usage?.completion_tokens, 'Total tokens:', res.usage?.total_tokens);
    
    if (!raw) {
      console.error('🔧 [PATCH AI] Empty AI response');
      throw new Error('Empty AI response');
    }
    
    let patch;
    try {
      const parsed = JSON.parse(raw);
      // The AI might return the patch directly as an array, or wrapped in an object, or as a single operation
      if (Array.isArray(parsed)) {
        patch = parsed;
      } else if (parsed.patch && Array.isArray(parsed.patch)) {
        patch = parsed.patch;
      } else if (parsed.operations && Array.isArray(parsed.operations)) {
        patch = parsed.operations;
      } else if (parsed.op && parsed.path) {
        // Single patch operation
        patch = [parsed];
      } else {
        console.error('🔧 [PATCH AI] Invalid response format - expected array, object with patch/operations, or single operation');
        throw new Error('Invalid response format - expected JSON Patch array or single operation');
      }
    } catch (parseError) {
      console.error('🔧 [PATCH AI] Failed to parse AI response as JSON:', parseError);
      throw new Error('Invalid JSON response from AI');
    }
    
    console.log('🔧 [PATCH AI] Parsed patch, operations:', patch.length);
    
    console.log('🔧 [PATCH AI] Validating patch operations...');
    for (const op of patch) {
      // Validate operation structure
      if (!op.op || !op.path) {
        console.error('🔧 [PATCH AI] Invalid operation - missing op or path:', op);
        throw new Error('Invalid operation - missing op or path');
      }
      
      if (!['replace', 'add', 'remove'].includes(op.op)) {
        console.error('🔧 [PATCH AI] Invalid operation type:', op.op);
        throw new Error(`Invalid operation type: ${op.op}`);
      }
      
      if (op.op !== 'remove' && op.value === undefined) {
        console.error('🔧 [PATCH AI] Missing value for non-remove operation:', op);
        throw new Error('Missing value for non-remove operation');
      }
      
      // Validate path format (basic JSON pointer validation)
      if (!op.path.startsWith('/')) {
        console.error('🔧 [PATCH AI] Invalid path format - must start with /:', op.path);
        throw new Error('Invalid path format - must start with /');
      }
      
      // Validate path is allowed
      const isAllowed = allow.some(p => op.path === p || op.path.startsWith(p + '/'));
      console.log('🔧 [PATCH AI] Operation:', op.op, 'Path:', op.path, 'Allowed:', isAllowed);
      
      if (!isAllowed) {
        console.error('🔧 [PATCH AI] Forbidden path detected:', op.path);
        throw new Error(`Forbidden path: ${op.path}`);
      }
    }
    
    console.log('🔧 [PATCH AI] All paths validated, applying patch...');
    const result = jsonpatch.applyPatch(JSON.parse(JSON.stringify(tokens)), patch, true).newDocument;
    console.log('🔧 [PATCH AI] Patch applied successfully');
    
    return result;
  }

  private cleanupCache() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    
    for (const [key, value] of this.amendmentCache.entries()) {
      if (now - value.timestamp > oneHour) {
        this.amendmentCache.delete(key);
        console.log('🗑️ [CACHE] Cleaned up old cache entry:', key);
      }
    }
  }

  async amend(input: AmendThemeInput) {
    console.log('🎯 [AMEND] Starting theme amendment for ID:', input.id);
    console.log('🎯 [AMEND] Instruction:', input.instruction);
    console.log('🎯 [AMEND] Manual scope:', input.scope);
    console.log('🎯 [AMEND] Manual mode:', input.mode);
    console.log('🎯 [AMEND] Dry run:', input.dryRun);
    
    const theme = await this.get(input.id);
    console.log('🎯 [AMEND] Theme loaded:', theme.id, theme.name);
    console.log('🎯 [AMEND] Available theme paths:', Object.keys(theme.tokens));
    console.log('🎯 [AMEND] Theme tokens sample:', JSON.stringify(theme.tokens, null, 2).substring(0, 500) + '...');
    
    // Check if we have cached changes for this theme and instruction
    const cacheKey = `${input.id}:${input.instruction}`;
    const cached = this.amendmentCache.get(cacheKey);
    
    let next = theme.tokens;
    let diff: any;
    
    if (cached && !input.dryRun) {
      // Use cached changes when applying (not previewing)
      console.log('🎯 [AMEND] Using cached changes from preview');
      next = cached.tokens;
      diff = cached.diff;
    } else {
      // Generate new changes (either for preview or when no cache exists)
      console.log('🎯 [AMEND] Generating new changes...');
      
      // Simple strategy: use regen for scoped requests, patch for general ones
      const strategy = input.mode ?? (input.scope && input.scope.length > 0 ? 'regen' : 'patch');
      console.log('🎯 [AMEND] Selected strategy:', strategy);

      try {
        if (strategy === 'regen') {
          console.log('🎯 [AMEND] Using regeneration strategy');
          next = await this.regenSubtree(theme.tokens, input.instruction, input.scope);
        } else {
          console.log('🎯 [AMEND] Using patch strategy');
          next = await this.patchWithAI(theme.tokens, input.instruction, input.scope);
        }
      } catch (error) {
        console.error('🎯 [AMEND] Error during theme modification:', error);
        throw new Error(`Theme modification failed: ${error.message}`);
      }
      
      // Generate diff for new changes
      diff = jsonpatch.compare(theme.tokens, next);
      console.log('🎯 [AMEND] Diff generated, operations:', diff.length);
      
      // Cache the changes for future use
      this.amendmentCache.set(cacheKey, { tokens: next, diff, timestamp: Date.now() });
      console.log('🎯 [AMEND] Changes cached for future use');
      
      // Clean up old cache entries (older than 1 hour)
      this.cleanupCache();
    }

    console.log('🎯 [AMEND] Tokens modified, validating with Zod...');
    const validated = ThemeTokensSchema.parse(next);
    console.log('🎯 [AMEND] Zod validation passed');

    if (input.dryRun) {
      console.log('🎯 [AMEND] Dry run mode - logging preview and returning');
      await this.audit.log('theme.amend.preview', { id: input.id, diff });
      return { ...theme, tokens: validated, _preview: true, diff };
    }
    
    console.log('🎯 [AMEND] Saving theme to database...');
    const saved = await this.repo.save({ ...theme, tokens: validated });
    console.log('🎯 [AMEND] Theme saved successfully');
    
    await this.audit.log('theme.amend', { id: input.id, diff });
    console.log('🎯 [AMEND] Amendment completed successfully');
    
    return saved;
  }
}





