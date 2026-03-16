import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReceiptIntakeDocument = ReceiptIntake & Document;

@Schema({ timestamps: true })
export class ReceiptIntake {
  @Prop({ type: Types.ObjectId, ref: 'Chat', required: true, index: true })
  chatId: Types.ObjectId;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, enum: ['admin', 'mechanic'] })
  userRole: 'admin' | 'mechanic';

  @Prop({ required: true, enum: ['active', 'completed', 'cancelled'], default: 'active' })
  status: 'active' | 'completed' | 'cancelled';

  @Prop({ required: true, default: 0 })
  currentStep: number;

  @Prop({ type: Object, default: {} })
  data: {
    mechanicEmail?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    serviceType?: string;
    partsUsed?: string[];
    laborHours?: number;
    laborRate?: number;
    laborCost?: number;
    partsCost?: number;
    notes?: string;
  };
}

export const ReceiptIntakeSchema = SchemaFactory.createForClass(ReceiptIntake);
ReceiptIntakeSchema.index({ chatId: 1, status: 1 });
