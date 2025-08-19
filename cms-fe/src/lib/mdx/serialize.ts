import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import remarkMdx from "remark-mdx";
import { remarkIdStamp } from "./idStamp";
import { validateMdxAst } from "./validateMdx";

export async function parseMdx(mdx: string) {
  return unified().use(remarkParse as any).use(remarkMdx as any).parse(mdx);
}

export async function stampAst(tree: any) {
  await unified().use(() => (t: any) => remarkIdStamp()(t)).run(tree);
  return tree;
}

export async function stringifyAst(tree: any) {
  return unified().use(remarkStringify as any).use(remarkMdx as any).stringify(tree) as string;
}

export async function normalizeAndValidate(mdx: string) {
  let tree = await parseMdx(mdx);
  tree = await stampAst(tree);
  await validateMdxAst(tree);
  const out = await stringifyAst(tree);
  return { tree, mdx: out };
}
