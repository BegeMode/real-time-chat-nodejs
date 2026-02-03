import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';

import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Enable NestJS shutdown hooks
  app.enableShutdownHooks();

  // Enable CORS with credentials
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });

  // Cookie parser middleware
  app.use(cookieParser());

  // Use pino logger
  const logger = app.get<Logger>(Logger);
  app.useLogger(logger);
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  /**
   * Helper for graceful shutdown
   */
  const gracefulShutdown = async (signalOrError?: string | Error) => {
    if (signalOrError instanceof Error) {
      logger.error({
        msg: 'Uncaught Exception detected, shutting down...',
        err: signalOrError.stack,
      });
    } else {
      logger.log(
        `Received signal: ${signalOrError ?? 'unknown'}, starting graceful shutdown...`,
      );
    }

    try {
      // Set a timeout for forced exit
      const forceExit = setTimeout(() => {
        logger.warn('Graceful shutdown timed out, forcing exit.');
        // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
        process.exit(1);
      }, 10_000); // 10 seconds

      await app.close();
      clearTimeout(forceExit);

      logger.log('Graceful shutdown completed successfully.');
      // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
      process.exit(signalOrError instanceof Error ? 1 : 0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
      process.exit(1);
    }
  };

  // Catch system-level errors
  process.on('unhandledRejection', (reason) => {
    logger.error({
      msg: 'Unhandled Rejection detected',
      reason: reason instanceof Error ? reason.stack : reason,
    });
  });

  process.on('uncaughtException', (err) => {
    void gracefulShutdown(err);
  });

  process.on('SIGTERM', () => {
    void gracefulShutdown('SIGTERM');
  });

  process.on('SIGINT', () => {
    void gracefulShutdown('SIGINT');
  });

  const serviceType = process.env.SERVICE_TYPE ?? 'ALL';
  logger.log(`Starting backend in ${serviceType} mode`);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Server is running on port ${port.toString()}`);
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void bootstrap();
