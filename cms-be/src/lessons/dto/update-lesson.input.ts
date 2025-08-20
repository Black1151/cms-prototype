import { Field, InputType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
export class UpdateLessonInput {
  @Field(() => String)
  slug!: string;

  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => String, { nullable: true })
  themeId?: string;

  @Field(() => String)
  mdx!: string;

  @Field(() => GraphQLJSON, { nullable: true })
  overrides?: Record<string, { css: Record<string, any> }>;
}
