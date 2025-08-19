import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Lesson } from './lesson.entity';
import { LessonService } from './lesson.service';
import { UpdateLessonInput } from './dto/update-lesson.input';

@Resolver(() => Lesson)
export class LessonResolver {
  constructor(private readonly service: LessonService) {}

  @Query(() => Lesson)
  lesson(@Args('slug', { type: () => String }) slug: string) {
    return this.service.findBySlug(slug);
  }

  @Mutation(() => Lesson)
  updateLesson(@Args('input') input: UpdateLessonInput) {
    return this.service.upsertBySlug(input);
  }
}
