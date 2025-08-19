import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lesson } from './lesson.entity';
import { LessonService } from './lesson.service';
import { LessonResolver } from './lesson.resolver';
import { MdxSerializeService } from '../common/mdx/serialize.service';
import { AuditService } from '../audit/audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([Lesson])],
  providers: [LessonService, LessonResolver, MdxSerializeService, AuditService],
  exports: [LessonService],
})
export class LessonsModule {}
