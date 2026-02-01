import { AuthModule } from '@auth/auth.module.js';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SocketGatewayModule } from '@socket-gateway/socket-gateway.module.js';
import { UsersModule } from '@users/users.module.js';
import { LoggerModule } from 'nestjs-pino';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ChatsModule } from './chats/chats.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: 'SYS:standard',
                },
              },
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        serializers: {
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          req: () => {},
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          res: () => {},
        },
      },
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    ChatsModule,
    // Load SocketGatewayModule only if we are in WEBSOCKETS or ALL mode
    ...(process.env.SERVICE_TYPE === 'WEBSOCKETS' ||
    process.env.SERVICE_TYPE === 'ALL' ||
    !process.env.SERVICE_TYPE
      ? [SocketGatewayModule]
      : []),
  ],
  // In WEBSOCKETS mode, we don't need HTTP controllers
  controllers: process.env.SERVICE_TYPE === 'WEBSOCKETS' ? [] : [AppController],
  providers: [AppService],
})
export class AppModule {}
