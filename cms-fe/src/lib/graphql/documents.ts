import { gql } from "@apollo/client";

/** Themes */
export const GET_THEME = gql`
  query GetTheme($id: String!) {
    theme(id: $id) { id name tokens }
  }
`;

export const GET_THEMES = gql`
  query GetThemes {
    themes { id name notes tokens }
  }
`;

export const UPDATE_THEME = gql`
  mutation UpdateTheme($input: UpdateThemeInput!) {
    updateTheme(input: $input) { id name tokens notes }
  }
`;

export const GENERATE_THEME = gql`
  mutation GenerateTheme($input: GenerateThemeInput!) {
    generateTheme(input: $input) {
      id
      name
      tokens
      notes
    }
  }
`;

export const DELETE_THEME = gql`
  mutation DeleteTheme($id: String!) {
    deleteTheme(id: $id)
  }
`;

/** Lessons */
export const GET_LESSON = gql`
  query GetLesson($slug: String!) {
    lesson(slug: $slug) {
      id
      slug
      title
      themeId
      mdx
      overrides
    }
  }
`;

export const UPDATE_LESSON = gql`
  mutation UpdateLesson($input: UpdateLessonInput!) {
    updateLesson(input: $input) {
      id
      slug
      title
      themeId
      mdx
      overrides
    }
  }
`;

/** MDX Pipeline (normalize + compile on the server) */
export const MDX_NORMALIZE = gql`
  query NormalizeMdx($mdx: String!) {
    normalizeMdx(mdx: $mdx) { normalized }
  }
`;

export const MDX_COMPILE = gql`
  query CompileMdx($mdx: String!) {
    compileMdx(mdx: $mdx) {
      normalized
      compiledSource
    }
  }
`;
