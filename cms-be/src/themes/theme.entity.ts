import { Field, ObjectType, ID } from '@nestjs/graphql';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType()
@Entity({ name: 'themes' })
export class Theme {
  @Field(() => ID)
  @PrimaryColumn({ type: 'text' })
  id!: string; // e.g., "biology-v1"

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  basedOnThemeId?: string;

  @Field(() => String, { nullable: true })
  notes?: string;

  @Field(() => GraphQLJSON)
  @Column({ type: 'jsonb' })
  tokens!: Record<string, any>;
}
