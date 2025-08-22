import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { ThemesModule } from './themes/theme.module';
import { LessonsModule } from './lessons/lesson.module';
import { Theme } from './themes/theme.entity';
import { Lesson } from './lessons/lesson.entity';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      sortSchema: true,
      playground: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : 5432,
      username: process.env.DATABASE_USERNAME ?? 'postgres',
      password: process.env.DATABASE_PASSWORD ?? 'postgres',
      database: process.env.DATABASE_NAME ?? 'cms_dev',
      entities: [Theme, Lesson],
      synchronize: true, // dev only
    }),
    TypeOrmModule.forFeature([Theme, Lesson]),
    ThemesModule,
    LessonsModule,
  ],

})
export class AppModule {}
