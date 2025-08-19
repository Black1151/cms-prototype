import { db } from "@/lib/db";
import { normalizeAndValidate } from "@/lib/mdx/serialize";
import { OverrideSchema } from "@/lib/schemas";
import { NextRequest, NextResponse } from "next/server";


export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const lesson = db.getLesson(params.id);
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lesson);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { mdx, overrides } = body ?? {};
    const { mdx: normalized } = await normalizeAndValidate(String(mdx));

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
