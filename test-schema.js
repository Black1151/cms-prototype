// Simple test to verify schema changes work
const { z } = require('zod');

// Test the updated schema
const Scale = z.object({
  50: z.string(), 100: z.string(), 200: z.string(), 300: z.string(), 400: z.string(),
  500: z.string(), 600: z.string(), 700: z.string(), 800: z.string(), 900: z.string(),
});

const ThemeTokensSchema = z.object({
  colors: z.object({
    brand: Scale,
    accent: Scale.optional(),
    neutral: Scale.optional(),
    success: Scale.optional(),
    warning: Scale.optional(),
    error: Scale.optional(),
    info: Scale.optional(),
    black: z.string(),
    white: z.string(),
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
});

// Test data with black and white
const testTheme = {
  colors: {
    brand: {
      "50": "#f0fdf4", "100": "#dcfce7", "200": "#bbf7d0", "300": "#86efac", "400": "#4ade80",
      "500": "#22c55e", "600": "#16a34a", "700": "#15803d", "800": "#166534", "900": "#14532d"
    },
    black: "#000000",
    white: "#FFFFFF"
  }
};

try {
  const result = ThemeTokensSchema.parse(testTheme);
  console.log('✅ Schema validation passed!');
  console.log('✅ Black color:', result.colors.black);
  console.log('✅ White color:', result.colors.white);
} catch (error) {
  console.error('❌ Schema validation failed:', error.message);
}

// Test data without black and white (should fail)
const testThemeWithoutEssentials = {
  colors: {
    brand: {
      "50": "#f0fdf4", "100": "#dcfce7", "200": "#bbf7d0", "300": "#86efac", "400": "#4ade80",
      "500": "#22c55e", "600": "#16a34a", "700": "#15803d", "800": "#166534", "900": "#14532d"
    }
  }
};

try {
  const result = ThemeTokensSchema.parse(testThemeWithoutEssentials);
  console.log('❌ This should have failed but passed');
} catch (error) {
  console.log('✅ Schema correctly requires black and white colors');
  console.log('Error:', error.message);
}

