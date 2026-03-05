import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommentDocument = Comment & Document;

@Schema({ timestamps: true })
export class Comment {
  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  postId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  @Prop({ required: true })
  authorName: string;

  @Prop({ required: true })
  content: string;

  // Snapshot of the quoted comment — stored so it survives deletions
  @Prop({ type: Object })
  quotedComment?: {
    commentId: string;
    authorName: string;
    content: string; // truncated to 200 chars at write time
  };

  @Prop({ type: [String], default: [] })
  upvotes: string[];

  @Prop({ type: [String], default: [] })
  downvotes: string[];

  @Prop({ default: true })
  isActive: boolean;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
CommentSchema.index({ postId: 1, createdAt: 1 });
