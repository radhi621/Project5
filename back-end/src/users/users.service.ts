import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  async findAll(status?: string): Promise<User[]> {
    const filter = status && status !== 'all' ? { status } : {};
    return this.userModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();
    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return updatedUser;
  }

  async updateLastActive(id: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, { lastActive: new Date() }).exec();
  }

  async incrementChatCount(id: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, { $inc: { totalChats: 1 } }).exec();
  }

  async incrementAppointmentCount(id: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, { $inc: { totalAppointments: 1 } }).exec();
  }

  async suspend(id: string): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { status: 'suspended' }, { new: true })
      .exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  async getStats() {
    const total = await this.userModel.countDocuments().exec();
    const active = await this.userModel.countDocuments({ status: 'active' }).exec();
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newThisMonth = await this.userModel
      .countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
      .exec();

    const avgChatsResult = await this.userModel.aggregate([
      { $group: { _id: null, avgChats: { $avg: '$totalChats' } } },
    ]);
    const avgChats = avgChatsResult[0]?.avgChats || 0;

    return {
      total,
      active,
      newThisMonth,
      avgChats: Math.round(avgChats * 10) / 10,
    };
  }
}
