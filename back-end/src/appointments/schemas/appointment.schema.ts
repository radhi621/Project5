import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AppointmentDocument = Appointment & Document;

@Schema({ timestamps: true })
export class Appointment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  userName: string;

  @Prop({ type: Types.ObjectId, ref: 'Mechanic', required: true })
  mechanicId: Types.ObjectId;

  @Prop({ required: true })
  mechanicName: string;

  @Prop({ required: true })
  shopName: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ default: 'pending', enum: ['pending', 'confirmed', 'completed', 'cancelled'] })
  status: string;

  @Prop()
  notes?: string;

  @Prop()
  userPhone?: string;

  @Prop()
  userEmail?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
