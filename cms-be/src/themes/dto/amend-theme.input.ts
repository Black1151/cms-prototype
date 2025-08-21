import { Field, InputType } from '@nestjs/graphql';
import { IsString, IsOptional, IsArray, IsEnum, IsBoolean } from 'class-validator';

@InputType()
export class AmendThemeInput {
  @Field()
  @IsString()
  id!: string;

  @Field()
  @IsString()
  instruction!: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsEnum(['notifications', 'spacing', 'radii', 'brandColors', 'accentColors', 'typography', 'layout', 'shadows', 'borders', 'animations'], { each: true })
  scope?: Array<'notifications' | 'spacing' | 'radii' | 'brandColors' | 'accentColors' | 'typography' | 'layout' | 'shadows' | 'borders' | 'animations'>;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(['auto', 'regen', 'patch'])
  mode?: 'auto' | 'regen' | 'patch';

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

