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

  @Prop({ required: true })
  timeSlot: string; // e.g., "09:00-10:00", "14:00-15:00"

  @Prop({ required: true })
  serviceType: string; // e.g., "Engine Repair", "Oil Change", etc.

  @Prop()
  estimatedDuration: number; // in minutes

  @Prop({ default: 'pending', enum: ['pending', 'confirmed', 'completed', 'cancelled', 'declined'] })
  status: string;

  @Prop()
  notes?: string;

  @Prop()
  userPhone?: string;

  @Prop()
  userEmail?: string;

  @Prop()
  cancellationReason?: string;

  @Prop()
  confirmedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
