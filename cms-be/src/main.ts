import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 4000);
  Logger.log(`🚀 Nest API running on http://localhost:${process.env.PORT ?? 4000}/graphql`);
}
bootstrap();
