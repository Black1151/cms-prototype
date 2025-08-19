import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Theme } from './theme.entity';
import { ThemeService } from './theme.service';
import { UpdateThemeInput } from './dto/update-theme.input';

@Resolver(() => Theme)
export class ThemeResolver {
  constructor(private readonly service: ThemeService) {}

  @Query(() => Theme)
  theme(@Args('id', { type: () => String }) id: string) {
    return this.service.get(id);
  }

  @Mutation(() => Theme)
  updateTheme(@Args('input') input: UpdateThemeInput) {
    return this.service.upsert(input);
  }
}
