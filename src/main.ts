import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: 'http://localhost:5173',
      methods: 'GET, PUT, PATCH, POST, DELETE',
      credentials: true,
    },
  });
  await app.listen(3000);
}
bootstrap();
