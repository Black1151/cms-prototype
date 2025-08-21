# Theme Amendment System

The Theme Amendment System enables follow-up instructions like "deeper colors for notifications" or "increase spacing slightly" without regenerating the whole theme. It provides multiple strategies for theme modifications with safety guarantees.

## Features

- **AI-powered theme adjustments** for all types of changes
- **Intelligent section detection** using GPT-5-nano to automatically identify affected areas
- **Scoped regeneration** of small subtrees
- **Constrained JSON Patch** (RFC6902) limited to strict allowlists
- **Always re-validates** with Zod and audits the diff
- **Dry-run support** for previewing changes

## Installation

The required dependencies are already installed:

```bash
npm install fast-json-patch tinycolor2
```

## API

### GraphQL Mutation

```graphql
mutation AmendTheme($input: AmendThemeInput!) {
  amendTheme(input: $input) {
    id
    name
    tokens
    _preview
    diff
  }
}
```

### Input Schema

```typescript
input AmendThemeInput {
  id: String!                    # Theme ID to amend
  instruction: String!           # Natural language instruction
  scope: [ThemeScope]           # Optional: restrict to specific areas
  mode: AmendmentMode           # Optional: force specific strategy
  dryRun: Boolean               # Optional: preview without saving
}

enum ThemeScope {
  notifications    # success, warning, error, info colors
  spacing         # spacing tokens
  radii           # border radius tokens
  brandColors     # brand color palette
  accentColors    # accent color palette
  typography      # fonts, font sizes, line heights, font weights
  layout          # breakpoints, grid, flexbox
  shadows         # box shadows, drop shadows
  borders         # border widths, styles
  animations      # transitions, durations, easing
}

enum AmendmentMode {
  auto            # Automatically choose best approach
  regen           # Regenerate specific subtree
  patch           # Apply JSON Patch
}
```

## How It Works

### 1. Intelligent Section Detection

The system automatically detects which parts of your theme need to be modified using a lightweight GPT-5-nano call:

```typescript
// User types: "make the brand colors warmer and more inviting"
// AI analyzes and returns: "brandColors"
// System then sends only brand colors to the main AI for modification
```

**Available sections:**
- **notifications**: Success, warning, error, info colors
- **spacing**: Spacing tokens, margins, padding
- **radii**: Border radius values
- **brandColors**: Primary brand color palette
- **accentColors**: Secondary accent color palette
- **typography**: Fonts, font sizes, line heights, font weights
- **layout**: Breakpoints, grid, flexbox
- **shadows**: Box shadows, drop shadows
- **borders**: Border widths, styles
- **animations**: Transitions, durations, easing

### 2. Scoped Regeneration

```typescript
// Example: Regenerate only notification colors
{
  id: "theme-123",
  instruction: "Make notifications more vibrant and modern",
  scope: ["notifications"],
  mode: "regen"
}
```

### 3. Constrained JSON Patch

Freeform AI-generated patches, but only on allowed paths:

```typescript
// Example: Complex color adjustments
{
  id: "theme-123", 
  instruction: "Shift brand colors to be more warm and inviting",
  scope: ["brandColors"],
  mode: "patch"
}
```

## Usage Examples

### Basic Amendment

```typescript
// Simple instruction - AI auto-detects sections and handles everything
const result = await themeService.amend({
  id: "biology-v1",
  instruction: "Make the spacing slightly larger"
});
// System automatically detects "spacing" section and modifies only that area
```

### Preview Changes

```typescript
// Preview without saving
const preview = await themeService.amend({
  id: "biology-v1",
  instruction: "Deeper notification colors",
  dryRun: true
});

console.log("Changes:", preview.diff);
console.log("Preview tokens:", preview.tokens);
```

### Force Approach

```typescript
// Force specific approach (optional - auto-detection is usually better)
const result = await themeService.amend({
  id: "biology-v1",
  instruction: "Redesign the spacing system",
  mode: "regen",
  scope: ["spacing"] // Manual scope override
});
```

## Safety Features

### Path Allowlisting

Only specific paths can be modified:

- `/colors/success` - Success color palette
- `/colors/warning` - Warning color palette  
- `/colors/error` - Error color palette
- `/colors/info` - Info color palette
- `/colors/brand` - Brand color palette
- `/colors/accent` - Accent color palette
- `/spacing` - Spacing tokens
- `/radii` - Border radius tokens

### Validation

- All changes pass through `ThemeTokensSchema.parse()`
- JSON Patch operations are validated against allowlist
- Diff is logged for audit trail

### Audit Logging

```typescript
// All amendments are logged
await audit.log('theme.amend', {
  id: input.id,
  diff: jsonpatch.compare(original, modified)
});

// Preview operations are also logged
await audit.log('theme.amend.preview', {
  id: input.id, 
  diff: diff
});
```

## Implementation Details

### Core Methods

- `regenSubtree(tokens, instruction, scope)` - AI subtree regeneration
- `patchWithAI(tokens, instruction, scope)` - Constrained JSON patching
- `resolveScopeToPaths(scope)` - Maps scopes to allowed paths

### Error Handling

- Rejects patches outside allowlist
- Validates all AI outputs with Zod
- Graceful fallback for malformed instructions

## Testing

Run the test suite:

```bash
node test-theme-amendment.js
```

This tests:
- Spacing adjustments
- Color palette modifications  
- Intent inference
- Scope resolution

## Best Practices

1. **Use clear, descriptive instructions** - AI auto-detects sections best with specific requests
2. **Trust the auto-detection** - The system intelligently identifies affected areas
3. **Use dryRun for complex changes** - Preview before applying
4. **Monitor audit logs** - Track all theme modifications
5. **Validate results** - Check that changes meet expectations

## Limitations

- Only supports specified scopes and paths
- AI regeneration requires OpenAI API access
- JSON Patch operations must be valid RFC6902

## Future Enhancements

- More sophisticated intent detection
- Additional deterministic transforms
- Custom scope definitions
- Batch amendment operations
- Theme versioning and rollback

