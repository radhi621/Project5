import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ServiceReceiptDocument = ServiceReceipt & Document;

@Schema({ timestamps: true })
export class ServiceReceipt {
  @Prop({ type: Types.ObjectId, ref: 'Mechanic', required: true, index: true })
  mechanicId: Types.ObjectId;

  @Prop({ required: true })
  mechanicName: string;

  @Prop({ required: true, lowercase: true, index: true })
  mechanicEmail: string;

  @Prop({ required: true })
  createdByUserId: string;

  @Prop({ required: true, enum: ['admin', 'mechanic'] })
  createdByRole: 'admin' | 'mechanic';

  @Prop({ type: Types.ObjectId, ref: 'Chat', required: true })
  chatId: Types.ObjectId;

  @Prop({ required: true })
  customerName: string;

  @Prop({ required: true })
  customerEmail: string;

  @Prop()
  customerPhone?: string;

  @Prop({ required: true })
  serviceType: string;

  @Prop({ type: [String], default: [] })
  partsUsed: string[];

  @Prop({ required: true, min: 0 })
  laborHours: number;

  @Prop({ required: true, min: 0 })
  laborRate: number;

  @Prop({ required: true, min: 0 })
  laborCost: number;

  @Prop({ required: true, min: 0 })
  partsCost: number;

  @Prop({ required: true, min: 0 })
  totalCost: number;

  @Prop({ default: '' })
  notes: string;

  @Prop()
  fileName?: string;

  @Prop()
  filePath?: string;

  @Prop()
  fileUrl?: string;

  @Prop({ default: 'final', enum: ['final'] })
  status: 'final';

  @Prop({ default: 'ai-intake', enum: ['ai-intake'] })
  source: 'ai-intake';
}

export const ServiceReceiptSchema = SchemaFactory.createForClass(ServiceReceipt);
ServiceReceiptSchema.index({ mechanicId: 1, createdAt: -1 });
