import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ default: 'active', enum: ['active', 'inactive', 'suspended'] })
  status: string;

  @Prop({ default: Date.now })
  lastActive: Date;

  @Prop({ default: 0 })
  totalChats: number;

  @Prop({ default: 0 })
  totalAppointments: number;

  @Prop({ default: 'user', enum: ['user', 'admin', 'mechanic'] })
  role: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
