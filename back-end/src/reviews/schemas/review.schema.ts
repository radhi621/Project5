import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ReviewDocument = Review & Document;

@Schema({ timestamps: true })
export class Review {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Mechanic', required: true })
  mechanicId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'MechanicRequest', required: true, unique: true })
  requestId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  userName: string;

  @Prop({ required: true })
  mechanicName: string;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ default: '' })
  comment: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// Create index to ensure one review per request
ReviewSchema.index({ requestId: 1 }, { unique: true });
// Index for efficient queries
ReviewSchema.index({ mechanicId: 1, createdAt: -1 });
ReviewSchema.index({ userId: 1, createdAt: -1 });
