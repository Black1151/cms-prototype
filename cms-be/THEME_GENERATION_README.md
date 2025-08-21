# Theme Generation Backend Implementation

This implementation adds AI-powered theme generation to the NestJS backend using OpenAI's GPT-4 model.

## 🎯 **What's New**

- **New DTO**: `GenerateThemeInput` for theme generation requests
- **New Service Method**: `generateTheme()` in `ThemeService`
- **New GraphQL Mutation**: `generateTheme` for client consumption
- **OpenAI Integration**: Secure API calls from the backend

## 🚀 **GraphQL Mutation**

```graphql
mutation GenerateTheme($input: GenerateThemeInput!) {
  generateTheme(input: $input) {
    id
    name
    tokens
    notes
  }
}
```

### Input
```graphql
input GenerateThemeInput {
  description: String!
}
```

### Response
Returns a `Theme` object with:
- `id`: Generated unique identifier
- `name`: Auto-generated name based on description
- `tokens`: Validated theme tokens (colors, radii, fonts)
- `notes`: Generation metadata

## 🔧 **Setup**

1. **Install Dependencies**: OpenAI client is already installed
2. **Environment Variable**: Add to your environment:
   ```
   OPENAI_API_KEY=your_actual_openai_api_key_here
   ```

## 📝 **Usage Examples**

### Frontend (Next.js)
```typescript
import { gql, useMutation } from '@apollo/client';

const GENERATE_THEME = gql`
  mutation GenerateTheme($input: GenerateThemeInput!) {
    generateTheme(input: $input) {
      id
      name
      tokens
      notes
    }
  }
`;

function ThemeGenerator() {
  const [generateTheme, { data, loading, error }] = useMutation(GENERATE_THEME);

  const handleGenerate = async (description: string) => {
    try {
      const result = await generateTheme({
        variables: { input: { description } }
      });
      console.log('Generated theme:', result.data.generateTheme);
    } catch (err) {
      console.error('Generation failed:', err);
    }
  };

  return (
    <button onClick={() => handleGenerate('modern dark theme with purple accents')}>
      Generate Theme
    </button>
  );
}
```

### cURL
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation GenerateTheme($input: GenerateThemeInput!) { generateTheme(input: $input) { id name tokens notes } }",
    "variables": { "input": { "description": "high contrast red and blue theme" } }
  }'
```

## 🏗️ **Architecture Benefits**

1. **Security**: API keys stay on the server
2. **Consistency**: Uses existing `ThemeTokensSchema` validation
3. **Integration**: Seamlessly works with existing theme system
4. **Audit Trail**: All generations are logged via `AuditService`
5. **Type Safety**: Full TypeScript and GraphQL schema generation

## 🔍 **How It Works**

1. **Client Request**: Frontend sends theme description via GraphQL
2. **OpenAI Call**: Backend calls OpenAI API with expert UI designer prompt
3. **Validation**: Response is validated against `ThemeTokensSchema`
4. **Response**: Returns validated theme tokens with metadata
5. **Logging**: All operations are audited for tracking

## 🧪 **Testing**

Use the included test script:
```bash
cd cms-be
node test-theme-generation.js
```

## 📊 **Generated Theme Structure**

The AI generates themes with:
- **Colors**: Brand and accent color scales (50-900)
- **Radii**: Border radius values
- **Fonts**: Heading and body font specifications

All tokens are validated against the existing Zod schema before being returned.

## 🚨 **Error Handling**

- **Missing API Key**: Clear error message if OpenAI key not configured
- **Invalid Responses**: JSON parsing and schema validation errors
- **OpenAI Failures**: Network and API error handling
- **Audit Logging**: All errors are logged for debugging

## 🔄 **Integration Points**

- **Existing Themes**: Generated themes can be saved using `updateTheme` mutation
- **Validation**: Uses same `ThemeTokensSchema` as manual theme creation
- **Audit**: Integrates with existing audit system
- **GraphQL**: Follows existing GraphQL patterns and conventions
