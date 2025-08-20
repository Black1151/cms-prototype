import { notFound } from "next/navigation";
import { serverGraphQL } from "@/lib/graphql/serverFetch";

const GET_LESSON_Q = `
  query GetLesson($slug: String!) {
    lesson(slug: $slug) { id slug title themeId mdx overrides }
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

import EditorClient from "./EditorClient";

export default async function EditorPage({ params }: { params: { id: string } }) {
  const lessonData = await serverGraphQL<{ lesson: any }>(GET_LESSON_Q, { slug: params.id }).catch(() => null);
  if (!lessonData?.lesson) return notFound();

  const themeData = await serverGraphQL<{ theme: { id: string; tokens: any } }>(
    GET_THEME_Q, { id: lessonData.lesson.themeId }
  );

  // Initial compiled preview for fast first paint
  const compiled = await serverGraphQL<{ compileMdx: { normalized: string; compiledSource: string } }>(
    COMPILE_MDX_Q, { mdx: lessonData.lesson.mdx }
  );

  return (
    <EditorClient
      id={lessonData.lesson.id}
      slug={lessonData.lesson.slug}
      mdx={lessonData.lesson.mdx}
      tokens={themeData.theme.tokens}
      overrides={lessonData.lesson.overrides ?? {}}
      mdxSourceInitial={{ compiledSource: compiled.compileMdx.compiledSource, scope: {} } as any}
    />
  );
}
