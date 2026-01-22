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

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Mechanic', required: true })
  mechanicId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  mechanicName: string;

  @Prop({ required: true })
  mechanicEmail: string;

  @Prop({
    type: String,
    enum: ['pending', 'active', 'completed', 'reopen-requested', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Prop({ type: [Object], default: [] })
  messages: {
    senderId: string;
    senderName: string;
    senderRole: 'user' | 'mechanic';
    content: string;
    timestamp: Date;
  }[];

  @Prop()
  acceptedAt: Date;

  @Prop()
  completedAt: Date;

  @Prop()
  completedByMechanic: boolean;

  @Prop()
  reopenRequestedAt: Date;
}

export const MechanicRequestSchema =
  SchemaFactory.createForClass(MechanicRequest);
