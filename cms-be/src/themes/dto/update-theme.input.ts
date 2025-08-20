import { Field, InputType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

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

  @Field(() => GraphQLJSON)
  tokens!: Record<string, any>;
}
