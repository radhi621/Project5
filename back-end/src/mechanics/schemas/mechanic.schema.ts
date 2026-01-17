import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MechanicDocument = Mechanic & Document;

@Schema({ timestamps: true })
export class Mechanic {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  shopName: string;

  @Prop({ type: [String], default: [] })
  specialties: string[];

  @Prop({ default: 0, min: 0, max: 5 })
  rating: number;

  @Prop({ default: 0 })
  totalReviews: number;

  @Prop({ default: 'available', enum: ['available', 'busy', 'offline'] })
  availability: string;

  @Prop({ default: 0 })
  completedJobs: number;

  @Prop()
  address: string;

  @Prop()
  city: string;

  @Prop()
  state: string;

  @Prop()
  zipCode: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const MechanicSchema = SchemaFactory.createForClass(Mechanic);
