import { notFound } from "next/navigation";
import LessonViewClient from "./LessonViewClient";
import { serverGraphQL } from "@/lib/graphql/serverFetch";

const GET_LESSON_Q = `
  query GetLesson($slug: String!) {
    lesson(slug: $slug) {
      id slug title themeId mdx overrides
    }
  }
`;

const GET_THEME_Q = `
  query GetTheme($id: String!) {
    theme(id: $id) { id tokens }
  }
`;

const COMPILE_MDX_Q = `
  query CompileMdx($mdx: String!) {
    compileMdx(mdx: $mdx) { normalized compiledSource }
  }
`;

export default async function LessonPage({ params }: { params: { id: string } }) {
  // 1) fetch lesson by slug
  const data = await serverGraphQL<{
    lesson: { id: string; slug: string; title: string; themeId: string; mdx: string; overrides?: any };
  }>(GET_LESSON_Q, { slug: params.id }).catch(() => null);

  if (!data?.lesson) return notFound();

  // 2) fetch theme tokens
  const themeData = await serverGraphQL<{ theme: { id: string; tokens: any } }>(
    GET_THEME_Q,
    { id: data.lesson.themeId }
  );

  // 3) compile MDX on the backend (provides compiledSource for MDXRemote)
  const compiled = await serverGraphQL<{ compileMdx: { normalized: string; compiledSource: string } }>(
    COMPILE_MDX_Q,
    { mdx: data.lesson.mdx }
  );

  return (
    <LessonViewClient
      id={data.lesson.id}
      // MDXRemote requires an object with compiledSource
      mdxSource={{ compiledSource: compiled.compileMdx.compiledSource, scope: {} } as any}
      tokens={themeData.theme.tokens}
      overrides={data.lesson.overrides ?? {}}
    />
  );
}
