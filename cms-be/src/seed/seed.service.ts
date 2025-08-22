import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Theme } from '../themes/theme.entity';
import { Lesson } from '../lessons/lesson.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(Theme) private readonly themes: Repository<Theme>,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
  ) {}

  async onModuleInit() {
    const countThemes = await this.themes.count();
    if (countThemes === 0) {
      await this.themes.save(this.themes.create({
        id: 'biology-v1',
        name: 'Biology v1',
        tokens: {
          colors: {
            brand: {
              "50": "#f0fdf4","100": "#dcfce7","200": "#bbf7d0","300": "#86efac","400": "#4ade80",
              "500": "#22c55e","600": "#16a34a","700": "#15803d","800": "#166534","900": "#14532d"
            },
            accent: {
              "50": "#ecfeff","100": "#cffafe","200": "#a5f3fc","300": "#67e8f9","400": "#22d3ee",
              "500": "#06b6d4","600": "#0891b2","700": "#0e7490","800": "#155e75","900": "#164e63"
            },
            black: "#000000",
            white: "#FFFFFF"
          },
          radii: { md: "12px" },
          fonts: { heading: "Inter, system-ui, sans-serif", body: "Inter, system-ui, sans-serif" }
        }
      }));
    }

    const countLessons = await this.lessons.count();
    if (countLessons === 0) {
      await this.lessons.save(this.lessons.create({
        slug: 'forces',
        title: 'Forces & Motion',
        themeId: 'biology-v1',
        mdx: `
<Heading data-id="h1" variant="lessonTitle">Forces & Motion</Heading>

<Callout data-id="c1" variant="info">
Today we’ll explore how forces change motion.
</Callout>

<Text data-id="t1">Newton’s First Law states that an object remains at rest or in uniform motion unless acted on by a net external force.</Text>

<Img data-id="img1" src="/images/cart.png" alt="Cart on a track" />

<TwoColumn data-id="col1">
  <Text data-id="t2">Left column content...</Text>
  <Text data-id="t3">Right column content...</Text>
</TwoColumn>
        `.trim(),
        overrides: { img1: { css: { borderRadius: '{radii.md}', boxShadow: 'lg' } } }
      }));
    }
  }
}
