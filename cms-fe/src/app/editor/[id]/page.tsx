import { notFound } from "next/navigation";

import { serialize } from "next-mdx-remote/serialize";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import { db } from "@/lib/db";
import { normalizeAndValidate } from "@/lib/mdx/serialize";
import EditorClient from "./EditorClient";


export default async function EditorPage({ params }: { params: { id: string } }) {
  const lesson = db.getLesson(params.id);
  if (!lesson) return notFound();

  // Normalize (stamps data-id) & validate once on load
  const { mdx } = await normalizeAndValidate(lesson.mdx);
  const tokens = db.getTheme(lesson.themeId);

  // Initial compiled preview for faster first paint
  const mdxSourceInitial = await serialize(mdx, {
    mdxOptions: { remarkPlugins: [remarkParse as any, remarkMdx as any], rehypePlugins: [] },
  });

  return (
    <EditorClient
      id={lesson.id}
      mdx={mdx}
      tokens={tokens}
      overrides={lesson.overrides ?? {}}
      mdxSourceInitial={mdxSourceInitial}
    />
  );
}
