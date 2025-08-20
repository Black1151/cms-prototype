// ast-validate.util.ts
import { COMPONENT_SCHEMAS } from '../zod/schemas';

// Tiny Unist walker (iterative, no external deps)
function walk(node: any, fn: (n: any) => void) {
  const stack = [node];
  while (stack.length) {
    const n = stack.pop()!;
    fn(n);
    if (n && typeof n === 'object' && Array.isArray(n.children)) {
      for (let i = n.children.length - 1; i >= 0; i--) {
        stack.push(n.children[i]);
      }
    }
  }
}

export function validateMdxAst(tree: any) {
  const errors: string[] = [];

  walk(tree, (node) => {
    if (node?.type === 'mdxJsxFlowElement' || node?.type === 'mdxJsxTextElement') {
      const name: string | undefined = node.name;
      const schema = name ? COMPONENT_SCHEMAS[name] : undefined;

      if (!schema) {
        errors.push(`Unknown component <${name ?? 'undefined'}>`);
        return;
      }

      const props: Record<string, any> = {};
      for (const attr of node.attributes ?? []) {
        if (attr?.type !== 'mdxJsxAttribute') continue;
        props[attr.name] = attr.value ?? true;
      }

      const res = schema.safeParse(props);
      if (!res.success) {
        const msg = res.error.issues
          .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
          .join('; ');
        errors.push(`<${name}> invalid props: ${msg}`);
      }
    }
  });

  if (errors.length) {
    const err = new Error('MDX validation failed:\n' + errors.join('\n'));
    (err as any).details = errors;
    throw err;
  }
}
