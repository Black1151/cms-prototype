// NOTE: no import from 'unist-util-visit'

function randomId(prefix = 'b') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

// Minimal Unist walker (no ESM deps)
function walk(node: any, fn: (n: any) => void) {
  const stack = [node];
  while (stack.length) {
    const n = stack.pop()!;
    fn(n);
    if (n && typeof n === 'object' && Array.isArray(n.children)) {
      // Push in reverse to keep order roughly left→right during pop
      for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]);
    }
  }
}

/** Mutates the tree to ensure each mdxJsx* element has a data-id attribute */
export function stampIds(tree: any) {
  walk(tree, (node) => {
    if (node?.type === 'mdxJsxFlowElement' || node?.type === 'mdxJsxTextElement') {
      const attrs = node.attributes ?? (node.attributes = []);
      const hasId = attrs.some((a: any) => a?.name === 'data-id');
      if (!hasId) {
        attrs.push({ type: 'mdxJsxAttribute', name: 'data-id', value: randomId() });
      }
    }
  });
  return tree;
}
