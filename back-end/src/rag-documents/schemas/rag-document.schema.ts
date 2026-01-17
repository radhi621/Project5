import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RagDocumentDocument = RagDocument & Document;

@Schema({ timestamps: true })
export class RagDocument {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  filePath: string;

  @Prop({ required: true })
  fileSize: number;

  @Prop({ default: 'pending', enum: ['pending', 'processing', 'processed', 'failed'] })
  status: string;

  @Prop({ default: 0 })
  chunks: number;

  @Prop()
  description: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  originalFileName: string;

  @Prop()
  mimeType: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date })
  processedAt: Date;
}

export const RagDocumentSchema = SchemaFactory.createForClass(RagDocument);
