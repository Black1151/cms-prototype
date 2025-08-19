import { Field, InputType } from '@nestjs/graphql';

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

  @Field(() => Object, { nullable: true })
  overrides?: Record<string, { css: Record<string, any> }>;
}
