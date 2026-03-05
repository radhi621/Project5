import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, PostDocument } from './schemas/post.schema';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { CreatePostDto, UpdatePostDto, CreateCommentDto } from './dto/community.dto';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class CommunityService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    private activityService: ActivityService,
  ) {}

  // ── Posts ──────────────────────────────────────────────────────────────────

  async createPost(dto: CreatePostDto, userId: string, userName: string): Promise<Post> {
    const post = new this.postModel({
      authorId: new Types.ObjectId(userId),
      authorName: userName,
      title: dto.title,
      content: dto.content,
      tags: dto.tags ?? [],
    });
    const saved = await post.save();

    await this.activityService.log(
      'community',
      'New community post created',
      userId,
      userName,
      { postId: (saved as any)._id.toString(), title: dto.title },
    );

    return saved;
  }

  async findAllPosts(
    sort: string = 'newest',
    tag?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ posts: Post[]; total: number }> {
    const filter: any = { isActive: true };
    if (tag) filter.tags = tag;

    const total = await this.postModel.countDocuments(filter).exec();

    // 'top' re-sorts in JS after fetching — keep DB sort as fallback by recency
    const mongoSort: any =
      sort === 'mostCommented' ? { commentCount: -1, createdAt: -1 } : { createdAt: -1 };

    const posts = await this.postModel
      .find(filter)
      .sort(mongoSort)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    if (sort === 'top') {
      posts.sort((a: any, b: any) => {
        const netA = a.upvotes.length - a.downvotes.length;
        const netB = b.upvotes.length - b.downvotes.length;
        return netB - netA;
      });
    }

    return { posts, total };
  }

  async findOnePost(id: string): Promise<Post> {
    const post = await this.postModel.findOne({ _id: id, isActive: true }).exec();
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async updatePost(
    id: string,
    dto: UpdatePostDto,
    userId: string,
    userRole: string,
  ): Promise<Post> {
    const post = await this.postModel.findById(id).exec();
    if (!post || !(post as any).isActive) throw new NotFoundException('Post not found');

    if (userRole !== 'admin' && (post as any).authorId.toString() !== userId) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    Object.assign(post, dto);
    return (post as any).save();
  }

  async deletePost(id: string, userId: string, userRole: string): Promise<void> {
    const post = await this.postModel.findById(id).exec();
    if (!post || !(post as any).isActive) throw new NotFoundException('Post not found');

    if (userRole !== 'admin' && (post as any).authorId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    (post as any).isActive = false;
    await (post as any).save();

    // Soft-delete all comments on this post
    await this.commentModel.updateMany(
      { postId: new Types.ObjectId(id) },
      { isActive: false },
    );
  }

  async votePost(
    id: string,
    type: 'upvote' | 'downvote',
    userId: string,
  ): Promise<Post> {
    const post = await this.postModel.findOne({ _id: id, isActive: true }).exec();
    if (!post) throw new NotFoundException('Post not found');

    const opposite = type === 'upvote' ? 'downvotes' : 'upvotes';
    const current = type === 'upvote' ? 'upvotes' : 'downvotes';

    // Remove from opposite to prevent simultaneous up+down
    (post as any)[opposite] = (post as any)[opposite].filter(
      (uid: string) => uid !== userId,
    );

    // Toggle in current array
    const idx = (post as any)[current].indexOf(userId);
    if (idx > -1) {
      (post as any)[current].splice(idx, 1); // undo vote
    } else {
      (post as any)[current].push(userId);
    }

    return (post as any).save();
  }

  // ── Comments ───────────────────────────────────────────────────────────────

  async createComment(
    dto: CreateCommentDto,
    userId: string,
    userName: string,
  ): Promise<Comment> {
    const post = await this.postModel
      .findOne({ _id: dto.postId, isActive: true })
      .exec();
    if (!post) throw new NotFoundException('Post not found');

    let quotedComment:
      | { commentId: string; authorName: string; content: string }
      | undefined;

    if (dto.quotedCommentId) {
      const quoted = await this.commentModel
        .findOne({ _id: dto.quotedCommentId, isActive: true })
        .exec();
      if (quoted) {
        quotedComment = {
          commentId: dto.quotedCommentId,
          authorName: (quoted as any).authorName,
          content: (quoted as any).content.slice(0, 200),
        };
      }
    }

    const comment = new this.commentModel({
      postId: new Types.ObjectId(dto.postId),
      authorId: new Types.ObjectId(userId),
      authorName: userName,
      content: dto.content,
      quotedComment,
    });

    const saved = await comment.save();
    await this.postModel.findByIdAndUpdate(dto.postId, { $inc: { commentCount: 1 } });

    return saved;
  }

  async findCommentsByPost(postId: string): Promise<Comment[]> {
    return this.commentModel
      .find({ postId: new Types.ObjectId(postId), isActive: true })
      .sort({ createdAt: 1 })
      .exec();
  }

  async deleteComment(id: string, userId: string, userRole: string): Promise<void> {
    const comment = await this.commentModel.findById(id).exec();
    if (!comment || !(comment as any).isActive)
      throw new NotFoundException('Comment not found');

    if (userRole !== 'admin' && (comment as any).authorId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    (comment as any).isActive = false;
    await (comment as any).save();
    await this.postModel.findByIdAndUpdate((comment as any).postId, {
      $inc: { commentCount: -1 },
    });
  }

  async voteComment(
    id: string,
    type: 'upvote' | 'downvote',
    userId: string,
  ): Promise<Comment> {
    const comment = await this.commentModel
      .findOne({ _id: id, isActive: true })
      .exec();
    if (!comment) throw new NotFoundException('Comment not found');

    const opposite = type === 'upvote' ? 'downvotes' : 'upvotes';
    const current = type === 'upvote' ? 'upvotes' : 'downvotes';

    (comment as any)[opposite] = (comment as any)[opposite].filter(
      (uid: string) => uid !== userId,
    );

    const idx = (comment as any)[current].indexOf(userId);
    if (idx > -1) {
      (comment as any)[current].splice(idx, 1);
    } else {
      (comment as any)[current].push(userId);
    }

    return (comment as any).save();
  }
}
