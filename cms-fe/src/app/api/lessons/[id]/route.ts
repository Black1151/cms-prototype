import { db } from "@/lib/db";
import { serverGraphQL } from "@/lib/graphql/serverFetch";
import { OverrideSchema } from "@/lib/schemas";
import { NextRequest, NextResponse } from "next/server";

const NORMALIZE_MDX_Q = `
  query NormalizeMdx($mdx: String!) {
    normalizeMdx(mdx: $mdx) { normalized }
  }
`;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const lesson = db.getLesson(params.id);
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lesson);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { mdx, overrides } = body ?? {};
    
    // Use backend GraphQL resolver for MDX normalization
    const result = await serverGraphQL<{ normalizeMdx: { normalized: string } }>(
      NORMALIZE_MDX_Q,
      { mdx: String(mdx) }
    );
    
    if (!result?.normalizeMdx) {
      throw new Error("Failed to normalize MDX");
    }
    
    const normalized = result.normalizeMdx.normalized;

    const cleanOverrides: Record<string, any> = {};
    if (overrides && typeof overrides === "object") {
      for (const [k, v] of Object.entries(overrides)) {
        cleanOverrides[k] = OverrideSchema.parse(v);
      }
    }
    const saved = db.saveLesson(params.id, { mdx: normalized, overrides: cleanOverrides });
    return NextResponse.json(saved);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Validation failed" }, { status: 400 });
  }
}
