import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Theme } from './theme.entity';

import { UpdateThemeInput } from './dto/update-theme.input';
import { GenerateThemeInput } from './dto/generate-theme.input';
import { AmendThemeInput } from './dto/amend-theme.input';
import { ThemeService } from './theme.service';

@Resolver(() => Theme)
export class ThemeResolver {
  constructor(private readonly service: ThemeService) {}

  @Query(() => Theme)
  theme(@Args('id', { type: () => String }) id: string) {
    return this.service.get(id);
  }

  @Query(() => [Theme])
  themes() {
    return this.service.getAll();
  }

  @Query(() => String)
  async checkOpenAIHealth() {
    console.log('🏥 [RESOLVER] Health check requested');
    const result = await this.service.checkOpenAIConnection();
    if (result.success) {
      return `OpenAI connection healthy - ${result.duration}ms, ${result.modelCount} models available`;
    } else {
      return `OpenAI connection failed: ${result.error}`;
    }
  }

  @Mutation(() => Theme)
  updateTheme(@Args('input') input: UpdateThemeInput) {
    return this.service.upsert(input);
  }

  @Mutation(() => Theme)
  generateTheme(@Args('input') input: GenerateThemeInput) {
    return this.service.generateTheme(input);
  }

  @Mutation(() => String)
  deleteTheme(@Args('id', { type: () => String }) id: string) {
    return this.service.deleteTheme(id);
  }

  @Mutation(() => Theme)
  amendTheme(@Args('input') input: AmendThemeInput) {
    return this.service.amend(input);
  }
}
