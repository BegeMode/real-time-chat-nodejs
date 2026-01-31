import { AuthModule } from '@auth/auth.module.js';
import { SocketAuthGuard } from '@guards/socket-auth.guard.js';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PubSubService } from '@socket-gateway/pub-sub.service.js';
import { RedisService } from '@socket-gateway/redis.service.js';
import { SocketGatewayService } from '@socket-gateway/socket.service.js';

@Module({
  imports: [
    AuthModule,
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
    {
      provide: PubSubService,
      useClass: RedisService,
    },
    SocketAuthGuard,
  ],
  exports: [PubSubService],
})
export class SocketGatewayModule {}
