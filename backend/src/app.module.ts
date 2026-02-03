import path from 'node:path';

import { AuthModule } from '@auth/auth.module.js';
import { ChatsModule } from '@chats/chats.module.js';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { SocketGatewayModule } from '@socket-gateway/socket-gateway.module.js';
import { StoriesModule } from '@stories/stories.module.js';
import { UsersModule } from '@users/users.module.js';
import { Connection, Query, Schema, Types } from 'mongoose';
import { LoggerModule } from 'nestjs-pino';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
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
        connectionFactory: (connection: Connection) => {
          connection.plugin((schema: Schema) => {
            // eslint-disable-next-line unicorn/consistent-function-scoping
            const transform = (_doc: unknown, ret: Record<string, unknown>) => {
              if (ret._id instanceof Types.ObjectId) {
                // eslint-disable-next-line canonical/id-match
                ret._id = ret._id.toString();
              }
              delete ret.__v;

              return ret;
            };

            schema.set('toJSON', {
              virtuals: true,
              versionKey: false,
              transform,
            });

            schema.set('toObject', {
              virtuals: true,
              versionKey: false,
              transform,
            });

            // Handle transformation for .lean() results
            schema.post(
              /^(find|findOne|findOneAndUpdate|findByIdAndUpdate)$/,
              function (this: Query<unknown, unknown>, res: unknown) {
                const isLean = this.getOptions().lean;
                if (isLean && res) {
                  // eslint-disable-next-line sonarjs/no-nested-functions
                  const process = (obj: Record<string, unknown>) => {
                    if (obj._id instanceof Types.ObjectId) {
                      // eslint-disable-next-line canonical/id-match
                      obj._id = obj._id.toString();
                    }
                    delete obj.__v;
                  };

                  if (Array.isArray(res)) {
                    // eslint-disable-next-line unicorn/no-array-for-each, unicorn/no-array-callback-reference
                    res.forEach(process);
                  } else {
                    process(res as Record<string, unknown>);
                  }
                }
              },
            );
          });

          return connection;
        },
      }),
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      rootPath: path.join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    AuthModule,
    UsersModule,
    ChatsModule,
    StoriesModule,
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
