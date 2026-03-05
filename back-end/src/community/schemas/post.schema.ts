import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PostDocument = Post & Document;

@Schema({ timestamps: true })
export class Post {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  @Prop({ required: true })
  authorName: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  // Arrays of userId strings — toggled on vote
  @Prop({ type: [String], default: [] })
  upvotes: string[];

  @Prop({ type: [String], default: [] })
  downvotes: string[];

  @Prop({ default: 0 })
  commentCount: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const PostSchema = SchemaFactory.createForClass(Post);
PostSchema.index({ createdAt: -1 });
PostSchema.index({ tags: 1 });
PostSchema.index({ commentCount: -1 });
