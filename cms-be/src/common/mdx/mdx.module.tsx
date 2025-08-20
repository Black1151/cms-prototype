// src/common/mdx/mdx.module.ts
import { Module } from '@nestjs/common';
import { MdxSerializeService } from './serialize.service';
import { MdxResolver } from './mdx.resolver';



@Module({
  providers: [MdxSerializeService, MdxResolver],
  exports: [MdxSerializeService],
})
export class MdxModule {}
