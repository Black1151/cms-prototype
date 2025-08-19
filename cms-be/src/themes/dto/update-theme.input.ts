import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateThemeInput {
  @Field(() => String)
  id!: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  basedOnThemeId?: string;

  @Field(() => String, { nullable: true })
  notes?: string;

  @Field(() => Object)
  tokens!: Record<string, any>;
}
