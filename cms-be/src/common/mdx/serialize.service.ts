import { Injectable } from '@nestjs/common';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkMdx from 'remark-mdx';
import { stampIds } from './id-stamp.util';
import { validateMdxAst } from './ast-validate.util';

@Injectable()
export class MdxSerializeService {
  async parse(mdx: string) {
    return unified().use(remarkParse as any).use(remarkMdx as any).parse(mdx);
  }

  async stringify(tree: any) {
    return unified().use(remarkStringify as any).use(remarkMdx as any).stringify(tree) as string;
  }

  /** Normalize (stamp data-ids), validate against registry schemas, and return canonical MDX */
  async normalizeAndValidate(mdx: string) {
    let tree = await this.parse(mdx);
    tree = stampIds(tree);
    validateMdxAst(tree);
    const out = await this.stringify(tree);
    return { tree, mdx: out };
  }
}
