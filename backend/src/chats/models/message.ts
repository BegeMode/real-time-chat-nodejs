import { ChatMember, ChatMemberSchema } from '@chats/models/chat-member.js';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type MessageDocument = MessageModel & Document;

@Schema({ timestamps: true, collection: 'messages' })
export class MessageModel {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Chat',
    required: true,
  })
  chatId!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  senderId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  text!: string;

  @Prop({
    type: [ChatMemberSchema],
    required: true,
  })
  members!: ChatMember[];

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;
}

export const MessageSchema = SchemaFactory.createForClass(MessageModel);

// Index for faster message retrieval by chat, excluding deleted messages for specific users
MessageSchema.index({
  chatId: 1,
  'members.user': 1,
  'members.deletedAt': 1,
  createdAt: -1,
});
