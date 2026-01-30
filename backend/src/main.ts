import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';

import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Enable CORS with credentials
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });

  // Cookie parser middleware
  app.use(cookieParser());

  // Use pino logger
  app.useLogger(app.get<Logger>(Logger));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('tsconfig-paths/register');
  // eslint-disable-next-line unicorn/prefer-top-level-await
  void bootstrap();
}
