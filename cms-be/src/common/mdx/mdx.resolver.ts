import { Args, ObjectType, Field, Query, Resolver } from '@nestjs/graphql';
import { MdxSerializeService } from './serialize.service';
import { serialize } from 'next-mdx-remote/serialize';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';

@ObjectType()
class MdxNormalizedPayload {
  @Field(() => String) normalized!: string;
}

@ObjectType()
class MdxCompiledPayload {
  @Field(() => String) normalized!: string;
  @Field(() => String) compiledSource!: string; // feeds MDXRemote on the client
}

@Resolver()
export class MdxResolver {
  constructor(private readonly mdx: MdxSerializeService) {}

  @Query(() => MdxNormalizedPayload)
  async normalizeMdx(@Args('mdx', { type: () => String }) mdx: string) {
    const { mdx: normalized } = await this.mdx.normalizeAndValidate(mdx);
    return { normalized };
  }

  @Query(() => MdxCompiledPayload)
  async compileMdx(@Args('mdx', { type: () => String }) mdx: string) {
    const { mdx: normalized } = await this.mdx.normalizeAndValidate(mdx);
    const mdxSource = await serialize(normalized, {
      mdxOptions: { remarkPlugins: [remarkParse as any, remarkMdx as any], rehypePlugins: [] },
    });
    // mdxSource is a serializable object { compiledSource, frontmatter? }
    return { normalized, compiledSource: (mdxSource as any).compiledSource as string };
  }
}
