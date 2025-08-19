import { visit } from "unist-util-visit";
import { COMPONENT_SCHEMAS } from "../schemas";

export async function validateMdxAst(tree: any) {
  const errors: string[] = [];

  visit(tree, (node: any) => {
    if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
      const name = node.name;
      const schema = COMPONENT_SCHEMAS[name];
      if (!schema) {
        errors.push(`Unknown component <${name}>`);
        return;
      }
      const props: Record<string, any> = {};
      for (const attr of node.attributes ?? []) {
        if (attr.type !== "mdxJsxAttribute") continue;
        props[attr.name] = attr.value ?? true;
      }
      const result = schema.safeParse(props);
      if (!result.success) {
        const msg = result.error.issues.map(i => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
        errors.push(`<${name}> invalid props: ${msg}`);
      }
    }
  });

  if (errors.length) throw new Error("MDX validation failed:\n" + errors.join("\n"));
}
