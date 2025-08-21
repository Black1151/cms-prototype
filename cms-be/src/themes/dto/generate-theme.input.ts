import { Field, InputType } from '@nestjs/graphql';
import { IsString, MinLength } from 'class-validator';

@InputType()
export class GenerateThemeInput {
  @Field(() => String)
  @IsString()
  @MinLength(3)
  description!: string;
}
