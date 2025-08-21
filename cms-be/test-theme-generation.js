// Test script for theme generation GraphQL mutation
// Run this with: node test-theme-generation.js

const { ApolloClient, InMemoryCache, gql } = require('@apollo/client');

// Note: This is a Node.js test script, so we'll use a simple fetch approach
async function testThemeGeneration() {
  try {
    const mutation = `
      mutation GenerateTheme($input: GenerateThemeInput!) {
        generateTheme(input: $input) {
          id
          name
          tokens
          notes
        }
      }
    `;

    const variables = {
      input: {
        description: "high contrast red and blue theme"
      }
    };

    const response = await fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: variables
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('HTTP Error:', error);
      return;
    }

    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL Errors:', result.errors);
      return;
    }

    console.log('Generated Theme:');
    console.log(JSON.stringify(result.data.generateTheme, null, 2));
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testThemeGeneration();
}

module.exports = { testThemeGeneration };
