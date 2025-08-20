import { NextRequest, NextResponse } from "next/server";
import { serverGraphQL } from "@/lib/graphql/serverFetch";

const COMPILE_MDX_Q = `
  query CompileMdx($mdx: String!) {
    compileMdx(mdx: $mdx) { 
      normalized 
      compiledSource 
    }
  }
`;

export async function POST(req: NextRequest) {
  try {
    const { mdx } = (await req.json()) as { mdx: string };
    
    // Use backend GraphQL resolver for MDX processing
    const result = await serverGraphQL<{ compileMdx: { normalized: string; compiledSource: string } }>(
      COMPILE_MDX_Q,
      { mdx }
    );
    
    if (!result?.compileMdx) {
      throw new Error("Failed to compile MDX");
    }
    
    return NextResponse.json({ 
      mdx: result.compileMdx.normalized, 
      mdxSource: { compiledSource: result.compileMdx.compiledSource, scope: {} }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "MDX preview failed" }, { status: 400 });
  }
}
