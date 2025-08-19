import { extendTheme } from "@chakra-ui/react";
import { ThemeTokens } from "../schemas";

export function createChakraThemeFromTokens(tokens: unknown) {
  const t = ThemeTokens.parse(tokens);
  return extendTheme({
    colors: {
      brand: t.colors.brand,
      accent: t.colors.accent ?? t.colors.brand
    },
    radii: { md: t.radii?.md ?? "12px" },
    fonts: { heading: t.fonts?.heading ?? "Inter", body: t.fonts?.body ?? "Inter" },
    components: {
      Heading: {
        variants: {
          lessonTitle: { fontSize: "3xl", fontWeight: "extrabold", color: "brand.700", mb: 4 },
          section: { fontSize: "xl", fontWeight: "bold", color: "brand.800", mt: 6, mb: 2 }
        }
      },
      Button: {
        variants: {
          solid: { bg: "brand.600", color: "white", _hover: { bg: "brand.700" } }
        }
      }
    },
    styles: { global: { "html, body": { fontFamily: "body" } } }
  });
}
