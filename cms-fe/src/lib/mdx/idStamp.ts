import { visit } from "unist-util-visit";

function randomId(prefix = "b") {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export function remarkIdStamp() {
  return (tree: any) => {
    visit(tree, (node: any) => {
      if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
        const hasId = (node.attributes || []).some((a: any) => a.name === "data-id");
        if (!hasId) {
          node.attributes = node.attributes || [];
          node.attributes.push({ type: "mdxJsxAttribute", name: "data-id", value: randomId() });
        }
      }
    });
  };
}
