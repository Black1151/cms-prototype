// src/common/mdx/mdx.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { MdxSerializeService } from './serialize.service';

@Controller('mdx')
export class MdxController {
  constructor(private readonly mdx: MdxSerializeService) {}

  @Post('normalize')
  async normalize(@Body() body: { mdx: string }) {
    const { mdx } = await this.mdx.normalizeAndValidate(body.mdx);
    // Return normalized MDX; your Next route can then run next-mdx-remote/serialize.
    return { mdx };
  }
}
