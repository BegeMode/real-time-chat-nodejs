import { AuthModule } from '@auth/auth.module.js';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SocketGatewayModule } from '@socket-gateway/socket-gateway.module.js';

import { ChatsController } from './chats.controller.js';
import { ChatsService } from './chats.service.js';
import { ChatSchema } from './models/chat.js';
import { MessageSchema } from './models/message.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Message', schema: MessageSchema },
      { name: 'Chat', schema: ChatSchema },
    ]),
    AuthModule,
    SocketGatewayModule,
  ],
  controllers: [ChatsController],
  providers: [ChatsService],
  exports: [ChatsService],
})
export class ChatsModule {}
