import { visit } from "unist-util-visit";

export type MdxJsxNode = {
  type: "mdxJsxFlowElement" | "mdxJsxTextElement";
  name: string;
  attributes: { type: "mdxJsxAttribute"; name: string; value?: any }[];
  children?: any[];
};

export function getTopLevelBlocks(tree: any): MdxJsxNode[] {
  return (tree.children || []).filter((n: any) =>
    n.type === "mdxJsxFlowElement" || n.type === "mdxJsxTextElement"
  );
}

export function getAttr(node: MdxJsxNode, name: string) {
  const a = node.attributes?.find((x) => x.name === name);
  return a?.value;
}

export function setAttr(node: MdxJsxNode, name: string, value: any) {
  const idx = node.attributes?.findIndex((x) => x.name === name) ?? -1;
  if (idx >= 0) node.attributes[idx].value = value;
  else {
    node.attributes = node.attributes || [];
    node.attributes.push({ type: "mdxJsxAttribute", name, value });
  }
}

export function moveTopLevel(tree: any, fromIndex: number, toIndex: number) {
  const arr = tree.children;
  const item = arr.splice(fromIndex, 1)[0];
  arr.splice(toIndex, 0, item);
}

export function findNodeById(tree: any, id: string): MdxJsxNode | null {
  let found: any = null;
  visit(tree, (node: any) => {
    if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
      const has = node.attributes?.find((a: any) => a.name === "data-id" && a.value === id);
      if (has) { found = node; return false; }
    }
  });
  return found;
}
