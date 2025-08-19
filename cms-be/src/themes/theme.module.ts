import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Theme } from './theme.entity';
import { ThemeService } from './theme.service';
import { ThemeResolver } from './theme.resolver';
import { AuditService } from '../audit/audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([Theme])],
  providers: [ThemeService, ThemeResolver, AuditService],
  exports: [ThemeService],
})
export class ThemesModule {}
