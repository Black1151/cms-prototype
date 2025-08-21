import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Theme } from './theme.entity';

import { ThemeResolver } from './theme.resolver';
import { AuditService } from '../audit/audit.service';
import { ThemeService } from './theme.service';

@Module({
  imports: [TypeOrmModule.forFeature([Theme])],
  providers: [ThemeService, ThemeResolver, AuditService],
  exports: [ThemeService],
})
export class ThemesModule {}
