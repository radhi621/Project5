import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { CreateReviewDto } from './dto/review.dto';
import { MechanicRequest } from '../mechanic-requests/schemas/mechanic-request.schema';
import { Mechanic } from '../mechanics/schemas/mechanic.schema';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(MechanicRequest.name) private mechanicRequestModel: Model<MechanicRequest>,
    @InjectModel(Mechanic.name) private mechanicModel: Model<Mechanic>,
  ) {}

  async create(userId: string, createReviewDto: CreateReviewDto): Promise<Review> {
    const { requestId, rating, comment } = createReviewDto;

    // Validate request exists and is completed
    const request = await this.mechanicRequestModel.findById(requestId);
    if (!request) {
      throw new NotFoundException('Chat session not found');
    }

    if (request.status !== 'completed') {
      throw new BadRequestException('Can only review completed chat sessions');
    }

    // Verify user owns this request
    if (request.userId.toString() !== userId) {
      throw new BadRequestException('You can only review your own chat sessions');
    }

    // Check if already reviewed
    const existingReview = await this.reviewModel.findOne({ 
      requestId: new Types.ObjectId(requestId) 
    } as any);
    if (existingReview) {
      throw new ConflictException('You have already reviewed this session');
    }

    // Get mechanic details
    const mechanic = await this.mechanicModel.findById(request.mechanicId);
    if (!mechanic) {
      throw new NotFoundException('Mechanic not found');
    }

    // Create review
    const review = new this.reviewModel({
      mechanicId: request.mechanicId,
      userId: new Types.ObjectId(userId),
      requestId: new Types.ObjectId(requestId),
      userName: request.userName,
      mechanicName: request.mechanicName,
      rating,
      comment: comment || '',
    });

    const savedReview = await review.save();

    // Update mechanic's rating
    await this.updateMechanicRating(request.mechanicId.toString(), rating);

    // Mark request as rated
    await this.mechanicRequestModel.findByIdAndUpdate(requestId, { isRated: true });

    return savedReview;
  }

  private async updateMechanicRating(mechanicId: string, newRating: number): Promise<void> {
    const mechanic = await this.mechanicModel.findById(mechanicId);
    if (!mechanic) return;

    const totalReviews = mechanic.totalReviews + 1;
    const updatedRating = (mechanic.rating * mechanic.totalReviews + newRating) / totalReviews;

    await this.mechanicModel.findByIdAndUpdate(mechanicId, {
      rating: Math.round(updatedRating * 10) / 10,
      totalReviews,
    });
  }

  async findByMechanic(mechanicId: string, limit: number = 50): Promise<Review[]> {
    return this.reviewModel
      .find({ mechanicId: new Types.ObjectId(mechanicId) } as any)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async findByUser(userId: string, limit: number = 50): Promise<Review[]> {
    return this.reviewModel
      .find({ userId: new Types.ObjectId(userId) } as any)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async findByRequest(requestId: string): Promise<Review | null> {
    return this.reviewModel.findOne({ requestId: new Types.ObjectId(requestId) } as any).exec();
  }

  async getMechanicStats(mechanicId: string) {
    const reviews = await this.reviewModel.find({ mechanicId: new Types.ObjectId(mechanicId) } as any);
    
    const ratingDistribution: Record<number, number> = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    reviews.forEach(review => {
      ratingDistribution[review.rating]++;
    });

    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    return {
      totalReviews,
      avgRating: Math.round(avgRating * 10) / 10,
      ratingDistribution,
      recentReviews: reviews.slice(0, 5),
    };
  }

  async getAll(limit: number = 100): Promise<Review[]> {
    return this.reviewModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }
}
