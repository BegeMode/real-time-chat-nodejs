import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StoryDocument = Story & Document;

@Schema({ timestamps: true })
export class Story {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user!: Types.ObjectId;

  @Prop({ required: true })
  videoUrl!: string;

  @Prop({ required: true, max: 16 })
  duration!: number;

  @Prop({
    type: Date,
    default: Date.now,
    index: { expires: '24h' }, // TTL Index: auto-delete after 24h
  })
  createdAt!: Date;
}

export const StorySchema = SchemaFactory.createForClass(Story);
