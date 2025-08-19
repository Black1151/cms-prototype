import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Theme } from './theme.entity';
import { UpdateThemeInput } from './dto/update-theme.input';
import { ThemeTokensSchema } from '../common/zod/schemas';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ThemeService {
  constructor(
    @InjectRepository(Theme) private readonly repo: Repository<Theme>,
    private readonly audit: AuditService,
  ) {}

  async get(id: string) {
    const t = await this.repo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Theme not found');
    return t;
  }

  async upsert(input: UpdateThemeInput) {
    // validate tokens with Zod
    const tokens = ThemeTokensSchema.parse(input.tokens);
    const next = this.repo.create({ ...input, tokens });
    await this.repo.save(next);
    await this.audit.log('theme.upsert', { id: input.id });
    return next;
  }
}
