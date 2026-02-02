import { ChatsModule } from '@chats/chats.module.js';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SocketGatewayModule } from '@socket-gateway/socket-gateway.module.js';
import { Story, StorySchema } from '@stories/models/story.js';
import { StoriesController } from '@stories/stories.controller.js';
import { StoriesService } from '@stories/stories.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Story.name, schema: StorySchema }]),
    ChatsModule,
    SocketGatewayModule,
  ],
  controllers: [StoriesController],
  providers: [StoriesService],
})
export class StoriesModule {}
