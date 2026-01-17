import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Chat', required: true })
  chatId: Types.ObjectId;

  @Prop({ required: true, enum: ['user', 'assistant'] })
  role: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [String], default: [] })
  sources: string[];

  @Prop({
    type: [
      {
        filename: String,
        originalName: String,
        mimetype: String,
        path: String,
      },
    ],
    default: [],
  })
  attachments: {
    filename: string;
    originalName: string;
    mimetype: string;
    path: string;
  }[];
}

export const MessageSchema = SchemaFactory.createForClass(Message);
