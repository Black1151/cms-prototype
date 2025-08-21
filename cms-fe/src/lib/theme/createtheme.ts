import { extendTheme } from "@chakra-ui/react";
import { ThemeTokens } from "../schemas";
import { THEME_ISOLATION_CONFIG, DEFAULT_THEME_FALLBACKS } from "./themeConfig";

export function createChakraThemeFromTokens(tokens: unknown) {
  const t = ThemeTokens.parse(tokens);
  
  // Create a completely isolated theme that doesn't inherit from the root theme
  return extendTheme({
    // Use isolation configuration
    ...THEME_ISOLATION_CONFIG,
    
    // Explicitly set all theme values to ensure no inheritance from root
    colors: {
      brand: t.colors.brand,
      accent: t.colors.accent ?? t.colors.brand,
      neutral: t.colors.neutral ?? DEFAULT_THEME_FALLBACKS.colors.neutral,
      success: t.colors.success ?? DEFAULT_THEME_FALLBACKS.colors.success,
      warning: t.colors.warning ?? DEFAULT_THEME_FALLBACKS.colors.warning,
      error: t.colors.error ?? DEFAULT_THEME_FALLBACKS.colors.error,
      info: t.colors.info ?? DEFAULT_THEME_FALLBACKS.colors.info,
      // Override any default Chakra colors to prevent inheritance
      gray: t.colors.neutral ?? DEFAULT_THEME_FALLBACKS.colors.neutral,
      red: t.colors.error ?? DEFAULT_THEME_FALLBACKS.colors.error,
      green: t.colors.success ?? DEFAULT_THEME_FALLBACKS.colors.success,
      yellow: t.colors.warning ?? DEFAULT_THEME_FALLBACKS.colors.warning,
      blue: t.colors.info ?? DEFAULT_THEME_FALLBACKS.colors.info,
    },
    fonts: {
      heading: t.fonts?.heading ?? DEFAULT_THEME_FALLBACKS.fonts.heading,
      body: t.fonts?.body ?? DEFAULT_THEME_FALLBACKS.fonts.body,
      mono: t.fonts?.mono ?? DEFAULT_THEME_FALLBACKS.fonts.mono,
      display: t.fonts?.display ?? DEFAULT_THEME_FALLBACKS.fonts.heading,
    },
    fontSizes: {
      xs: t.fontSizes?.xs ?? DEFAULT_THEME_FALLBACKS.fontSizes.xs,
      sm: t.fontSizes?.sm ?? DEFAULT_THEME_FALLBACKS.fontSizes.sm,
      md: t.fontSizes?.md ?? DEFAULT_THEME_FALLBACKS.fontSizes.md,
      lg: t.fontSizes?.lg ?? DEFAULT_THEME_FALLBACKS.fontSizes.lg,
      xl: t.fontSizes?.xl ?? DEFAULT_THEME_FALLBACKS.fontSizes.xl,
      "2xl": t.fontSizes?.["2xl"] ?? DEFAULT_THEME_FALLBACKS.fontSizes["2xl"],
      "3xl": t.fontSizes?.["3xl"] ?? DEFAULT_THEME_FALLBACKS.fontSizes["3xl"],
      "4xl": t.fontSizes?.["4xl"] ?? DEFAULT_THEME_FALLBACKS.fontSizes["4xl"],
      "5xl": t.fontSizes?.["5xl"] ?? DEFAULT_THEME_FALLBACKS.fontSizes["5xl"],
      "6xl": t.fontSizes?.["6xl"] ?? DEFAULT_THEME_FALLBACKS.fontSizes["6xl"],
    },
    fontWeights: {
      hairline: t.fontWeights?.hairline ?? 100,
      thin: t.fontWeights?.thin ?? 200,
      light: t.fontWeights?.light ?? 300,
      normal: t.fontWeights?.normal ?? 400,
      medium: t.fontWeights?.medium ?? 500,
      semibold: t.fontWeights?.semibold ?? 600,
      bold: t.fontWeights?.bold ?? 700,
      extrabold: t.fontWeights?.extrabold ?? 800,
      black: t.fontWeights?.black ?? 900,
    },
    lineHeights: {
      none: t.lineHeights?.none ?? 1,
      tight: t.lineHeights?.tight ?? 1.25,
      snug: t.lineHeights?.snug ?? 1.375,
      normal: t.lineHeights?.normal ?? 1.5,
      relaxed: t.lineHeights?.relaxed ?? 1.625,
      loose: t.lineHeights?.loose ?? 2,
    },
    spacing: {
      xs: t.spacing?.xs ?? DEFAULT_THEME_FALLBACKS.spacing.xs,
      sm: t.spacing?.sm ?? DEFAULT_THEME_FALLBACKS.spacing.sm,
      md: t.spacing?.md ?? DEFAULT_THEME_FALLBACKS.spacing.md,
      lg: t.spacing?.lg ?? DEFAULT_THEME_FALLBACKS.spacing.lg,
      xl: t.spacing?.xl ?? DEFAULT_THEME_FALLBACKS.spacing.xl,
      "2xl": t.spacing?.["2xl"] ?? DEFAULT_THEME_FALLBACKS.spacing["2xl"],
      "3xl": t.spacing?.["3xl"] ?? DEFAULT_THEME_FALLBACKS.spacing["3xl"],
    },
    radii: {
      none: t.radii?.none ?? DEFAULT_THEME_FALLBACKS.radii.none,
      sm: t.radii?.sm ?? DEFAULT_THEME_FALLBACKS.radii.sm,
      md: t.radii?.md ?? DEFAULT_THEME_FALLBACKS.radii.md,
      lg: t.radii?.lg ?? DEFAULT_THEME_FALLBACKS.radii.lg,
      xl: t.radii?.xl ?? DEFAULT_THEME_FALLBACKS.radii.xl,
      "2xl": t.radii?.["2xl"] ?? DEFAULT_THEME_FALLBACKS.radii["2xl"],
      full: t.radii?.full ?? DEFAULT_THEME_FALLBACKS.radii.full,
    },
    shadows: {
      xs: t.shadows?.xs ?? "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      sm: t.shadows?.sm ?? "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
      md: t.shadows?.md ?? "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
      lg: t.shadows?.lg ?? "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
      xl: t.shadows?.xl ?? "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
      "2xl": t.shadows?.["2xl"] ?? "0 25px 50px -12px rgb(0 0 0 / 0.25)",
      inner: t.shadows?.inner ?? "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
      outline: t.shadows?.outline ?? "0 0 0 3px rgb(59 130 246 / 0.5)",
    },
    breakpoints: {
      sm: t.breakpoints?.sm ?? "640px",
      md: t.breakpoints?.md ?? "768px",
      lg: t.breakpoints?.lg ?? "1024px",
      xl: t.breakpoints?.xl ?? "1280px",
      "2xl": t.breakpoints?.["2xl"] ?? "1536px",
    },
    components: {
      Heading: {
        baseStyle: {
          fontFamily: "heading",
          fontWeight: "bold",
          color: "brand.700",
        },
        variants: {
          lessonTitle: { 
            fontSize: "3xl", 
            fontWeight: "extrabold", 
            color: "brand.700", 
            mb: 4 
          },
          section: { 
            fontSize: "xl", 
            fontWeight: "bold", 
            color: "brand.800", 
            mt: 6, 
            mb: 2 
          }
        }
      },
      Button: {
        baseStyle: {
          fontWeight: "medium",
          borderRadius: "md",
        },
        variants: {
          solid: { 
            bg: "brand.600", 
            color: "white", 
            _hover: { bg: "brand.700" },
            _active: { bg: "brand.800" }
          },
          outline: {
            border: "2px solid",
            borderColor: "brand.600",
            color: "brand.600",
            _hover: { bg: "brand.50" }
          },
          ghost: {
            color: "brand.600",
            _hover: { bg: "brand.50" }
          }
        }
      },
      Text: {
        baseStyle: {
          color: "neutral.700",
          lineHeight: "relaxed",
        }
      },
      Link: {
        baseStyle: {
          color: "brand.600",
          _hover: { textDecoration: "underline" }
        }
      }
    },
    styles: {
      global: {
        // Ensure all styles are scoped to this theme
        "html, body": {
          fontFamily: "body",
          color: "neutral.900",
          bg: "white",
        },
        "h1, h2, h3, h4, h5, h6": {
          fontFamily: "heading",
          fontWeight: "bold",
        },
        // Override any inherited styles
        "*": {
          boxSizing: "border-box",
        }
      }
    }
  });
}
