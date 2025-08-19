// src/common/mdx/mdx.module.ts
import { Module } from '@nestjs/common';
import { MdxSerializeService } from './serialize.service';
import { MdxController } from './mdx.controller';


@Module({
  providers: [MdxSerializeService],
  controllers: [MdxController],
  exports: [MdxSerializeService],
})
export class MdxModule {}
