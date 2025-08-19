import { NextRequest, NextResponse } from "next/server";

import { serialize } from "next-mdx-remote/serialize";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import { normalizeAndValidate } from "@/lib/mdx/serialize";

export async function POST(req: NextRequest) {
  try {
    const { mdx } = (await req.json()) as { mdx: string };
    const { mdx: normalized } = await normalizeAndValidate(mdx);
    const mdxSource = await serialize(normalized, {
      mdxOptions: { remarkPlugins: [remarkParse as any, remarkMdx as any], rehypePlugins: [] },
    });
    return NextResponse.json({ mdx: normalized, mdxSource });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "MDX preview failed" }, { status: 400 });
  }
}
