import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ _id: false })
export class ChatMember {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user!: Types.ObjectId;

  @Prop({ default: null, type: Date })
  deletedAt?: Date | null;

  @Prop({ default: 0 })
  unreadCount!: number;
}

export const ChatMemberSchema = SchemaFactory.createForClass(ChatMember);
