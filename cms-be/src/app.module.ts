import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { ThemesModule } from './themes/theme.module';
import { LessonsModule } from './lessons/lesson.module';
import { JsonScalar } from './common/scalars/json.scalar';
import { SeedService } from './seed/seed.service';
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
      host: process.env.DB_HOST ?? 'localhost',
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASS ?? 'postgres',
      database: process.env.DB_NAME ?? 'insight',
      entities: [Theme, Lesson],
      synchronize: true, // dev only
    }),
    ThemesModule,
    LessonsModule,
  ],
  providers: [JsonScalar, SeedService],
})
export class AppModule {}
