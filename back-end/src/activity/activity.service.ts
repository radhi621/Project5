import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Activity, ActivityDocument } from './schemas/activity.schema';

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
  ) {}

  async log(
    type: string,
    action: string,
    userId?: string,
    userName?: string,
    metadata?: Record<string, any>,
  ): Promise<Activity> {
    const activity = new this.activityModel({
      type,
      action,
      userId,
      userName,
      metadata,
      timestamp: new Date(),
    });
    return activity.save();
  }

  async getRecent(limit: number = 10): Promise<Activity[]> {
    return this.activityModel
      .find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  async getByType(type: string, limit: number = 10): Promise<Activity[]> {
    return this.activityModel
      .find({ type })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  async getStats(): Promise<any> {
    const total = await this.activityModel.countDocuments().exec();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCount = await this.activityModel
      .countDocuments({ timestamp: { $gte: today } })
      .exec();

    const byType = await this.activityModel.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      total,
      today: todayCount,
      byType,
    };
  }
}
