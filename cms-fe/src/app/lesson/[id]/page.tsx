import { notFound } from "next/navigation";

import { serialize } from "next-mdx-remote/serialize";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import { db } from "@/lib/db";
import { normalizeAndValidate } from "@/lib/mdx/serialize";
import LessonViewClient from "./LessonViewClient";

export default async function LessonPage({ params }: { params: { id: string } }) {
  const lesson = db.getLesson(params.id);
  if (!lesson) return notFound();

  // Ensure data-id is stamped and content is valid
  const { mdx } = await normalizeAndValidate(lesson.mdx);

  // Compile MDX on the server
  const mdxSource = await serialize(mdx, {
    mdxOptions: { remarkPlugins: [remarkParse as any, remarkMdx as any], rehypePlugins: [] },
  });

  const tokens = db.getTheme(lesson.themeId);
  return (
    <LessonViewClient
      id={lesson.id}
      mdxSource={mdxSource}
      tokens={tokens}
      overrides={lesson.overrides ?? {}}
    />
  );
}
