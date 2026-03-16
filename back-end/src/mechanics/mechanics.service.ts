import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Mechanic, MechanicDocument } from './schemas/mechanic.schema';
import { CreateMechanicDto, UpdateMechanicDto } from './dto/mechanic.dto';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class MechanicsService {
  constructor(
    @InjectModel(Mechanic.name) private mechanicModel: Model<MechanicDocument>,
    private activityService: ActivityService,
  ) {}

  async create(createMechanicDto: CreateMechanicDto): Promise<Mechanic> {
    const createdMechanic = new this.mechanicModel(createMechanicDto);
    const saved = await createdMechanic.save();
    
    // Log activity
    await this.activityService.log(
      'mechanic',
      'New mechanic profile created',
      undefined,
      saved.name,
      { email: saved.email, shop: saved.shopName },
    );
    
    return saved;
  }

  async findAll(availability?: string): Promise<Mechanic[]> {
    const filter: any = { isActive: true };
    if (availability && availability !== 'all') {
      filter.availability = availability;
    }
    return this.mechanicModel.find(filter).sort({ rating: -1 }).exec();
  }

  async findByEmail(email: string): Promise<MechanicDocument | null> {
    return this.mechanicModel.findOne({ email: email.toLowerCase(), isActive: true }).exec();
  }

  async findOne(id: string): Promise<Mechanic> {
    const mechanic = await this.mechanicModel.findById(id).exec();
    if (!mechanic) {
      throw new NotFoundException(`Mechanic with ID ${id} not found`);
    }
    return mechanic;
  }

  async update(id: string, updateMechanicDto: UpdateMechanicDto, user?: any): Promise<Mechanic> {
    // If user is a mechanic (not admin), verify they own this profile
    if (user && user.role === 'mechanic') {
      const mechanic = await this.mechanicModel.findById(id).exec();
      if (!mechanic) {
        throw new NotFoundException(`Mechanic with ID ${id} not found`);
      }
      if (mechanic.email !== user.email) {
        throw new ForbiddenException('You can only update your own profile');
      }
    }
    
    const updatedMechanic = await this.mechanicModel
      .findByIdAndUpdate(id, updateMechanicDto, { new: true })
      .exec();
    if (!updatedMechanic) {
      throw new NotFoundException(`Mechanic with ID ${id} not found`);
    }
    
    // Log activity
    await this.activityService.log(
      'mechanic',
      'Mechanic profile updated',
      user?.sub,
      updatedMechanic.name,
      { email: updatedMechanic.email, updates: Object.keys(updateMechanicDto) },
    );
    
    return updatedMechanic;
  }

  async updateAvailability(id: string, availability: string, user?: any): Promise<Mechanic> {
    return this.update(id, { availability }, user);
  }

  async incrementCompletedJobs(id: string): Promise<void> {
    await this.mechanicModel
      .findByIdAndUpdate(id, { $inc: { completedJobs: 1 } })
      .exec();
  }

  async addReview(id: string, rating: number): Promise<Mechanic> {
    const mechanic = await this.findOne(id);
    const totalReviews = mechanic.totalReviews + 1;
    const newRating =
      (mechanic.rating * mechanic.totalReviews + rating) / totalReviews;

    const result = await this.mechanicModel
      .findByIdAndUpdate(
        id,
        {
          rating: Math.round(newRating * 10) / 10,
          totalReviews,
        },
        { new: true },
      )
      .exec() as Mechanic;
      
    if (!result) {
      throw new NotFoundException(`Mechanic with ID ${id} not found`);
    }
    return result;
  }

  async remove(id: string): Promise<void> {
    const result = await this.mechanicModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Mechanic with ID ${id} not found`);
    }
  }

  async getStats() {
    const total = await this.mechanicModel
      .countDocuments({ isActive: true })
      .exec();
    const available = await this.mechanicModel
      .countDocuments({ availability: 'available', isActive: true })
      .exec();

    const avgRatingResult = await this.mechanicModel.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } },
    ]);
    const avgRating = avgRatingResult[0]?.avgRating || 0;

    const totalJobsResult = await this.mechanicModel.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, totalJobs: { $sum: '$completedJobs' } } },
    ]);
    const totalJobs = totalJobsResult[0]?.totalJobs || 0;

    return {
      total,
      available,
      avgRating: Math.round(avgRating * 10) / 10,
      totalJobs,
    };
  }
}
