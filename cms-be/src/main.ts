import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for development/prototype
  app.enableCors({
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
  });
  
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
  Logger.log(`🚀 Nest API running on http://localhost:${process.env.PORT ?? 3000}/graphql`);
}
bootstrap();
