import { Field, ObjectType, ID } from '@nestjs/graphql';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@ObjectType()
@Entity({ name: 'lessons' })
export class Lesson {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Field(() => String)
  @Column({ type: 'text' })
  slug!: string; // e.g., "forces"

  @Field(() => String)
  @Column({ type: 'text' })
  title!: string;

  @Field(() => String)
  @Column({ type: 'text' })
  themeId!: string;

  @Field(() => String)
  @Column({ type: 'text' })
  mdx!: string;

  @Field(() => Object, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  overrides?: Record<string, { css: Record<string, any> }>;
}
