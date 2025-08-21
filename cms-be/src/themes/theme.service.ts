import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Theme } from './theme.entity';
import { UpdateThemeInput } from './dto/update-theme.input';
import { GenerateThemeInput } from './dto/generate-theme.input';
import { ThemeTokensSchema } from '../common/zod/schemas';
import { AuditService } from '../audit/audit.service';
import OpenAI from 'openai';

@Injectable()
export class ThemeService {
  private openai: OpenAI;

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
        params.max_tokens = 40000;
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
}




/////////////////////////


