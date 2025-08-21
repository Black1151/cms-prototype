import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Theme } from './theme.entity';
import { ThemeService } from './theme.service';
import { UpdateThemeInput } from './dto/update-theme.input';
import { GenerateThemeInput } from './dto/generate-theme.input';

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
}
