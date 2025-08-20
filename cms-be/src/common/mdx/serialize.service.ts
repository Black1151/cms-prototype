import { Injectable } from '@nestjs/common';
import { stampIds } from './id-stamp.util';
import { validateMdxAst } from './ast-validate.util';

@Injectable()
export class MdxSerializeService {
  // ESM deps loaded at runtime and cached
  private unified!: typeof import('unified')['unified'];
  private remarkParse!: any;
  private remarkStringify!: any;
  private remarkMdx!: any;

  private ready?: Promise<void>;
  private ensureReady() {
    if (!this.ready) {
      this.ready = (async () => {
        const [
          { unified },
          { default: remarkParse },
          { default: remarkStringify },
          { default: remarkMdx },
        ] = await Promise.all([
          import('unified'),
          import('remark-parse'),
          import('remark-stringify'),
          import('remark-mdx'),
        ]);
        this.unified = unified;
        this.remarkParse = remarkParse;
        this.remarkStringify = remarkStringify;
        this.remarkMdx = remarkMdx;
      })();
    }
    return this.ready;
  }

  async parse(mdx: string) {
    await this.ensureReady();
    return this.unified().use(this.remarkParse).use(this.remarkMdx).parse(mdx);
  }

  async stringify(tree: any) {
    await this.ensureReady();
    return this.unified().use(this.remarkStringify).use(this.remarkMdx).stringify(tree) as string;
  }

  /** Normalize (stamp data-ids), validate against registry schemas, and return canonical MDX */
  async normalizeAndValidate(mdx: string) {
    const parsed = await this.parse(mdx);
    const stamped = stampIds(parsed);
    validateMdxAst(stamped);
    const out = await this.stringify(stamped);
    return { tree: stamped, mdx: out };
  }
}
