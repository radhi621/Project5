import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type MechanicRequestDocument = MechanicRequest & Document;

@Schema({ timestamps: true })
export class MechanicRequest {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  userName: string;

  @Prop({ required: true })
  userEmail: string;

  @Prop()
  userPhone: string;

  @Prop({ type: [Object], required: true })
  chatHistory: {
    role: string;
    content: string;
    timestamp: Date;
  }[];

  @Prop({
    type: String,
    enum: ['pending', 'accepted', 'denied', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Mechanic' })
  acceptedBy: MongooseSchema.Types.ObjectId;

  @Prop()
  acceptedByName: string;

  @Prop()
  acceptedByEmail: string;

  @Prop()
  responseMessage: string;

  @Prop()
  respondedAt: Date;
}

export const MechanicRequestSchema =
  SchemaFactory.createForClass(MechanicRequest);
