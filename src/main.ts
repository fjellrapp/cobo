import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const port = process.env.PORT || 3000;
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      methods: 'GET, PUT, PATCH, POST, DELETE',
      credentials: true,
    },
  });
  await app.listen(port).then(() => {
    console.log(`Server started on port ${port}`);
  });
}
bootstrap();
