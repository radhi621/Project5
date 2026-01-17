import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VectorChunkDocument = VectorChunk & Document;

@Schema({ timestamps: true })
export class VectorChunk {
  @Prop({ required: true })
  content: string;

  @Prop({ type: [Number], required: true })
  embedding: number[];

  @Prop({ type: Types.ObjectId, ref: 'RagDocument', required: true })
  documentId: Types.ObjectId;

  @Prop({ required: true })
  chunkIndex: number;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const VectorChunkSchema = SchemaFactory.createForClass(VectorChunk);

// Create index for vector similarity search
VectorChunkSchema.index({ embedding: '2dsphere' });
