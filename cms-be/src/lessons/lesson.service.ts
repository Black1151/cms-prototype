import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from './lesson.entity';
import { UpdateLessonInput } from './dto/update-lesson.input';
import { MdxSerializeService } from '../common/mdx/serialize.service';
import { OverrideSchema } from '../common/zod/schemas';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class LessonService {
  constructor(
    @InjectRepository(Lesson) private readonly repo: Repository<Lesson>,
    private readonly mdx: MdxSerializeService,
    private readonly audit: AuditService,
  ) {}

  async findBySlug(slug: string) {
    const l = await this.repo.findOne({ where: { slug } });
    if (!l) throw new NotFoundException('Lesson not found');
    return l;
  }

  async upsertBySlug(input: UpdateLessonInput) {
    // 1) normalize & validate MDX
    const { mdx } = await this.mdx.normalizeAndValidate(input.mdx);

    // 2) validate overrides shape (if provided)
    let cleanOverrides: Record<string, { css: Record<string, any> }> | undefined;
    if (input.overrides) {
      cleanOverrides = {};
      for (const [k, v] of Object.entries(input.overrides)) {
        cleanOverrides[k] = OverrideSchema.parse(v);
      }
    }

    // 3) upsert lesson
    let lesson = await this.repo.findOne({ where: { slug: input.slug } });
    if (!lesson) {
      lesson = this.repo.create({
        slug: input.slug,
        title: input.title ?? input.slug,
        themeId: input.themeId ?? 'biology-v1',
        mdx,
        overrides: cleanOverrides,
      });
    } else {
      lesson.mdx = mdx;
      if (typeof input.title === 'string') lesson.title = input.title;
      if (typeof input.themeId === 'string') lesson.themeId = input.themeId;
      lesson.overrides = cleanOverrides;
    }
    await this.repo.save(lesson);
    await this.audit.log('lesson.upsert', { slug: lesson.slug, id: lesson.id });
    return lesson;
  }
}
