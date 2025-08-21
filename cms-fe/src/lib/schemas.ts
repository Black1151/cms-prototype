import { z } from "zod";

export const Scale = z.object({
  50: z.string(), 100: z.string(), 200: z.string(), 300: z.string(), 400: z.string(),
  500: z.string(), 600: z.string(), 700: z.string(), 800: z.string(), 900: z.string(),
});

export const ThemeTokens = z.object({
  colors: z.object({
    brand: Scale,
    accent: Scale.optional(),
    neutral: Scale.optional(),
    success: Scale.optional(),
    warning: Scale.optional(),
    error: Scale.optional(),
    info: Scale.optional(),
  }),
  spacing: z.object({
    xs: z.string().optional(),
    sm: z.string().optional(),
    md: z.string().optional(),
    lg: z.string().optional(),
    xl: z.string().optional(),
    '2xl': z.string().optional(),
    '3xl': z.string().optional(),
  }).optional(),
  radii: z.object({
    none: z.string().optional(),
    sm: z.string().optional(),
    md: z.string().optional(),
    lg: z.string().optional(),
    xl: z.string().optional(),
    '2xl': z.string().optional(),
    full: z.string().optional(),
  }).optional(),
  fonts: z.object({
    heading: z.string().optional(),
    body: z.string().optional(),
    mono: z.string().optional(),
    display: z.string().optional(),
  }).optional(),
  fontSizes: z.object({
    xs: z.string().optional(),
    sm: z.string().optional(),
    md: z.string().optional(),
    lg: z.string().optional(),
    xl: z.string().optional(),
    '2xl': z.string().optional(),
    '3xl': z.string().optional(),
    '4xl': z.string().optional(),
    '5xl': z.string().optional(),
    '6xl': z.string().optional(),
  }).optional(),
  fontWeights: z.object({
    hairline: z.string().optional(),
    thin: z.string().optional(),
    light: z.string().optional(),
    normal: z.string().optional(),
    medium: z.string().optional(),
    semibold: z.string().optional(),
    bold: z.string().optional(),
    extrabold: z.string().optional(),
    black: z.string().optional(),
  }).optional(),
  lineHeights: z.object({
    none: z.string().optional(),
    tight: z.string().optional(),
    snug: z.string().optional(),
    normal: z.string().optional(),
    relaxed: z.string().optional(),
    loose: z.string().optional(),
  }).optional(),
  shadows: z.object({
    xs: z.string().optional(),
    sm: z.string().optional(),
    md: z.string().optional(),
    lg: z.string().optional(),
    xl: z.string().optional(),
    '2xl': z.string().optional(),
    inner: z.string().optional(),
    outline: z.string().optional(),
  }).optional(),
  borders: z.object({
    widths: z.object({
      none: z.string().optional(),
      thin: z.string().optional(),
      thick: z.string().optional(),
    }).optional(),
    styles: z.object({
      solid: z.string().optional(),
      dashed: z.string().optional(),
      dotted: z.string().optional(),
      double: z.string().optional(),
      groove: z.string().optional(),
      ridge: z.string().optional(),
      inset: z.string().optional(),
      outset: z.string().optional(),
    }).optional(),
  }).optional(),
  gradients: z.object({
    primary: z.string().optional(),
    secondary: z.string().optional(),
    accent: z.string().optional(),
    neutral: z.string().optional(),
  }).optional(),
  backgrounds: z.object({
    primary: z.string().optional(),
    secondary: z.string().optional(),
    tertiary: z.string().optional(),
    overlay: z.string().optional(),
  }).optional(),
  animations: z.object({
    duration: z.object({
      fast: z.string().optional(),
      normal: z.string().optional(),
      slow: z.string().optional(),
    }).optional(),
    easing: z.object({
      linear: z.string().optional(),
      ease: z.string().optional(),
      easeIn: z.string().optional(),
      easeOut: z.string().optional(),
      easeInOut: z.string().optional(),
    }).optional(),
  }).optional(),
  breakpoints: z.object({
    sm: z.string().optional(),
    md: z.string().optional(),
    lg: z.string().optional(),
    xl: z.string().optional(),
    '2xl': z.string().optional(),
  }).optional(),
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
