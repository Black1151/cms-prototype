import { z } from "zod";

export const Scale = z.object({
  50: z.string(), 100: z.string(), 200: z.string(), 300: z.string(), 400: z.string(),
  500: z.string(), 600: z.string(), 700: z.string(), 800: z.string(), 900: z.string(),
});

export const ThemeTokens = z.object({
  colors: z.object({
    brand: Scale,
    accent: Scale.optional()
  }),
  radii: z.object({ md: z.string() }).partial().optional(),
  fonts: z.object({ heading: z.string(), body: z.string() }).partial().optional(),
});

export const CalloutProps = z.object({
  variant: z.enum(["info", "success", "warning", "danger"]).optional(),
});

export const ImgProps = z.object({
  src: z.string().min(1),
  alt: z.string().min(3),
});

export const HeadingProps = z.object({
  variant: z.enum(["lessonTitle", "section"]).optional(),
  children: z.any().optional()
});

export const TextProps = z.object({ children: z.any().optional() });
export const TwoColumnProps = z.object({});

export const COMPONENT_SCHEMAS: Record<string, z.ZodTypeAny> = {
  Callout: CalloutProps,
  Img: ImgProps,
  Heading: HeadingProps,
  Text: TextProps,
  TwoColumn: TwoColumnProps,
};

export const OverrideSchema = z.object({ css: z.record(z.string(), z.any()) });
