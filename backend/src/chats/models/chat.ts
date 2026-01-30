import { ChatMember, ChatMemberSchema } from '@chats/models/chat-member.js';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type ChatDocument = ChatModel & Document;

@Schema({ timestamps: true, collection: 'chats' })
export class ChatModel {
  @Prop({
    type: [ChatMemberSchema],
    required: true,
    validate: {
      validator: (v: ChatMember[]) => v.length >= 2,
      message: 'A chat must have at least 2 participants',
    },
  })
  members!: ChatMember[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message' })
  lastMessage?: Types.ObjectId;

  @Prop()
  createdAt!: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy!: Types.ObjectId;

  @Prop()
  updatedAt!: Date;
}

export const ChatSchema = SchemaFactory.createForClass(ChatModel);

// Index for finding chats where a specific user is a participant
ChatSchema.index({ 'members.user': 1 });
// Compounded index for finding active (not deleted) chats for a user
ChatSchema.index({ 'members.user': 1, 'members.deletedAt': 1 });
// Index for sorting by last update
ChatSchema.index({ updatedAt: -1 });
