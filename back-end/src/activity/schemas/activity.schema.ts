import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ActivityDocument = Activity & Document;

@Schema({ timestamps: true })
export class Activity {
  @Prop({ required: true, enum: ['user', 'mechanic', 'rag', 'appointment', 'system'] })
  type: string;

  @Prop({ required: true })
  action: string;

  @Prop()
  userId?: string;

  @Prop()
  userName?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);
