import { AuthModule } from '@auth/auth.module.js';
import { ChatsModule } from '@chats/chats.module.js';
import { SocketAuthGuard } from '@guards/socket-auth.guard.js';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PubSubService } from '@socket-gateway/pub-sub.service.js';
import { RedisService } from '@socket-gateway/redis.service.js';
import { SocketGatewayService } from '@socket-gateway/socket.service.js';
import { SocketNotifierService } from '@socket-gateway/socket-notifier.service.js';
import { SocketTransport } from '@socket-gateway/socket-transport.service.js';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => ChatsModule),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  providers: [
    SocketGatewayService,
    SocketNotifierService,
    {
      provide: SocketTransport,
      useExisting: SocketGatewayService,
    },
    {
      provide: PubSubService,
      useClass: RedisService,
    },
    SocketAuthGuard,
  ],
  exports: [PubSubService, SocketTransport],
})
export class SocketGatewayModule {}
